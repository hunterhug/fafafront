<template>
  <div class="zh-layout">
    <!-- 知乎式顶部导航 -->
    <header class="zh-nav">
      <div class="zh-nav-inner">
        <router-link to="/" class="zh-logo">
          <SiteLogo :size="32" class="zh-logo-icon" />
          <span class="zh-logo-text">{{ site.siteTitle }}</span>
        </router-link>
        <nav class="zh-nav-links">
          <router-link to="/" class="zh-nav-link home-link">{{ t('nav.home') }}</router-link>
          <router-link to="/explore" class="zh-nav-link">{{ t('nav.explore') }}</router-link>
        </nav>
        <div class="zh-nav-right">
          <LanguageSwitcher />
          <template v-if="userStore.isLogin">
            <router-link to="/user/messages" class="zh-nav-icon" :title="t('nav.messages')">
              <el-badge :value="unread" :hidden="!unread" :max="99">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
              </el-badge>
            </router-link>
            <el-dropdown trigger="click" @command="onCommand">
              <span class="zh-avatar-wrap">
                <el-avatar :size="32" :src="userStore.user?.head_photo || undefined" class="zh-avatar">
                  {{ (userStore.user?.nick_name || userStore.user?.name || '?')[0] }}
                </el-avatar>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="site">{{ t('nav.mySite') }}</el-dropdown-item>
                  <el-dropdown-item command="dashboard">{{ t('nav.dashboard') }}</el-dropdown-item>
                  <el-dropdown-item v-if="userStore.canAdmin" command="admin">{{ t('nav.admin') }}</el-dropdown-item>
                  <el-dropdown-item divided command="logout">{{ t('nav.logout') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <router-link to="/user/login" class="zh-btn-plain">{{ t('nav.login') }}</router-link>
            <router-link to="/user/register" class="zh-btn-primary">{{ t('nav.register') }}</router-link>
          </template>
        </div>
      </div>
    </header>

    <main class="zh-main">
      <router-view />
    </main>

    <footer class="zh-footer">
      <div class="zh-footer-links">
        <template v-if="SHOW_SITE_LINKS">
          <router-link to="/about" class="zh-footer-link">{{ t('nav.about') }}</router-link>
          <router-link to="/acknowledgments" class="zh-footer-link">{{ t('nav.acknowledgments') }}</router-link>
          <router-link to="/versions" class="zh-footer-link">{{ t('nav.versions') }}</router-link>
          <router-link to="/roadmap" class="zh-footer-link">{{ t('nav.roadmap') }}</router-link>
        </template>
        <a
          v-for="l in site.friendLinks"
          :key="l.id"
          :href="l.url"
          class="zh-footer-link"
          :target="l.open_new === 1 ? '_blank' : '_self'"
          :rel="l.open_new === 1 ? 'noopener' : undefined"
        >{{ l.name }}</a>
        <a v-if="SHOW_SITE_LINKS" href="https://github.com/hunterhug/fafacms" target="_blank" rel="noopener" class="zh-footer-link">GitHub</a>
      </div>
      <div class="zh-footer-brand">{{ site.footerIntro }}</div>
    </footer>

    <!-- 移动端底部导航（全局，跨布局） -->
    <MobileTabbar />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { useSiteStore } from '@/store/site'
import request from '@/api'
import MobileTabbar from '@/components/MobileTabbar.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import SiteLogo from '@/components/SiteLogo.vue'
import { t } from '@/i18n'
import { SHOW_SITE_LINKS } from '@/utils/siteLinks'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const site = useSiteStore()
const unread = ref(0)

function onCommand(cmd) {
  switch (cmd) {
    case 'site':
      router.push(`/u/${userStore.user?.name}`)
      break
    case 'dashboard':
      router.push('/user')
      break
    case 'admin':
      router.push('/admin')
      break
    case 'logout':
      userStore.logout()
      ElMessage.success(t('auth.logoutSuccess'))
      router.push('/')
      break
  }
}

// 拉取未读消息数
async function loadUnread() {
  if (!userStore.isLogin) return
  try {
    const res = await request.post('/api/message/list', {
      message_type: -1,
      receive_status: 0,
      limit: 1,
      page: 1
    })
    const un = res.data?.un_read || {}
    unread.value = Object.values(un).reduce((a, b) => a + (Number(b) || 0), 0)
  } catch (e) {
    unread.value = 0
  }
}

// 未读轮询（5 秒），及时感知新私信/通知
let unreadTimer = null
function startUnreadPolling() {
  if (unreadTimer) return
  unreadTimer = setInterval(() => {
    if (!document.hidden) loadUnread()
  }, 5000)
}

onMounted(() => {
  site.load()
  loadUnread()
  if (userStore.isLogin) {
    userStore.refresh()
    userStore.loadPerm()
  }
  window.addEventListener('unread-updated', loadUnread)
  startUnreadPolling()
})

onUnmounted(() => {
  if (unreadTimer) {
    clearInterval(unreadTimer)
    unreadTimer = null
  }
  window.removeEventListener('unread-updated', loadUnread)
})
// 路由变化（如从消息页返回）时刷新未读数
watch(() => route.path, () => {
  if (userStore.isLogin) loadUnread()
})
</script>

<style scoped>
.zh-layout {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

/* 导航 */
.zh-nav {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
  border-bottom: 1px solid var(--zh-border);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.zh-nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.zh-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 28px;
}

.zh-logo-icon {
  /* 图形由 SiteLogo 组件绘制（猫爪），这里只保留布局 */
  width: 32px;
  height: 32px;
}

.zh-logo-text {
  font-size: 18px;
  font-weight: 700;
  background: var(--zh-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.zh-nav-links {
  display: flex;
  gap: 24px;
}

.zh-nav-link {
  color: var(--zh-text-2);
  font-size: 15px;
  line-height: 52px;
}

.zh-nav-link:hover {
  color: var(--zh-blue);
}

.zh-nav-link.router-link-active {
  color: var(--zh-blue);
  font-weight: 600;
  border-bottom: 3px solid var(--zh-blue);
}

/* 首页链接精确匹配：只有恰好 / 才蓝底，切到其他页面时蓝底消失 */
.zh-nav-link.home-link.router-link-active:not(.router-link-exact-active) {
  color: var(--zh-text-2);
  font-weight: normal;
  border-bottom: none;
}

.zh-nav-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 20px;
}

/* 右侧图标组统一对齐：消除内联 SVG 基线偏移（真实浏览器） */
.zh-nav-right > * {
  display: flex;
  align-items: center;
}

.zh-nav-icon {
  color: var(--zh-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
}

.zh-nav-icon:hover {
  color: var(--zh-blue);
}

/* 消息图标内 el-badge + svg 居中，svg 块级化去基线 */
.zh-nav-icon .el-badge {
  display: flex;
  align-items: center;
  justify-content: center;
}

.zh-nav-icon svg,
.lang-btn svg {
  display: block;
}

.zh-avatar-wrap {
  cursor: pointer;
  display: inline-flex;
}

.zh-avatar {
  background: var(--zh-blue);
  color: #fff;
}

/* 主内容 */
.zh-main {
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 20px;
}

.zh-footer {
  text-align: center;
  color: var(--zh-text-3);
  font-size: 13px;
  padding: 24px 16px;
}

.zh-footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 8px;
}

.zh-footer-link {
  color: var(--zh-text-2);
  text-decoration: none;
  font-size: 13px;
}

.zh-footer-link:hover {
  color: var(--zh-blue);
}

.zh-footer-brand {
  color: var(--zh-text-3);
}

@media (max-width: 768px) {
  /* 移动端顶部隐藏「首页/发现」导航（底部 tabbar 已覆盖），给 logo + 登录/头像留空间 */
  .zh-nav-links {
    display: none;
  }

  .zh-nav-inner {
    gap: 8px;
    padding: 0 12px;
  }

  /* 移动端 logo 留白收紧，标题超长省略，避免顶栏换行错版 */
  .zh-logo {
    margin-right: 8px;
    min-width: 0;
  }

  .zh-logo-text {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .zh-nav-right {
    gap: 8px;
  }

  /* 给底部 tabbar（MobileTabbar 组件）留出空间 */
  .zh-main {
    padding-bottom: 64px;
  }

  .zh-footer {
    display: none;
  }
}
</style>
