<template>
  <el-card class="reports-card">
    <template #header>
      <div class="rp-head">
        <span>{{ t('admin.reports') }}</span>
        <div class="rp-tabs">
          <span class="rp-tab" :class="{ active: tab === 'content' }" @click="switchTab('content')">{{ t('admin.contentReports') }}</span>
          <span class="rp-tab" :class="{ active: tab === 'comment' }" @click="switchTab('comment')">{{ t('admin.commentReports') }}</span>
          <span class="rp-tab" :class="{ active: tab === 'user' }" @click="switchTab('user')">{{ t('admin.userReports') }}</span>
        </div>
        <span class="rp-total">{{ t('admin.totalItems', { n: total }) }}</span>
      </div>
    </template>

    <el-form inline size="small" class="filter-form">
      <el-form-item :label="t('admin.objectStatus')">
        <el-select v-model="statusFilter" style="width: 130px" @change="load(1)">
          <el-option :label="t('common.all')" :value="-1" />
          <template v-if="tab === 'content'">
            <el-option :label="t('admin.normal')" :value="0" />
            <el-option :label="t('admin.hidden')" :value="1" />
            <el-option :label="t('admin.banned')" :value="2" />
            <el-option :label="t('admin.rubbish')" :value="3" />
          </template>
          <template v-else-if="tab === 'comment'">
            <el-option :label="t('admin.normal')" :value="0" />
            <el-option :label="t('admin.banned')" :value="1" />
          </template>
          <template v-else>
            <el-option :label="t('admin.notActivated')" :value="0" />
            <el-option :label="t('admin.normal')" :value="1" />
            <el-option :label="t('admin.blacklist')" :value="2" />
          </template>
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load(1)">{{ t('common.query') }}</el-button>
      </el-form-item>
    </el-form>

    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else>
      <el-empty v-if="rows.length === 0" :description="t('admin.noReports')" :image-size="60" />

      <!-- ===== 文章举报 ===== -->
      <el-table v-else-if="tab === 'content'" :data="rows" size="small">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column :label="t('admin.reportedContent')" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <a class="rp-link" href="#" @click.prevent="openFront(row.content_id)">{{ row.content_title || '#' + row.content_id }}</a>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.contentAuthor')" width="120">
          <template #default="{ row }">
            <router-link v-if="row.content_user_name" :to="`/u/${row.content_user_name}`" class="rp-link">{{ row.content_user_name }}</router-link>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.reporter')" width="120">
          <template #default="{ row }">
            <router-link v-if="row.user_name" :to="`/u/${row.user_name}`" class="rp-link">{{ row.user_nick || row.user_name }}</router-link>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" :label="t('admin.reason')" width="140" show-overflow-tooltip />
        <el-table-column :label="t('admin.time')" width="150">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.status')" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.content_status === 0" type="success" size="small">{{ t('admin.normal') }}</el-tag>
            <el-tag v-else-if="row.content_status === 1" type="warning" size="small">{{ t('admin.hidden') }}</el-tag>
            <el-tag v-else-if="row.content_status === 2" type="danger" size="small">{{ t('admin.banned') }}</el-tag>
            <el-tag v-else-if="row.content_status === 3" type="info" size="small">{{ t('admin.rubbish') }}</el-tag>
            <el-tag v-else type="info" size="small">{{ t('admin.deleted') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.operation')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.content_status === 2"
              size="small"
              type="success"
              plain
              @click="banContent(row, 0)"
            >{{ t('admin.unban') }}</el-button>
            <el-button v-else size="small" type="danger" plain @click="banContent(row, 2)">{{ t('admin.ban') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- ===== 评论举报 ===== -->
      <el-table v-else-if="tab === 'comment'" :data="rows" size="small">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column :label="t('admin.reportedComment')" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <a
              v-if="row.comment_is_delete"
              class="rp-link muted"
              href="#"
              @click.prevent="openFront(row.content_id, row.comment_id)"
            >{{ t('common.deleted') }}</a>
            <a v-else class="rp-link" href="#" @click.prevent="openFront(row.content_id, row.comment_id)">{{ row.comment_describe }}</a>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.commentAuthor')" width="120">
          <template #default="{ row }">
            <router-link v-if="row.comment_user_name" :to="`/u/${row.comment_user_name}`" class="rp-link">{{ row.comment_user_name }}</router-link>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.belongsToContent')" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <a v-if="row.content_id" class="rp-link" href="#" @click.prevent="openFront(row.content_id)">{{ row.content_title || '#' + row.content_id }}</a>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.reporter')" width="120">
          <template #default="{ row }">
            <router-link v-if="row.user_name" :to="`/u/${row.user_name}`" class="rp-link">{{ row.user_nick || row.user_name }}</router-link>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" :label="t('admin.reason')" width="140" show-overflow-tooltip />
        <el-table-column :label="t('admin.time')" width="150">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.status')" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.comment_is_delete" type="info" size="small">{{ t('common.deleted') }}</el-tag>
            <el-tag v-else-if="row.comment_status === 1" type="danger" size="small">{{ t('admin.banned') }}</el-tag>
            <el-tag v-else type="success" size="small">{{ t('admin.normal') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.operation')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.comment_is_delete"
              size="small"
              disabled
            >{{ t('common.deleted') }}</el-button>
            <el-button
              v-else-if="row.comment_status === 1"
              size="small"
              type="success"
              plain
              @click="banComment(row, 0)"
            >{{ t('admin.unban') }}</el-button>
            <el-button v-else size="small" type="danger" plain @click="banComment(row, 1)">{{ t('admin.banned') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- ===== 用户举报 ===== -->
      <el-table v-else :data="rows" size="small">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column :label="t('admin.reportedUser')" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <router-link v-if="row.bad_user_name" :to="`/u/${row.bad_user_name}`" class="rp-link">{{ row.bad_user_nick || row.bad_user_name }}</router-link>
            <span v-else>#{{ row.bad_user_id }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.reporter')" width="130">
          <template #default="{ row }">
            <router-link v-if="row.user_name" :to="`/u/${row.user_name}`" class="rp-link">{{ row.user_nick || row.user_name }}</router-link>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" :label="t('admin.reason')" width="140" show-overflow-tooltip />
        <el-table-column :label="t('admin.time')" width="150">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.status')" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.bad_user_status === 2" type="danger" size="small">{{ t('admin.blacklist') }}</el-tag>
            <el-tag v-else-if="row.bad_user_status === 1" type="success" size="small">{{ t('admin.normal') }}</el-tag>
            <el-tag v-else type="info" size="small">{{ t('admin.notActivated') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.operation')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.bad_user_status === 2"
              size="small"
              type="success"
              plain
              @click="banUser(row, 1)"
            >{{ t('admin.unblacklist') }}</el-button>
            <el-button v-else size="small" type="danger" plain @click="banUser(row, 2)">{{ t('admin.blacklist') }}</el-button>
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
import { resolveContentUrlById } from '@/utils/url'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'

const tab = ref('content')
const loading = ref(true)
const rows = ref([])
const page = ref(1)
const limit = 10
const total = ref(0)
const totalPages = ref(0)
const statusFilter = ref(-1)

function switchTab(t) {
  tab.value = t
  statusFilter.value = -1
  load(1)
}

async function load(p = 1) {
  loading.value = true
  page.value = p
  const api = tab.value === 'content' ? '/api/content/admin/bad/list' : tab.value === 'comment' ? '/api/comment/admin/bad/list' : '/api/user/admin/bad/list'
  try {
    const res = await request.post(api, {
      status: statusFilter.value,
      sort: ['-id'],
      limit,
      page: p
    })
    rows.value = res.data.bad || []
    total.value = res.data.total || 0
    totalPages.value = res.data.total_pages || 0
  } catch (e) {
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function banContent(row, status) {
  try {
    await ElMessageBox.confirm(
      status === 2 ? t('admin.banContentConfirm', { title: row.content_title }) : t('admin.unbanContentConfirm'),
      t('common.confirm'),
      { type: 'warning' }
    )
    await request.post('/api/content/admin/update/status', { id: row.content_id, status })
    ElMessage.success(t('admin.updated'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

async function banComment(row, status) {
  try {
    await ElMessageBox.confirm(status === 1 ? t('admin.banCommentConfirm') : t('admin.unbanCommentConfirm'), t('common.confirm'), { type: 'warning' })
    await request.post('/api/comment/admin/update/status', { id: row.comment_id, status })
    ElMessage.success(t('admin.updated'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

async function banUser(row, status) {
  try {
    await ElMessageBox.confirm(
      status === 2 ? t('admin.blockUserConfirm', { name: row.bad_user_nick || row.bad_user_name }) : t('admin.unblockUserConfirm'),
      t('common.confirm'),
      { type: 'warning' }
    )
    await request.post('/api/user/admin/update', { id: row.bad_user_id, status })
    ElMessage.success(t('admin.updated'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}


// 打开被举报的文章：按 id 解析成 SEO 地址后新窗口打开（评论举报可带 ?comment= 定位）
async function openFront(contentId, commentId) {
  if (!contentId) return
  const url = await resolveContentUrlById(request, contentId)
  if (!url) return
  window.open(commentId ? `${url}?comment=${commentId}` : url, '_blank')
}

onMounted(() => load(1))
</script>

<style scoped>
.rp-head {
  display: flex;
  align-items: center;
  gap: 20px;
}

.rp-tabs {
  display: flex;
  gap: 14px;
}

.rp-tab {
  font-size: 14px;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 4px 2px;
  border-bottom: 2px solid transparent;
}

.rp-tab:hover {
  color: var(--zh-blue);
}

.rp-tab.active {
  color: var(--zh-blue);
  font-weight: 600;
  border-bottom-color: var(--zh-blue);
}

.rp-total {
  margin-left: auto;
  font-size: 13px;
  color: var(--zh-text-3);
}

.filter-form {
  margin-bottom: 8px;
}

.rp-link {
  color: var(--zh-blue);
  text-decoration: none;
}

.rp-link:hover {
  text-decoration: underline;
}

.rp-link.muted {
  color: var(--zh-text-3);
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
