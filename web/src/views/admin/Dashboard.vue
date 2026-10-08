<template>
  <div class="dashboard">
    <!-- 核心指标 -->
    <el-row :gutter="16">
      <el-col v-for="s in visibleCore" :key="s.label" :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" :style="{ color: s.color, background: s.bg }" v-html="s.icon"></div>
          <div class="stat-num" :style="{ color: s.color }">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 内容/互动指标 -->
    <el-row :gutter="16" style="margin-top: 16px">
      <el-col v-for="s in visibleExtra" :key="s.label" :xs="12" :sm="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon" :style="{ color: s.color, background: s.bg }" v-html="s.icon"></div>
          <div class="stat-num" :style="{ color: s.color }">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作 -->
    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="24">
        <el-card>
          <template #header>{{ t('admin.quickOps') }}</template>
          <div class="quick-actions">
            <router-link v-for="q in quickLinks" :key="q.to" :to="q.to" class="qa-item" v-html="qaIcon(q.key) + '<span>' + t(q.label) + '</span>'"></router-link>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <!-- 内容状态分布 -->
      <el-col :xs="24" :md="8">
        <el-card v-if="canContent">
          <template #header>{{ t('admin.contentStatus') }}</template>
          <div v-for="s in statusList" :key="s.label" class="status-item">
            <span class="si-label">
              <span class="si-dot" :style="{ background: s.color }"></span>{{ s.label }}
            </span>
            <b>{{ s.value }}</b>
          </div>
        </el-card>
      </el-col>

      <!-- 最近发布 -->
      <el-col :xs="24" :md="8">
        <el-card v-if="canContent">
          <template #header>{{ t('admin.recentPublish') }}</template>
          <div v-for="c in recentContents" :key="c.id" class="list-item">
            <a class="li-title" href="#" @click.prevent="openFront(c)">{{ c.pre_title || c.title }}</a>
            <span class="li-meta">
              @{{ c.user_name }} ·
              <span v-if="c.first_publish_time" class="li-time">{{ t('manage.firstPublish') }} {{ formatTime(c.first_publish_time) }}</span>
              <span v-else class="li-time">{{ formatTime(c.create_time) }}</span>
            </span>
          </div>
          <el-empty v-if="recentContents.length === 0" :description="t('common.empty')" :image-size="40" />
        </el-card>
      </el-col>

      <!-- 最新用户 -->
      <el-col :xs="24" :md="8">
        <el-card v-if="canUsers">
          <template #header>{{ t('admin.latestRegister') }}</template>
          <div v-for="u in recentUsers" :key="u.id" class="list-item">
            <router-link :to="`/u/${u.name}`" class="li-title">{{ u.nick_name || u.name }}</router-link>
            <span class="li-meta">@{{ u.name }} · <span class="li-time">{{ t('admin.regAt') }} {{ formatTime(u.create_time) }}</span></span>
          </div>
          <el-empty v-if="recentUsers.length === 0" :description="t('common.empty')" :image-size="40" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import request from '@/api'
import { contentUrl, resolveContentUrlById } from '@/utils/url'
import { formatTime } from '@/utils/format'
import { t } from '@/i18n'
import { hasPerm, anyPerm } from '@/utils/adminPerms'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const perm = computed(() => userStore.adminPerm)
const has = (u) => userStore.isAdmin || hasPerm(perm.value, u)
const hasAny = (urls) => userStore.isAdmin || anyPerm(perm.value, urls)

const S = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`

// 快捷操作图标
const QA_ICONS = {
  write: S('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  report: S('<path d="M22 4h-2l-1-1h-6L12 4h-2a2 2 0 0 0-2 2v2h16V6a2 2 0 0 0-2-2z"/><path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>'),
  content: S('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'),
  comment: S('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  user: S('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'),
  msg: S('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/>'),
  settings: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  friends: S('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>')
}
function qaIcon(k) {
  return QA_ICONS[k] || ''
}

const userTotal = ref('-')
const contentTotal = ref('-')
const vipTotal = ref('-')
const nodeTotal = ref('-')
const commentTotal = ref('-')
const fileTotal = ref('-')
const relationTotal = ref('-')
const reportTotal = ref('-')
const statusCount = reactive({ published: 0, draft: 0, hidden: 0, banned: 0, rubbish: 0 })
const recentContents = ref([])
const recentUsers = ref([])

// 概览卡片可见性 = 权限过滤（need 为 null 表示无需后台资源，如公开统计/写文章）
const coreStats = computed(() => [
  { need: null, label: t('admin.registeredUsers'), value: userTotal.value, color: '#ff5f57', bg: '#fff1f0', icon: S('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>') },
  { need: '/v1/content/admin/list', label: t('admin.publishedContent'), value: contentTotal.value, color: '#ff8c42', bg: '#fff3ec', icon: S('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>') },
  { need: null, label: t('admin.vipUsers'), value: vipTotal.value, color: '#e6a23c', bg: '#fdf6ec', icon: S('<path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8z"/>') },
  { need: '/v1/node/admin/list', label: t('admin.nodeCount'), value: nodeTotal.value, color: '#67c23a', bg: '#f0f9eb', icon: S('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>') }
])
const visibleCore = computed(() => coreStats.value.filter((x) => !x.need || has(x.need)))

const extraStats = computed(() => [
  { need: '/v1/comment/admin/list', label: t('admin.commentCount'), value: commentTotal.value, color: '#7c6bd8', bg: '#f3effc', icon: S('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>') },
  { need: '/v1/file/admin/list', label: t('admin.fileCount'), value: fileTotal.value, color: '#909399', bg: '#f4f4f5', icon: S('<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/>') },
  { need: '/v1/relation/admin/list', label: t('admin.relationCount'), value: relationTotal.value, color: '#ff5f57', bg: '#fff1f0', icon: S('<path d="M16 11a4 4 0 1 0-8 0"/><path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.5V14h4V9.5c1.2-.7 2-2 2-3.5a4 4 0 0 0-4-4z"/>') },
  { need: ['/v1/content/admin/bad/list', '/v1/comment/admin/bad/list', '/v1/user/admin/bad/list'], label: t('admin.pendingReports'), value: reportTotal.value, color: '#e6a23c', bg: '#fdf6ec', icon: S('<path d="M22 4h-2l-1-1h-6L12 4h-2a2 2 0 0 0-2 2v2h16V6a2 2 0 0 0-2-2z"/><path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>') }
])
const visibleExtra = computed(() =>
  extraStats.value.filter((x) => (Array.isArray(x.need) ? hasAny(x.need) : !x.need || has(x.need)))
)

// 快捷操作（need=null 无需后台资源：写文章人人可用；其余按对应管理页权限）
const quickLinks = computed(() => {
  const all = [
    { to: '/user/manage?write=1', key: 'write', label: 'user.write', need: null },
    { to: '/admin/reports', key: 'report', label: 'admin.handleReports', need: '/v1/content/admin/bad/list' },
    { to: '/admin/contents', key: 'content', label: 'admin.contents', need: '/v1/content/admin/list' },
    { to: '/admin/comments', key: 'comment', label: 'admin.comments', need: '/v1/comment/admin/list' },
    { to: '/admin/users', key: 'user', label: 'admin.users', need: '/v1/user/list' },
    { to: '/admin/messages', key: 'msg', label: 'admin.siteNotice', need: '/v1/message/admin/list' },
    { to: '/admin/settings', key: 'settings', label: 'admin.settings', need: '/v1/site/config/update' },
    { to: '/admin/friends', key: 'friends', label: 'admin.friends', need: '/v1/friend/list' }
  ]
  return all.filter((x) => !x.need || has(x.need))
})

// 区块可见性
const canContent = computed(() => has('/v1/content/admin/list'))
const canUsers = computed(() => hasAny(['/v1/user/list', '/v1/user/admin/list']))
const canComments = computed(() => has('/v1/comment/admin/list'))

const statusList = computed(() => [
  { label: t('admin.published'), value: statusCount.published, color: '#67c23a' },
  { label: t('admin.draft'), value: statusCount.draft, color: '#909399' },
  { label: t('admin.hiddenStatus'), value: statusCount.hidden, color: '#e6a23c' },
  { label: t('admin.bannedStatus'), value: statusCount.banned, color: '#f56c6c' },
  { label: t('admin.rubbish'), value: statusCount.rubbish, color: '#c0c4cc' }
])


// 打开前台文章：地址由「用户名 + 节点 SEO + 文章 SEO」拼成，地址栏不出现 id
async function openFront(c) {
  const url = contentUrl(c) || (await resolveContentUrlById(request, c.id))
  if (url) window.open(url, '_blank')
}

onMounted(async () => {
  // 权限异步到达：若尚未拉取先同步一次，避免卡片/请求误判为无权限
  if (!userStore.adminPerm && userStore.isLogin) {
    await userStore.loadPerm()
  }
  // 核心指标：注册/VIP 走公开统计；内容总数需内容权限；节点数需节点权限
  try {
    const jobs = []
    jobs.push(request.post('/app/u', { vip: -1, limit: 1, offset: 0 }).then((r) => { userTotal.value = r.data?.total || 0 }).catch(() => {}))
    jobs.push(request.post('/app/u', { vip: 1, limit: 1, offset: 0 }).then((r) => { vipTotal.value = r.data?.total || '-' }).catch(() => {}))
    if (canContent.value) {
      jobs.push(request.post('/api/content/admin/list', { status: 0, publish_type: 1, limit: 1, page: 1, sort: ['=id'] }).then((r) => { contentTotal.value = r.data?.total || 0 }).catch(() => {}))
    }
    if (has('/v1/node/admin/list')) {
      jobs.push(request.post('/api/node/admin/list', { sort: ['=id', '+sort_num'], limit: 200 }).then((r) => { nodeTotal.value = (r.data?.nodes || []).length }).catch(() => {}))
    }
    await Promise.allSettled(jobs)
  } catch (e) {}

  // 互动指标：按各自权限请求
  try {
    const jobs = []
    if (canComments.value) {
      jobs.push(request.post('/api/comment/admin/list', { comment_type: -1, status: -1, is_delete: -1, root_comment_id: -1, comment_anonymous: -1, limit: 1, page: 1, sort: ['=id'] }).then((r) => { commentTotal.value = r.data?.total || 0 }).catch(() => {}))
    }
    if (has('/v1/file/admin/list')) {
      jobs.push(request.post('/api/file/admin/list', { store_type: -1, status: -1, type: '', tag: '', is_picture: -1, limit: 1, page: 1 }).then((r) => { fileTotal.value = r.data?.total || 0 }).catch(() => {}))
    }
    if (has('/v1/relation/admin/list')) {
      jobs.push(request.post('/api/relation/admin/list', { limit: 1, page: 1 }).then((r) => { relationTotal.value = r.data?.total || 0 }).catch(() => {}))
    }
    if (has('/v1/content/admin/bad/list') || has('/v1/comment/admin/bad/list')) {
      const p1 = has('/v1/content/admin/bad/list')
        ? request.post('/api/content/admin/bad/list', { status: -1, limit: 1, page: 1 }).then((r) => r.data?.total || 0).catch(() => 0)
        : Promise.resolve(0)
      const p2 = has('/v1/comment/admin/bad/list')
        ? request.post('/api/comment/admin/bad/list', { status: -1, limit: 1, page: 1 }).then((r) => r.data?.total || 0).catch(() => 0)
        : Promise.resolve(0)
      jobs.push(Promise.all([p1, p2]).then(([a, b]) => { reportTotal.value = a + b }))
    }
    await Promise.allSettled(jobs)
  } catch (e) {}

  // 内容状态分布：仅内容权限用户
  if (canContent.value) {
    const statusBase = {
      user_id: 0, user_name: '', id: 0, seo: '', node_id: 0, node_seo: '',
      top: -1, password_type: -1, close_comment: -1,
      create_time_begin: 0, create_time_end: 0, update_time_begin: 0, update_time_end: 0,
      publish_time_begin: 0, publish_time_end: 0, first_publish_time_begin: 0, first_publish_time_end: 0,
      sort: ['=id'], limit: 1, page: 1
    }
    const countBy = async (extra) => {
      try {
        const r = await request.post('/api/content/admin/list', { ...statusBase, ...extra })
        return r.data?.total || 0
      } catch (e) {
        return 0
      }
    }
    try {
      const [published, draft, hidden, banned, rubbish] = await Promise.all([
        countBy({ status: 0, publish_type: 1 }),
        countBy({ status: 0, publish_type: 0 }),
        countBy({ status: 1, publish_type: 1 }),
        countBy({ status: 2, publish_type: 1 }),
        countBy({ status: 3 })
      ])
      statusCount.published = published
      statusCount.draft = draft
      statusCount.hidden = hidden
      statusCount.banned = banned
      statusCount.rubbish = rubbish
    } catch (e) {}

    // 最近发布
    try {
      const res = await request.post('/api/content/admin/list', {
        ...statusBase, status: -1, publish_type: 1,
        sort: ['=id', '-first_publish_time', '-create_time', '=status'], limit: 5, page: 1
      })
      const list = res.data?.contents || []
      recentContents.value = list.filter((x) => x.status !== 3).slice(0, 5)
    } catch (e) {}
  }

  // 最新注册：用户列表权限
  if (canUsers.value) {
    try {
      const res = await request.post('/api/user/list', {
        status: -1, gender: -1, vip: -1, limit: 5, page: 1,
        sort: ['=id', '=name', '-vip', '=activate_time', '=followed_num', '=following_num', '=content_num', '=content_cool_num', '-create_time', '=update_time', '=gender']
      })
      recentUsers.value = res.data?.users || []
    } catch (e) {}
  }
})
</script>

<style scoped>
.stat-card {
  text-align: center;
}

.stat-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 8px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-num {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  color: var(--zh-text-3);
  margin-top: 4px;
  font-size: 13px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.qa-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  background: #faf8f6;
  color: var(--zh-text-2);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
}

.qa-item svg {
  color: var(--zh-blue);
}

.qa-item:hover {
  background: #fff1f0;
  color: var(--zh-blue);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 95, 87, 0.12);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px dashed #f5f0ed;
  font-size: 13px;
  color: var(--zh-text-2);
}

.status-item:last-child {
  border-bottom: none;
}

.si-label {
  display: flex;
  align-items: center;
  gap: 7px;
}

.si-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-item b {
  color: var(--zh-text);
  font-weight: 600;
}

.list-item {
  padding: 8px 0;
  border-bottom: 1px solid #faf7f5;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.list-item:last-child {
  border-bottom: none;
}

.li-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--zh-text);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.li-title:hover {
  color: var(--zh-blue);
}

.li-meta {
  color: var(--zh-text-3);
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.li-time {
  white-space: nowrap;
}
</style>
