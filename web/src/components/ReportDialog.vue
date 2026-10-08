<template>
  <el-dialog :model-value="visible" :title="t('report.title')" width="400px" append-to-body @update:model-value="$emit('update:visible', $event)">
    <p class="rd-tip">{{ t('report.reason') }}：</p>
    <el-radio-group v-model="reason" class="rd-list">
      <el-radio v-for="r in reasons" :key="r" :value="r" class="rd-item">
        <span class="rd-text">{{ t(r) }}</span>
      </el-radio>
    </el-radio-group>

    <el-input
      v-if="reason === 'report.other'"
      v-model="customReason"
      type="textarea"
      :rows="2"
      maxlength="50"
      show-word-limit
      class="rd-custom"
      :placeholder="t('report.customPlaceholder')"
    />

    <template #footer>
      <el-button @click="$emit('update:visible', false)">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">{{ t('report.submit') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { t } from '@/i18n'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['update:visible', 'confirm'])

const reasons = ['report.spam', 'report.porn', 'report.illegal', 'report.plagiarism', 'report.other']
const reason = ref('report.spam')
const customReason = ref('')
const submitting = ref(false)

function submit() {
  let finalReason = reason.value
  if (reason.value === 'report.other') {
    finalReason = customReason.value.trim()
    if (!finalReason) {
      ElMessage.warning(t('report.customPlaceholder'))
      return
    }
  } else {
    finalReason = t(reason.value)
  }
  submitting.value = true
  try {
    emit('confirm', finalReason)
    emit('update:visible', false)
    reason.value = 'report.spam'
    customReason.value = ''
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.rd-tip {
  margin: 0 0 12px;
  color: var(--zh-text-2);
  font-size: 14px;
}

.rd-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.rd-item {
  width: 100%;
  margin-right: 0;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.15s;
}

.rd-item:hover {
  background: #faf7f5;
}

.rd-text {
  font-size: 14px;
}

.rd-custom {
  margin-top: 12px;
}

@media (max-width: 768px) {
  .rd-item {
    padding: 10px 8px;
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  .rd-text {
    font-size: 15px;
  }
}
</style>
