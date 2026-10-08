<template>
  <el-card class="pwd-card">
    <template #header>{{ t('user.password') }}</template>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      :title="t('user.passwordAlert')"
      style="margin-bottom: 16px"
    />
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="large">
      <el-form-item :label="t('auth.email')" prop="email">
        <el-input v-model="form.email" disabled />
      </el-form-item>
      <el-form-item :label="t('auth.captcha')" prop="code">
        <div class="code-row">
          <el-input ref="codeRef" v-model="form.code" :placeholder="t('auth.codePlaceholder')" maxlength="6" @input="form.code = form.code.replace(/\D/g, '').slice(0, 6)" />
          <el-button :loading="sending" @click="sendCode">{{ t('auth.sendCode') }}</el-button>
        </div>
      </el-form-item>
      <el-form-item v-if="needCaptcha" prop="captcha_code">
        <div class="captcha-row">
          <el-input v-model="form.captcha_code" :placeholder="t('auth.captcha')" @keyup.enter="sendCode" />
          <img v-if="captchaImage" :src="captchaImage" class="captcha-img" :title="t('common.refresh')" :alt="t('auth.captcha')" @click="loadCaptcha" />
        </div>
      </el-form-item>
      <el-form-item :label="t('auth.newPassword')" prop="password">
        <el-input v-model="form.password" type="password" show-password />
      </el-form-item>
      <el-form-item :label="t('auth.confirmPassword')" prop="repassword">
        <el-input v-model="form.repassword" type="password" show-password />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="submit">{{ t('user.password') }}</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { t } from '@/i18n'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref(null)
const sending = ref(false)
const saving = ref(false)

const form = reactive({
  email: userStore.user?.email || '',
  code: '',
  password: '',
  repassword: '',
  captcha_code: ''
})

const needCaptcha = ref(false)
const captchaId = ref('')
const captchaImage = ref('')
const codeRef = ref(null)

async function loadCaptcha() {
  try {
    const res = await request.post('/app/captcha')
    captchaId.value = res.data.captcha_id
    captchaImage.value = res.data.image
  } catch (e) {
    ElMessage.error(e.msg || t('common.failed'))
  }
}

const rules = {
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

async function sendCode() {
  if (!form.email) {
    ElMessage.warning(t('auth.emailEmpty'))
    return
  }
  sending.value = true
  try {
    const payload = { email: form.email }
    if (needCaptcha.value) {
      payload.captcha_id = captchaId.value
      payload.captcha_code = form.captcha_code
    }
    await request.post('/app/user/password/forget', payload)
    ElMessage.success(t('auth.codeSent'))
  } catch (e) {
    if (e.id === 100031) {
      needCaptcha.value = true
      form.captcha_code = ''
      await loadCaptcha()
      ElMessage.warning(t('auth.captchaFirst'))
    } else if (e.id === 100032) {
      form.captcha_code = ''
      await loadCaptcha()
      ElMessage.error(e.msg || t('auth.captchaPlaceholder'))
    } else if (e.id === 100028) {
      // 验证码刚发过且未过期：不重复发信，提示并聚焦验证码输入框
      ElMessage.info(e.msg || t('err.100028'))
      codeRef.value?.focus()
    } else {
      ElMessage.error(e.msg || t('common.sendFailed'))
    }
  } finally {
    sending.value = false
  }
}

function submit() {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      await request.post('/app/user/password/change', {
        email: form.email,
        code: form.code,
        password: form.password,
        repassword: form.repassword
      })
      ElMessage.success(t('auth.passwordChangedLogin'))
      userStore.logout()
      router.push('/user/login')
    } catch (e) {
      
      ElMessage.error(e.msg || t('common.failed'))
    } finally {
      saving.value = false
    }
  })
}

onMounted(() => {
  if (!form.email) {
    ElMessage.warning(t('auth.emailEmpty'))
  }
})
</script>

<style scoped>
.pwd-card {
  max-width: 560px;
}

.code-row {
  display: flex;
  gap: 8px;
  width: 100%;
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
