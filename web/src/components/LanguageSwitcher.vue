<template>
  <el-dropdown trigger="click" placement="bottom-end" @command="onCommand">
    <button class="lang-btn" :title="t('nav.language')" aria-label="language">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    </button>
    <template #dropdown>
      <el-dropdown-menu class="lang-menu">
        <el-dropdown-item
          v-for="l in LANGUAGES"
          :key="l.code"
          :command="l.code"
          :class="{ 'is-active': l.code === locale }"
        >
          <span class="lang-name">{{ l.name }}</span>
          <svg v-if="l.code === locale" class="lang-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { LANGUAGES, locale, setLocale, t } from '@/i18n'

function onCommand(code) {
  setLocale(code)
}
</script>

<style scoped>
.lang-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  color: var(--zh-text-2);
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
}

.lang-btn svg {
  display: block;
}

.lang-btn:hover {
  background: #fff1f0;
  color: var(--zh-blue);
}

.lang-menu {
  max-height: 320px;
  overflow-y: auto;
}

.lang-menu :deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 8px 18px;
}

.lang-menu :deep(.el-dropdown-menu__item.is-active) {
  color: var(--zh-blue);
  font-weight: 600;
}

.lang-check {
  color: var(--zh-blue);
  flex-shrink: 0;
}
</style>
