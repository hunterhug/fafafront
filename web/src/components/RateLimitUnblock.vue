<template>
  <el-dialog
    v-model="visible"
    :title="t('rateLimit.verifyTitle')"
    width="360px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    append-to-body
  >
    <div class="ru-tip">{{ t('rateLimit.verifyDesc') }}</div>
    <div class="ru-captcha">
      <el-input v-model="code" :placeholder="t('auth.captcha')" maxlength="6" @keyup.enter="submit" />
      <img v-if="img" :src="img" class="ru-img" :title="t('common.refresh')" :alt="t('auth.captcha')" @click="loadCaptcha" />
    </div>
    <template #footer>
      <el-button type="primary" :loading="loading" @click="submit">{{ t('rateLimit.submit') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { t } from '@/i18n'

const visible = ref(false)
const code = ref('')
const img = ref('')
const captchaId = ref('')
const loading = ref(false)

async function loadCaptcha() {
  try {
    const res = await request.post('/app/captcha')
    captchaId.value = res.data.captcha_id
    img.value = res.data.image
  } catch (e) {
    // 忽略
  }
}

function onRateLimited() {
  visible.value = true
  code.value = ''
  loadCaptcha()
}

async function submit() {
  if (!code.value) {
    ElMessage.warning(t('auth.captcha'))
    return
  }
  loading.value = true
  try {
    await request.post('/app/captcha/unblock', { captcha_id: captchaId.value, captcha_code: code.value })
    ElMessage.success(t('rateLimit.verifyTitle'))
    visible.value = false
  } catch (e) {
    if (e.id === 100032) {
      code.value = ''
      loadCaptcha()
      ElMessage.error(t('auth.captchaPlaceholder'))
    } else {
      ElMessage.error(e.msg || t('common.failed'))
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => window.addEventListener('rate-limited', onRateLimited))
onUnmounted(() => window.removeEventListener('rate-limited', onRateLimited))
</script>

<style scoped>
.ru-tip {
  color: var(--zh-text-2);
  font-size: 14px;
  margin-bottom: 12px;
}

.ru-captcha {
  display: flex;
  gap: 10px;
  align-items: center;
}

.ru-img {
  height: 40px;
  width: 120px;
  border-radius: 6px;
  border: 1px solid var(--zh-border);
  cursor: pointer;
  flex-shrink: 0;
  object-fit: cover;
}
</style>
