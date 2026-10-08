<template>
  <div class="files-page">
    <!-- 头部：标题 + 统计 + 上传 -->
    <div class="zh-card files-head">
      <div class="fh-left">
        <div class="fh-title">{{ t('files.title') }}</div>
        <div class="fh-stats">
          <span>{{ t('files.total', { n: total }) }}</span>
          <span>{{ t('files.images') }} <b>{{ statImg }}</b></span>
          <span>{{ t('files.files') }} <b>{{ statFile }}</b></span>
        </div>
      </div>
      <el-button type="primary" round :icon="UploadFilled" @click="uploadDialog = true">
        {{ t('files.uploadFile') }}
      </el-button>
    </div>

    <!-- 类型筛选 -->
    <div class="files-tabs">
      <span class="files-tab" :class="{ active: typeFilter === '' }" @click="switchType('')">{{ t('files.all') }}</span>
      <span class="files-tab" :class="{ active: typeFilter === 'image' }" @click="switchType('image')">{{ t('files.images') }}</span>
      <span class="files-tab" :class="{ active: typeFilter === 'file' }" @click="switchType('file')">{{ t('files.files') }}</span>
    </div>

    <!-- 标签筛选（按标签分类） -->
    <div v-if="tagOptions.length > 0" class="files-tags">
      <span class="files-tag" :class="{ active: tagFilter === '' }" @click="switchTag('')">{{ t('files.allTags') }}</span>
      <span v-for="t in tagOptions" :key="t" class="files-tag" :class="{ active: tagFilter === t }" @click="switchTag(t)">{{ t }}</span>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else>
      <el-empty v-if="files.length === 0" :description="t('files.noFiles')" :image-size="70" />
      <div v-else class="files-grid">
        <div v-for="f in files" :key="f.id" class="file-card">
          <!-- 媒体区 -->
          <div class="fc-media" @click="preview(f)">
            <img v-if="f.is_picture" :src="thumbUrl(f.url)" :alt="f.file_name" loading="lazy" />
            <div v-else class="fc-icon">
              <el-icon :size="34"><Document /></el-icon>
            </div>
            <span class="fc-type">{{ typeLabel(f.type) }}</span>
          </div>
          <!-- 信息区 -->
          <div class="fc-info">
            <div class="fc-name" :title="f.file_name || f.url.split('/').pop()">
              {{ f.file_name || f.url.split('/').pop() }}
            </div>
            <div class="fc-meta">
              <span v-if="f.tag && f.tag !== 'other'" class="fc-tag">{{ f.tag }}</span>
              {{ formatSize(f.size) }} · {{ formatTime(f.create_time) }}
            </div>
            <div class="fc-desc">{{ f.describe || t('files.noDesc') }}</div>
          </div>
          <!-- 操作区 -->
          <div class="fc-actions">
            <button class="fc-btn" @click="copyUrl(f)">{{ t('files.copyLink') }}</button>
            <button class="fc-btn" @click="editDescribe(f)">{{ t('files.desc') }}</button>
            <button class="fc-btn" @click="preview(f)">{{ t('files.preview') }}</button>
            <button class="fc-btn fc-btn-danger" @click="removeFile(f)">{{ t('files.delete') }}</button>
          </div>
        </div>
      </div>
      <el-pagination
        v-if="totalPages > 1"
        class="pager"
        layout="prev, pager, next"
        :total="total"
        :page-size="limit"
        :current-page="page"
        @current-change="load"
      />
    </template>

    <!-- 上传弹窗 -->
    <el-dialog v-model="uploadDialog" :title="t('files.uploadFile')" width="420px">
      <el-form label-width="60px">
        <el-form-item :label="t('files.tag')">
          <el-input v-model="uploadForm.tag" :placeholder="t('files.tagHint')" />
        </el-form-item>
        <el-form-item :label="t('files.desc')">
          <el-input v-model="uploadForm.describe" :placeholder="t('files.descHint')" />
        </el-form-item>
        <el-form-item :label="t('files.file')">
          <el-upload
            drag
            :show-file-list="false"
            :http-request="doUpload"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.gz"
            style="width: 100%"
          >
            <div style="padding: 16px 0">
              <el-icon :size="30" style="color: var(--zh-blue)"><UploadFilled /></el-icon>
              <div style="font-size: 13px; color: var(--zh-text-2); margin-top: 6px">
                {{ t('files.uploadHint') }}
              </div>
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, UploadFilled } from '@element-plus/icons-vue'
import request from '@/api'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'

const loading = ref(true)
const files = ref([])
const page = ref(1)
const limit = 12
const total = ref(0)
const totalPages = ref(0)
const typeFilter = ref('')
const tagFilter = ref('')
const tagOptions = ref([])
const statImg = ref(0)
const statFile = ref(0)
const uploadDialog = ref(false)
const uploadForm = reactive({ tag: '', describe: '' })

// 根据扩展名自动识别文件类型（图片/文件/其他）
function detectType(fileName) {
  const ext = (fileName.split('.').pop() || '').toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image'
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', 'gz', 'bz2', 'htm', 'html'].includes(ext)) return 'file'
  return 'other'
}

async function load(p = 1) {
  loading.value = true
  page.value = p
  try {
    const res = await request.post('/api/file/list', {
      store_type: -1,
      status: 0,
      type: typeFilter.value,
      tag: tagFilter.value,
      is_picture: typeFilter.value === 'image' ? 1 : -1,
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

// 统计图片/文件数量
async function loadStats() {
  try {
    const [img, file] = await Promise.all([
      request.post('/api/file/list', { store_type: -1, status: 0, type: 'image', is_picture: 1, limit: 1, page: 1 }),
      request.post('/api/file/list', { store_type: -1, status: 0, type: 'file', is_picture: 0, limit: 1, page: 1 })
    ])
    statImg.value = img.data?.total || 0
    statFile.value = file.data?.total || 0
  } catch (e) {}
}

function switchType(t) {
  typeFilter.value = t
  load(1)
}

function switchTag(t) {
  tagFilter.value = t
  load(1)
}

// 拉取该用户文件的去重标签（用于标签分类）
async function loadTags() {
  try {
    const res = await request.post('/api/file/list', {
      store_type: -1,
      status: 0,
      type: '',
      tag: '',
      is_picture: -1,
      create_time_begin: 0,
      create_time_end: 0,
      sort: ['=id'],
      limit: 1000,
      page: 1
    })
    const set = new Set()
    for (const f of res.data?.files || []) {
      if (f.tag && f.tag !== 'other') set.add(f.tag)
    }
    tagOptions.value = [...set]
  } catch (e) {
    tagOptions.value = []
  }
}

async function doUpload({ file }) {
  const fd = new FormData()
  fd.append('type', detectType(file.name))
  fd.append('describe', uploadForm.describe)
  fd.append('tag', uploadForm.tag || 'other')
  fd.append('file', file)
  try {
    await request.post('/api/file/upload', fd)
    ElMessage.success(t('files.uploadSuccess'))
    uploadDialog.value = false
    uploadForm.tag = ''
    uploadForm.describe = ''
    load(1)
    loadStats()
  } catch (e) {
    ElMessage.error(e.msg || t('files.uploadFailed'))
  }
}

function copyUrl(row) {
  navigator.clipboard?.writeText(row.url)
  ElMessage.success(t('common.linkCopied'))
}

// 删除=软隐藏：仅从个人列表消失（status→1），管理后台可见可恢复；物理文件保留
async function removeFile(row) {
  try {
    await ElMessageBox.confirm(
      t('files.deleteConfirm', { name: row.file_name || row.url.split('/').pop() }),
      t('common.tip'),
      { type: 'warning', confirmButtonText: t('files.delete'), cancelButtonText: t('common.cancel') }
    )
  } catch (e) {
    return // 取消/关闭弹窗则不删除
  }
  try {
    await request.post('/api/file/update', { id: row.id, hide: true })
    ElMessage.success(t('files.deleteDone'))
    load(page.value)
    loadStats()
    loadTags()
  } catch (err) {
    ElMessage.error(err.msg || t('common.failed'))
  }
}

async function editDescribe(row) {
  try {
    const { value } = await ElMessageBox.prompt(t('files.editDescPrompt'), t('common.edit'), { inputValue: row.describe || '' })
    await request.post('/api/file/update', { id: row.id, describe: value || '' })
    ElMessage.success(t('common.updated'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

function preview(row) {
  if (row.is_picture) {
    window.open(row.url, '_blank')
  } else {
    copyUrl(row)
  }
}

function thumbUrl(url) {
  if (!url) return undefined
  return url.includes('/storage/') ? url.replace('/storage/', '/storage_x/') : url
}

function typeLabel(type) {
  if (type === 'image') return t('files.images')
  if (type === 'file') return t('files.files')
  return type || t('files.other')
}

function formatSize(size) {
  if (!size) return '0 B'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / 1024 / 1024).toFixed(1) + ' MB'
}

onMounted(() => {
  load(1)
  loadStats()
  loadTags()
})
</script>

<style scoped>
.files-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-bottom: 12px;
}

.fh-title {
  font-size: 18px;
  font-weight: 700;
}

.fh-stats {
  display: flex;
  gap: 16px;
  margin-top: 4px;
  color: var(--zh-text-3);
  font-size: 13px;
}

.fh-stats b {
  color: var(--zh-blue);
  font-size: 15px;
}

/* 类型筛选 */
.files-tabs {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
  padding: 0 4px;
}

.files-tab {
  font-size: 14px;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 6px 2px;
  border-bottom: 2px solid transparent;
}

.files-tab:hover {
  color: var(--zh-blue);
}

.files-tab.active {
  color: var(--zh-blue);
  font-weight: 600;
  border-bottom-color: var(--zh-blue);
}

/* 标签筛选（胶囊式） */
.files-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0 4px;
}

.files-tag {
  font-size: 12px;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 999px;
  background: #f5f0ed;
  transition: all 0.2s;
}

.files-tag:hover {
  color: var(--zh-blue);
}

.files-tag.active {
  background: var(--zh-blue);
  color: #fff;
  font-weight: 600;
}

/* 网格卡片 */
.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.file-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #f3eee9;
  transition: all 0.2s;
}

.file-card:hover {
  box-shadow: 0 6px 20px rgba(255, 95, 87, 0.08);
  transform: translateY(-2px);
}

.fc-media {
  position: relative;
  height: 120px;
  background: #faf8f6;
  cursor: pointer;
  overflow: hidden;
}

.fc-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s;
}

.fc-media:hover img {
  transform: scale(1.05);
}

.fc-icon {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c9c2bc;
}

.fc-type {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 11px;
}

.fc-info {
  padding: 10px 12px 4px;
}

.fc-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--zh-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fc-meta {
  color: var(--zh-text-3);
  font-size: 11px;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fc-tag {
  padding: 0 6px;
  border-radius: 4px;
  background: #fff1f0;
  color: var(--zh-blue);
  font-size: 11px;
  line-height: 18px;
  white-space: nowrap;
}

.fc-desc {
  color: var(--zh-text-2);
  font-size: 12px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fc-actions {
  display: flex;
  gap: 6px;
  padding: 6px 12px 12px;
}

.fc-btn {
  flex: 1;
  border: 1px solid #f0e9e3;
  background: #fff;
  color: var(--zh-text-2);
  font-size: 12px;
  border-radius: 6px;
  padding: 3px 0;
  cursor: pointer;
  transition: all 0.2s;
}

.fc-btn:hover {
  color: var(--zh-blue);
  border-color: var(--zh-blue);
  background: #fff3f1;
}

.fc-btn-danger {
  color: #e2554a;
}

.fc-btn-danger:hover {
  color: #fff !important;
  border-color: var(--zh-red, #e2554a) !important;
  background: #e2554a !important;
}

.pager {
  margin-top: 16px;
  justify-content: center;
}
</style>
