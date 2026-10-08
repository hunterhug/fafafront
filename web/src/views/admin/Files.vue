<template>
  <el-card class="files-card">
    <template #header>
      <div class="fl-head">
        <div class="fl-left">
          <span>{{ t('admin.filesAllUsers') }}</span>
          <el-select v-model="statusFilter" size="small" style="width: 110px; margin-left: 12px" @change="load(1)">
            <el-option :label="t('common.all')" value="-1" />
            <el-option :label="t('admin.normal')" value="0" />
            <el-option :label="t('admin.hidden')" value="1" />
          </el-select>
        </div>
        <span class="fl-total">{{ t('admin.totalFiles', { n: total }) }}</span>
      </div>
    </template>

    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else>
      <el-empty v-if="files.length === 0" :description="t('file.noFiles')" :image-size="60" />
      <el-table v-else :data="files" size="small">
        <el-table-column :label="t('admin.preview')" width="90">
          <template #default="{ row }">
            <el-image
              v-if="row.is_picture"
              :src="row.url"
              fit="cover"
              style="width: 56px; height: 40px; border-radius: 4px"
              :preview-src-list="[row.url]"
              preview-teleported
            />
            <span v-else>{{ t('admin.file') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="URL" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" :href="row.url" target="_blank">{{ row.url }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="user_name" :label="t('admin.uploader')" width="100" />
        <el-table-column prop="type" :label="t('admin.type')" width="80" />
        <el-table-column prop="tag" :label="t('file.tag')" width="90" />
        <el-table-column prop="describe" :label="t('file.description')" min-width="120" />
        <el-table-column :label="t('file.size')" width="90">
          <template #default="{ row }">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.status')" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="success" size="small">{{ t('admin.normal') }}</el-tag>
            <el-tag v-else type="danger" size="small">{{ t('admin.hidden') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.uploadTime')" width="150">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.operation')" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="copyUrl(row)">{{ t('admin.copyUrl') }}</el-button>
            <el-button size="small" @click="editDescribe(row)">{{ t('admin.editDesc') }}</el-button>
            <el-button size="small" :type="row.status === 0 ? 'danger' : 'success'" @click="toggleHide(row)">
              {{ row.status === 0 ? t('admin.hidden') : t('file.restore') }}
            </el-button>
          </template>
        </el-table-column>
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
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'

const loading = ref(true)
const files = ref([])
const page = ref(1)
const limit = 10
const total = ref(0)
const totalPages = ref(0)
const statusFilter = ref('-1')

async function load(p = 1) {
  loading.value = true
  page.value = p
  try {
    const res = await request.post('/api/file/admin/list', {
      store_type: -1,
      status: Number(statusFilter.value),
      type: '',
      tag: '',
      is_picture: -1,
      create_time_begin: 0,
      create_time_end: 0,
      sort: ['=id', '-create_time', '-update_time', '=user_id', '=type', '=tag', '=store_type', '=status', '=size'],
      limit,
      page: p
    })
    files.value = res.data.files || []
    total.value = res.data.total || 0
    totalPages.value = res.data.total_pages || 0
  } catch (e) {
    files.value = []
  } finally {
    loading.value = false
  }
}

function copyUrl(row) {
  navigator.clipboard?.writeText(row.url)
  ElMessage.success(t('admin.copyUrlSuccess'))
}

async function editDescribe(row) {
  try {
    const { value } = await ElMessageBox.prompt(t('admin.editFileDesc'), t('common.edit'), { inputValue: row.describe || '' })
    await request.post('/api/file/admin/update', { id: row.id, describe: value || '' })
    ElMessage.success(t('admin.updated'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

async function toggleHide(row) {
  const hide = row.status === 0
  try {
    await request.post('/api/file/admin/update', { id: row.id, hide })
    ElMessage.success(hide ? t('admin.hideDone') : t('admin.restoreDone'))
    load(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

function formatSize(size) {
  if (!size) return '0 B'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / 1024 / 1024).toFixed(1) + ' MB'
}

onMounted(() => load(1))
</script>

<style scoped>
.pager {
  margin-top: 16px;
  justify-content: center;
}

.fl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fl-left {
  display: flex;
  align-items: center;
}

.fl-total {
  font-size: 13px;
  color: var(--zh-text-3);
  font-weight: 400;
}
</style>
