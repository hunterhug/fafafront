<template>
  <div class="user-index">
    <el-skeleton v-if="loading" :rows="6" animated />

    <template v-else-if="user">
      <!-- 我的信息卡 -->
      <div class="zh-card head-card">
        <div class="user-head">
          <el-avatar :size="64" :src="user.head_photo || undefined">
            {{ (user.nick_name || user.name || '?')[0] }}
          </el-avatar>
          <div class="user-info">
            <div class="name-row">
              <span class="nick">{{ user.nick_name || user.name }}</span>
              <el-tag v-if="userStore.isVip" type="success" size="small">VIP</el-tag>
              <el-tag v-else type="info" size="small">{{ t('user.normalUser') }}</el-tag>
            </div>
            <div class="uname">@{{ user.name }}</div>
          </div>
          <router-link :to="`/u/${user.name}`" class="zh-btn-plain view-site">{{ t('user.viewMySite') }}</router-link>
        </div>
        <div class="stats">
          <router-link to="/user/manage" class="stat-link">
            <div class="stat"><b>{{ user.content_num || 0 }}</b><span>{{ t('user.content') }}</span></div>
          </router-link>
          <router-link :to="`/u/${user.name}/fans`" class="stat-link">
            <div class="stat"><b>{{ user.followed_num || 0 }}</b><span>{{ t('user.followers') }}</span></div>
          </router-link>
          <router-link :to="`/u/${user.name}/follows`" class="stat-link">
            <div class="stat"><b>{{ user.following_num || 0 }}</b><span>{{ t('user.following') }}</span></div>
          </router-link>
          <div class="stat"><b>{{ user.content_cool_num || 0 }}</b><span>{{ t('userpage.likes') }}</span></div>
        </div>
      </div>

      <!-- 非 VIP 提示 -->
      <div v-if="!userStore.isVip" class="zh-card vip-card">
        <div class="vip-text">
          {{ t('user.vipDesc') }}
        </div>
        <router-link to="/admin/users" v-if="userStore.canManageUsers" class="zh-btn-primary vip-btn">{{ t('userpage.manageVip') }}</router-link>
      </div>

      <!-- {{ t('user.quickLinks') }} -->
      <div class="zh-card quick-card">
        <div class="quick-title">{{ t('user.quickLinks') }}</div>
        <div class="quick-grid">
          <router-link to="/user/manage?write=1" class="quick-item">
            <span class="qi-icon" style="background:#ff5f57"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></span>
            <span class="qi-name">{{ t('user.write') }}</span>
          </router-link>
          <router-link to="/user/manage" class="quick-item">
            <span class="qi-icon" style="background:#00b368"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></span>
            <span class="qi-name">{{ t('user.myContent') }}</span>
          </router-link>
          <router-link :to="`/u/${user?.name}`" class="quick-item">
            <span class="qi-icon" style="background:#ff9f1c"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg></span>
            <span class="qi-name">{{ t('nav.mySite') }}</span>
          </router-link>
          <router-link to="/user/files" class="quick-item">
            <span class="qi-icon" style="background:#9c6ade"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></span>
            <span class="qi-name">{{ t('user.files') }}</span>
          </router-link>
          <router-link to="/user/messages" class="quick-item">
            <span class="qi-icon" style="background:#ff665e"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            <span class="qi-name">{{ t('user.messages') }}</span>
          </router-link>
          <router-link to="/user/follows" class="quick-item">
            <span class="qi-icon" style="background:#00a2ae"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span class="qi-name">{{ t('user.follows') }}</span>
          </router-link>
          <router-link to="/user/profile" class="quick-item">
            <span class="qi-icon" style="background:#5b7bd5"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/></svg></span>
            <span class="qi-name">{{ t('user.profile') }}</span>
          </router-link>
          <router-link to="/user/password" class="quick-item">
            <span class="qi-icon" style="background:#f5a623"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
            <span class="qi-name">{{ t('user.password') }}</span>
          </router-link>
          <router-link to="/user/security" class="quick-item">
            <span class="qi-icon" style="background:#e0556b"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
            <span class="qi-name">{{ t('user.security') }}</span>
          </router-link>
        </div>
      </div>
    </template>

    <el-empty v-else :description="t('common.getInfoFailed')" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/api'
import { t } from '@/i18n'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const loading = ref(true)
const user = ref(null)

async function load() {
  try {
    const res = await request.get('/api/user/info')
    user.value = res.data
  } catch (e) {
    user.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.head-card {
  padding: 20px 24px;
}

.user-head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nick {
  font-size: 22px;
  font-weight: 700;
}

.uname {
  color: var(--zh-text-3);
  margin-top: 2px;
}

.view-site {
  margin-left: auto;
  font-size: 13px;
}

.stats {
  display: flex;
  gap: 40px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f5f0ed;
}

.stat {
  text-align: center;
}

.stat b {
  display: block;
  font-size: 20px;
}

.stat span {
  color: var(--zh-text-3);
  font-size: 13px;
}

.stat-link {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

.stat-link:hover b {
  color: var(--zh-blue);
}

.vip-card {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #fff8e6;
  border: 1px solid #ffd766;
}

.vip-text {
  color: #8a6d1a;
  font-size: 14px;
}

.vip-btn {
  font-size: 13px;
  padding: 4px 14px;
}

.quick-card {
  padding: 16px 24px;
}

.quick-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 14px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--zh-border);
  text-decoration: none;
  transition: all 0.2s;
}

.quick-item:hover {
  border-color: var(--zh-blue);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.qi-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.qi-name {
  color: var(--zh-text);
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
