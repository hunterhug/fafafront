<template>
  <el-card class="friends-card">
    <template #header>
      <div class="head">
        <span>{{ t('admin.friends') }}</span>
        <el-button size="small" type="primary" @click="openCreate">{{ t('admin.newLink') }}</el-button>
      </div>
    </template>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      :title="t('admin.friendLinkTip')"
      style="margin-bottom: 12px"
    />

    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else>
      <el-empty v-if="links.length === 0" :description="t('admin.noFriendLinks')" :image-size="60" />
      <el-table v-else :data="links" size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" :label="t('admin.name')" min-width="120" />
        <el-table-column :label="t('admin.link')" min-width="200">
          <template #default="{ row }">
            <a :href="row.url" target="_blank" rel="noopener">{{ row.url }}</a>
          </template>
        </el-table-column>
        <el-table-column prop="sort_num" :label="t('admin.sort')" width="70" />
        <el-table-column :label="t('admin.hidden')" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.hide === 1" type="info" size="small">{{ t('admin.hideDone') }}</el-tag>
            <el-tag v-else type="success" size="small">{{ t('admin.show') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.newWindow')" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.open_new === 1" type="primary" size="small">{{ t('common.yes') }}</el-tag>
            <el-tag v-else type="info" size="small">{{ t('common.no') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.operation')" width="220" fixed="right">
          <template #default="{ row, $index }">
            <el-button size="small" text :disabled="$index === 0" @click="move(row, -1)">{{ t('admin.moveUp') }}</el-button>
            <el-button size="small" text :disabled="$index === links.length - 1" @click="move(row, 1)">{{ t('admin.moveDown') }}</el-button>
            <el-button size="small" text @click="toggleHide(row)">
              {{ row.hide === 1 ? t('admin.show') : t('admin.hidden') }}
            </el-button>
            <el-button size="small" text type="primary" @click="openEdit(row)">{{ t('common.edit') }}</el-button>
            <el-button size="small" text type="danger" @click="remove(row)">{{ t('common.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- 新建/编辑 -->
    <el-dialog v-model="dialogVisible" :title="editId ? t('admin.editFriendLink') : t('admin.newFriendLink')" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item :label="t('admin.name')" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="t('admin.link')" prop="url">
          <el-input v-model="form.url" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item :label="t('admin.openNew')">
          <el-switch v-model="form.open_new" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item :label="t('admin.hidden')">
          <el-switch v-model="form.hide" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="save">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api'
import { useSiteStore } from '@/store/site'
import { t } from '@/i18n'

const site = useSiteStore()
const loading = ref(true)
const links = ref([])
const saving = ref(false)

const dialogVisible = ref(false)
const editId = ref(0)
const formRef = ref(null)
const form = reactive({ name: '', url: '', open_new: 1, hide: 0 })
const rules = {
  name: [{ required: true, message: t('auth.enterName'), trigger: 'blur' }],
  url: [{ required: true, message: t('auth.enterLink'), trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    const res = await request.post('/api/friend/list', { limit: 100, page: 1, sort: ['+sort_num', '=id'] })
    links.value = res.data?.friend_links || []
  } catch (e) {
    links.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editId.value = 0
  form.name = ''
  form.url = ''
  form.open_new = 1
  form.hide = 0
  dialogVisible.value = true
}

function openEdit(row) {
  editId.value = row.id
  form.name = row.name
  form.url = row.url
  form.open_new = row.open_new
  form.hide = row.hide
  dialogVisible.value = true
}

function save() {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      if (editId.value) {
        await request.post('/api/friend/update', {
          id: editId.value,
          name: form.name,
          url: form.url,
          open_new: form.open_new,
          hide: form.hide
        })
      } else {
        await request.post('/api/friend/create', {
          name: form.name,
          url: form.url,
          open_new: form.open_new,
          hide: form.hide
        })
      }
      ElMessage.success(t('common.saved'))
      dialogVisible.value = false
      await load()
      site.load(true)
    } catch (e) {
      ElMessage.error(e.msg || t('admin.saveFailed'))
    } finally {
      saving.value = false
    }
  })
}

async function toggleHide(row) {
  try {
    await request.post('/api/friend/update', {
      id: row.id,
      name: row.name,
      url: row.url,
      open_new: row.open_new,
      hide: row.hide === 1 ? 0 : 1
    })
    ElMessage.success(t('admin.updated'))
    await load()
    site.load(true)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

async function move(row, dir) {
  const arr = links.value.slice()
  const i = arr.findIndex((x) => x.id === row.id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  links.value = arr
  try {
    await request.post('/api/friend/sort', { ids: arr.map((x) => x.id) })
    site.load(true)
  } catch (e) {
    ElMessage.error(e.msg || t('admin.sortFailed'))
    await load()
  }
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(t('admin.deleteFriendLinkConfirm', { name: row.name }), t('admin.tip'), { type: 'warning' })
    await request.post('/api/friend/delete', { id: row.id })
    ElMessage.success(t('common.deleted'))
    await load()
    site.load(true)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('admin.deleteFailed'))
  }
}

onMounted(load)
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
