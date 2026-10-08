<template>
  <div ref="root" class="emoji-picker">
    <!-- 标签页：表情 / GIF -->
    <div class="ep-tabs">
      <span class="ep-tab" :class="{ active: tab === 'emoji' }" @click="tab = 'emoji'">表情</span>
      <span class="ep-tab" :class="{ active: tab === 'gif' }" @click="tab = 'gif'">GIF</span>
    </div>

    <div class="ep-body">
      <!-- 表情网格 -->
      <div v-if="tab === 'emoji'" class="ep-grid">
        <span v-for="e in EMOJIS" :key="e" class="ep-item" :title="e" @click="pick(e)">{{ e }}</span>
      </div>
      <!-- GIF 网格 -->
      <div v-else class="ep-grid">
        <img v-for="g in GIFS" :key="g" :src="g" class="ep-gif" loading="lazy" alt="gif" @click="pick('![' + 'gif' + '](' + g + ')')" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { EMOJIS, GIFS } from '@/utils/emoji'

const props = defineProps({
  // 选择后是否立即收起面板：评论/回复（提交类输入）true；私信聊天（可能连选多个）false
  closeOnSelect: { type: Boolean, default: false }
})
const emit = defineEmits(['select', 'close'])
const tab = ref('emoji')
const root = ref(null)

function pick(v) {
  emit('select', v)
  // 需要即收时：插入后关闭面板，避免停在原地
  if (props.closeOnSelect) {
    emit('close')
  }
}

// 点击面板外部时自动关闭
function onClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) {
    emit('close')
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.emoji-picker {
  position: absolute;
  bottom: 40px;
  left: 0;
  width: 380px;
  background: #fff;
  border: 1px solid #f0e9e3;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(24, 18, 16, 0.14);
  z-index: 40;
  overflow: hidden;
}

.ep-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 10px 0;
}

.ep-tab {
  font-size: 13px;
  color: var(--zh-text-2);
  cursor: pointer;
  padding: 5px 14px;
  border-radius: 999px;
}

.ep-tab:hover {
  background: #faf7f5;
}

.ep-tab.active {
  background: #fff1f0;
  color: var(--zh-blue);
  font-weight: 600;
}

.ep-body {
  padding: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.ep-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.ep-item {
  font-size: 22px;
  text-align: center;
  cursor: pointer;
  padding: 6px 0;
  border-radius: 8px;
  transition: background 0.15s, transform 0.15s;
}

.ep-item:hover {
  background: #fff3f1;
  transform: scale(1.15);
}

.ep-gif {
  width: 100%;
  height: 44px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.15s;
}

.ep-gif:hover {
  transform: scale(1.06);
}

@media (max-width: 768px) {
  .emoji-picker {
    width: min(300px, calc(100vw - 24px));
    left: auto;
    right: 0;
  }
  .ep-grid {
    grid-template-columns: repeat(8, 1fr);
  }
}
</style>
