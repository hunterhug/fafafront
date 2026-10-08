<template>
  <div class="explore-layout">
    <div class="explore-main">
      <div class="feed-tabs">
        <el-tooltip :content="t('explore.sortHotHint')" placement="top">
          <span class="feed-tab" :class="{ active: feedTab === 'hot' }" @click="switchTab('hot')">{{ t('home.hot') }}</span>
        </el-tooltip>
        <el-tooltip :content="t('home.sortLatestHint')" placement="top">
          <span class="feed-tab" :class="{ active: feedTab === 'latest' }" @click="switchTab('latest')">{{ t('home.latest') }}</span>
        </el-tooltip>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else>
        <el-empty v-if="contents.length === 0" :description="t('home.noContent')" />

        <article
          v-for="c in contents"
          :key="c.id"
          class="feed-item"
          @click="goDetail(c)"
        >
          <div class="feed-author">
            <router-link :to="`/u/${c.user_name}`" class="feed-avatar" @click.stop>
              <el-avatar :size="32" :src="thumbUrl(c.user_head_photo)">
                {{ (c.user_nick_name || c.user_name || '?')[0] }}
              </el-avatar>
            </router-link>
            <div class="feed-author-info">
              <router-link :to="`/u/${c.user_name}`" class="feed-author-name" @click.stop>
                {{ c.user_nick_name || c.user_name }}
              </router-link>
              <span class="feed-time">{{ formatRelative(c.first_publish_time_int) }}</span>
            </div>
            <!-- 热度标记 -->
            <span class="hot-badge">{{ t('explore.hotScore') }} {{ c.cool + c.views + c.comment_num }}</span>
          </div>

          <div class="feed-body" :class="{ hasCover: c.image_path }">
            <div class="feed-text">
              <h2 class="feed-title">{{ c.title }}<span v-if="c.is_lock" class="lock-tag" :title="t('article.locked')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span></h2>
              <p class="feed-excerpt">{{ stripMarkdown(c.describe) }}</p>
            </div>
            <el-image
              v-if="c.image_path"
              :src="c.image_path"
              fit="cover"
              class="feed-cover"
            />
          </div>

          <div class="feed-actions">
            <span class="zh-text-3">{{ c.cool || 0 }} {{ t('article.like') }}</span>
            <span class="zh-text-3">{{ t('article.commentsCount', { n: c.comment_num || 0 }) }}</span>
            <span class="zh-text-3">{{ t('article.views', { n: c.views || 0 }) }}</span>
          </div>
        </article>

        <!-- 无限滚动 -->
        <div v-if="loadingMore" class="feed-more">{{ t('common.loading') }}</div>
        <div v-else-if="hasMore" class="feed-more" @click="loadMore">{{ t('common.loadMore') }}</div>
        <div v-else-if="contents.length > 0" class="feed-end">— 已经到底啦 —</div>
      </template>
    </div>

    <!-- 右侧：{{ t('explore.hotUsers') }}（按粉丝/获赞排序） -->
    <aside class="explore-side">
      <div class="side-card">
        <el-tooltip :content="t('explore.hotTooltip')" placement="top">
          <div class="side-title">{{ t('explore.hotUsers') }}</div>
        </el-tooltip>
        <div v-for="(u, i) in users" :key="u.id" class="side-user">
          <span class="rank" :class="{ 'rank-top': i < 3 }">{{ i + 1 }}</span>
          <router-link :to="`/u/${u.name}`" class="side-user-head">
            <el-avatar :size="36" :src="thumbUrl(u.head_photo)">
              {{ (u.nick_name || u.name || '?')[0] }}
            </el-avatar>
            <div class="side-user-info">
              <div class="side-user-name">{{ u.nick_name || u.name }}</div>
              <div class="side-user-desc">
                <span class="metric">🔥 {{ u.content_cool_num || 0 }}</span>
                <span class="metric">{{ t('user.followers') }} {{ u.followed_num || 0 }}</span>
              </div>
            </div>
          </router-link>
          <el-button
            v-if="userStore.isLogin && u.name !== userStore.user?.name"
            size="small"
            :type="u.is_following ? 'default' : 'primary'"
            round
            :loading="u._loading"
            @click="toggleFollow(u)"
          >{{ u.is_following ? (u.is_mutual ? t('home.mutual') : t('home.followed')) : t('home.follow') }}</el-button>
        </div>
        <el-empty v-if="users.length === 0" :description="t('home.noUsers')" :image-size="40" />
      </div>

      <!-- 关于社区 -->
      <div class="side-card">
        <div class="side-title">{{ t('home.aboutCommunity') }}</div>
        <p class="side-text">{{ site.siteTitle }} {{ site.siteIntro }}</p>
        <div v-if="SHOW_SITE_LINKS" class="side-actions side-links">
          <router-link to="/about" class="side-link">{{ t('nav.about') }}</router-link>
          <router-link to="/acknowledgments" class="side-link">{{ t('nav.acknowledgments') }}</router-link>
          <router-link to="/versions" class="side-link">{{ t('nav.versions') }}</router-link>
          <router-link to="/roadmap" class="side-link">{{ t('nav.roadmap') }}</router-link>
        </div>
      </div>
    </aside>

    <!-- 回到顶部 -->
    <transition name="fade">
      <button v-if="showFloatTop" class="float-top" :title="t('common.top')" @click="scrollToTop">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </button>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { formatRelative, stripMarkdown } from '@/utils/format'
import { contentUrl } from '@/utils/url'
import { useUserStore } from '@/store/user'
import { useSiteStore } from '@/store/site'
import { fetchMyFans } from '@/utils/relation'
import { t } from '@/i18n'
import { SHOW_SITE_LINKS } from '@/utils/siteLinks'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const site = useSiteStore()

const feedTab = ref('hot')
const contents = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const page = ref(1)
const limit = 10
const total = ref(0)
const users = ref([])

// 热门：按热度（赞/浏览/评论）降序；最新：纯发布时间
function buildSort() {
  if (feedTab.value === 'latest') {
    return [
      '=id', '-first_publish_time', '-publish_time',
      '-create_time', '-update_time', '-views', '=comment_num', '=bad', '=cool', '=seo'
    ]
  }
  return [
    '=id', '-cool', '-views', '-comment_num',
    '-first_publish_time', '-publish_time', '=bad', '=seo'
  ]
}

function switchTab(t) {
  feedTab.value = t
  load(1)
  window.scrollTo(0, 0)
}

async function load(p = 1, append = false) {
  page.value = p
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  try {
    const res = await request.post('/app/u/content', {
      user_id: 0,
      user_name: '',
      node_id: 0,
      node_seo: '',
      first_publish_time_begin: 0,
      first_publish_time_end: 0,
      publish_time_begin: 0,
      publish_time_end: 0,
      sort: buildSort(),
      limit,
      page: p
    })
    const list = res.data.contents || []
    contents.value = append ? [...contents.value, ...list] : list
    total.value = res.data.total || 0
    hasMore.value = contents.value.length < total.value

    // 后端已在列表响应中带出作者昵称/头像（user_nick_name / user_head_photo），无需逐作者请求
    list.forEach((c) => {
      c.user_nick_name = c.user_nick_name || c.user_name
    })
  } catch (e) {
    if (!append) contents.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value || loadingMore.value) return
  load(page.value + 1, true)
}

// {{ t('explore.hotUsers') }}：按 VIP、粉丝数、获赞排序取前 6
async function loadUsers() {
  try {
    const res = await request.post('/app/u', {
      vip: -1,
      limit: 6,
      offset: 0,
      sort: [
        '=id', '=name', '-content_cool_num', '-followed_num',
        '-content_num', '=vip', '=activate_time', '=following_num', '=create_time', '=gender'
      ]
    })
    users.value = res.data.users || []
    if (userStore.isLogin) {
      try {
        const [f, fans] = await Promise.all([
          request.post('/api/relation/following/me', { limit: 100, page: 1 }),
          fetchMyFans()
        ])
        const followed = new Set((f.data?.relations || []).map((r) => r.user_b_id))
        users.value.forEach((u) => {
          u.is_following = followed.has(u.id)
          u.is_mutual = followed.has(u.id) && fans.has(u.id)
        })
      } catch (e) {}
    }
  } catch (e) {
    users.value = []
  }
}

function goDetail(c) {
  // 地址由「用户名 + 节点 SEO + 文章 SEO」拼成；SEO 不全时不跳转
  const url = contentUrl(c)
  if (url) router.push(url)
}

async function toggleFollow(u) {
  if (!userStore.isLogin) {
    ElMessage.warning(t('common.loginFirst'))
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  u._loading = true
  try {
    if (u.is_following) {
      await request.post('/api/relation/follow/minute', { user_id: u.id, user_name: u.name })
      u.is_following = false
      u.is_mutual = false
      u.followed_num = Math.max((u.followed_num || 0) - 1, 0)
      ElMessage.success(t('common.unfollowSuccess'))
    } else {
      await request.post('/api/relation/follow/add', { user_id: u.id, user_name: u.name })
      u.is_following = true
      u.is_mutual = (await fetchMyFans()).has(u.id)
      u.followed_num = (u.followed_num || 0) + 1
      ElMessage.success(t('common.followSuccess'))
    }
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  } finally {
    u._loading = false
  }
}

function thumbUrl(url) {
  if (!url) return undefined
  return url.includes('/storage/') ? url.replace('/storage/', '/storage_x/') : url
}

// 回到顶部按钮
const showFloatTop = ref(false)
function onScroll() {
  showFloatTop.value = document.documentElement.scrollTop > 500
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  document.title = `发现 - ${site.siteTitle}`
  load(1)
  loadUsers()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.explore-layout {
  /* 标签区总高度 = 上边距 16 + 行高 24 + 下边距 14；
     侧栏用它作为 padding-top，让第一张卡片与第一篇文章卡片顶部对齐 */
  --feed-head-h: 54px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.explore-main {
  flex: 1;
  min-width: 0;
}

.feed-tabs {
  display: flex;
  align-items: center;
  gap: 24px;
  /* 与右侧卡片标题行对齐：
     上 16 + 行高 24 + 下 14  ==  卡片 padding 16 + 标题高 24 + 标题下边距 14 */
  min-height: 24px;
  margin: 16px 0 14px;
}




.feed-tab {
  position: relative;
  font-size: 15px;
  line-height: 24px;
  color: var(--zh-text-2);
  cursor: pointer;
  transition: color 0.2s;
}

.feed-tab:hover {
  color: var(--zh-blue);
}

.feed-tab.active {
  color: var(--zh-text);
  font-weight: 600;
}

/* 选中下划线用伪元素：不再让 border 参与盒模型，
   否则选中/未选中时标签高度不同，旁边的问号会跟着上下跳。 */
.feed-tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -7px;
  height: 3px;
  border-radius: 2px;
  background: var(--zh-blue);
}

.feed-item {
  background: #fff;
  border-radius: var(--zh-radius);
  padding: 20px 24px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.25s ease, border-color 0.25s ease;
  box-shadow: var(--zh-shadow);
  border: 1px solid transparent;
}

.feed-item:hover {
  transform: translateY(-3px);
  box-shadow: var(--zh-shadow-hover);
  border-color: #ffe0dc;
}

.feed-author {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.feed-author-name {
  font-size: 14px;
  color: var(--zh-text-2);
  font-weight: 600;
}

.feed-author-name:hover {
  color: var(--zh-blue);
}

.feed-time {
  font-size: 13px;
  color: var(--zh-text-3);
  margin-left: 8px;
}

.hot-badge {
  margin-left: auto;
  color: #ff665e;
  font-size: 13px;
}

.feed-body {
  display: flex;
  gap: 16px;
}

.feed-text {
  flex: 1;
  min-width: 0;
}

.feed-title {
  font-size: 21px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--zh-text);
}

.feed-item:hover .feed-title {
  color: var(--zh-blue);
}

.feed-excerpt {
  margin-top: 8px;
  color: var(--zh-text-2);
  font-size: 15px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feed-cover {
  width: 172px;
  height: 116px;
  flex-shrink: 0;
  border-radius: var(--zh-radius);
  transition: transform 0.3s ease;
}

.feed-item:hover .feed-cover {
  transform: scale(1.04);
}

.feed-actions {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 12px;
}

.feed-more {
  text-align: center;
  padding: 18px 0 6px;
  color: var(--zh-blue);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.feed-more:hover {
  color: #ff8a75;
}

.feed-end {
  text-align: center;
  padding: 18px 0 6px;
  color: var(--zh-text-3);
  font-size: 12px;
  letter-spacing: 0.1em;
}

.explore-side {
  width: 296px;
  flex-shrink: 0;
  /* 跳过标签区的高度，使右侧第一张卡片与左侧第一篇文章卡片顶部齐平 */
  padding-top: var(--feed-head-h);
}

.side-card {
  background: #fff;
  border-radius: var(--zh-radius);
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--zh-shadow);
}

.side-title {
  font-size: 16px;
  font-weight: 600;
  /* 固定高与行高（默认 line-height 是 26.4px，会比 24px 的行盒多出一点），
     保证与左侧标签行在同一水平线上，且不随字体度量浮动 */
  height: 24px;
  line-height: 24px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}



.side-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin: 0 -10px;
  border-radius: 10px;
  transition: background 0.2s;
}

.side-user:hover {
  background: #fff3f1;
}

.rank {
  width: 20px;
  color: var(--zh-text-3);
  font-weight: 600;
  font-size: 15px;
}

/* 注意：不要用 :nth-child 判断名次——卡片里还有标题等兄弟元素，
   那样算出来的是「第 N 个子元素」而不是「第 N 名用户」。 */
.rank-top {
  color: #ff665e;
}

.side-user-head {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.side-user-info {
  min-width: 0;
}

.side-user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--zh-text);
}

.side-user-desc {
  font-size: 12px;
  color: var(--zh-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.metric:first-child {
  color: #ff8a75;
  font-weight: 600;
}

.side-text {
  color: var(--zh-text-2);
  font-size: 14px;
  margin-bottom: 14px;
}

.side-actions {
  display: flex;
  gap: 10px;
}

.side-links {
  gap: 8px 14px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.side-link {
  color: var(--zh-text-2);
  font-size: 13px;
  text-decoration: none;
}

.side-link:hover {
  color: var(--zh-blue);
}

.side-btn {
  flex: 1;
  font-size: 13px;
}

@media (max-width: 768px) {
  .explore-side {
    display: none;
  }

  .feed-tabs {
    gap: 16px;
  }


  .feed-item {
    padding: 14px 16px;
  }

  .feed-title {
    font-size: 18px;
  }

  .feed-cover {
    width: 110px;
    height: 78px;
  }

  .feed-actions {
    gap: 14px;
  }
}
.lock-tag {
  margin-left: 6px;
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  color: #b5aea8;
}

/* 回到顶部 */
.float-top {
  position: fixed;
  right: 32px;
  bottom: 40px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: var(--zh-text-2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.float-top:hover {
  color: var(--zh-blue);
  transform: translateY(-2px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

</style>
