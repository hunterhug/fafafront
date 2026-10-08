<template>
  <div class="doc-page">
    <div class="doc-card">
      <h1 class="doc-title">{{ t('about.acknowledgments') }}</h1>
      <p class="doc-sub">{{ t('about.ackSubtitle') }}</p>
      <MdPreview :model-value="content" editor-id="ack-doc" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { MdPreview } from 'md-editor-v3'
import { t } from '@/i18n'
import content from '@/content/acknowledgments.md?raw'

onMounted(() => {
  document.title = t('about.acknowledgments')
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

.doc-card :deep(img) {
  border-radius: 50%;
  vertical-align: middle;
}

.doc-card :deep(table) {
  border-collapse: collapse;
  width: 100%;
}

.doc-card :deep(th),
.doc-card :deep(td) {
  border: 1px solid var(--zh-border);
  padding: 10px 14px;
  text-align: left;
}

.doc-card :deep(th) {
  background: #faf7f5;
}

@media (max-width: 768px) {
  .doc-card {
    padding: 20px 16px;
  }
}
</style>
