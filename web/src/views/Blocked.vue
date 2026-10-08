<template>
  <div class="blocked-wrap">
    <div class="blocked-card">
      <div class="blocked-icon">
        <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"></circle>
          <line x1="4.8" y1="4.8" x2="19.2" y2="19.2"></line>
        </svg>
      </div>
      <h1 class="blocked-title">{{ t('blocked.title') }}</h1>
      <p class="blocked-desc">{{ t('blocked.desc') }}</p>
      <p class="blocked-hint">{{ t('blocked.contact') }}</p>
      <router-link to="/" class="zh-btn-primary blocked-btn">返回首页</router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSiteStore } from '@/store/site'
import { t } from '@/i18n'

const site = useSiteStore()

onMounted(() => {
  document.title = `账号已被拉黑 - ${site.siteTitle}`
})
</script>

<style scoped>
.blocked-wrap {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.blocked-card {
  background: #fff;
  border-radius: var(--zh-radius);
  box-shadow: var(--zh-shadow);
  padding: 48px 40px;
  max-width: 420px;
  width: 100%;
  text-align: center;
}

.blocked-icon {
  color: var(--zh-danger, #f56c6c);
  margin-bottom: 18px;
}

.blocked-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--zh-text-1, #303133);
}

.blocked-desc {
  font-size: 14px;
  color: var(--zh-text-2, #606266);
  line-height: 1.7;
  margin: 0 0 8px;
}

.blocked-hint {
  font-size: 13px;
  color: var(--zh-text-3, #909399);
  margin: 0 0 24px;
}

.blocked-btn {
  display: inline-block;
  text-decoration: none;
}
</style>
