<template>
  <el-card class="security-card">
    <template #header>{{ t('user.security') }}</template>
    <el-skeleton v-if="loading" :rows="6" animated />
    <template v-else>
      <!-- 邮箱 -->
      <div class="sec-row">
        <div class="sec-info">
          <div class="sec-label">{{ t('user.securityLoginEmail') }}</div>
          <div class="sec-value">{{ user?.email || '—' }}</div>
        </div>
        <span class="sec-muted">{{ t('user.securityEmailDesc') }}</span>
      </div>

      <!-- 两步验证 -->
      <div class="sec-row">
        <div class="sec-info">
          <div class="sec-label">{{ t('user.twoFactor') }}</div>
          <div class="sec-value">
            <el-tag v-if="twoFaEnabled" type="success" size="small">{{ t('user.twoFactorEnabled') }}</el-tag>
            <el-tag v-else type="info" size="small">{{ t('user.twoFactorDisabled') }}</el-tag>
          </div>
        </div>
        <el-button v-if="!twoFaEnabled" type="primary" size="small" @click="openEnable">{{ t('user.enable2fa') }}</el-button>
        <el-button v-else size="small" type="danger" plain @click="openDisable">{{ t('user.disable2fa') }}</el-button>
      </div>

      <el-alert
        type="warning"
        :closable="false"
        show-icon
        :title="t('user.2faLostHint')"
        style="margin-top: 16px"
      />
    </template>

    <!-- 开启 2FA 对话框 -->
    <el-dialog v-model="enableVisible" :title="t('user.enable2fa')" width="420px" :close-on-click-modal="false">
      <div class="fa-steps">
        <p class="fa-tip">{{ t('user.scanQr2') }}</p>
        <div class="fa-qr">
          <img v-if="qrDataUrl" :src="qrDataUrl" class="fa-qr-img" :alt="t('user.qrCode')" />
          <div v-else class="fa-qr-loading">{{ t('user.qrLoading') }}</div>
        </div>
        <div class="fa-secret">
          {{ t('user.secretKey') }}：<code>{{ secret }}</code>
          <el-button size="small" text type="primary" @click="copySecret">{{ t('common.copy') }}</el-button>
        </div>
        <p class="fa-tip">{{ t('user.enterCode2') }}</p>
        <el-input v-model="enableCode" :placeholder="t('auth.twoFactorCode')" maxlength="6" @keyup.enter="confirmEnable" />
      </div>
      <template #footer>
        <el-button @click="enableVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="enabling" @click="confirmEnable">{{ t('user.confirmBind') }}</el-button>
      </template>
    </el-dialog>

    <!-- 关闭 2FA 对话框 -->
    <el-dialog v-model="disableVisible" :title="t('user.disable2fa')" width="400px">
      <p class="fa-tip">{{ t('user.disable2faDesc') }}</p>
      <el-input v-model="disablePassword" type="password" show-password :placeholder="t('user.loginPassword')" @keyup.enter="confirmDisable" />
      <template #footer>
        <el-button @click="disableVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="danger" :loading="disabling" @click="confirmDisable">{{ t('user.confirmClose') }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import request from '@/api'
import { t } from '@/i18n'

const loading = ref(true)
const user = ref(null)
const twoFaEnabled = ref(false)

const enableVisible = ref(false)
const secret = ref('')
const uri = ref('')
const qrDataUrl = ref('')
const enableCode = ref('')
const enabling = ref(false)

const disableVisible = ref(false)
const disablePassword = ref('')
const disabling = ref(false)

async function load() {
  try {
    const res = await request.get('/api/user/info')
    user.value = res.data
    twoFaEnabled.value = !!res.data.two_fa
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  } finally {
    loading.value = false
  }
}

async function openEnable() {
  enableCode.value = ''
  qrDataUrl.value = ''
  secret.value = ''
  try {
    const res = await request.post('/api/user/2fa/secret')
    secret.value = res.data.secret
    uri.value = res.data.uri
    qrDataUrl.value = await QRCode.toDataURL(res.data.uri, { width: 220, margin: 1 })
    enableVisible.value = true
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

async function copySecret() {
  try {
    await navigator.clipboard.writeText(secret.value)
    ElMessage.success(t('common.copied'))
  } catch (e) {
    ElMessage.warning(t('user.copyFail'))
  }
}

async function confirmEnable() {
  if (!enableCode.value) {
    ElMessage.warning(t('auth.enterTwoFaCode'))
    return
  }
  enabling.value = true
  try {
    await request.post('/api/user/2fa/enable', { code: enableCode.value })
    ElMessage.success(t('user.2faEnabled'))
    enableVisible.value = false
    twoFaEnabled.value = true
  } catch (e) {
    if (e.id === 100037) {
      enableCode.value = ''
      ElMessage.error(t('auth.twoFaWrong'))
    } else if (e.id === 100038) {
      enableVisible.value = false
      ElMessage.error(t('auth.twoFaExpired'))
    } else {
      ElMessage.error(e.msg || t('common.failed'))
    }
  } finally {
    enabling.value = false
  }
}

function openDisable() {
  disablePassword.value = ''
  disableVisible.value = true
}

async function confirmDisable() {
  if (!disablePassword.value) {
    ElMessage.warning(t('auth.enterLoginPassword'))
    return
  }
  disabling.value = true
  try {
    await request.post('/api/user/2fa/disable', { password: disablePassword.value })
    ElMessage.success(t('user.2faDisabled'))
    disableVisible.value = false
    twoFaEnabled.value = false
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  } finally {
    disabling.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.security-card {
  max-width: 640px;
}

.sec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--zh-border);
}

.sec-label {
  font-size: 14px;
  color: var(--zh-text-2);
  margin-bottom: 4px;
}

.sec-value {
  font-size: 15px;
  font-weight: 600;
}

.sec-muted {
  font-size: 12px;
  color: var(--zh-text-3);
}

.fa-tip {
  font-size: 14px;
  color: var(--zh-text-2);
  margin-bottom: 10px;
  line-height: 1.6;
}

.fa-qr {
  display: flex;
  justify-content: center;
  margin: 8px 0 12px;
}

.fa-qr-img {
  width: 220px;
  height: 220px;
  border: 1px solid var(--zh-border);
  border-radius: 8px;
}

.fa-qr-loading {
  width: 220px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--zh-text-3);
  background: #faf7f5;
  border-radius: 8px;
}

.fa-secret {
  font-size: 13px;
  color: var(--zh-text-2);
  margin-bottom: 12px;
  word-break: break-all;
}

.fa-secret code {
  background: #faf7f5;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
