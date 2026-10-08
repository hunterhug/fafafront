<template>
  <div class="user-layout">
    <!-- 左侧：用户卡 + 菜单 -->
    <aside class="user-aside">
      <div class="zh-card user-card">
        <router-link :to="`/u/${userStore.user?.name}`" class="uc-head">
          <el-avatar :size="48" :src="userStore.user?.head_photo || undefined">
            {{ (userStore.user?.nick_name || userStore.user?.name || '?')[0] }}
          </el-avatar>
          <div class="uc-info">
            <div class="uc-name">{{ userStore.user?.nick_name || userStore.user?.name }}</div>
            <div class="uc-uname">@{{ userStore.user?.name }}</div>
          </div>
        </router-link>
        <router-link :to="`/u/${userStore.user?.name}`" class="uc-link">{{ t('nav.mySite') }} →</router-link>
      </div>

      <!-- 知乎式菜单 -->
      <div class="zh-card nav-card">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: activeMenu === item.to }"
        >
          <span class="nav-icon" v-html="item.icon"></span>
          <span class="nav-name">{{ t(item.name) }}</span>
          <el-badge v-if="item.badge && unread > 0" :value="unread" :max="99" class="nav-badge" />
        </router-link>
      </div>
    </aside>

    <!-- 右侧内容 -->
    <main class="user-main">
      <router-view />
    </main>

    <!-- 移动端底部导航（全局，跨布局） -->
    <MobileTabbar />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import request from '@/api'
import MobileTabbar from '@/components/MobileTabbar.vue'
import { t } from '@/i18n'

const route = useRoute()
const userStore = useUserStore()
const unread = ref(0)

const S = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`

const menuItems = [
  { to: '/user/manage?write=1', icon: S('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'), name: 'user.write' },
  { to: '/user/manage', icon: S('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'), name: 'user.manage' },
  { to: '/user/files', icon: S('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'), name: 'user.files' },
  { to: '/user/messages', icon: S('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'), name: 'user.messages', badge: true },
  { to: '/user/follows', icon: S('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'), name: 'user.follows' },
  { to: '/user/profile', icon: S('<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>'), name: 'user.profile' },
  { to: '/user/password', icon: S('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'), name: 'user.password' },
  { to: '/user/security', icon: S('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'), name: 'user.security' },
  { to: '/', icon: S('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'), name: 'nav.home' }
]

const activeMenu = computed(() => {
  const p = route.path
  if (p.startsWith('/user/content/')) return '/user/manage'
  if (p.startsWith('/user/messages')) return '/user/messages'
  return p
})

// 拉取未读总数（un_read 是 map，求和）
async function loadUnread() {
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

onMounted(() => {
  loadUnread()
  userStore.refresh()
  if (userStore.isLogin) userStore.loadPerm()
  window.addEventListener('unread-updated', loadUnread)
})
</script>

<style scoped>
.user-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  max-width: 1400px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 16px 20px;
}

.user-aside {
  width: 220px;
  flex-shrink: 0;
}

.user-card {
  padding: 16px;
  margin-bottom: 12px;
}

.uc-head {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.uc-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--zh-text);
}

.uc-uname {
  color: var(--zh-text-3);
  font-size: 13px;
}

.uc-link {
  display: block;
  margin-top: 12px;
  font-size: 13px;
  color: var(--zh-blue);
}

.nav-card {
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  font-size: 14px;
  color: var(--zh-text-2);
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #faf7f5;
  color: var(--zh-text);
}

.nav-item.active {
  background: #fff1f0;
  color: var(--zh-blue);
  font-weight: 600;
  border-right: 3px solid var(--zh-blue);
}

.nav-icon {
  width: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-badge {
  margin-left: auto;
}

.user-main {
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

@media (max-width: 768px) {
  .user-layout {
    flex-direction: column;
    padding: 10px;
    padding-bottom: 70px; /* 给底部 tabbar 留空间 */
  }

  .user-aside {
    width: 100%;
  }

  /* 用户卡压缩为一行，隐藏"我的主页"链接节省纵向空间 */
  .user-card {
    padding: 10px 14px;
    margin-bottom: 8px;
  }

  .uc-head {
    gap: 10px;
  }

  .uc-link {
    display: none;
  }

  /* 菜单横向滚动，避免堆叠挤占内容区（尤其消息页需要快速到达） */
  .nav-card {
    display: flex;
    overflow-x: auto;
    padding: 4px 0;
  }

  .nav-item {
    flex-shrink: 0;
    white-space: nowrap;
    padding: 8px 14px;
    border-radius: 8px;
  }

  .nav-item.active {
    border-right: none;
    border-bottom: 2px solid var(--zh-blue);
    border-radius: 8px 8px 0 0;
  }

  .nav-badge {
    margin-left: 4px;
  }
}
</style>
