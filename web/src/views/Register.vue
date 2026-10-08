<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-head">
        <div class="auth-logo">花</div>
        <h1 class="auth-title">{{ t('auth.registerTitle') }}</h1>
        <p class="auth-sub">{{ t('auth.registerSubtitle') }}</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large">
        <el-form-item prop="name">
          <el-input v-model="form.name" :placeholder="t('auth.usernameHint')" />
        </el-form-item>
        <el-form-item prop="nick_name">
          <el-input v-model="form.nick_name" :placeholder="t('auth.nicknameHint')" />
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="form.email" :placeholder="t('auth.emailHint')" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" show-password :placeholder="t('auth.passwordHint')" />
        </el-form-item>
        <el-form-item prop="repassword">
          <el-input v-model="form.repassword" type="password" show-password :placeholder="t('auth.confirmPassword')" />
        </el-form-item>
        <el-form-item v-if="needCaptcha" prop="captcha_code">
          <div class="captcha-row">
            <el-input v-model="form.captcha_code" :placeholder="t('auth.captcha')" />
            <img v-if="captchaImage" :src="captchaImage" class="captcha-img" :title="t('common.refresh')" :alt="t('auth.captcha')" @click="loadCaptcha" />
          </div>
        </el-form-item>
        <el-form-item>
          <button class="zh-btn-primary auth-submit" :disabled="loading" @click.prevent="submit">
            {{ loading ? t('auth.registering') : t('nav.register') }}
          </button>
        </el-form-item>
        <div class="auth-links">
          <router-link to="/user/login">{{ t('auth.hasAccount') }}</router-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { t } from '@/i18n'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const form = reactive({
  name: '',
  nick_name: '',
  email: '',
  password: '',
  repassword: '',
  captcha_code: ''
})

// 验证码（风险触发：同 IP 注册过频繁才显示，正常用户无感）
const needCaptcha = ref(false)
const captchaId = ref('')
const captchaImage = ref('')

async function loadCaptcha() {
  try {
    const res = await request.post('/app/captcha')
    captchaId.value = res.data.captcha_id
    captchaImage.value = res.data.image
  } catch (e) {
    // 静默
  }
}

const rules = {
  name: [
    { required: true, message: t('auth.enterUsername'), trigger: 'blur' },
    { min: 2, max: 20, message: t('auth.usernameLength'), trigger: 'blur' }
  ],
  nick_name: [{ required: true, message: t('auth.enterNickname'), trigger: 'blur' }],
  email: [
    { required: true, message: t('auth.enterEmail'), trigger: 'blur' },
    { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('auth.enterPassword'), trigger: 'blur' },
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

function submit() {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const payload = {
        name: form.name,
        nick_name: form.nick_name,
        email: form.email,
        password: form.password,
        repassword: form.repassword
      }
      if (needCaptcha.value) {
        payload.captcha_id = captchaId.value
        payload.captcha_code = form.captcha_code
      }
      await request.post('/app/user/register', payload)
      ElMessage.success(t('auth.registerSuccessMail'))
      router.push(`/user/activate?email=${encodeURIComponent(form.email)}`)
    } catch (e) {
      if (e.id === 100031) {
        needCaptcha.value = true
        form.captcha_code = ''
        await loadCaptcha()
        ElMessage.warning(t('auth.captchaFirst'))
      } else if (e.id === 100032) {
        form.captcha_code = ''
        await loadCaptcha()
        ElMessage.error(t('auth.captchaPlaceholder'))
      } else {
        const map = {
          100021: '系统已关闭注册',
          100022: t('auth.usernameUsed'),
          100023: t('auth.emailUsed'),
          100010: t('common.failed')
        }
        ElMessage.error(map[e.id] || e.msg || t('common.failed'))
      }
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
  width: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 36px 36px;
  box-shadow: 0 12px 48px rgba(255, 95, 87, 0.14);
}

.auth-head {
  text-align: center;
  margin-bottom: 28px;
}

.auth-logo {
  width: 52px;
  height: 52px;
  margin: 0 auto 12px;
  border-radius: 10px;
  background: var(--zh-blue);
  color: #fff;
  font-size: 28px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-title {
  font-size: 22px;
  font-weight: 700;
}

.auth-sub {
  color: var(--zh-text-3);
  margin-top: 6px;
  font-size: 14px;
}

.auth-submit {
  width: 100%;
  padding: 10px 0;
  font-size: 15px;
}

.auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-links {
  font-size: 14px;
  text-align: center;
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
