<template>
  <!-- 站点 Logo：猫爪（渐变圆角底 + 白色爪印），可随 size 缩放；favicon 用同款 public/favicon.svg -->
  <span class="site-logo" :style="{ width: size + 'px', height: size + 'px' }" aria-hidden="true">
    <svg :width="size" :height="size" viewBox="0 0 64 64" focusable="false">
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ff9a86" />
          <stop offset="1" stop-color="#ff5f57" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" :rx="size >= 28 ? 14 : 12" :fill="`url(#${gradId})`" />
      <g fill="#ffffff">
        <ellipse cx="20.5" cy="24.5" rx="5.1" ry="6.4" transform="rotate(-14 20.5 24.5)" />
        <ellipse cx="30" cy="19.5" rx="5.1" ry="6.6" />
        <ellipse cx="39.6" cy="21.8" rx="5.1" ry="6.4" transform="rotate(12 39.6 21.8)" />
        <ellipse cx="47.5" cy="29.6" rx="4.9" ry="5.8" transform="rotate(24 47.5 29.6)" />
        <path d="M31.6 31.4c6.6 0 12 4.6 12 10.6 0 5.1-4.1 8.4-9.3 8.4h-5.4c-5.2 0-9.3-3.3-9.3-8.4 0-6 5.4-10.6 12-10.6z" />
      </g>
    </svg>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: { type: Number, default: 32 }
})

// 多个 Logo 同页时避免渐变 id 冲突
const gradId = computed(() => `site-logo-paw-${props.size}`)
</script>

<style scoped>
.site-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.site-logo svg {
  display: block;
}
</style>
