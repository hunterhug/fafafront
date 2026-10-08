<template>
  <div class="doc-page">
    <div class="doc-card">
      <h1 class="doc-title">{{ t('about.roadmap') }}</h1>
      <p class="doc-sub">{{ t('about.roadmapSubtitle') }}</p>
      <MdPreview :model-value="content" editor-id="todo-list-doc" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { MdPreview } from 'md-editor-v3'
import { t } from '@/i18n'
import content from '@/content/todo_list.md?raw'

onMounted(() => {
  document.title = t('about.roadmap')
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

.doc-card :deep(ul) {
  padding-left: 1.4em;
  line-height: 1.9;
  color: var(--zh-text-2);
}

.doc-card :deep(li) {
  margin-bottom: 2px;
}

.doc-card :deep(code) {
  background: #faf7f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.doc-card :deep(blockquote) {
  border-left: 3px solid var(--zh-blue);
  background: #faf5ee;
  margin: 12px 0;
  padding: 8px 14px;
  color: var(--zh-text-2);
}

@media (max-width: 768px) {
  .doc-card {
    padding: 20px 16px;
  }
}
</style>
