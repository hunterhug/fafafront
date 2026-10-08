<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <template #header>{{ t('auth.forgetTitle') }}</template>
      <el-steps :active="step" align-center finish-status="success" style="margin-bottom: 20px">
        <el-step :title="t('auth.stepEmail')" />
        <el-step :title="t('auth.stepCode')" />
        <el-step :title="t('auth.stepReset')" />
      </el-steps>

      <!-- 第一步：发送验证码 -->
      <el-form v-if="step === 0" ref="emailForm" :model="form" :rules="emailRules" label-position="top" size="large">
        <el-form-item :label="t('auth.email')" prop="email">
          <el-input v-model="form.email" :placeholder="t('auth.emailPlaceholder')" />
        </el-form-item>
        <el-form-item v-if="needCaptcha" prop="captcha_code">
          <div class="captcha-row">
            <el-input v-model="form.captcha_code" :placeholder="t('auth.captcha')" @keyup.enter="sendCode" />
            <img v-if="captchaImage" :src="captchaImage" class="captcha-img" :title="t('common.refresh')" :alt="t('auth.captcha')" @click="loadCaptcha" />
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="sending" style="width: 100%" @click="sendCode">{{ t('auth.sendCode') }}</el-button>
        </el-form-item>
      </el-form>

      <!-- 第二步：输入验证码和新密码 -->
      <el-form v-else ref="resetForm" :model="form" :rules="resetRules" label-position="top" size="large">
        <el-form-item :label="t('auth.stepCode')" prop="code">
          <el-input v-model="form.code" :placeholder="t('auth.codePlaceholder')" maxlength="6" @input="form.code = form.code.replace(/\D/g, '').slice(0, 6)" />
        </el-form-item>
        <el-form-item :label="t('auth.newPassword')" prop="password">
          <el-input v-model="form.password" type="password" show-password :placeholder="t('auth.passwordHint')" />
        </el-form-item>
        <el-form-item :label="t('auth.confirmPassword')" prop="repassword">
          <el-input v-model="form.repassword" type="password" show-password :placeholder="t('auth.repasswordPlaceholder')" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="resetPassword">{{ t('auth.stepReset') }}</el-button>
          <el-button style="width: 100%; margin-top: 10px" @click="backToEmail">{{ t('common.back') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { t } from '@/i18n'

const router = useRouter()
const step = ref(0)
const sending = ref(false)
const loading = ref(false)
const emailForm = ref(null)
const resetForm = ref(null)

const form = reactive({ email: '', code: '', password: '', repassword: '', captcha_code: '' })

const needCaptcha = ref(false)
const captchaId = ref('')
const captchaImage = ref('')

async function loadCaptcha() {
  try {
    const res = await request.post('/app/captcha')
    captchaId.value = res.data.captcha_id
    captchaImage.value = res.data.image
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

function backToEmail() {
  step.value = 0
  needCaptcha.value = false
  captchaId.value = ''
  form.captcha_code = ''
}

const emailRules = {
  email: [
    { required: true, message: t('auth.enterEmail'), trigger: 'blur' },
    { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' }
  ]
}

const resetRules = {
  code: [{ required: true, message: t('auth.enterVerifyCode'), trigger: 'blur' }],
  password: [
    { required: true, message: t('auth.enterNewPassword'), trigger: 'blur' },
    { min: 6, max: 16, message: t('auth.passwordLength'), trigger: 'blur' }
  ],
  repassword: [
    { required: true, message: t('auth.enterRepassword'), trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.password) callback(new Error(t('auth.passwordMismatch')))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

function sendCode() {
  emailForm.value.validate(async (valid) => {
    if (!valid) return
    sending.value = true
    try {
      const payload = { email: form.email }
      if (needCaptcha.value) {
        payload.captcha_id = captchaId.value
        payload.captcha_code = form.captcha_code
      }
      await request.post('/app/user/password/forget', payload)
      ElMessage.success(t('auth.codeSent'))
      needCaptcha.value = false
      step.value = 1
    } catch (e) {
      if (e.id === 100031) {
        // 触发图形验证码：显示输入框并加载图片，重试需带 captcha
        needCaptcha.value = true
        form.captcha_code = ''
        await loadCaptcha()
        ElMessage.warning(t('auth.captchaFirst'))
      } else if (e.id === 100032) {
        form.captcha_code = ''
        await loadCaptcha()
        ElMessage.error(e.msg || t('auth.captchaPlaceholder'))
      } else if (e.id === 100028) {
        // 验证码刚发过且未过期：不重复发信，直接引导进入第二步输入验证码
        needCaptcha.value = false
        form.captcha_code = ''
        ElMessage.info(e.msg || t('err.100028'))
        step.value = 1
      } else {
        ElMessage.error(e.msg || t('common.sendFailed'))
      }
    } finally {
      sending.value = false
    }
  })
}

function resetPassword() {
  resetForm.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await request.post('/app/user/password/change', {
        email: form.email,
        code: form.code,
        password: form.password,
        repassword: form.repassword
      })
      ElMessage.success(t('auth.passwordReset'))
      router.push('/user/login')
    } catch (e) {
      ElMessage.error(e.msg || t('common.failed'))
    } finally {
      loading.value = false
    }
  })
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

.captcha-row {
  display: flex;
  gap: 10px;
  width: 100%;
  align-items: center;
}

.captcha-img {
  height: 40px;
  width: 120px;
  border-radius: 6px;
  border: 1px solid #f0e9e3;
  cursor: pointer;
  flex-shrink: 0;
  object-fit: cover;
}
</style>
