<template>
  <el-card class="contents-card">
    <template #header>
      {{ t('user.myContent') }}
      <el-button size="small" type="primary" style="float: right" @click="$router.push('/user/write')">
        {{ t('user.write') }}
      </el-button>
    </template>

    <el-tabs v-model="tab" @tab-change="reload">
      <el-tab-pane :label="t('contents.all')" name="all" />
      <el-tab-pane :label="t('contents.published')" name="published" />
      <el-tab-pane :label="t('contents.draft')" name="draft" />
      <el-tab-pane :label="t('contents.republish')" name="republish" />
      <el-tab-pane :label="t('contents.hidden')" name="hidden" />
      <el-tab-pane :label="t('contents.recycle')" name="rubbish" />
    </el-tabs>

    <!-- 组合筛选 -->
    <div class="filter-bar">
      <el-select v-model="filter.top" size="small" style="width: 110px" @change="load(1)">
        <el-option :label="t('contents.allTop')" :value="-1" />
        <el-option :label="t('contents.top')" :value="1" />
        <el-option :label="t('contents.notTop')" :value="0" />
      </el-select>
      <el-select v-model="filter.password_type" size="small" style="width: 110px" @change="load(1)">
        <el-option :label="t('contents.allPwd')" :value="-1" />
        <el-option :label="t('contents.withPwd')" :value="1" />
        <el-option :label="t('contents.noPwd')" :value="0" />
      </el-select>
      <el-select v-model="filter.close_comment" size="small" style="width: 110px" @change="load(1)">
        <el-option :label="t('contents.allComment')" :value="-1" />
        <el-option :label="t('contents.commentClosed')" :value="1" />
        <el-option :label="t('contents.commentOpen')" :value="0" />
      </el-select>
      <el-select
        v-model="filter.node_id"
        size="small"
        style="width: 150px"
        clearable
        :placeholder="t('contents.allNode')"
        @change="load(1)"
      >
        <el-option-group v-for="p in nodes" :key="p.id" :label="p.name">
          <el-option :label="p.name" :value="p.id" />
          <el-option v-for="s in p.son || []" :key="s.id" :label="'  └ ' + s.name" :value="s.id" />
        </el-option-group>
      </el-select>
      <el-select v-model="filter.sortBy" size="small" style="width: 120px" @change="load(1)">
        <el-option :label="t('contents.byNewest')" value="time" />
        <el-option :label="t('contents.byViews')" value="views" />
        <el-option :label="t('contents.byLikes')" value="cool" />
        <el-option :label="t('contents.byComments')" value="comment" />
      </el-select>
      <el-button size="small" @click="resetFilter">{{ t('common.reset') }}</el-button>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else>
      <el-empty v-if="contents.length === 0" :description="t('contents.noContent')" :image-size="60" />

      <!-- 卡片式列表 -->
      <div v-for="row in contents" :key="row.id" class="content-card">
        <!-- 顶部：标题 + 状态组 -->
        <div class="cc-head">
          <router-link
            :to="`/user/content/${row.id}/edit`"
            class="cc-title"
            :class="{ muted: row.status === 3 }"
          >{{ row.pre_title || row.title || t('article.untitled') }}</router-link>
          <div class="cc-tags">
            <el-tag v-if="row.version === 0" size="small" type="info">{{ t('contents.unpublished') }}</el-tag>
            <el-tag v-else-if="row.pre_flush === 0" size="small" type="warning">{{ t('contents.draftPending') }}</el-tag>
            <el-tag v-else size="small" type="success">{{ t('contents.publishedVer', { version: row.version }) }}</el-tag>
            <el-tag v-if="row.status === 1" size="small" type="warning">{{ t('contents.hidden') }}</el-tag>
            <el-tag v-else-if="row.status === 2" size="small" type="danger">{{ t('admin.banned') }}</el-tag>
            <el-tag v-else-if="row.status === 3" size="small" type="info">{{ t('contents.recycle') }}</el-tag>
            <el-tag v-if="row.top === 1" size="small" type="danger">{{ t('article.top') }}</el-tag>
            <el-tag v-if="row.password" size="small" type="warning">{{ t('contents.encrypted') }}</el-tag>
            <el-tag v-if="row.close_comment === 1" size="small">{{ t('article.closeComments') }}</el-tag>
          </div>
        </div>

        <!-- 中间：节点 + SEO + 摘要 -->
        <div class="cc-meta">
          <router-link
            v-if="row.node_id && nodeMap[row.node_id]"
            :to="`/user/nodes`"
            class="cc-node"
          ><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> {{ nodeMap[row.node_id] }}</router-link>
          <span v-else-if="row.node_seo" class="cc-node"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> {{ row.node_seo }}</span>
          <span v-if="row.seo" class="cc-seo">SEO: {{ row.seo }}</span>
        </div>
        <p v-if="row.pre_describe || row.describe" class="cc-excerpt">
          {{ (row.pre_describe || row.describe).slice(0, 120) }}{{ (row.pre_describe || row.describe).length > 120 ? '…' : '' }}
        </p>

        <!-- 底部：统计 + 时间 -->
        <div class="cc-stats">
          <span class="cc-stat"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>{{ row.views || 0 }}</span>
          <span class="cc-stat"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h2c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1H2v11z"/><path d="M21.8 9.8c-.3-.5-.8-.8-1.3-.8H15l.6-2.6c.1-.5 0-1-.3-1.4-.3-.4-.7-.6-1.2-.6h-.8c-.5 0-.9.2-1.2.6l-3.5 4.2c-.3.3-.4.8-.4 1.2v7c0 1.1.9 2 2 2h6.6c.8 0 1.5-.5 1.8-1.3l2.3-5.4v-3.5c0-.6-.2-1.2-.6-1.6z"/></svg>{{ row.cool || 0 }}</span>
          <span class="cc-stat"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>{{ row.comment_num || 0 }}</span>
          <span class="dot">·</span>
          <span>{{ t('contents.publishTime', { time: row.first_publish_time ? formatTime(row.first_publish_time) : '—' }) }}</span>
          <span>{{ t('contents.updateTime', { time: formatTime(row.update_time) }) }}</span>
        </div>

        <!-- 操作区 -->
        <div class="cc-actions">
          <template v-if="row.status !== 3">
            <el-button size="small" type="primary" plain @click="$router.push(`/user/content/${row.id}/edit`)">
              {{ t('common.edit') }}
            </el-button>
            <el-button
              v-if="row.pre_flush === 0"
              size="small"
              type="success"
              @click="publish(row)"
            >{{ t('editor.publish') }}</el-button>
            <el-button size="small" @click="toggleTop(row)">
              {{ row.top === 1 ? t('contents.cancelTop') : t('article.top') }}
            </el-button>
            <el-button size="small" @click="toggleHide(row)">
              {{ row.status === 1 ? t('contents.show') : t('contents.hide') }}
            </el-button>
            <el-button size="small" @click="setPassword(row)">{{ t('contents.password') }}</el-button>
            <el-button size="small" @click="toggleComment(row)">
              {{ row.close_comment === 1 ? t('contents.openComment') : t('contents.closeComment') }}
            </el-button>
            <el-button size="small" @click="showHistory(row)">{{ t('contents.history') }} v{{ row.version || 0 }}</el-button>
            <el-button size="small" type="danger" plain @click="toRubbish(row)">{{ t('contents.delete') }}</el-button>
          </template>
          <template v-else>
            <el-button size="small" type="success" plain @click="recycle(row)">{{ t('contents.restore') }}</el-button>
            <el-button size="small" type="danger" @click="reallyDelete(row)">{{ t('contents.deleteForever') }}</el-button>
          </template>
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

    <!-- 历史版本对话框（左右布局：列表 + 预览，仅发布历史） -->
    <el-dialog v-model="historyVisible" :title="t('contents.historyVersions')" width="860px">
      <el-empty v-if="historyList.length === 0" :description="t('contents.noHistory')" :image-size="60" />
      <div v-else class="history-layout">
        <!-- 左：版本列表 -->
        <div class="history-list">
          <div
            v-for="h in historyList"
            :key="h.id"
            class="history-item"
            :class="{ active: historyPreview?.id === h.id }"
            @click="previewHistory(h)"
          >
            <div class="hi-title">{{ h.title || t('article.untitled') }}</div>
            <div class="hi-meta">
              <el-tag type="success" size="small">v{{ h.version }}</el-tag>
              <span>{{ formatTime(h.create_time) }}</span>
            </div>
          </div>
        </div>
        <!-- 右：预览 -->
        <div class="history-preview">
          <template v-if="historyPreview">
            <h3 class="hp-title">{{ historyPreview.title }}</h3>
            <div class="hp-meta">
              <el-tag type="success" size="small">v{{ historyPreview.version }}</el-tag>
              <span>{{ formatTime(historyPreview.create_time) }}</span>
            </div>
            <div class="hp-body">
              <MdPreview
                v-if="historyPreview.describe"
                :model-value="historyPreview.describe"
                :editor-id="'history-' + historyPreview.id"
              />
              <span v-else class="zh-text-3">{{ t('contents.emptyContent') }}</span>
            </div>
            <div class="hp-actions">
              <el-button type="primary" size="small" @click="restoreHistory(historyPreview)">
                {{ t('contents.restoreVersion') }}
              </el-button>
            </div>
          </template>
          <el-empty v-else :description="t('contents.selectVersion')" :image-size="50" />
        </div>
      </div>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MdPreview } from 'md-editor-v3'
import request from '@/api'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'

const tab = ref('all')
const contents = ref([])
const loading = ref(true)
const page = ref(1)
const limit = 10
const total = ref(0)
const totalPages = ref(0)

const historyVisible = ref(false)
const historyList = ref([])
const historyPreview = ref(null)
let historyContentId = 0

// 组合筛选状态
const filter = reactive({
  top: -1,
  password_type: -1,
  close_comment: -1,
  node_id: 0,
  sortBy: 'time'
})
const nodes = ref([])
// node_id -> 节点名（含二级，子节点带父名前缀）
const nodeMap = ref({})

function buildNodeMap() {
  
  const walk = (list, prefix) => {
    for (const n of list) {
      const name = prefix ? `${prefix} / ${n.name}` : n.name
      map[n.id] = name
      if (n.son) walk(n.son, name)
    }
  }
  walk(nodes.value, '')
  nodeMap.value = map
}

function buildSortBy() {
  const base = ['=id', '-user_id', '=top', '=sort_num']
  switch (filter.sortBy) {
    case 'views':
      return [...base, '-views', '-comment_num', '-cool', '-first_publish_time', '-publish_time', '-create_time', '-update_time', '=bad', '=version', '+status', '=seo']
    case 'cool':
      return [...base, '-cool', '-views', '-comment_num', '-first_publish_time', '-publish_time', '-create_time', '-update_time', '=bad', '=version', '+status', '=seo']
    case 'comment':
      return [...base, '-comment_num', '-views', '-cool', '-first_publish_time', '-publish_time', '-create_time', '-update_time', '=bad', '=version', '+status', '=seo']
    default:
      return [...base, '-first_publish_time', '-publish_time', '-create_time', '-update_time', '-views', '=comment_num', '=bad', '=cool', '=version', '+status', '=seo']
  }
}

function buildQuery(p) {
  const q = {
    limit,
    page: p,
    sort: buildSortBy(),
    top: filter.top,
    password_type: filter.password_type,
    close_comment: filter.close_comment,
    node_id: filter.node_id || 0
  }
  switch (tab.value) {
    case 'published':
      q.status = -1
      q.publish_type = 1
      break
    case 'draft':
      q.status = -1
      q.publish_type = 0
      break
    case 'republish':
      q.status = -1
      q.publish_type = 3
      break
    case 'hidden':
      q.status = 1
      break
    case 'rubbish':
      q.status = 3
      break
    default:
      q.status = -1
      q.publish_type = -1
  }
  return q
}

// 加载节点下拉
async function loadNodes() {
  try {
    const res = await request.post('/api/node/list', {
      sort: ['=id', '+sort_num', '-create_time', '-update_time', '+status', '=seo']
    })
    nodes.value = res.data.nodes || []
    buildNodeMap()
  } catch (e) {
    nodes.value = []
  }
}

function resetFilter() {
  filter.top = -1
  filter.password_type = -1
  filter.close_comment = -1
  filter.node_id = 0
  filter.sortBy = 'time'
  load(1)
}

async function load(p = 1) {
  loading.value = true
  page.value = p
  try {
    const res = await request.post('/api/content/list', buildQuery(p))
    contents.value = res.data.contents || []
    total.value = res.data.total || 0
    totalPages.value = res.data.total_pages || 0
  } catch (e) {
    contents.value = []
  } finally {
    loading.value = false
  }
}

function reload() {
  load(1)
}

async function publish(row) {
  try {
    await request.post('/api/content/publish', { id: row.id })
    ElMessage.success(t('editor.publishSuccess'))
    load(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('editor.publishFail'))
  }
}

async function toggleTop(row) {
  try {
    await request.post('/api/content/update/top', { id: row.id, top: row.top === 1 ? 0 : 1 })
    ElMessage.success(t('contents.topUpdated'))
    load(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

async function toggleHide(row) {
  try {
    const status = row.status === 1 ? 0 : 1
    await request.post('/api/content/update/status', { id: row.id, status })
    ElMessage.success(status === 1 ? t('contents.hiddenDone') : t('contents.shownDone'))
    load(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

async function setPassword(row) {
  try {
    const { value } = await ElMessageBox.prompt(t('contents.passwordPrompt'), t('contents.setPassword'), {
      inputValue: row.password || ''
    })
    await request.post('/api/content/update/password', { id: row.id, password: value || '' })
    ElMessage.success(t('contents.passwordUpdated'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

async function toggleComment(row) {
  try {
    const close = row.close_comment === 1 ? 0 : 1
    await request.post('/api/content/update/comment', { id: row.id, close_comment: close })
    ElMessage.success(close === 1 ? t('contents.commentClosed') : t('contents.commentOpened'))
    load(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

async function toRubbish(row) {
  try {
    await ElMessageBox.confirm(t('contents.moveToRubbish', { title: row.pre_title || row.title }), t('common.tip'), { type: 'warning' })
    await request.post('/api/content/rubbish', { id: row.id })
    ElMessage.success(t('contents.rubbished'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

async function recycle(row) {
  try {
    await request.post('/api/content/recycle', { id: row.id })
    ElMessage.success(t('contents.restored'))
    load(page.value)
  } catch (e) {
    ElMessage.error(e.msg || t('contents.restoreFailed'))
  }
}

async function reallyDelete(row) {
  try {
    await ElMessageBox.confirm(t('contents.deleteForeverConfirm'), t('contents.warning'), { type: 'error' })
    await request.post('/api/content/delete', { id: row.id })
    ElMessage.success(t('contents.deletedForever'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.deleteFailed'))
  }
}

async function showHistory(row) {
  historyContentId = row.id
  historyPreview.value = null
  await fetchHistory()
  historyVisible.value = true
}

async function fetchHistory() {
  try {
    const res = await request.post('/api/content/history/list', {
      content_id: historyContentId,
      types: 1, // 只看发布历史
      create_time_begin: 0,
      create_time_end: 0,
      sort: ['=id', '-user_id', '-create_time', '-content_id'],
      limit: 50,
      page: 1
    })
    historyList.value = res.data.contents || []
    // 默认选中第一条
    if (historyList.value.length > 0) {
      previewHistory(historyList.value[0])
    }
  } catch (e) {
    ElMessage.error(e.msg || t('contents.loadHistoryFailed'))
  }
}

async function previewHistory(row) {
  // 先显示列表已有信息（列表接口 Omit 了 describe）
  historyPreview.value = { ...row }
  // 异步拉取完整正文用于预览
  try {
    const res = await request.post('/api/content/history/take', { id: row.id })
    historyPreview.value = { ...row, ...res.data }
  } catch (e) {
    // 取不到正文不影响列表展示
  }
}

async function restoreHistory(row) {
  try {
    await ElMessageBox.confirm(t('contents.restoreHistoryConfirm'), t('contents.restore'), { type: 'warning' })
    await request.post('/api/content/restore', { history_id: row.id, save: true })
    ElMessage.success(t('contents.restoreHistoryDone'))
    historyVisible.value = false
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('contents.restoreFailed'))
  }
}

onMounted(() => {
  load(1)
  loadNodes()
})
</script>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

/* 内容卡片 */
.content-card {
  background: #fff;
  border: 1px solid var(--zh-border);
  border-radius: 6px;
  padding: 14px 18px;
  margin-bottom: 12px;
  transition: box-shadow 0.2s;
}

.content-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.cc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.cc-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--zh-text);
  text-decoration: none;
  line-height: 1.4;
}

.cc-title:hover {
  color: var(--zh-blue);
}

.cc-title.muted {
  color: var(--zh-text-3);
}

.cc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.cc-meta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 13px;
}

.cc-node {
  color: var(--zh-blue);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.cc-seo {
  color: var(--zh-text-3);
}

.cc-excerpt {
  margin-top: 8px;
  color: var(--zh-text-2);
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cc-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  color: var(--zh-text-3);
  font-size: 13px;
}

.cc-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.cc-stats .dot {
  color: var(--zh-border);
}

.cc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f5f0ed;
}

/* 历史对话框 */
.history-layout {
  display: flex;
  gap: 16px;
  height: 460px;
}

.history-list {
  width: 260px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--zh-border);
  padding-right: 12px;
}

.history-item {
  padding: 10px;
  border-radius: var(--zh-radius);
  cursor: pointer;
  margin-bottom: 6px;
}

.history-item:hover {
  background: #faf7f5;
}

.history-item.active {
  background: #fff1f0;
}

.hi-title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hi-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  color: var(--zh-text-3);
  font-size: 12px;
}

.history-preview {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.hp-title {
  font-size: 18px;
  font-weight: 600;
}

.hp-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
  color: var(--zh-text-3);
  font-size: 13px;
}

.hp-body {
  font-size: 14px;
  line-height: 1.8;
  color: var(--zh-text-2);
}

.hp-actions {
  margin-top: 16px;
}

.pager {
  margin-top: 16px;
  justify-content: center;
}
</style>
