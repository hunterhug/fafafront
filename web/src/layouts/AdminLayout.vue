<template>
  <div class="admin-layout">
    <!-- 左侧：标题 + 菜单（与个人中心一致的暖色浅色风格） -->
    <aside class="admin-aside">
      <div class="zh-card aside-title-card">
        <div class="aside-title">{{ t('nav.admin') }}</div>
        <div class="aside-sub">FaFa CMS</div>
      </div>

      <div class="zh-card nav-card">
        <router-link
          v-for="m in menus"
          :key="m.to"
          :to="m.to"
          class="nav-item"
          :class="{ active: activeMenu === m.to }"
        >
          <span class="nav-icon" v-html="m.icon"></span>
          <span class="nav-name">{{ t(m.name) }}</span>
        </router-link>
      </div>
    </aside>

    <!-- 右侧内容 -->
    <main class="admin-main">
      <router-view />
    </main>

    <!-- 移动端底部导航（全局，跨布局） -->
    <MobileTabbar />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import MobileTabbar from '@/components/MobileTabbar.vue'
import { t } from '@/i18n'
import { useRoute } from 'vue-router'
import { filterMenus } from '@/utils/adminPerms'
import { useUserStore } from '@/store/user'

const route = useRoute()
const userStore = useUserStore()

// 进入后台时静默刷新权限（远端组授权变化可同步到本页；超管也顺带更新）
onMounted(() => {
  if (userStore.isLogin) userStore.loadPerm()
})

const S = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`

const allMenus = [
  { to: '/admin', icon: S('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'), name: 'admin.dashboard' },
  { to: '/admin/users', icon: S('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'), name: 'admin.users' },
  { to: '/admin/groups', icon: S('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'), name: 'admin.groups' },
  { to: '/admin/contents', icon: S('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>'), name: 'admin.contents' },
  { to: '/admin/comments', icon: S('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'), name: 'admin.comments' },
  { to: '/admin/reports', icon: S('<path d="M22 4h-2l-1-1h-6L12 4h-2a2 2 0 0 0-2 2v2h16V6a2 2 0 0 0-2-2z"/><path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>'), name: 'admin.reports' },
  { to: '/admin/nodes', icon: S('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'), name: 'admin.nodes' },
  { to: '/admin/files', icon: S('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'), name: 'admin.files' },
  { to: '/admin/relations', icon: S('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'), name: 'admin.relations' },
  { to: '/admin/messages', icon: S('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/>'), name: 'admin.messages' },
  { to: '/admin/settings', icon: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'), name: 'admin.settings' },
  { to: '/admin/friends', icon: S('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'), name: 'admin.friends' },
  { to: '/', icon: S('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'), name: 'nav.home' }
]

// 超管（admin 名字 / perm.super_admin）显示全部菜单；组用户按勾选资源过滤
const menus = computed(() => {
  const perm = userStore.adminPerm
  if (userStore.isAdmin || (perm && perm.super_admin)) return allMenus
  if (!perm) return []
  return filterMenus(allMenus, perm)
})

const activeMenu = computed(() => {
  const p = route.path
  if (p === '/admin' || p.startsWith('/admin/dashboard')) return '/admin'
  return p
})
</script>

<style scoped>
.admin-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  max-width: 1400px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 16px 20px;
}

.admin-aside {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 16px;
}

.aside-title-card {
  padding: 16px;
  margin-bottom: 12px;
}

.aside-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--zh-text);
}

.aside-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--zh-text-3);
  letter-spacing: 0.05em;
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
  flex-shrink: 0;
}

.admin-main {
  flex: 1;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

/* ===== 移动端：菜单横向滚动条 ===== */
@media (max-width: 768px) {
  .admin-layout {
    flex-direction: column;
    padding: 10px;
    padding-bottom: 70px; /* 给底部 tabbar 留空间 */
  }

  .admin-aside {
    width: 100%;
    position: static;
  }

  .aside-title-card {
    display: none;
  }

  .nav-card {
    display: flex;
    overflow-x: auto;
    padding: 4px 0;
  }

  .nav-item {
    flex-shrink: 0;
    white-space: nowrap;
    border-radius: 8px;
    margin: 2px;
  }

  .nav-item.active {
    border-right: none;
    border-bottom: 2px solid var(--zh-blue);
    border-radius: 8px 8px 0 0;
  }
}
</style>
