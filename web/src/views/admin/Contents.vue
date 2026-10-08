<template>
  <el-card class="contents-card">
    <template #header>
      <div class="ct-head">
        <span>{{ t('admin.contentsTitle') }}</span>
        <span class="ct-total">{{ t('admin.contentsTotal', { total }) }}</span>
      </div>
    </template>

    <el-form inline size="small" class="filter-form">
      <el-form-item :label="t('admin.userName')">
        <el-input v-model="filter.user_name" :placeholder="t('admin.authorUserName')" clearable @keyup.enter="load(1)" />
      </el-form-item>
      <el-form-item :label="t('admin.status')">
        <el-select v-model="filter.status" style="width: 120px" @change="load(1)">
          <el-option :label="t('common.all')" :value="-1" />
          <el-option :label="t('admin.normal')" :value="0" />
          <el-option :label="t('admin.hidden')" :value="1" />
          <el-option :label="t('admin.banned')" :value="2" />
          <el-option :label="t('admin.rubbish')" :value="3" />
          <el-option :label="t('admin.deleted')" :value="4" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load(1)">{{ t('common.query') }}</el-button>
      </el-form-item>
    </el-form>

    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else>
      <el-table :data="contents" size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column :label="t('admin.contentTitle')" min-width="200">
          <template #default="{ row }">
            {{ row.pre_title || row.title }}
            <el-tag v-if="row.top === 1" size="small" type="danger" style="margin-left: 4px">{{ t('article.top') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="user_name" :label="t('admin.author')" width="110" />
        <el-table-column :label="t('admin.status')" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="success" size="small">{{ t('admin.normal') }}</el-tag>
            <el-tag v-else-if="row.status === 1" type="warning" size="small">{{ t('admin.hidden') }}</el-tag>
            <el-tag v-else-if="row.status === 2" type="danger" size="small">{{ t('admin.banned') }}</el-tag>
            <el-tag v-else-if="row.status === 3" type="info" size="small">{{ t('admin.rubbish') }}</el-tag>
            <el-tag v-else-if="row.status === 4" type="info" size="small">{{ t('admin.deleted') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.publish')" width="90">
          <template #default="{ row }">
            <span v-if="row.version > 0">v{{ row.version }}</span>
            <span v-else style="color: var(--zh-text-3)">{{ t('admin.unpublished') }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.viewsLikesComments')" width="110">
          <template #default="{ row }">{{ row.views }} / {{ row.cool }} / {{ row.comment_num }}</template>
        </el-table-column>
        <el-table-column :label="t('article.report')" width="70" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.bad > 0 ? '#ff665e' : 'var(--zh-text-3)' }">{{ row.bad || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.publishTime')" width="150">
          <template #default="{ row }">{{ formatTime(row.first_publish_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.operation')" width="320" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 2"
              size="small"
              type="success"
              plain
              @click="setStatus(row, 0)"
            >{{ t('admin.unban') }}</el-button>
            <el-button v-else size="small" type="danger" plain @click="setStatus(row, 2)">{{ t('admin.ban') }}</el-button>
            <el-button size="small" @click="viewBody(row)">{{ t('admin.viewContent') }}</el-button>
            <el-button size="small" @click="viewHistory(row)">{{ t('admin.history') }}</el-button>
            <el-button size="small" @click="openFront(row)">{{ t('admin.viewFront') }}</el-button>
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

    <!-- 正文查看弹窗 -->
    <el-dialog v-model="bodyDialog" :title="t('admin.articleBody')" width="720px" top="6vh">
      <div v-if="bodyLoading" style="padding: 30px 0; text-align: center; color: var(--zh-text-3)">{{ t('common.loading') }}</div>
      <template v-else-if="bodyData">
        <h3 style="margin: 0 0 10px">{{ bodyData.title || bodyData.pre_title }}</h3>
        <div class="body-meta">
          <span>{{ t('admin.authorLabel') }}{{ bodyData.user_name }}</span>
          <span v-if="bodyData.status === 2" style="color: #ff665e">{{ t('admin.bannedMark') }}</span>
          <span v-else-if="bodyData.status === 1" style="color: #e6a23c">{{ t('admin.hiddenMark') }}</span>
          <span v-if="bodyData.close_comment === 1" style="color: var(--zh-text-3)">{{ t('admin.commentClosedMark') }}</span>
        </div>
        <div style="max-height: 60vh; overflow-y: auto; border: 1px solid #f5f0ed; border-radius: 6px; padding: 14px">
          <MdPreview
            :model-value="bodyData.pre_describe || bodyData.describe || ''"
            :editor-id="'admin-body-' + bodyData.id"
          />
        </div>
      </template>
      <el-empty v-else :description="t('admin.noContent')" />
    </el-dialog>

    <!-- 历史版本弹窗 -->
    <el-dialog v-model="historyDialog" :title="t('article.historyVersions')" width="760px" top="6vh">
      <div v-if="historyLoading" style="padding: 30px 0; text-align: center; color: var(--zh-text-3)">{{ t('common.loading') }}</div>
      <template v-else-if="historyList.length > 0">
        <el-table :data="historyList" size="small" @row-click="viewHistoryVersion">
          <el-table-column :label="t('admin.version')" width="80">
            <template #default="{ row }">v{{ row.version }}</template>
          </el-table-column>
          <el-table-column :label="t('admin.type')" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.types === 1" type="success" size="small">{{ t('admin.publish') }}</el-tag>
              <el-tag v-else-if="row.types === 2" type="warning" size="small">{{ t('article.restore') }}</el-tag>
              <el-tag v-else type="info" size="small">{{ t('common.save') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" :label="t('admin.contentTitle')" min-width="180" show-overflow-tooltip />
          <el-table-column :label="t('admin.time')" width="160">
            <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
          </el-table-column>
          <el-table-column :label="t('admin.operation')" width="100">
            <template #default="{ row }">
              <el-button size="small" type="danger" text @click="deleteHistory(row)">{{ t('common.delete') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="historyTotalPages > 1"
          small
          class="pager"
          layout="total, prev, pager, next"
          :total="historyTotal"
          :page-size="10"
          :current-page="historyPage"
          @current-change="loadHistory"
        />
      </template>
      <el-empty v-else :description="t('admin.noHistory')" />

      <!-- 版本正文 -->
      <el-dialog v-model="versionDialog" :title="t('admin.historyContent')" width="720px" append-to-body>
        <div v-if="versionData" style="max-height: 60vh; overflow-y: auto; border: 1px solid #f5f0ed; border-radius: 6px; padding: 14px">
          <h3 style="margin-top: 0">{{ versionData.title }}</h3>
          <MdPreview
            :model-value="versionData.describe || ''"
            :editor-id="'admin-ver-' + versionData.id"
          />
        </div>
      </el-dialog>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MdPreview } from 'md-editor-v3'
import request from '@/api'
import { contentUrl, resolveContentUrlById } from '@/utils/url'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'

const loading = ref(true)
const contents = ref([])
const page = ref(1)
const limit = 10
const total = ref(0)
const totalPages = ref(0)
const filter = reactive({ user_name: '', status: -1 })
// 正文查看弹窗
const bodyDialog = ref(false)
const bodyLoading = ref(false)
const bodyData = ref(null)
// 历史版本弹窗
const historyDialog = ref(false)
const historyLoading = ref(false)
const historyList = ref([])
const historyPage = ref(1)
const historyTotal = ref(0)
const historyTotalPages = ref(0)
const historyContentId = ref(0)
const versionDialog = ref(false)
const versionData = ref(null)


// 「查看前台」：按 id 解析成 SEO 地址再跳转（地址栏不出现 id）
async function openFront(row) {
  // 列表行里已带 user_name / node_seo / seo，直接拼；缺失时再按 id 解析
  const url = contentUrl(row) || (await resolveContentUrlById(request, row.id))
  if (url) window.open(url, '_blank')
  else ElMessage.warning(t('admin.contentNoUrl'))
}

async function load(p = 1) {
  loading.value = true
  page.value = p
  try {
    const res = await request.post('/api/content/admin/list', {
      user_id: 0,
      user_name: filter.user_name,
      id: 0,
      seo: '',
      node_id: 0,
      node_seo: '',
      top: -1,
      status: filter.status,
      password_type: -1,
      close_comment: -1,
      publish_type: -1,
      create_time_begin: 0,
      create_time_end: 0,
      update_time_begin: 0,
      update_time_end: 0,
      publish_time_begin: 0,
      publish_time_end: 0,
      first_publish_time_begin: 0,
      first_publish_time_end: 0,
      sort: [
        '=id', '-user_id', '-top', '+sort_num', '-first_publish_time',
        '-publish_time', '-create_time', '-update_time', '-views',
        '=comment_num', '=bad', '=cool', '=version', '+status', '=seo'
      ],
      limit,
      page: p
    })
    contents.value = res.data.contents || []
    total.value = res.data.total || 0
    totalPages.value = res.data.total_pages || 0
  } catch (e) {
    contents.value = []
  } finally {
    loading.value = false
  }
}

async function setStatus(row, status) {
  try {
    await ElMessageBox.confirm(
      status === 2 ? t('admin.confirmBanContent', { title: row.pre_title || row.title }) : t('admin.confirmUnbanContent'),
      t('common.confirm'),
      { type: 'warning' }
    )
    await request.post('/api/content/admin/update/status', { id: row.id, status })
    ElMessage.success(status === 2 ? t('admin.bannedDone') : t('admin.unbannedDone'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

// 查看正文（管理员可看被删/隐藏的文章内容）
async function viewBody(row) {
  bodyDialog.value = true
  bodyLoading.value = true
  bodyData.value = null
  try {
    const res = await request.post('/api/content/admin/take', { id: row.id })
    bodyData.value = res.data
  } catch (e) {
    ElMessage.error(e.msg || t('admin.getBodyFailed'))
  } finally {
    bodyLoading.value = false
  }
}

// 历史版本
async function viewHistory(row) {
  historyContentId.value = row.id
  historyDialog.value = true
  loadHistory(1)
}

async function loadHistory(p = 1) {
  historyLoading.value = true
  historyPage.value = p
  try {
    const res = await request.post('/api/content/history/admin/list', {
      content_id: historyContentId.value,
      types: -1,
      create_time_begin: 0,
      create_time_end: 0,
      sort: ['=id', '=user_id', '-create_time', '-content_id'],
      limit: 10,
      page: p
    })
    historyList.value = res.data.contents || []
    historyTotal.value = res.data.total || 0
    historyTotalPages.value = res.data.total_pages || 0
  } catch (e) {
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

// 查看某个历史版本内容
async function viewHistoryVersion(row) {
  try {
    const res = await request.post('/api/content/history/admin/take', { id: row.id })
    versionData.value = res.data
    versionDialog.value = true
  } catch (e) {
    ElMessage.error(e.msg || t('admin.getVersionFailed'))
  }
}

// 真删除历史版本
async function deleteHistory(row) {
  try {
    await ElMessageBox.confirm(t('admin.deleteHistoryConfirm', { version: row.version }), t('common.confirm'), { type: 'warning' })
    await request.post('/api/content/history/delete', { id: row.id })
    ElMessage.success(t('common.deleted'))
    loadHistory(historyPage.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.deleteFailed'))
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.ct-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ct-total {
  font-size: 13px;
  color: var(--zh-text-3);
  font-weight: 400;
}

.filter-form {
  margin-bottom: 8px;
}

.body-meta {
  display: flex;
  gap: 16px;
  color: var(--zh-text-3);
  font-size: 13px;
  margin-bottom: 10px;
}

.pager {
  margin-top: 16px;
  justify-content: center;
}
</style>
