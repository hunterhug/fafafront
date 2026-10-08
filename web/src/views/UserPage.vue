<template>
  <div class="user-site">
    <el-skeleton v-if="loading" :rows="10" animated />

    <div v-else-if="user && user.is_in_black" class="blocked-mask-wrap">
      <div class="blocked-mask">
        <div class="blocked-mask-icon">!</div>
        <div class="blocked-mask-title">{{ t('userpage.blacklisted') }}</div>
        <div class="blocked-mask-desc">{{ t('userpage.blacklistedDesc') }}</div>
        <router-link to="/" class="zh-btn-primary">{{ t('error.backHome') }}</router-link>
      </div>
    </div>

    <template v-else-if="user">
      <!-- 封面条 -->
      <div class="cover-bar"></div>

      <!-- 头部卡 -->
      <div class="zh-card head-card">
        <div class="head-main">
          <el-avatar :size="120" :src="user.head_photo || undefined" class="head-avatar">
            {{ (user.nick_name || user.name || '?')[0] }}
          </el-avatar>
          <div class="head-info">
            <div class="head-name-row">
              <h1 class="head-name">{{ user.nick_name || user.name }}</h1>
              <el-tag v-if="user.is_vip" type="success" size="small">VIP</el-tag>
              <el-tag v-if="user.is_in_black" type="danger" size="small">{{ t('userpage.blacklisted') }}</el-tag>
            </div>
            <div class="head-uname">@{{ user.name }}</div>
            <div class="head-desc">{{ user.short_describe || t('userpage.noBio') }}</div>
            <!-- 详细介绍（社交APP式，超长可展开） -->
            <div v-if="user.describe && user.describe !== user.short_describe" class="head-about">
              <p class="about-text" :class="{ expanded: aboutExpanded }">{{ user.describe }}</p>
              <a v-if="user.describe.length > 80" href="javascript:;" class="about-toggle" @click="aboutExpanded = !aboutExpanded">
                {{ aboutExpanded ? t('userpage.collapse') : t('userpage.expand') }}
              </a>
            </div>
            <!-- 个人资料（小红书式，微博/GitHub 可点击跳转，只显示账号名） -->
            <div class="head-info-tags">
              <span v-if="genderText" class="info-tag">
                <b class="gender-icon" :class="user.gender === 1 ? 'male' : 'female'">
                  {{ user.gender === 1 ? '♂' : '♀' }}
                </b>
                {{ genderText }}
              </span>
              <span v-if="user.email" class="info-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>
                {{ user.email }}
              </span>
              <span v-if="user.qq" class="info-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#1EBAFC"><path d="M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673"/></svg>
                {{ user.qq }}
              </span>
              <span v-if="user.wechat" class="info-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#07C160"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/></svg>
                {{ user.wechat }}
              </span>
              <a
                v-if="user.weibo"
                class="info-tag link"
                :href="'https://weibo.com/' + normSocial(user.weibo, 'weibo.com')"
                target="_blank"
                :title="'https://weibo.com/' + normSocial(user.weibo, 'weibo.com')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#E6162D"><path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.439l-.002.004zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.601l.014-.028zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.57-.18-.405-.615.375-.977.42-1.804 0-2.404-.781-1.112-2.915-1.053-5.364-.03 0 0-.766.331-.571-.271.376-1.217.315-2.224-.27-2.809-1.338-1.337-4.869.045-7.888 3.08C1.309 10.87 0 13.273 0 15.348c0 3.981 5.099 6.395 10.086 6.395 6.536 0 10.888-3.801 10.888-6.82 0-1.822-1.547-2.854-2.915-3.284v.01zm1.908-5.092c-.766-.856-1.908-1.187-2.96-.962-.436.09-.706.511-.616.932.09.42.511.691.932.602.511-.105 1.067.044 1.442.465.376.421.466.977.316 1.473-.136.406.089.856.51.992.405.119.857-.105.992-.512.33-1.021.12-2.178-.646-3.035l.03.045zm2.418-2.195c-1.576-1.757-3.905-2.419-6.054-1.968-.496.104-.812.587-.706 1.081.104.496.586.813 1.082.707 1.532-.331 3.185.15 4.296 1.383 1.112 1.246 1.429 2.943.947 4.416-.165.48.106 1.007.586 1.157.479.165.991-.104 1.157-.586.675-2.088.241-4.478-1.338-6.235l.03.045z"/></svg>
                {{ normSocial(user.weibo, 'weibo.com') }}
              </a>
              <a
                v-if="user.github"
                class="info-tag link"
                :href="'https://github.com/' + normSocial(user.github, 'github.com')"
                target="_blank"
                :title="'https://github.com/' + normSocial(user.github, 'github.com')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#181717"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                {{ normSocial(user.github, 'github.com') }}
              </a>
              <span class="info-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ t('userpage.joined', { date: user.create_time }) }}
              </span>
            </div>
            <div class="head-stats">
              <span><b>{{ user.content_num }}</b> {{ t('user.content') }}</span>
              <router-link :to="`/u/${user.name}/fans`" class="stat-link">
                <b>{{ user.followed_num }}</b> {{ t('user.followers') }}
              </router-link>
              <router-link :to="`/u/${user.name}/follows`" class="stat-link">
                <b>{{ user.following_num }}</b> {{ t('user.following') }}
              </router-link>
              <span><b>{{ user.content_cool_num }}</b> {{ t('userpage.likes') }}</span>
            </div>
          </div>
          <div class="head-actions">
            <!-- 别人的官网 -->
            <template v-if="!isSelf && userStore.isLogin">
              <button
                class="zh-btn-primary"
                :class="{ followed: isFollowing, mutual: isMutual }"
                @click="toggleFollow"
              >{{ isFollowing ? (isMutual ? t('relations.mutual') : t('relations.followed')) : t('relations.follow') }}</button>
              <button class="zh-btn-plain" @click="goChat">{{ t('userpage.sendMsg') }}</button>
              <button class="zh-btn-plain" @click="openReport">{{ t('userpage.report') }}</button>
            </template>
            <template v-else-if="!isSelf && !userStore.isLogin">
              <button class="zh-btn-primary" @click="router.push({ name: 'login', query: { redirect: route.fullPath } })">
                关注
              </button>
              <button class="zh-btn-plain" @click="router.push({ name: 'login', query: { redirect: route.fullPath } })">
                举报
              </button>
            </template>
            <!-- 自己的官网 -->
            <template v-else>
              <button class="zh-btn-plain" @click="router.push('/user/profile')">{{ t('userpage.editProfile') }}</button>
              <button class="zh-btn-primary" @click="router.push('/user/write')">{{ t('userpage.writeArticle') }}</button>
            </template>
          </div>
        </div>
      </div>

      <!-- 主体：tab -->
      <div class="site-body" :class="{ masked: isSelf && !userStore.isVip }">
        <div class="site-main">
          <div class="site-tabs">
            <span class="site-tab" :class="{ active: tab === 'recommend' }" @click="switchTab('recommend')">{{ t('home.recommend') }}</span>
            <span class="site-tab" :class="{ active: tab === 'latest' }" @click="switchTab('latest')">{{ t('home.latest') }}</span>
            <span
              v-for="n in nodes"
              :key="n.id"
              class="site-tab"
              :class="{ active: tab === 'node-' + n.id }"
              @click="switchTab('node-' + n.id)"
            >{{ n.name }}<em class="tab-count">{{ nodeTotalCount(n) }}</em></span>
            <!-- 直达的节点不在可见节点列表里（例如作者本人访问自己的隐藏节点）：
                 显示一个临时 tab，让当前筛选状态可见 -->
            <span
              v-if="routeNode && !nodeVisible(routeNode.id)"
              :key="'route-node-' + routeNode.id"
              class="site-tab"
              :class="{ active: tab === 'node-' + routeNode.id }"
              @click="switchTab('node-' + routeNode.id)"
            >{{ routeNode.name }}<em class="tab-count">{{ t('nodes.hiddenTag') }}</em></span>
          </div>

          <!-- 二级子节点（选中一级节点时展示） -->
          <div v-if="activeParent && (activeParent.son || []).length > 0" class="site-subtabs">
            <span
              class="subtab"
              :class="{ active: activeNodeId === activeParent.id }"
              @click="selectNode(activeParent.id, true)"
            >{{ t('common.all') }}</span>
            <span
              v-for="s in activeParent.son"
              :key="s.id"
              class="subtab"
              :class="{ active: activeNodeId === s.id }"
              @click="selectNode(s.id, false)"
            >{{ s.name }}<em class="tab-count">{{ s.content_num || 0 }}</em></span>
          </div>

          <el-empty
            v-if="contents.length === 0"
            :description="nodeMissing ? t('nodes.hiddenOrMissing') : t('userpage.noContent')"
            :image-size="60"
          />
          <article
            v-for="c in contents"
            :key="c.id"
            class="zh-card site-article"
            @click="goDetail(c)"
          >
            <div class="sa-head">
              <router-link
                v-if="c.node_seo && nodeNameBySeo(c.node_seo)"
                class="sa-node"
                :to="nodeUrl(c.user_name, c.node_seo)"
                @click.stop
              >{{ nodeNameBySeo(c.node_seo) }}</router-link>
              <span v-if="c.node_hidden" class="sa-hidden">{{ t('nodes.hiddenTag') }}</span>
              <span class="sa-time">{{ formatRelative(c.first_publish_time_int) }}</span>
            </div>
            <div class="sa-body" :class="{ hasCover: c.image_path }">
              <div class="sa-text">
                <h2 class="sa-title">{{ c.title }}<span v-if="c.is_lock" class="lock-tag" :title="t('article.locked')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span></h2>
                <p class="sa-excerpt">{{ stripMarkdown(c.describe) }}</p>
              </div>
              <el-image
                v-if="c.image_path"
                :src="c.image_path"
                fit="cover"
                loading="lazy"
                class="sa-cover"
              />
            </div>
            <div class="sa-actions">
              <span>{{ c.cool || 0 }} {{ t('article.like') }}</span>
              <span>{{ c.comment_num || 0 }} {{ t('article.comments') }}</span>
              <span>{{ c.views || 0 }} {{ t('article.viewsShort') }}</span>
            </div>
          </article>
          <!-- 无限滚动 -->
          <div v-if="loadingMore" class="feed-more">{{ t('common.loading') }}</div>
          <div v-else-if="hasMore" class="feed-more" @click="loadMore">{{ t('common.loadMore') }}</div>
          <div v-else-if="contents.length > 0" class="feed-end">— {{ t('home.noMore') }} —</div>
        </div>

        <!-- 非 VIP 自己官网的蒙版 -->
        <div v-if="isSelf && !userStore.isVip" class="vip-mask">
          <div class="vip-mask-inner">
            <div class="vip-mask-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <p class="vip-mask-title">{{ t('userpage.vipMask') }}</p>
            <p class="vip-mask-sub">{{ t('userpage.vipMaskHint') }}</p>
            <el-button v-if="userStore.canManageUsers" type="primary" size="small" @click="$router.push('/admin/users')">
              管理 VIP
            </el-button>
          </div>
        </div>
      </div>

    </template>

    <el-empty v-else :description="t('common.noData')" />

    <!-- 回到顶部 -->
    <transition name="fade">
      <button v-if="showFloatTop" class="float-top" :title="t('common.top')" @click="scrollToTop">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </button>
    </transition>

    <!-- 举报用户对话框 -->
    <ReportDialog v-model:visible="reportVisible" @confirm="handleReport" />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { t } from '@/i18n'
import { useUserStore } from '@/store/user'
import { useSiteStore } from '@/store/site'
import { normSocial, formatRelative, stripMarkdown } from '@/utils/format'
import { contentUrl, nodeUrl } from '@/utils/url'
import { fetchMyFans } from '@/utils/relation'
import ReportDialog from '@/components/ReportDialog.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const site = useSiteStore()
const userName = ref(route.params.name)

const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(false)
const user = ref(null)
const nodes = ref([])
const contents = ref([])
const total = ref(0)
const page = ref(1)
const limit = 10
const activeNodeId = ref(0)
const includeChildren = ref(false)
// URL 直达的节点（/u/<用户名>/node/<节点SEO>）；隐藏节点只有作者本人能取到
const routeNode = ref(null)
// 节点取不到时的提示类型：'' | 'hidden'（不存在或已隐藏）
const nodeMissing = ref('')
const allCount = ref(0)
const aboutExpanded = ref(false)
const tab = ref('recommend')
const isFollowing = ref(false)
const isMutual = ref(false)
const followingLoading = ref(false)

const isSelf = computed(() => userStore.isLogin && userStore.user?.name === userName.value)

const genderText = computed(() => {
  if (!user.value) return ''
  if (user.value.gender === 1) return t('user.male')
  if (user.value.gender === 2) return t('user.female')
  return t('user.secret')
})

async function loadUser() {
  try {
    const res = await request.post('/app/u/info', { user_name: userName.value })
    user.value = res.data
    document.title = `${res.data?.nick_name || res.data?.name || userName.value}的官网 - ${site.siteTitle}`
  } catch (e) {
    user.value = null
  }
}

// 全部内容总数（节点 tab 用）
async function loadAllCount() {
  try {
    const res = await request.post('/app/u/content', {
      user_name: userName.value,
      limit: 1,
      page: 1
    })
    allCount.value = res.data.total || 0
  } catch (e) {
    allCount.value = 0
  }
}

async function loadNodes() {
  try {
    const res = await request.post('/app/u/nodes', { user_name: userName.value })
    nodes.value = res.data.nodes || []
  } catch (e) {
    nodes.value = []
  }
}

async function loadContents(p = 1, append = false) {
  page.value = p
  if (append) loadingMore.value = true
  try {
    const res = await request.post('/app/u/content', {
      user_name: userName.value,
      node_id: activeNodeId.value,
      include_children: includeChildren.value,
      node_seo: '',
      first_publish_time_begin: 0,
      first_publish_time_end: 0,
      publish_time_begin: 0,
      publish_time_end: 0,
      sort: buildContentSort(),
      limit,
      page: p
    })
    const list = res.data.contents || []
    contents.value = append ? [...contents.value, ...list] : list
    total.value = res.data.total || 0
    hasMore.value = contents.value.length < total.value
  } catch (e) {
    if (!append) contents.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loading.value || loadingMore.value) return
  loadContents(page.value + 1, true)
}

// 回到顶部按钮显示（仅监听滚动，不自动加载）
const showFloatTop = ref(false)

function onScroll() {
  showFloatTop.value = document.documentElement.scrollTop > 500
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 打开文章：地址由「用户名 + 节点 SEO + 文章 SEO」拼成（见 utils/url.js）
function goDetail(c) {
  const url = contentUrl(c)
  if (url) router.push(url)
}

function switchTab(t) {
  tab.value = t
  if (t === 'recommend' || t === 'latest') {
    activeNodeId.value = 0
    includeChildren.value = false
    syncNodeUrl(0)
  } else if (String(t).startsWith('node-')) {
    const id = Number(String(t).slice(5))
    activeNodeId.value = id
    includeChildren.value = true
    syncNodeUrl(id)
  }
  loadContents(1)
}

// 把当前选中的节点同步到地址栏（节点 SEO 在同一用户内唯一）
function syncNodeUrl(nodeId) {
  if (nodeId === 0) {
    if (route.params.nodeSeo) {
      router.replace({ name: 'user-page', params: { name: userName.value } })
    }
    return
  }
  const seo = nodeSeoById(nodeId)
  if (!seo) return
  const target = nodeUrl(userName.value, seo)
  if (route.params.nodeSeo !== seo) {
    router.replace(target)
  }
}

// 在可见节点列表里按 id 找节点
function findNodeById(nodeId) {
  const find = (list) => {
    for (const n of list) {
      if (n.id === nodeId) return n
      const r = find(n.son || [])
      if (r) return r
    }
    return null
  }
  return find(nodes.value)
}

// 节点 id → SEO（可见节点列表优先，其次是 URL 直达的节点）
function nodeSeoById(nodeId) {
  const n = findNodeById(nodeId)
  if (n) return n.seo || ''
  if (routeNode.value && routeNode.value.id === nodeId) return routeNode.value.seo || ''
  return ''
}

// 该节点是否出现在可见节点列表里（隐藏节点只有作者本人能直达，不在列表里）
function nodeVisible(nodeId) {
  return !!findNodeById(nodeId)
}

// 节点名（用于筛选提示/标题）
const activeNodeName = computed(() => {
  if (activeNodeId.value === 0) return t('userpage.allContent')
  const find = (list) => {
    for (const n of list) {
      if (n.id === activeNodeId.value) return n.name
      if (n.son) {
        const r = find(n.son)
        if (r) return r
      }
    }
    return ''
  }
  return find(nodes.value) || t('userpage.articles')
})

// 一级节点总文章数 = 直发文章 + 各二级子节点文章
function nodeTotalCount(n) {
  const sons = (n.son || []).reduce((a, s) => a + (s.content_num || 0), 0)
  return (n.content_num || 0) + sons
}

// 节点 seo → 名称（文章卡片上的节点标签显示名称而非 seo）
function nodeNameBySeo(seo) {
  if (!seo) return ''
  const find = (list) => {
    for (const n of list) {
      if (n.seo === seo) return n.name
      if (n.son) {
        const r = find(n.son)
        if (r) return r
      }
    }
    return ''
  }
  const name = find(nodes.value)
  if (name) return name
  // 直达的隐藏节点不在可见列表里，用带过来的节点信息兜底；
  // 仍然找不到就返回空——不要把 SEO 字符串当成节点名显示
  if (routeNode.value && routeNode.value.seo === seo) return routeNode.value.name
  return ''
}

// 选择节点：withChildren=true 表示一级节点下钻（含二级子节点文章）
function selectNode(nodeId, withChildren = false) {
  activeNodeId.value = nodeId
  includeChildren.value = withChildren
  syncNodeUrl(nodeId)
  loadContents(1)
}

// 当前选中的一级节点（node-<id> tab）
const activeParent = computed(() => {
  const t = String(tab.value)
  if (!t.startsWith('node-')) return null
  const pid = Number(t.slice(5))
  return nodes.value.find((n) => n.id === pid) || null
})

// 从文章卡片的节点标签跳转到对应节点（一级则下钻，二级则选中该子节点）
// 已废弃：卡片标签现在是按节点 SEO 生成的 router-link，这里保留给内部调用
function jumpToNode(nodeId) {
  for (const n of nodes.value) {
    if (n.id === nodeId) {
      tab.value = 'node-' + n.id
      activeNodeId.value = n.id
      includeChildren.value = true
      loadContents(1)
      return
    }
    const s = (n.son || []).find((x) => x.id === nodeId)
    if (s) {
      tab.value = 'node-' + n.id
      activeNodeId.value = s.id
      includeChildren.value = false
      loadContents(1)
      return
    }
  }
}

function buildContentSort() {
  if (tab.value === 'latest') {
    // 最新：纯首次发布时间倒序
    return [
      '=id', '=top', '=sort_num', '-first_publish_time', '-publish_time',
      '-create_time', '-update_time', '-views', '=comment_num', '=bad', '=cool', '=seo'
    ]
  }
  // 推荐：置顶 → 手动排序 → 评论/浏览/赞 → 时间
  return [
    '=id', '-top', '+sort_num', '-comment_num', '-views', '-cool',
    '-first_publish_time', '-publish_time', '=bad', '=seo'
  ]
}

async function loadFollowingStatus() {
  if (!userStore.isLogin || isSelf.value || !user.value) return
  try {
    const [res, fans] = await Promise.all([
      request.post('/api/relation/following/me', {
        limit: 100,
        page: 1,
        sort: ['=id', '=user_a_id', '=user_b_id', '-create_time']
      }),
      fetchMyFans()
    ])
    isFollowing.value = (res.data.relations || []).some((r) => r.user_b_id === user.value.id)
    isMutual.value = isFollowing.value && fans.has(user.value.id)
  } catch (e) {
    isFollowing.value = false
    isMutual.value = false
  }
}

async function toggleFollow() {
  if (!userStore.isLogin) {
    ElMessage.warning(t('common.loginFirst'))
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  followingLoading.value = true
  try {
    if (isFollowing.value) {
      await request.post('/api/relation/follow/minute', { user_id: user.value.id, user_name: user.value.name })
      isFollowing.value = false
      isMutual.value = false
      user.value.followed_num = Math.max((user.value.followed_num || 0) - 1, 0)
      ElMessage.success(t('common.unfollowSuccess'))
    } else {
      await request.post('/api/relation/follow/add', { user_id: user.value.id, user_name: user.value.name })
      isFollowing.value = true
      isMutual.value = (await fetchMyFans()).has(user.value.id)
      user.value.followed_num = (user.value.followed_num || 0) + 1
      ElMessage.success(t('common.followSuccess'))
    }
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  } finally {
    followingLoading.value = false
  }
}

function goChat() {
  if (!userStore.isLogin) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  router.push({ path: '/user/messages', query: { peer: user.value.id } })
}

// 举报用户
const reportVisible = ref(false)

function openReport() {
  if (!userStore.isLogin) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  reportVisible.value = true
}

async function handleReport(reason) {
  try {
    await request.post('/api/user/bad', { id: user.value.id, reason })
    ElMessage.success(t('article.reportSuccess'))
  } catch (e) {
    if (e.id === 110012) {
      ElMessage.warning(t('report.reportedUser'))
    } else {
      ElMessage.error(e.msg || t('common.failed'))
    }
  }
}

// 按 URL 里的节点 SEO 定位节点并列出该节点文章。
// 节点 SEO 在同一用户内唯一；隐藏节点对访客不可见（会取不到），
// 作者本人访问自己的隐藏节点则能正常看到文章。
async function applyRouteNode(nodeSeo) {
  routeNode.value = null
  nodeMissing.value = ''
  try {
    const res = await request.post('/app/u/node', { user_name: userName.value, seo: nodeSeo })
    const n = res.data
    if (!n || !n.id) throw new Error('node not found')
    routeNode.value = { id: n.id, seo: n.seo, name: n.name, level: n.level || 0 }
    tab.value = 'node-' + n.id
    activeNodeId.value = n.id
    includeChildren.value = (n.level || 0) === 0
    await loadContents(1)
  } catch (e) {
    // 节点不存在，或者节点已被隐藏而当前访问者不是作者本人
    nodeMissing.value = 'hidden'
    tab.value = 'recommend'
    activeNodeId.value = 0
    includeChildren.value = false
  }
}

// 完整加载（用户/节点/文章/关注状态/计数）
async function loadAll() {
  // 旧的 ?node=<id> 地址已废弃：清掉参数，只展示个人主页
  if (route.query.node !== undefined) {
    router.replace({ name: 'user-page', params: { name: userName.value } })
  }
  loading.value = true
  tab.value = 'recommend'
  activeNodeId.value = 0
  includeChildren.value = false
  routeNode.value = null
  nodeMissing.value = ''
  await loadUser()
  await Promise.all([loadNodes(), loadFollowingStatus(), loadAllCount()])
  const nodeSeo = route.params.nodeSeo
  if (nodeSeo) {
    await applyRouteNode(String(nodeSeo))
  } else {
    await loadContents(1)
  }
  loading.value = false
}

// 官网之间跳转（/u/a -> /u/b）组件复用，监听路由变化重新加载
watch(
  () => route.params.name,
  () => {
    userName.value = route.params.name
    loadAll()
  }
)

// 节点 SEO 变化（含前进/后退）：与当前选中节点不一致时才重新定位，
// 避免页面内部同步地址栏时重复请求
watch(
  () => route.params.nodeSeo,
  async (nv) => {
    const seo = nv ? String(nv) : ''
    if (!seo) {
      if (activeNodeId.value !== 0) {
        tab.value = 'recommend'
        activeNodeId.value = 0
        includeChildren.value = false
        routeNode.value = null
        nodeMissing.value = ''
        await loadContents(1)
      }
      return
    }
    if (nodeSeoById(activeNodeId.value) === seo) return
    loading.value = true
    await applyRouteNode(seo)
    loading.value = false
  }
)

onMounted(() => {
  loadAll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.blocked-mask-wrap {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.blocked-mask {
  background: #fff;
  border-radius: var(--zh-radius);
  box-shadow: var(--zh-shadow);
  padding: 48px 40px;
  max-width: 420px;
  width: 100%;
  text-align: center;
}

.blocked-mask-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fef0f0;
  color: #f56c6c;
  font-size: 30px;
  font-weight: 700;
}

.blocked-mask-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--zh-text-1, #303133);
  margin: 0 0 10px;
}

.blocked-mask-desc {
  font-size: 14px;
  color: var(--zh-text-2, #606266);
  line-height: 1.7;
  margin: 0 0 24px;
}

.cover-bar {
  height: 160px;
  background: linear-gradient(135deg, #ff8a75 0%, #ff5f57 45%, #ffd0c9 100%);
  border-radius: 8px 8px 0 0;
  margin-bottom: -45px;
}

.head-card {
  padding: 0 24px 20px;
  position: relative;
}

.head-main {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  padding-top: 8px;
}

.head-avatar {
  border: 4px solid #fff;
  box-shadow: 0 2px 10px rgba(255, 95, 87, 0.25);
  border-radius: 12px;
  background: linear-gradient(135deg, #ff8a75, #ff5f57);
  color: #fff;
  font-size: 46px;
  flex-shrink: 0;
}

.head-info {
  flex: 1;
  padding: 10px 0 0;
  min-width: 0;
}

.head-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.head-name {
  font-size: 24px;
  font-weight: 700;
}

.head-uname {
  color: var(--zh-text-3);
  font-size: 14px;
}

.head-desc {
  color: var(--zh-text-2);
  font-size: 14px;
  margin-top: 10px;
  line-height: 1.7;
}

.head-about {
  margin-top: 10px;
}

.about-text {
  color: var(--zh-text-2);
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.about-text.expanded {
  display: block;
}

.about-toggle {
  color: var(--zh-blue);
  font-size: 13px;
}

.head-info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.info-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  background: #f5f0ed;
  border-radius: 999px;
  font-size: 12px;
  color: var(--zh-text-2);
}

.info-tag.link {
  cursor: pointer;
  text-decoration: none;
}

.info-tag.link:hover {
  background: #fff1f0;
  color: var(--zh-blue);
}

.gender-icon.male {
  color: #2196f3;
}

.gender-icon.female {
  color: #ff4d6a;
}

.head-stats {
  display: flex;
  gap: 28px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f5f0ed;
  color: var(--zh-text-3);
  font-size: 14px;
}

.stat-link {
  cursor: pointer;
}

.stat-link:hover b {
  color: var(--zh-blue);
}

/* 关系列表 */
.rel-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rel-tabs {
  display: flex;
  gap: 16px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--zh-border);
}

.rel-tab {
  font-size: 14px;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 8px 4px;
}

.rel-tab:hover {
  color: var(--zh-blue);
}

.rel-tab.active {
  color: var(--zh-blue);
  font-weight: 600;
  border-bottom: 2px solid var(--zh-blue);
}

.rel-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  border-bottom: 1px solid #f5f0ed;
}

.rel-user:last-child {
  border-bottom: none;
}

.rel-user:hover {
  background: #fff8f5;
}

.rel-user-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.rel-user-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--zh-text);
  display: flex;
  align-items: center;
}

.rel-user-desc {
  color: #9b9491;
  font-size: 12px;
  margin-top: 2px;
}

.rel-user-bio {
  color: var(--zh-text-2);
  font-size: 13px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}

.rel-user-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.follow-btn {
  border: 1px solid var(--zh-blue);
  background: #fff;
  color: var(--zh-blue);
  border-radius: 999px;
  padding: 4px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.follow-btn:hover {
  background: var(--zh-blue);
  color: #fff;
}

.follow-btn.following {
  background: #f0f0f0;
  border-color: #e0dcd9;
  color: #9b9491;
}

.site-btn {
  color: #9b9491;
}

.rel-user-info {
  flex: 1;
  min-width: 0;
}

.rel-user-name {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rel-user-desc {
  color: var(--zh-text-3);
  font-size: 12px;
}

.rel-user-arrow {
  color: var(--zh-text-3);
  font-size: 18px;
}

.head-stats b {
  color: var(--zh-text);
}

.head-actions {
  display: flex;
  gap: 10px;
  padding-bottom: 4px;
}

.site-body {
  margin-top: 12px;
  position: relative;
}

.site-body.masked .site-main {
  filter: blur(2px);
  pointer-events: none;
  user-select: none;
}

.vip-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.75);
  border-radius: var(--zh-radius);
  z-index: 5;
}

.vip-mask-inner {
  text-align: center;
  background: #fff;
  border-radius: 8px;
  padding: 24px 40px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.vip-mask-icon {
  color: #b5aea8;
  display: flex;
  justify-content: center;
}

.vip-mask-title {
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  color: var(--zh-text);
}

.vip-mask-sub {
  color: var(--zh-text-3);
  font-size: 13px;
  margin-top: 4px;
  margin-bottom: 12px;
}

.site-main {
  width: 100%;
}

.site-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0 24px;
  background: #fff;
  padding: 0 20px;
  border-radius: var(--zh-radius);
  margin-bottom: 12px;
  box-shadow: var(--zh-shadow);
}

.site-subtabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 4px 12px;
}

.subtab {
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 13px;
  color: var(--zh-text-2);
  background: #fff;
  cursor: pointer;
  border: 1px solid var(--zh-border);
  transition: all 0.15s;
}

.subtab:hover {
  color: var(--zh-blue);
  border-color: var(--zh-blue);
}

.subtab.active {
  background: var(--zh-blue);
  color: #fff;
  border-color: var(--zh-blue);
}

.site-feed-tabs {
  display: flex;
  gap: 20px;
  background: #fff;
  padding: 0 16px;
  border-radius: var(--zh-radius);
  margin-bottom: 12px;
  box-shadow: var(--zh-shadow);
}

.site-feed-tab {
  font-size: 15px;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 12px 4px;
}

.site-feed-tab:hover {
  color: var(--zh-blue);
}

.site-feed-tab.active {
  color: var(--zh-blue);
  font-weight: 600;
  border-bottom: 3px solid var(--zh-blue);
}

.node-filter-hint {
  font-size: 13px;
  color: var(--zh-text-3);
  padding: 6px 4px;
}

.node-filter-hint a {
  margin-left: 10px;
  color: var(--zh-blue);
}

.node-articles-list {
  margin-top: 8px;
}

/* 节点 tab：树形侧栏 + 文章列表 */
.node-layout {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.node-tree {
  width: 230px;
  flex-shrink: 0;
  padding: 10px;
  max-height: 640px;
  overflow-y: auto;
  position: sticky;
  top: 70px;
}

.nt-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--zh-text-2);
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 2px;
}

.nt-item b {
  font-size: 12px;
  color: #b5aea8;
  font-weight: 500;
}

.nt-item:hover {
  background: #fff3f1;
  color: var(--zh-blue);
}

.nt-item.active {
  background: var(--zh-blue);
  color: #fff;
  font-weight: 600;
}

.nt-item.active b {
  color: rgba(255, 255, 255, 0.85);
}

.nt-item.son {
  padding-left: 28px;
  font-size: 13px;
}

.node-articles-panel {
  flex: 1;
  min-width: 0;
}

.na-head {
  font-size: 15px;
  font-weight: 600;
  color: var(--zh-text-2);
  padding: 4px 4px 10px;
}

.site-tab {
  font-size: 15px;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 14px 0;
}

.tab-count {
  font-style: normal;
  font-weight: 500;
  color: var(--zh-text-3);
  margin-left: 4px;
  font-size: 12px;
}

.site-tab.active .tab-count,
.subtab.active .tab-count {
  color: var(--zh-blue);
}

.site-tab:hover {
  color: var(--zh-blue);
}

.site-tab.active {
  color: var(--zh-blue);
  font-weight: 600;
  border-bottom: 3px solid var(--zh-blue);
}

.site-article {
  padding: 20px 24px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.site-article:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.sa-head {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--zh-text-3);
  font-size: 13px;
}

.sa-node {
  color: var(--zh-blue);
  cursor: pointer;
  text-decoration: none;
}

/* 文章挂在已隐藏的节点上（只有作者本人能看到这类文章） */
.sa-hidden {
  font-size: 12px;
  color: var(--zh-orange, #e6a23c);
  border: 1px solid currentColor;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 16px;
}

.sa-title {
  font-size: 20px;
  font-weight: 600;
  margin-top: 6px;
}

.site-article:hover .sa-title {
  color: var(--zh-blue);
}

.sa-body {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.sa-text {
  flex: 1;
  min-width: 0;
}

.sa-cover {
  width: 140px;
  height: 90px;
  border-radius: 8px;
  flex-shrink: 0;
  object-fit: cover;
}

.sa-excerpt {
  color: var(--zh-text-2);
  font-size: 14px;
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sa-actions {
  display: flex;
  gap: 20px;
  margin-top: 10px;
  color: var(--zh-text-3);
  font-size: 13px;
}

.site-node {
  padding: 14px 20px;
}

.node-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.node-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--zh-text);
}

.node-name:hover {
  color: var(--zh-blue);
}

.node-count {
  color: var(--zh-text-3);
  font-size: 13px;
}

.node-son {
  margin: 8px 0 0 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
}

.son-name {
  color: var(--zh-text-2);
  font-size: 14px;
}

.son-name:hover {
  color: var(--zh-blue);
}

.about-card {
  padding: 20px 24px;
}

.about-title {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 12px;
}

.about-text {
  color: var(--zh-text-2);
  font-size: 15px;
  line-height: 1.8;
}

.about-meta {
  margin-top: 16px;
  color: var(--zh-text-2);
  font-size: 14px;
  line-height: 2;
}

.about-meta span {
  color: var(--zh-text-3);
}

.pager {
  margin-top: 16px;
  justify-content: center;
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

/* ===== 移动端适配 ===== */
@media (max-width: 768px) {
  .head-main {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .head-info-tags {
    justify-content: center;
  }
  .head-stats {
    justify-content: center;
  }
  .head-actions {
    justify-content: center;
  }
  .node-layout {
    flex-direction: column;
  }
  .node-tree {
    width: 100%;
    max-height: 220px;
    position: static;
  }
  .site-tabs {
    padding: 0 12px;
  }
  .site-article {
    padding: 14px 16px;
  }
  .sa-title {
    font-size: 18px;
  }
  .sa-cover {
    width: 104px;
    height: 70px;
  }
}

.lock-tag {
  margin-left: 6px;
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  color: #b5aea8;
}

</style>
