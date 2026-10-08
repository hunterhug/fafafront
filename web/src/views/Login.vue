<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-head">
        <div class="auth-logo">花</div>
        <h1 class="auth-title">{{ t('auth.loginTitle') }}</h1>
        <p class="auth-sub">{{ t('auth.loginSubtitle') }}</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large">
        <el-form-item prop="user_name">
          <el-input v-model="form.user_name" :placeholder="t('auth.username')" prefix-icon="User" />
        </el-form-item>

        <!-- 第一步：账号密码 -->
        <template v-if="!twoFaStep">
          <el-form-item prop="pass_wd">
            <el-input
              v-model="form.pass_wd"
              type="password"
              show-password
              :placeholder="t('auth.password')"
              prefix-icon="Lock"
              @keyup.enter="submit"
            />
          </el-form-item>
          <el-form-item v-if="needCaptcha" prop="captcha_code">
            <div class="captcha-row">
              <el-input v-model="form.captcha_code" :placeholder="t('auth.captcha')" prefix-icon="Key" @keyup.enter="submit" />
              <img v-if="captchaImage" :src="captchaImage" class="captcha-img" :title="t('common.refresh')" :alt="t('auth.captcha')" @click="loadCaptcha" />
            </div>
          </el-form-item>
          <el-form-item>
            <button class="zh-btn-primary auth-submit" :disabled="loading" @click.prevent="submit">
              {{ loading ? t('common.loading') : t('nav.login') }}
            </button>
          </el-form-item>
        </template>

        <!-- 第二步：两步验证 -->
        <template v-else>
          <div class="twofa-tip">
            <p>{{ t('auth.twoFactorTitle') }}</p>
            <p class="muted">{{ t('auth.twoFactorCodePlaceholder') }}</p>
          </div>
          <el-form-item prop="two_fa_code">
            <el-input
              v-model="form.two_fa_code"
              :placeholder="t('auth.twoFactorCode')"
              maxlength="6"
              prefix-icon="Key"
              @keyup.enter="submitTwoFa"
            />
          </el-form-item>
          <el-form-item>
            <button class="zh-btn-primary auth-submit" :disabled="loading" @click.prevent="submitTwoFa">
              {{ loading ? t('common.loading') : t('auth.twoFactorCode') }}
            </button>
            <button class="zh-btn-plain auth-submit back-btn" @click.prevent="backToPwd">{{ t('common.back') }}</button>
          </el-form-item>
        </template>

        <div class="auth-links">
          <router-link to="/user/register">{{ t('auth.registerNow') }}</router-link>
          <router-link to="/user/forget">{{ t('auth.forgot') }}</router-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api'
import { useUserStore } from '@/store/user'
import { t } from '@/i18n'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const formRef = ref(null)
const loading = ref(false)
const form = reactive({ user_name: '', pass_wd: '', captcha_code: '', two_fa_code: '' })
const rules = {
  user_name: [{ required: true, message: t('auth.enterUsernameOrEmail'), trigger: 'blur' }],
  pass_wd: [{ required: true, message: t('auth.enterPassword'), trigger: 'blur' }],
  two_fa_code: [{ required: true, message: t('auth.enterVerifyCode'), trigger: 'blur' }]
}

// 验证码（风险触发：连续失败才显示，正常用户无感）
const needCaptcha = ref(false)
const captchaId = ref('')
const captchaImage = ref('')

// 两步验证
const twoFaStep = ref(false)
const twoFaPending = ref('')

async function loadCaptcha() {
  try {
    const res = await request.post('/app/captcha')
    captchaId.value = res.data.captcha_id
    captchaImage.value = res.data.image
  } catch (e) {
    // 验证码加载失败静默
  }
}

function backToPwd() {
  twoFaStep.value = false
  twoFaPending.value = ''
  form.two_fa_code = ''
}

// 登录成功后的统一收尾：拉取用户信息 → 存 token → 跳转
async function finishLogin(token) {
  const uid = Number(token.split('_')[0])
  let user = null
  try {
    const info = await request.post('/app/u/info', { user_id: uid })
    user = info.data
  } catch (e) {
    // 用户信息拉取失败不阻塞登录
  }
  userStore.setLogin(token, user)
  if (user && user.is_in_black) {
    // 被拉黑用户登录后直接进被拉黑提示页（无需拉权限）
    ElMessage.warning(t('common.blockedTip') || '账号已被拉黑')
    router.push('/blocked')
    return
  }
  // 拉取组权限（决定管理后台入口/菜单）；登录后可能直达 /admin（?redirect），
  // 守卫同步读 localStorage，必须等 perm 写回后再跳转，否则会被误拦
  await userStore.loadPerm()
  ElMessage.success(t('auth.loginSuccess'))
  if (route.query.redirect) {
    router.push(route.query.redirect)
  } else if (user && user.name) {
    router.push(`/u/${user.name}`)
  } else {
    router.push('/')
  }
}

function submit() {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const payload = {
        user_name: form.user_name,
        pass_wd: form.pass_wd
      }
      if (needCaptcha.value) {
        payload.captcha_id = captchaId.value
        payload.captcha_code = form.captcha_code
      }
      const res = await request.post('/app/user/token/get', payload)
      await finishLogin(res.data)
    } catch (e) {
      if (e.id === 100031) {
        needCaptcha.value = true
        form.captcha_code = ''
        await loadCaptcha()
        ElMessage.warning(t('auth.captchaPlaceholder'))
      } else if (e.id === 100032) {
        form.captcha_code = ''
        await loadCaptcha()
        ElMessage.error(t('auth.captchaPlaceholder'))
      } else if (e.id === 100033) {
        ElMessage.error(t('common.failed'))
      } else if (e.id === 100036) {
        // 需要两步验证
        twoFaPending.value = e.data?.data?.pending || ''
        twoFaStep.value = true
        form.two_fa_code = ''
        ElMessage.info(t('auth.twoFactorTitle'))
      } else {
        ElMessage.error(e.msg || t('common.failed'))
      }
    } finally {
      loading.value = false
    }
  })
}

async function submitTwoFa() {
  if (!form.two_fa_code) {
    ElMessage.warning(t('auth.enterTwoFaCode'))
    return
  }
  loading.value = true
  try {
    const res = await request.post('/app/user/token/2fa', {
      pending: twoFaPending.value,
      code: form.two_fa_code
    })
    await finishLogin(res.data)
  } catch (e) {
    if (e.id === 100037) {
      form.two_fa_code = ''
      ElMessage.error(t('auth.twoFaWrong'))
    } else if (e.id === 100038) {
      backToPwd()
      ElMessage.error(t('auth.twoFaExpired'))
    } else {
      ElMessage.error(e.msg || t('common.failed'))
    }
  } finally {
    loading.value = false
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

.back-btn {
  margin-top: 10px;
}

.auth-links {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
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

.twofa-tip {
  text-align: center;
  color: var(--zh-text-2);
  font-size: 14px;
  margin-bottom: 12px;
}

.twofa-tip .muted {
  color: var(--zh-text-3);
  font-size: 12px;
  margin-top: 4px;
}
</style>
