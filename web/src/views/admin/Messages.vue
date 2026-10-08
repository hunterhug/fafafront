<template>
  <el-card class="messages-card">
    <template #header>
      <el-tabs v-model="tab" class="msg-tabs" @tab-change="onTabChange">
        <el-tab-pane :label="t('admin.allMessages')" name="all" />
        <el-tab-pane :label="t('admin.globalNotice')" name="global" />
      </el-tabs>
      <el-button v-if="tab === 'global'" size="small" type="primary" style="float: right" @click="createDialog = true">
        {{ t('admin.publishNoticeBtn') }}
      </el-button>
    </template>

    <!-- 全部消息：类型/状态筛选 -->
    <el-form v-if="tab === 'all'" inline size="small" class="filter-form">
      <el-form-item :label="t('admin.type')">
        <el-select v-model="filter.message_type" style="width: 130px" @change="load(1)">
          <el-option :label="t('common.all')" :value="-1" />
          <el-option v-for="(name, t) in TYPE_NAMES" :key="t" :label="name" :value="Number(t)" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('admin.status')">
        <el-select v-model="filter.receive_status" style="width: 110px" @change="load(1)">
          <el-option :label="t('common.all')" :value="-1" />
          <el-option :label="t('admin.unread')" :value="0" />
          <el-option :label="t('admin.read')" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load(1)">{{ t('common.search') }}</el-button>
      </el-form-item>
    </el-form>

    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else>
      <el-empty v-if="list.length === 0" :description="t('common.noData')" :image-size="60" />
      <el-table v-else :data="list" size="small">
        <!-- 全部消息 -->
        <template v-if="tab === 'all'">
          <el-table-column :label="t('admin.type')" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="typeTag(row.message_type)">{{ typeName(row.message_type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('admin.content')" min-width="260">
            <template #default="{ row }">
              <div class="msg-body">
                <el-tag v-if="row.comment_id && extraComments[row.comment_id]?.is_delete" size="small" type="danger" class="msg-del-tag">
                  {{ t('admin.commentDeleted') }}
                </el-tag>
                <span v-if="row.message_type === 10" class="msg-text" v-html="renderTextContent(row.send_message)"></span>
                <span v-else-if="row.comment_describe" class="msg-text" v-html="renderCommentContent(row.comment_describe)"></span>
                <span v-else class="msg-text" v-html="renderTextContent(row.send_message || t('admin.systemMessage'))"></span>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="t('admin.sender')" width="120">
            <template #default="{ row }">{{ senderName(row) }}</template>
          </el-table-column>
          <el-table-column :label="t('admin.receiver')" width="120">
            <template #default="{ row }">{{ receiverName(row) }}</template>
          </el-table-column>
          <el-table-column :label="t('admin.status')" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.receive_status === 0" type="warning" size="small">{{ t('admin.unread') }}</el-tag>
              <el-tag v-else type="info" size="small">{{ t('admin.read') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('admin.time')" width="160">
            <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
          </el-table-column>
        </template>
        <!-- 全局站内信 -->
        <template v-else>
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column :label="t('admin.noticeContent')" min-width="260">
            <template #default="{ row }">
              <span class="msg-text" v-html="renderTextContent(row.send_message)"></span>
            </template>
          </el-table-column>
          <el-table-column :label="t('admin.status')" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.status === 1" type="success" size="small">{{ t('admin.published') }}</el-tag>
              <el-tag v-else-if="row.status === 2" type="info" size="small">{{ t('common.deleted') }}</el-tag>
              <el-tag v-else type="warning" size="small">{{ t('admin.pending') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="total" :label="t('admin.targetCount')" width="90" />
          <el-table-column prop="success" :label="t('admin.success')" width="80" />
          <el-table-column :label="t('admin.time')" width="160">
            <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
          </el-table-column>
          <el-table-column :label="t('admin.operation')" width="180">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 0"
                size="small"
                type="success"
                plain
                @click="setStatus(row, 1)"
              >{{ t('admin.publish') }}</el-button>
              <el-button v-else-if="row.status === 1" size="small" type="danger" plain @click="setStatus(row, 2)">
                {{ t('common.delete') }}
              </el-button>
            </template>
          </el-table-column>
        </template>
      </el-table>
      <el-pagination
        v-if="totalPages > 1"
        class="pager"
        layout="total, prev, pager, next"
        :total="total"
        :page-size="limit"
        :current-page="page"
        @current-change="load"
      />
    </template>

    <!-- 发布通知 -->
    <el-dialog v-model="createDialog" :title="t('admin.publishNotice')" width="480px">
      <el-alert type="info" :closable="false" show-icon :title="t('admin.noticeRecordHint')" style="margin-bottom: 12px" />
      <el-form label-width="90px">
        <el-form-item :label="t('admin.noticeContent')">
          <el-input v-model="createForm.message" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item :label="t('admin.sendScope')">
          <el-radio-group v-model="createForm.all_people">
            <el-radio :value="true">{{ t('admin.allUsers') }}</el-radio>
            <el-radio :value="false">{{ t('admin.specificUsers') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!createForm.all_people" :label="t('admin.specificUsers')">
          <el-select
            v-model="selectedUserIds"
            multiple
            filterable
            remote
            reserve-keyword
            :remote-method="searchUsers"
            :loading="searchingUsers"
            :placeholder="t('admin.searchUserHint')"
            style="width: 100%"
          >
            <el-option
              v-for="u in searchUserOptions"
              :key="u.id"
              :label="`${u.nick_name || u.name}（${u.name}）`"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('admin.sendNow')">
          <el-switch v-model="createForm.right_now" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="create">{{ t('admin.publish') }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'
import { renderCommentContent, renderTextContent } from '@/utils/renderContent'
import { hasPerm } from '@/utils/adminPerms'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const perm = () => userStore.adminPerm
const has = (u) => userStore.isAdmin || hasPerm(perm(), u)

const tab = ref('all') // 初始由 onMounted 按权限校正
const loading = ref(true)
const list = ref([])
const page = ref(1)
const limit = 10
const total = ref(0)
const totalPages = ref(0)
const extraUsers = ref({})
const extraComments = ref({})
const filter = reactive({ message_type: -1, receive_status: -1 })

const createDialog = ref(false)
const creating = ref(false)
const createForm = reactive({
  message: '',
  all_people: true,
  right_now: true
})

// 指定用户：远程搜索多选（按用户名/昵称）
const selectedUserIds = ref([])
const searchUserOptions = ref([])
const searchingUsers = ref(false)

async function searchUsers(q) {
  if (!q) {
    searchUserOptions.value = []
    return
  }
  searchingUsers.value = true
  try {
    // name / nick_name 后端分别是模糊匹配，这里两个维度各查一次再合并去重
    const base = { id: 0, name: '', nick_name: '', status: -1, vip: -1, gender: -1, limit: 20, page: 1, sort: ['=id'] }
    const [r1, r2] = await Promise.all([
      request.post('/api/user/list', { ...base, name: q }),
      request.post('/api/user/list', { ...base, nick_name: q })
    ])
    const map = new Map()
    for (const r of [r1, r2]) {
      for (const u of r.data?.users || []) map.set(u.id, u)
    }
    searchUserOptions.value = Array.from(map.values()).slice(0, 20)
  } catch (e) {
    searchUserOptions.value = []
  } finally {
    searchingUsers.value = false
  }
}

const TYPE_NAMES = {
  0: t('msg.typeCommentContent'), 1: t('msg.typeCommentComment'), 2: t('msg.typeLikeContent'), 3: t('msg.typeLikeComment'),
  4: t('msg.typeBanContent'), 5: t('msg.typeBanComment'), 6: t('msg.typeRecoverContent'), 7: t('msg.typeRecoverComment'),
  8: t('msg.typeFollow'), 9: t('msg.typePublish'), 10: t('msg.typePrivate'), 11: t('msg.typeGlobal')
}

function typeName(t) {
  return TYPE_NAMES[t] || t('msg.catSystem')
}

function typeTag(t) {
  if (t === 10) return 'primary'
  if (t === 11) return 'success'
  if (t === 8) return 'warning'
  return 'info'
}

function nameOf(id) {
  if (!id) return '—'
  const u = extraUsers.value[id]
  return u ? u.nick_name || u.name : `用户 ${id}`
}

function senderName(row) {
  if (row.message_type === 11) return t('msg.catSystem')
  return nameOf(row.send_user_id || row.user_id)
}

function receiverName(row) {
  return nameOf(row.receive_user_id)
}

function onTabChange() {
  load(1)
}

async function load(p = 1) {
  loading.value = true
  page.value = p
  try {
    let res
    if (tab.value === 'all') {
      res = await request.post('/api/message/admin/list', {
        message_type: filter.message_type,
        receive_status: filter.receive_status,
        chanel_user_id: 0,
        limit,
        page: p,
        sort: ['=id', '-create_time', '=receive_status', '=send_status', '=message_type', '=send_user_id', '=receive_user_id']
      })
      list.value = res.data.messages || []
      extraUsers.value = res.data.extra_users || {}
      extraComments.value = res.data.extra_comments || {}
    } else {
      res = await request.post('/api/message/admin/global/list', {
        id: 0,
        status: -1,
        create_time_begin: 0,
        create_time_end: 0,
        sort: ['=id', '-create_time', 'status', '=total', '=success'],
        limit,
        page: p
      })
      list.value = res.data.global_messages || res.data.messages || res.data.message || []
    }
    total.value = res.data.total || 0
    totalPages.value = res.data.total_pages || 0
  } catch (e) {
    list.value = []
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!createForm.message.trim()) {
    ElMessage.warning(t('admin.enterNoticeContent'))
    return
  }
  if (!createForm.all_people && selectedUserIds.value.length === 0) {
    ElMessage.warning(t('admin.selectAtLeastOneUser'))
    return
  }
  creating.value = true
  try {
    const payload = {
      all_people: createForm.all_people,
      message: createForm.message,
      right_now: createForm.right_now
    }
    if (!createForm.all_people) {
      payload.user_ids = selectedUserIds.value
    }
    await request.post('/api/message/admin/global/create', payload)
    ElMessage.success(t('admin.noticeCreated'))
    createDialog.value = false
    // 还原默认：避免上次「指定用户/立即发送」残留导致下次误发
    createForm.message = ''
    createForm.all_people = true
    createForm.right_now = true
    selectedUserIds.value = []
    searchUserOptions.value = []
    load(1)
  } catch (e) {
    ElMessage.error(e.msg || t('admin.createFailed'))
  } finally {
    creating.value = false
  }
}

async function setStatus(row, status) {
  try {
    await request.post('/api/message/admin/global/update/status', { id: row.id, status })
    ElMessage.success(t('admin.updated'))
    load(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

onMounted(() => {
  // 只授全局站内信(global)权限、无普通消息(admin/list)权限时，默认落全局 tab，避免一进来 100006
  if (!has('/v1/message/admin/list') && has('/v1/message/admin/global/list')) {
    tab.value = 'global'
  }
  load(1)
})
</script>

<style scoped>
.msg-tabs {
  display: inline-block;
  vertical-align: middle;
}

.filter-form {
  margin-bottom: 8px;
}

.pager {
  margin-top: 16px;
  justify-content: center;
}

.msg-body {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.6;
}

.msg-del-tag {
  flex-shrink: 0;
  margin-top: 2px;
}

.msg-text {
  word-break: break-all;
  min-width: 0;
}
</style>
