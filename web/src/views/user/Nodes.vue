<template>
  <el-card class="nodes-card">
    <template #header>
      {{ t('nodes.title') }}
      <el-button
        size="small"
        type="primary"
        style="float: right"
        :disabled="userStore.isLogin && !userStore.isVip"
        @click="openCreate(0)"
      >{{ t('nodes.newRoot') }}</el-button>
    </template>

    <el-alert
      v-if="userStore.isLogin && !userStore.isVip"
      type="warning"
      :closable="false"
      show-icon
      :title="t('nodes.vipOnly')"
      style="margin-bottom: 12px"
    />
    <el-alert
      type="info"
      :closable="false"
      show-icon
      :title="t('nodes.tip')"
      style="margin-bottom: 12px"
    />

    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else>
      <el-empty v-if="nodes.length === 0" :description="t('nodes.noNodes')" :image-size="60" />
      <el-tree
        v-else
        :data="nodes"
        node-key="id"
        default-expand-all
        draggable
        :expand-on-click-node="false"
        @node-drop="onDrop"
      >
        <template #default="{ data }">
          <div class="node-row">
            <span class="node-name">{{ data.name }}</span>
            <el-tag v-if="data.status === 1" size="small" type="warning">{{ t('admin.hidden') }}</el-tag>
            <span class="node-count">{{ t('nodes.articles', { n: data.content_num }) }}</span>
            <span class="node-actions">
              <el-button size="small" text type="primary" @click="openCreate(data.id)">{{ t('nodes.child') }}</el-button>
              <el-button size="small" text type="primary" @click="openEdit(data)">{{ t('common.edit') }}</el-button>
              <el-button size="small" text type="warning" @click="toggleStatus(data)">
                {{ data.status === 1 ? t('admin.show') : t('admin.hidden') }}
              </el-button>
              <el-button size="small" text type="danger" @click="remove(data)">{{ t('common.delete') }}</el-button>
            </span>
          </div>
        </template>
      </el-tree>
    </template>

    <!-- 创建/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="editId ? t('nodes.editNode') : t('nodes.createNode')" width="480px">
      <el-form ref="nodeForm" :model="nodeForm" :rules="nodeRules" label-width="90px">
        <el-form-item :label="t('nodes.nodeName')" prop="name">
          <el-input v-model="nodeForm.name" />
        </el-form-item>
        <el-form-item prop="seo">
          <template #label>
            <span>{{ t('nodes.seo') }}
              <el-tooltip placement="top" :content="t('nodes.seoTip')" raw-content>
                <span class="prop-help">?</span>
              </el-tooltip>
            </span>
          </template>
          <el-input v-model="nodeForm.seo" :placeholder="t('nodes.unique')" />
        </el-form-item>
        <el-form-item :label="t('nodes.desc')">
          <el-input v-model="nodeForm.describe" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item :label="t('nodes.bgImage')">
          <el-upload :show-file-list="false" :http-request="uploadImage" accept="image/*">
            <el-button plain size="small">{{ t('nodes.uploadImage') }}</el-button>
          </el-upload>
          <el-image
            v-if="nodeForm.image_path"
            :src="nodeForm.image_path"
            fit="cover"
            style="width: 120px; height: 60px; border-radius: var(--zh-radius); margin-top: 8px"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="saveNode">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api'
import { genSeo } from '@/utils/seo'
import { useUserStore } from '@/store/user'
import { t } from '@/i18n'

const userStore = useUserStore()
const loading = ref(true)
const nodes = ref([])
const dialogVisible = ref(false)
const saving = ref(false)
const editId = ref(0)
const parentId = ref(0)
const nodeFormRef = ref(null)

const nodeForm = reactive({
  name: '',
  seo: '',
  describe: '',
  image_path: ''
})

const nodeRules = {
  name: [{ required: true, message: t('nodes.enterName'), trigger: 'blur' }],
  // SEO 选填：留空由后端自动生成；有输入才校验格式
  seo: [
    {
      validator: (rule, value, cb) => {
        const v = String(value || '').trim()
        if (!v || /^[A-Za-z0-9\u4e00-\u9fa5]+$/.test(v)) cb()
        else cb(new Error(t('nodes.seoInvalid')))
      },
      trigger: 'blur'
    }
  ]
}

async function load() {
  loading.value = true
  try {
    const res = await request.post('/api/node/list', {
      sort: ['=id', '+sort_num', '-create_time', '-update_time', '+status', '=seo']
    })
    nodes.value = res.data.nodes || []
  } catch (e) {
    nodes.value = []
  } finally {
    loading.value = false
  }
}

function openCreate(parentNodeId) {
  editId.value = 0
  parentId.value = parentNodeId
  nodeForm.name = ''
  // 新建节点：SEO 预填随机短码（可见、可改；留空保存时后端也会兜底生成）
  nodeForm.seo = genSeo()
  nodeForm.describe = ''
  nodeForm.image_path = ''
  dialogVisible.value = true
}

function openEdit(data) {
  editId.value = data.id
  parentId.value = data.parent_node_id || 0
  nodeForm.name = data.name
  nodeForm.seo = data.seo
  nodeForm.describe = data.describe
  nodeForm.image_path = data.image_path
  dialogVisible.value = true
}

async function uploadImage({ file }) {
  const fd = new FormData()
  fd.append('type', 'image')
  fd.append('describe', 'node image')
  fd.append('tag', 'node')
  fd.append('file', file)
  try {
    const res = await request.post('/api/file/upload', fd)
    const path = res.data?.url || res.data?.path || res.data?.file_path || ''
    if (path) {
      nodeForm.image_path = path
      ElMessage.success(t('nodes.imgUploaded'))
    }
  } catch (e) {
    ElMessage.error(e.msg || t('nodes.uploadFailed'))
  }
}

function saveNode() {
  nodeFormRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      if (editId.value) {
        await request.post('/api/node/update/info', {
          id: editId.value,
          name: nodeForm.name,
          describe: nodeForm.describe
        })
        await request.post('/api/node/update/seo', { id: editId.value, seo: nodeForm.seo })
        if (nodeForm.image_path) {
          await request.post('/api/node/update/image', { id: editId.value, image_path: nodeForm.image_path })
        }
      } else {
        await request.post('/api/node/create', {
          seo: nodeForm.seo,
          name: nodeForm.name,
          describe: nodeForm.describe,
          parent_node_id: parentId.value,
          image_path: nodeForm.image_path
        })
      }
      ElMessage.success(t('nodes.saveSuccess'))
      dialogVisible.value = false
      load()
    } catch (e) {
      const map = {
        101000: t('nodes.seoUsed'),
        99996: t('nodes.vipCreateOnly'),
        100010: t('nodes.seoInvalid')
      }
      ElMessage.error(map[e.id] || e.msg || t('nodes.saveFailed'))
    } finally {
      saving.value = false
    }
  })
}

async function toggleStatus(data) {
  try {
    const status = data.status === 1 ? 0 : 1
    await request.post('/api/node/update/status', { id: data.id, status })
    ElMessage.success(status === 1 ? t('nodes.hiddenDone') : t('nodes.shownDone'))
    load()
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

async function remove(data) {
  try {
    await ElMessageBox.confirm(t('nodes.deleteConfirm', { name: data.name }), t('common.tip'), { type: 'warning' })
    await request.post('/api/node/delete', { id: data.id })
    ElMessage.success(t('common.deleted'))
    load()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.deleteFailed'))
  }
}

// 拖拽排序/移动
async function onDrop(dragging, drop, type) {
  try {
    if (type === 'inner') {
      // 拖进某节点成为子节点
      await request.post('/api/node/update/parent', {
        id: dragging.data.id,
        to_be_root: false,
        parent_node_id: drop.data.id
      })
    } else if (type === 'before' && drop.data.level === 0) {
      // 拖到顶层节点之前 → 成为顶层
      await request.post('/api/node/update/parent', {
        id: dragging.data.id,
        to_be_root: true,
        parent_node_id: 0
      })
      await request.post('/api/node/sort', { xid: dragging.data.id, yid: drop.data.id })
    } else {
      // 拖到某节点后面（成为其弟弟）
      await request.post('/api/node/sort', { xid: dragging.data.id, yid: drop.data.id })
    }
    ElMessage.success(t('nodes.sortSaved'))
    load()
  } catch (e) {
    ElMessage.error(e.msg || t('nodes.sortFailed'))
    load()
  }
}

onMounted(load)
</script>

<style scoped>
.node-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 8px;
}

.node-name {
  font-size: 14px;
  font-weight: 500;
}

.node-count {
  color: var(--zh-text-3);
  font-size: 12px;
}

.node-actions {
  margin-left: auto;
}

.node-hidden-tag {
  font-size: 12px;
  color: var(--zh-orange, #e6a23c);
  border: 1px solid currentColor;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 16px;
  margin-left: 6px;
}

.prop-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: 11px;
  line-height: 1;
  cursor: help;
  opacity: 0.6;
  margin-left: 4px;
  vertical-align: 1px;
}
</style>
