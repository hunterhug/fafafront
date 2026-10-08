<template>
  <div class="home-layout">
    <!-- 主列：内容流 -->
    <div class="home-main">
      <div class="feed-tabs">
        <el-tooltip :content="t('home.sortRecommendHint')" placement="top">
          <span class="feed-tab" :class="{ active: feedTab === 'recommend' }" @click="switchFeed('recommend')">{{ t('home.recommend') }}</span>
        </el-tooltip>
        <el-tooltip :content="t('home.sortLatestHint')" placement="top">
          <span class="feed-tab" :class="{ active: feedTab === 'latest' }" @click="switchFeed('latest')">{{ t('home.latest') }}</span>
        </el-tooltip>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else>
        <el-empty v-if="contents.length === 0" :description="t('home.noContent')" />

        <!-- 知乎式文章卡片 -->
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
              loading="lazy"
              class="feed-cover"
            />
          </div>

          <div class="feed-actions" @click.stop>
            <button class="zh-like-btn" :class="{ liked: c.is_cool }" @click="cool(c)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 20h2c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1H2v11zm19.8-10.2c-.3-.5-.8-.8-1.3-.8H15l.6-2.6c.1-.5 0-1-.3-1.4-.3-.4-.7-.6-1.2-.6h-.8c-.5 0-.9.2-1.2.6l-3.5 4.2c-.3.3-.4.8-.4 1.2v7c0 1.1.9 2 2 2h6.6c.8 0 1.5-.5 1.8-1.3l2.3-5.4v-3.5c0-.6-.2-1.2-.6-1.6z" />
              </svg>
              <span>{{ c.cool || 0 }}</span>
            </button>
            <span class="feed-action" @click="goDetail(c)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span>{{ t('article.commentsCount', { n: c.comment_num || 0 }) }}</span>
            </span>
            <span class="feed-action views">{{ t('article.views', { n: c.views || 0 }) }}</span>
          </div>
        </article>

        <!-- 无限滚动：加载更多 / 加载中 / 到底了 -->
        <div v-if="loadingMore" class="feed-more">{{ t('common.loading') }}</div>
        <div v-else-if="hasMore" class="feed-more" @click="loadMore">{{ t('common.loadMore') }}</div>
        <div v-else-if="contents.length > 0" class="feed-end">— {{ t('home.noMore') }} —</div>
      </template>
    </div>

    <!-- 右侧边栏 -->
    <aside class="home-side">
      <!-- {{ t('home.recommendedUsers') }} -->
      <div class="side-card">
        <el-tooltip :content="t('home.recommendTooltip')" placement="top">
          <div class="side-title">{{ t('home.recommendedUsers') }}</div>
        </el-tooltip>
        <div v-for="u in users" :key="u.id" class="side-user">
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

      <!-- 社区公告 -->
      <div class="side-card">
        <div class="side-title">{{ t('home.aboutCommunity') }}</div>
        <p class="side-text">{{ site.siteTitle }} {{ site.siteIntro }}</p>
        <div v-if="SHOW_SITE_LINKS" class="side-actions side-links">
          <router-link to="/about" class="side-link">{{ t('nav.about') }}</router-link>
          <router-link to="/acknowledgments" class="side-link">{{ t('nav.acknowledgments') }}</router-link>
          <router-link to="/versions" class="side-link">{{ t('nav.versions') }}</router-link>
          <router-link to="/roadmap" class="side-link">{{ t('nav.roadmap') }}</router-link>
        </div>
        <div class="side-actions">
          <template v-if="userStore.isLogin && !userStore.isVip">
            <router-link to="/user/write" class="zh-btn-plain side-btn">{{ t('home.writeArticleVip') }}</router-link>
            <p class="vip-hint">{{ t('home.vipHint') }}</p>
          </template>
          <router-link v-else to="/user/write" class="zh-btn-plain side-btn">{{ t('home.writeArticle') }}</router-link>
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
import { useUserStore } from '@/store/user'
import { useSiteStore } from '@/store/site'
import { t } from '@/i18n'
import { fetchMyFans } from '@/utils/relation'
import { formatRelative, stripMarkdown } from '@/utils/format'
import { contentUrl } from '@/utils/url'
import { SHOW_SITE_LINKS } from '@/utils/siteLinks'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const site = useSiteStore()

const contents = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const page = ref(1)
const limit = 10
const total = ref(0)
const feedTab = ref(localStorage.getItem('homeFeedTab') === 'latest' ? 'latest' : 'recommend')

const users = ref([])

function switchFeed(t) {
  if (feedTab.value === t) return
  feedTab.value = t
  localStorage.setItem('homeFeedTab', t)
  load(1, false)
  window.scrollTo(0, 0)
}

function buildSort() {
  if (feedTab.value === 'latest') {
    // 最新：按首次发布时间倒序
    return [
      '=id', '=top', '-first_publish_time', '-publish_time',
      '-create_time', '-update_time', '-views', '=comment_num', '=bad', '=cool', '=seo'
    ]
  }
  // 推荐：评论数/浏览量/赞（热度主导）→ 发布时间兜底
  // top/sort_num 任何人都可设置，全局推荐禁用（显式 = 声明阻止白名单兜底）
  return [
    '=id', '=top', '=sort_num', '-comment_num', '-views', '-cool',
    '-first_publish_time', '-publish_time', '=bad', '=seo'
  ]
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

async function loadUsers() {
  try {
    const res = await request.post('/app/u', {
      vip: -1,
      limit: 5,
      offset: 0,
      sort: ['=id', '=name', '-followed_num', '-content_cool_num', '=following_num', '=content_num', '=vip', '=activate_time', '=create_time', '=update_time', '=gender']
    })
    users.value = res.data.users || []
    // 标记我关注了谁 + 互相关注（登录时）
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

async function cool(c) {
  if (!userStore.isLogin) {
    ElMessage.warning(t('common.loginFirst'))
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  try {
    await request.post('/api/content/cool', { id: c.id })
    if (c.is_cool) {
      c.is_cool = false
      c.cool = (c.cool || 0) - 1
    } else {
      c.is_cool = true
      c.cool = (c.cool || 0) + 1
    }
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

function goDetail(c) {
  // 地址由「用户名 + 节点 SEO + 文章 SEO」拼成；SEO 不全时不跳转
  const url = contentUrl(c)
  if (url) router.push(url)
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
  document.title = `${site.siteTitle} - ${site.siteSubtitle || ''}`.trim()
  load(1)
  loadUsers()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.home-layout {
  /* 标签区总高度 = 上边距 16 + 行高 24 + 下边距 14；
     侧栏用它作为 padding-top，让第一张卡片与第一篇文章卡片顶部对齐 */
  --feed-head-h: 54px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.home-main {
  flex: 1;
  min-width: 0;
}

/* 推荐/最新 tab（知乎风格） */
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

/* 文章卡片 */
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

.feed-body {
  display: flex;
  gap: 16px;
}

.feed-body.hasCover {
  align-items: flex-start;
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

.feed-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--zh-text-3);
  font-size: 14px;
}

.feed-action:hover {
  color: var(--zh-blue);
}

.feed-action.views {
  cursor: default;
}

.pager {
  margin-top: 16px;
  justify-content: center;
}

.feed-more {
  text-align: center;
  padding: 10px 0 6px;
  color: var(--zh-blue);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.feed-more:hover {
  color: #ff7a2f;
}

.feed-end {
  text-align: center;
  padding: 18px 0 6px;
  color: var(--zh-text-3);
  font-size: 12px;
  letter-spacing: 0.1em;
}

/* 右侧边栏 */
.home-side {
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

.vip-hint {
  color: #b5aea8;
  font-size: 11px;
  margin-top: 6px;
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
  .home-side {
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
