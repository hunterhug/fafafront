<template>
  <el-dialog :model-value="visible" :title="t('article.historyVersions')" width="860px" @update:model-value="$emit('update:visible', $event)">
    <el-empty v-if="historyList.length === 0" :description="t('article.noHistory')" :image-size="60" />
    <div v-else class="history-layout">
      <div class="history-list">
        <div
          v-for="h in historyList"
          :key="h.id"
          class="history-item"
          :class="{ active: historyPreview?.id === h.id }"
          @click="previewHistory(h)"
        >
          <div class="hi-title">{{ h.title || t('article.untitled') }}</div>
          <div class="hi-meta">
            <el-tag type="success" size="small">v{{ h.version }}</el-tag>
            <span>{{ formatTime(h.create_time) }}</span>
          </div>
        </div>
      </div>
      <div class="history-preview">
        <template v-if="historyPreview">
          <h3 class="hp-title">{{ historyPreview.title }}</h3>
          <div class="hp-meta">
            <el-tag type="success" size="small">v{{ historyPreview.version }}</el-tag>
            <span>{{ formatTime(historyPreview.create_time) }}</span>
          </div>
          <div class="hp-body">
            <MdPreview
              v-if="historyPreview.describe"
              :model-value="historyPreview.describe"
              :editor-id="'history-' + historyPreview.id"
            />
            <span v-else class="zh-text-3">{{ t('article.emptyContent') }}</span>
          </div>
          <div class="hp-actions">
            <el-button type="primary" size="small" @click="restoreHistory(historyPreview)">
              恢复到预发布区
            </el-button>
          </div>
        </template>
        <el-empty v-else :description="t('article.selectVersion')" :image-size="50" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MdPreview } from 'md-editor-v3'
import request from '@/api'
import { t } from '@/i18n'
import { formatTime } from '@/utils/format'

const props = defineProps({
  contentId: { type: Number, default: 0 },
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible', 'restored'])

const historyList = ref([])
const historyPreview = ref(null)

async function loadHistory() {
  historyPreview.value = null
  historyList.value = []
  if (!props.contentId) return
  try {
    const res = await request.post('/api/content/history/list', {
      content_id: props.contentId,
      types: 1, // 只看发布历史
      create_time_begin: 0,
      create_time_end: 0,
      sort: ['=id', '-user_id', '-create_time', '-content_id'],
      limit: 50,
      page: 1
    })
    historyList.value = res.data.contents || []
    if (historyList.value.length > 0) {
      previewHistory(historyList.value[0])
    }
  } catch (e) {
    ElMessage.error(e.msg || t('common.loadFailed'))
  }
}

async function previewHistory(row) {
  historyPreview.value = { ...row }
  try {
    const res = await request.post('/api/content/history/take', { id: row.id })
    historyPreview.value = { ...row, ...res.data }
  } catch (e) {
    // 取不到正文不影响列表展示
  }
}

async function restoreHistory(row) {
  try {
    await ElMessageBox.confirm(t('article.restoreHistoryConfirm'), t('article.restore'), { type: 'warning' })
    await request.post('/api/content/restore', { history_id: row.id, save: true })
    ElMessage.success(t('article.restoredConfirm'))
    emit('update:visible', false)
    emit('restored')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.msg || t('common.failed'))
  }
}

watch(
  () => [props.visible, props.contentId],
  ([visible]) => {
    if (visible) loadHistory()
  }
)
</script>

<style scoped>
.history-layout {
  display: flex;
  gap: 16px;
  height: 460px;
}

.history-list {
  width: 260px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--zh-border);
  padding-right: 12px;
}

.history-item {
  padding: 10px;
  border-radius: var(--zh-radius);
  cursor: pointer;
  margin-bottom: 6px;
}

.history-item:hover {
  background: #faf7f5;
}

.history-item.active {
  background: #fff1f0;
}

.hi-title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hi-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  color: var(--zh-text-3);
  font-size: 12px;
}

.history-preview {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.hp-title {
  font-size: 18px;
  font-weight: 600;
}

.hp-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
  color: var(--zh-text-3);
  font-size: 13px;
}

.hp-body {
  font-size: 14px;
  line-height: 1.8;
  color: var(--zh-text-2);
}

.hp-actions {
  margin-top: 16px;
}
</style>
