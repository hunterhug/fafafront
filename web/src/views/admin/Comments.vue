<template>
  <el-card class="comments-card">
    <template #header>
      <div class="cmt-head">
        <span>{{ t('admin.commentsTitle') }}</span>
        <span class="cmt-total">{{ t('admin.commentsTotal', { total }) }}</span>
      </div>
    </template>

    <el-form inline size="small" class="filter-form">
      <el-form-item :label="t('admin.contentId')">
        <el-input v-model="filter.content_id" :placeholder="t('admin.contentId')" clearable @keyup.enter="load(1)" @clear="load(1)" />
      </el-form-item>
      <el-form-item :label="t('admin.commenter')">
        <el-input v-model="filter.user_name" :placeholder="t('admin.userName')" clearable @keyup.enter="load(1)" @clear="load(1)" />
      </el-form-item>
      <el-form-item :label="t('admin.type')">
        <el-select v-model="filter.comment_type" style="width: 130px" @change="load(1)">
          <el-option :label="t('common.all')" :value="-1" />
          <el-option :label="t('admin.commentContent')" :value="0" />
          <el-option :label="t('admin.commentReply')" :value="1" />
          <el-option :label="t('admin.multiReply')" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('admin.status')">
        <el-select v-model="filter.status" style="width: 110px" @change="load(1)">
          <el-option :label="t('common.all')" :value="-1" />
          <el-option :label="t('admin.normal')" :value="0" />
          <el-option :label="t('admin.banned')" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('common.delete')">
        <el-select v-model="filter.is_delete" style="width: 110px" @change="load(1)">
          <el-option :label="t('common.all')" :value="-1" />
          <el-option :label="t('admin.notDeleted')" :value="0" />
          <el-option :label="t('common.deleted')" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load(1)">{{ t('common.query') }}</el-button>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="locateMode"
      type="success"
      :closable="false"
      show-icon
      class="locate-bar"
    >
      <template #title>
        <span>{{ t('admin.locatedTip', { id: locateId }) }}</span>
        <el-button size="small" text type="primary" @click="exitLocate">{{ t('admin.backToList') }}</el-button>
      </template>
    </el-alert>

    <el-skeleton v-if="loading" :rows="8" animated />
    <template v-else>
      <el-empty v-if="rows.length === 0" :description="t('admin.noComments')" :image-size="60" />
      <el-table v-else :data="rows" size="small" :row-class-name="({ row }) => 'cmt-row-' + row.id">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column :label="t('admin.commentContent')" min-width="220">
          <template #default="{ row }">
            <div class="cmt-body">
              <el-tag v-if="row.is_delete" size="small" type="danger" class="cmt-del-tag">{{ t('admin.commentDeleted') }}</el-tag>
              <span class="cmt-text" :class="{ 'is-del': row.is_delete }" v-html="renderCommentContent(row.describe)"></span>
              <span
                v-if="row.root_comment_id"
                class="cmt-reply"
                :title="t('admin.locateToRoot')"
                @click.stop="locateComment(row.root_comment_id)"
              >↳ {{ t('article.reply') }} #{{ row.root_comment_id }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.belongContent')" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <a
              class="cmt-content-link"
              href="#"
              @click.prevent="openFront(row.content_id)"
            >{{ row.content_title || '#' + row.content_id }}</a>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.commenter')" width="120">
          <template #default="{ row }">
            <span v-if="row.is_anonymous">{{ t('admin.anonymous') }}</span>
            <router-link v-else :to="`/u/${row.user_name}`" class="cmt-user">{{ row.user_nick_name || row.user_name }}</router-link>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.type')" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="commentTypeTag(row.comment_type)">{{ typeLabel(row.comment_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cool" :label="t('article.like')" width="60" align="center" />
        <el-table-column prop="bad" :label="t('article.report')" width="60" align="center" />
        <el-table-column :label="t('admin.time')" width="150">
          <template #default="{ row }">{{ formatTime(row.create_time) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.status')" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.is_delete" type="info" size="small">{{ t('common.deleted') }}</el-tag>
            <el-tag v-else-if="row.is_ban" type="danger" size="small">{{ t('admin.banned') }}</el-tag>
            <el-tag v-else type="success" size="small">{{ t('admin.normal') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('admin.operation')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.is_delete && row.is_ban"
              size="small"
              type="success"
              plain
              @click="setStatus(row, 0)"
            >{{ t('admin.unban') }}</el-button>
            <el-button
              v-else-if="!row.is_delete"
              size="small"
              type="danger"
              plain
              @click="setStatus(row, 1)"
            >{{ t('admin.banned') }}</el-button>
            <span v-else class="zh-text-3">—</span>
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
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api'
import { resolveContentUrlById } from '@/utils/url'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'
import { renderCommentContent } from '@/utils/renderContent'

const loading = ref(true)
const rows = ref([])
const page = ref(1)
const limit = 10
const total = ref(0)
const totalPages = ref(0)
const filter = reactive({ content_id: '', user_name: '', comment_type: -1, status: -1, is_delete: -1 })
// 聚焦定位：点击「↳ 回复 #id」后只显示该条评论
const locateMode = ref(false)
const locateId = ref(0)
let locateSnap = null // 定位前的筛选+页码快照，用于返回

function typeLabel(type) {
  if (type === 0) return t('admin.commentContent')
  if (type === 1) return t('admin.commentReply')
  if (type === 2) return t('admin.multiReply')
  return t('admin.unknown')
}

function commentTypeTag(t) {
  if (t === 0) return 'info'
  if (t === 1) return 'primary'
  return 'warning'
}

async function load(p = 1) {
  loading.value = true
  page.value = p
  try {
    const res = await request.post('/api/comment/admin/list', {
      id: 0,
      user_id: 0,
      user_name: '',
      content_id: Number(filter.content_id) || 0,
      content_user_id: 0,
      content_user_name: '',
      comment_id: 0,
      comment_user_id: 0,
      comment_user_name: filter.user_name || '',
      root_comment_id: -1,
      root_comment_user_id: 0,
      root_comment_user_name: '',
      comment_type: filter.comment_type,
      status: filter.status,
      is_delete: filter.is_delete,
      comment_anonymous: -1,
      create_time_begin: 0,
      create_time_end: 0,
      sort: ['=id', '-create_time', '=comment_type'],
      limit,
      page: p
    })
    const list = res.data.comments || []
    const extraComments = res.data.extra?.comments || {}
    const extraUsers = res.data.extra?.users || {}
    rows.value = list.map((c) => buildRow(c, extraComments, extraUsers))
    total.value = res.data.total || 0
    totalPages.value = res.data.total_pages || 0
    // 退出聚焦态（用户手动改筛选/翻页/重新查询触发普通 load）→ 丢弃快照，避免"返回列表"回到过期状态
    if (locateMode.value) {
      locateMode.value = false
      locateId.value = 0
      locateSnap = null
    }
  } catch (e) {
    rows.value = []
  } finally {
    loading.value = false
  }
}

// 组装列表行（extra 补全正文/用户/时间/状态）
function buildRow(c, extraComments, extraUsers) {
  const full = extraComments[c.id] || {}
  const u = extraUsers[full.user_id] || {}
  return {
    ...c,
    describe: full.describe || '',
    create_time: full.create_time || 0,
    is_ban: !!full.is_ban,
    is_delete: !!full.is_delete,
    is_anonymous: !!full.is_anonymous,
    user_id: full.user_id,
    cool: full.cool || 0,
    bad: full.bad || 0,
    user_name: u.name || c.user_name || (full.user_id ? t('common.user') + ' ' + full.user_id : ''),
    user_nick_name: u.nick_name || ''
  }
}

// 「↳ 回复 #id」定位：切到聚焦模式，列表只保留被回复的这一条评论
async function locateComment(targetId) {
  if (!targetId) return
  // 记住当前筛选，供「返回列表」恢复
  locateSnap = {
    content_id: filter.content_id, user_name: filter.user_name,
    comment_type: filter.comment_type, status: filter.status, is_delete: filter.is_delete,
    page: page.value
  }
  loading.value = true
  try {
    // 后端 ListComment 支持 id 精确过滤（不过滤已删/违禁），直接取该条
    const res = await request.post('/api/comment/admin/list', {
      id: targetId,
      user_id: 0, user_name: '', content_id: 0, content_user_id: 0, content_user_name: '',
      comment_id: 0, comment_user_id: 0, comment_user_name: '',
      root_comment_id: -1, root_comment_user_id: 0, root_comment_user_name: '',
      comment_type: -1, status: -1, is_delete: -1, comment_anonymous: -1,
      create_time_begin: 0, create_time_end: 0,
      sort: ['=id', '-create_time', '=comment_type'], limit: 1, page: 1
    })
    const list = res.data.comments || []
    if (list.length === 0 || list[0].id !== targetId) {
      ElMessage.warning(t('admin.locateNotFound'))
      exitLocate()
      return
    }
    const extraComments = res.data.extra?.comments || {}
    const extraUsers = res.data.extra?.users || {}
    rows.value = list.map((c) => buildRow(c, extraComments, extraUsers))
    total.value = 1
    totalPages.value = 1
    locateId.value = targetId
    locateMode.value = true
    // 聚焦态下让这条可见，做一次轻高亮
    await nextTick()
    const trs = document.querySelectorAll(`.el-table__row.cmt-row-${targetId}`)
    trs.forEach((tr) => {
      tr.classList.add('locate-flash')
      setTimeout(() => tr.classList.remove('locate-flash'), 1600)
    })
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
    exitLocate()
  } finally {
    loading.value = false
  }
}

// 退出聚焦：恢复定位前筛选并刷新列表
function exitLocate() {
  locateMode.value = false
  locateId.value = 0
  let backPage = 1
  if (locateSnap) {
    filter.content_id = locateSnap.content_id
    filter.user_name = locateSnap.user_name
    filter.comment_type = locateSnap.comment_type
    filter.status = locateSnap.status
    filter.is_delete = locateSnap.is_delete
    backPage = locateSnap.page || 1
    locateSnap = null
  }
  load(backPage)
}

async function setStatus(row, status) {
  try {
    await ElMessageBox.confirm(status === 1 ? t('admin.confirmBanComment') : t('admin.confirmUnbanComment'), t('common.confirm'), {
      type: 'warning'
    })
    await request.post('/api/comment/admin/update/status', { id: row.id, status })
    ElMessage.success(t('common.updated'))
    load(page.value)
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}


// 打开所属文章：按 id 解析成 SEO 地址后新窗口打开（地址栏不出现 id）
async function openFront(contentId) {
  const url = await resolveContentUrlById(request, contentId)
  if (url) window.open(url, '_blank')
}

onMounted(() => load(1))
</script>

<style scoped>
.filter-form {
  margin-bottom: 8px;
}
.locate-bar {
  margin-bottom: 12px;
}

.locate-bar .el-alert__title {
  display: flex;
  align-items: center;
  gap: 8px;
}


.pager {
  margin-top: 16px;
  justify-content: flex-end;
}

.cmt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cmt-total {
  font-size: 13px;
  color: var(--zh-text-3);
  font-weight: 400;
}

.cmt-body {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.5;
}

.cmt-deleted {
  color: var(--zh-text-3);
  font-style: italic;
}

.cmt-reply {
  color: var(--zh-text-3);
  font-size: 12px;
  white-space: nowrap;
}

.cmt-text {
  word-break: break-all;
  line-height: 1.6;
}

/* 已删除评论正文：弱化以示该内容已被作者/管理删除（管理员仍可见原文便于复核） */
.cmt-text.is-del {
  opacity: 0.6;
  text-decoration: line-through;
}

.cmt-del-tag {
  flex-shrink: 0;
}

.cmt-reply {
  cursor: pointer;
  user-select: none;
}

.cmt-reply:hover {
  color: var(--zh-blue);
  text-decoration: underline;
}

/* 定位高亮（短暂闪烁） */
.el-table__row.locate-flash td {
  background: #fff7d6 !important;
  transition: background 0.5s;
}

.cmt-content-link,
.cmt-user {
  color: var(--zh-blue);
  text-decoration: none;
}

.cmt-content-link:hover,
.cmt-user:hover {
  text-decoration: underline;
}
</style>
