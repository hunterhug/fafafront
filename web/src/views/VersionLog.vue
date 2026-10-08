<template>
  <div class="doc-page">
    <div class="doc-card">
      <h1 class="doc-title">{{ t('about.versions') }}</h1>
      <p class="doc-sub">{{ t('about.versionSubtitle') }}</p>
      <MdPreview :model-value="content" editor-id="version-log-doc" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { MdPreview } from 'md-editor-v3'
import { t } from '@/i18n'
import content from '@/content/version_log.md?raw'

onMounted(() => {
  document.title = t('about.versions')
})
</script>

<style scoped>
.doc-page {
  max-width: 900px;
  margin: 0 auto;
}

.doc-card {
  background: #fff;
  border-radius: var(--zh-radius);
  box-shadow: var(--zh-shadow);
  padding: 28px 36px;
}

.doc-title {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 6px;
}

.doc-sub {
  color: var(--zh-text-3);
  margin-bottom: 20px;
}

.doc-card :deep(h2) {
  font-size: 20px;
  font-weight: 700;
  margin: 24px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--zh-border);
}

.doc-card :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 18px 0 8px;
}

.doc-card :deep(p) {
  line-height: 1.9;
  color: var(--zh-text-2);
}

.doc-card :deep(ol) {
  padding-left: 1.4em;
  line-height: 1.9;
  color: var(--zh-text-2);
}

.doc-card :deep(code) {
  background: #faf7f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

@media (max-width: 768px) {
  .doc-card {
    padding: 20px 16px;
  }
}
</style>
