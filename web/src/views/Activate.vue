<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <template #header>{{ t('auth.activateTitle') }}</template>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        :title="t('auth.activateDesc')"
      />
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" style="margin-top: 16px">
        <el-form-item :label="t('auth.email')" prop="email">
          <el-input v-model="form.email" :placeholder="t('auth.emailPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('auth.activateCode')" prop="code">
          <el-input v-model="form.code" :placeholder="t('auth.activateCodePlaceholder')" maxlength="6" @input="form.code = form.code.replace(/\D/g, '').slice(0, 6)" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="submit">{{ t('auth.activate') }}</el-button>
          <el-button style="width: 100%; margin-top: 10px" @click="resend">{{ t('auth.resendCode') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { t } from '@/i18n'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const form = reactive({ email: route.query.email || '', code: '' })
const rules = {
  email: [{ required: true, message: t('auth.enterEmail'), trigger: 'blur' }],
  code: [{ required: true, message: t('auth.enterActivateCode'), trigger: 'blur' }]
}

function submit() {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await request.post('/app/user/activate', { email: form.email, code: form.code })
      ElMessage.success(t('auth.activateSuccess'))
      router.push('/user/login')
    } catch (e) {
      
      ElMessage.error(e.msg || t('common.failed'))
    } finally {
      loading.value = false
    }
  })
}

async function resend() {
  if (!form.email) {
    ElMessage.warning(t('auth.emailFirst'))
    return
  }
  try {
    await request.post('/app/user/activate/code', { email: form.email })
    ElMessage.success(t('auth.activateCodeResent'))
  } catch (e) {
    ElMessage.error(e.msg || t('common.sendFailed'))
  }
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 60px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 16px;
  background: linear-gradient(135deg, #fff7f5 0%, #ffe6e2 45%, #fff1f0 100%);
}

.auth-card {
  width: 480px;
  border: none;
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(255, 95, 87, 0.14);
}
</style>
