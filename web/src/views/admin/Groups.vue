<template>
  <div class="groups">
    <el-row :gutter="16">
      <!-- 左侧：用户组列表 -->
      <el-col :span="10">
        <el-card>
          <template #header>
            {{ t('admin.groups') }}
            <el-button size="small" type="primary" style="float: right" @click="openCreate">{{ t('admin.newGroup') }}</el-button>
          </template>
          <el-skeleton v-if="loading" :rows="6" animated />
          <template v-else>
            <el-empty v-if="groups.length === 0" :description="t('admin.noGroups')" :image-size="60" />
            <div
              v-for="g in groups"
              :key="g.id"
              class="group-item"
              :class="{ active: currentGroup?.id === g.id }"
              @click="selectGroup(g)"
            >
              <div class="group-name">
                {{ g.name }}
                <el-tag v-if="g.id === 1" size="small" type="success">{{ t('admin.default') }}</el-tag>
              </div>
              <div class="group-desc">{{ g.describe }}</div>
              <div class="group-actions" @click.stop>
                <el-button size="small" text type="primary" @click="openEdit(g)">{{ t('common.edit') }}</el-button>
                <el-button size="small" text type="danger" @click="removeGroup(g)">{{ t('common.delete') }}</el-button>
              </div>
            </div>
          </template>
        </el-card>
      </el-col>

      <!-- 右侧：组详情 -->
      <el-col :span="14">
        <el-card v-if="currentGroup">
          <template #header>
            {{ t('admin.groupTitle', { name: currentGroup.name }) }}
            <el-tabs v-model="detailTab" style="display: inline-block; margin-left: 20px">
              <el-tab-pane :label="t('admin.groupUsers')" name="users" />
              <el-tab-pane :label="t('admin.resourcePerms')" name="resources" />
            </el-tabs>
          </template>

          <!-- 组信息 -->
          <el-descriptions v-if="groupDetail" :column="2" size="small" border style="margin-bottom: 16px">
            <el-descriptions-item :label="t('admin.groupId')">{{ groupDetail.id }}</el-descriptions-item>
            <el-descriptions-item :label="t('admin.groupName')">{{ groupDetail.name }}</el-descriptions-item>
            <el-descriptions-item :label="t('admin.desc')" :span="2">{{ groupDetail.describe || '—' }}</el-descriptions-item>
            <el-descriptions-item :label="t('admin.createTime')">{{ fmtTime(groupDetail.create_time) }}</el-descriptions-item>
            <el-descriptions-item :label="t('admin.updateTime')">{{ fmtTime(groupDetail.update_time) }}</el-descriptions-item>
          </el-descriptions>

          <!-- 组下用户 -->
          <template v-if="detailTab === 'users'">
            <el-table :data="groupUsers" size="small">
              <el-table-column prop="id" label="ID" width="60" />
              <el-table-column prop="name" :label="t('user.username')" width="120" />
              <el-table-column prop="nick_name" :label="t('auth.nickname')" min-width="110" />
              <el-table-column label="VIP" width="70">
                <template #default="{ row }">
                  <el-tag v-if="row.vip === 1" size="small" type="success">VIP</el-tag>
                  <span v-else class="zh-text-3">—</span>
                </template>
              </el-table-column>
              <el-table-column prop="email" :label="t('auth.email')" min-width="150" />
            </el-table>
            <el-empty v-if="groupUsers.length === 0" :description="t('admin.noGroupUsers')" :image-size="50" />
          </template>

          <!-- 资源权限 -->
          <template v-else>
            <el-alert
              type="info"
              :closable="false"
              show-icon
              :title="t('admin.resourcePermTip')"
              style="margin-bottom: 12px"
            />
            <el-checkbox-group v-model="assignedResources" class="resource-list">
              <el-checkbox v-for="r in resources" :key="r.id" :value="r.id" :label="r.id">
                {{ resName(r) }} <span class="res-url">{{ r.url }}</span>
              </el-checkbox>
            </el-checkbox-group>
            <div style="margin-top: 12px">
              <el-button type="primary" size="small" :loading="savingRes" @click="saveResources">
                {{ t('admin.saveResourceAssign') }}
              </el-button>
            </div>
          </template>
        </el-card>
        <el-empty v-else :description="t('admin.selectGroupHint')" />
      </el-col>
    </el-row>

    <!-- 创建/编辑组 -->
    <el-dialog v-model="dialogVisible" :title="editId ? t('admin.editGroup') : t('admin.newGroupTitle')" width="440px">
      <el-form ref="groupForm" :model="form" :rules="rules" label-width="80px">
        <el-form-item :label="t('admin.groupName')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="t('admin.desc')">
          <el-input v-model="form.describe" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="save">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'

const loading = ref(true)
const groups = ref([])
const currentGroup = ref(null)
const groupDetail = ref(null)
const detailTab = ref('users')
const groupUsers = ref([])
const resources = ref([])
const assignedResources = ref([])
const savingRes = ref(false)

const dialogVisible = ref(false)
const editId = ref(0)
const saving = ref(false)
const groupFormRef = ref(null)
const form = reactive({ name: '', describe: '' })
const rules = {
  name: [{ required: true, message: t('auth.enterGroupName'), trigger: 'blur' }]
}

// 权限资源 URL → 中文名（后端 Resource.name 是英文，这里转成可读的中文菜单）
const RESOURCE_CN = {
  '/v1/group/create': 'admin.res0',
  '/v1/group/update': 'admin.res1',
  '/v1/group/delete': 'admin.res2',
  '/v1/group/take': 'admin.res3',
  '/v1/group/list': 'admin.res4',
  '/v1/group/user/list': 'admin.res5',
  '/v1/group/resource/list': 'admin.res6',
  '/v1/user/list': 'admin.res7',
  '/v1/user/create': 'admin.res8',
  '/v1/user/assign': 'admin.res9',
  '/v1/user/admin/update': 'admin.res10',
  '/v1/resource/list': 'admin.res11',
  '/v1/resource/assign': 'admin.res12',
  '/v1/file/admin/list': 'admin.res13',
  '/v1/file/admin/update': 'admin.res14',
  '/v1/node/admin/list': 'admin.res15',
  '/v1/content/admin/update/status': 'admin.res16',
  '/v1/content/admin/take': 'admin.res17',
  '/v1/content/history/admin/take': 'admin.res18',
  '/v1/content/admin/list': 'admin.res19',
  '/v1/content/history/admin/list': 'admin.res20',
  '/v1/comment/admin/list': 'admin.res21',
  '/v1/comment/admin/update/status': 'admin.res22',
  '/v1/content/admin/bad/list': 'admin.res23',
  '/v1/comment/admin/bad/list': 'admin.res24',
  '/v1/relation/admin/list': 'admin.res25',
  '/v1/message/admin/list': 'admin.res26',
  '/v1/message/admin/global/create': 'admin.res27',
  '/v1/message/admin/global/list': 'admin.res28',
  '/v1/message/admin/global/update/status': 'admin.res29',
  '/v1/site/config/update': 'admin.res30',
  '/v1/friend/list': 'admin.res31',
  '/v1/friend/create': 'admin.res32',
  '/v1/friend/update': 'admin.res33',
  '/v1/friend/delete': 'admin.res34',
  '/v1/friend/sort': 'admin.res35'
}

function resName(r) {
  return t(RESOURCE_CN[r.url]) || r.name
}

async function load() {
  loading.value = true
  try {
    const res = await request.post('/api/group/list', {
      id: 0, name: '', limit: 100, page: 1,
      sort: ['=id', '=name', '-create_time', '=update_time']
    })
    groups.value = res.data.groups || []
  } catch (e) {
    groups.value = []
  } finally {
    loading.value = false
  }
}

async function selectGroup(g) {
  currentGroup.value = g
  detailTab.value = 'users'
  await Promise.all([loadGroupDetail(g.id), loadGroupUsers(g.id), loadGroupResources(g.id)])
}

// /group/take：拉取组完整信息（创建/更新时间等）
async function loadGroupDetail(groupId) {
  try {
    const res = await request.post('/api/group/take', { id: groupId, name: '' })
    groupDetail.value = res.data || null
  } catch (e) {
    groupDetail.value = null
  }
}

function fmtTime(t) {
  return t ? formatTime(t) : '—'
}

async function loadGroupUsers(groupId) {
  try {
    const res = await request.post('/api/group/user/list', { group_id: groupId })
    groupUsers.value = res.data.users || []
  } catch (e) {
    groupUsers.value = []
  }
}

async function loadGroupResources(groupId) {
  try {
    const [res, res2] = await Promise.all([
      request.post('/api/resource/list', {
        id: 0, name: '', url: '', limit: 200, page: 1,
        sort: ['=id', '+create_time', '-name']
      }),
      request.post('/api/group/resource/list', { group_id: groupId })
    ])
    resources.value = res.data.resources || []
    // 注意：/group/resource/list 返回的是资源 id 数组（[]int64），不是对象数组，直接赋值即可
    assignedResources.value = res2.data?.resources || []
  } catch (e) {
    resources.value = []
    assignedResources.value = []
  }
}

async function saveResources() {
  savingRes.value = true
  try {
    await request.post('/api/resource/assign', {
      group_id: currentGroup.value.id,
      resource_release: 0,
      resources: assignedResources.value
    })
    ElMessage.success(t('admin.resourceAssignSaved'))
  } catch (e) {
    ElMessage.error(e.msg || t('admin.saveFailed'))
  } finally {
    savingRes.value = false
  }
}

function openCreate() {
  editId.value = 0
  form.name = ''
  form.describe = ''
  dialogVisible.value = true
}

function openEdit(g) {
  editId.value = g.id
  form.name = g.name
  form.describe = g.describe
  dialogVisible.value = true
}

function save() {
  groupFormRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      if (editId.value) {
        await request.post('/api/group/update', {
          id: editId.value,
          name: form.name,
          describe: form.describe,
          image_path: ''
        })
      } else {
        await request.post('/api/group/create', {
          name: form.name,
          describe: form.describe,
          image_path: ''
        })
      }
      ElMessage.success(t('admin.saveSuccess'))
      dialogVisible.value = false
      load()
    } catch (e) {
      ElMessage.error(e.msg || t('admin.saveFailed'))
    } finally {
      saving.value = false
    }
  })
}

async function removeGroup(g) {
  try {
    await ElMessageBox.confirm(t('admin.deleteGroupConfirm', { name: g.name }), t('admin.tip'), { type: 'warning' })
    await request.post('/api/group/delete', { id: g.id, name: g.name })
    ElMessage.success(t('common.deleted'))
    if (currentGroup.value?.id === g.id) currentGroup.value = null
    load()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('admin.deleteFailed'))
  }
}

onMounted(load)
</script>

<style scoped>
.group-item {
  padding: 10px;
  border: 1px solid #f5f0ed;
  border-radius: 6px;
  margin-bottom: 10px;
  cursor: pointer;
}

.group-item.active {
  border-color: var(--zh-blue);
  background: #fff1f0;
}

.group-name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-desc {
  color: var(--zh-text-3);
  font-size: 13px;
  margin-top: 4px;
}

.group-actions {
  margin-top: 6px;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 480px;
  overflow-y: auto;
}

.res-url {
  color: var(--zh-text-3);
  font-size: 12px;
  margin-left: 8px;
}
</style>
