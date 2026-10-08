<template>
  <nav class="zh-tabbar">
    <router-link to="/" class="tabbar-item" :class="{ active: route.path === '/' }">
      <span class="ti-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
      </span>
      <span class="ti-label">{{ t('tabbar.home') }}</span>
    </router-link>
    <router-link to="/explore" class="tabbar-item" :class="{ active: route.path.startsWith('/explore') }">
      <span class="ti-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
      </span>
      <span class="ti-label">{{ t('tabbar.explore') }}</span>
    </router-link>
    <router-link to="/user/messages" class="tabbar-item" :class="{ active: route.path.startsWith('/user/messages') }">
      <span class="ti-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
        <i v-if="unread > 0" class="ti-badge">{{ unread > 99 ? '99+' : unread }}</i>
      </span>
      <span class="ti-label">{{ t('tabbar.messages') }}</span>
    </router-link>
    <router-link
      :to="userStore.isLogin ? '/user' : '/user/login'"
      class="tabbar-item"
      :class="{ active: route.path.startsWith('/u/') || route.path.startsWith('/user') }"
    >
      <span class="ti-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </span>
      <span class="ti-label">{{ t('tabbar.me') }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import request from '@/api'
import { t } from '@/i18n'

const route = useRoute()
const userStore = useUserStore()
const unread = ref(0)

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

let timer = null
onMounted(() => {
  loadUnread()
  window.addEventListener('unread-updated', loadUnread)
  timer = setInterval(() => {
    if (!document.hidden) loadUnread()
  }, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('unread-updated', loadUnread)
})

watch(() => route.path, () => {
  if (userStore.isLogin) loadUnread()
})
</script>

<style scoped>
.zh-tabbar {
  display: none;
}

@media (max-width: 768px) {
  .zh-tabbar {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 200;
    background: rgba(255, 255, 255, 0.78);
    backdrop-filter: saturate(180%) blur(14px);
    -webkit-backdrop-filter: saturate(180%) blur(14px);
    border-top: 1px solid #f0e9e3;
    padding-bottom: env(safe-area-inset-bottom);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
  }

  .tabbar-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 0 6px;
    text-decoration: none;
    color: var(--zh-text-3);
    font-size: 10px;
  }

  .tabbar-item.active {
    color: var(--zh-blue);
    font-weight: 600;
  }

  .tabbar-item.active .ti-icon {
    transform: scale(1.12);
  }

  .ti-icon {
    font-size: 20px;
    position: relative;
    line-height: 1;
    transition: transform 0.2s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  .ti-badge {
    position: absolute;
    top: -4px;
    right: -12px;
    min-width: 15px;
    height: 15px;
    padding: 0 4px;
    border-radius: 8px;
    background: var(--zh-blue);
    color: #fff;
    font-size: 10px;
    font-style: normal;
    line-height: 15px;
    text-align: center;
  }
}
</style>
