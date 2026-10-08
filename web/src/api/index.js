import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { attachSign } from '@/utils/sign'
import { errorMessage } from '@/utils/errors'
import { t } from '@/i18n'

// 统一 axios 实例：/app/ 公开接口，/api/ 登录后接口（v1）
const service = axios.create({
  timeout: 20000
})

// 请求拦截：自动带 token（后端要求请求头 Auth）+ 轻量签名（防重放）
service.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers['Auth'] = token
  }
  await attachSign(config)
  return config
})

// 响应拦截：统一处理 {flag, data, error}
service.interceptors.response.use(
  (res) => {
    const data = res.data
    if (data && data.flag === true) {
      return data
    }
    // flag=false：按错误码处理
    if (data && data.error) {
      const { id, msg } = data.error
      switch (id) {
        case 100000: // 未登录/登录失效
        case 100002: // 未登录
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('adminPerm') // 避免残留上一账号的组权限缓存
          {
            // 区分两种失效，给出不同提示：
            //  - "token empty"：本次请求没带 token（从未登录 / 已登出）
            //  - "user not found"：带了 token 但服务端会话已不存在。最常见的原因是
            //    本站开启了 -single_login（同一账号只能一处在线），账号在别处登录把本端顶掉了。
            const evicted = /user not found/i.test(msg || '')
            // 已经在登录页就不再重复弹窗，否则被顶掉后会反复提示、看起来像"登不上"
            if (router.currentRoute.value.path !== '/user/login') {
              ElMessage.warning(evicted ? t('common.sessionEvicted') : t('common.loginFirst'))
              router.push('/user/login')
            }
          }
          break
        case 100004: // 未激活
          ElMessage.warning(t('auth.notActivated'))
          router.push('/user/activate')
          break
        case 100005: // 拉黑：统一跳转到被拉黑提示页，不再频繁弹窗
          if (router.currentRoute.value.path !== '/blocked') {
            router.push('/blocked')
          }
          break
        case 100006: // 无权限
          ElMessage.error(t('common.noPermission'))
          break
        default:
          // 其余业务错误码由页面 catch 统一处理（给出中文提示）
          break
      }
      return Promise.reject({ id, msg: errorMessage(id, msg), data })
    }
    return data
  },
  (error) => {
    // 限流拉黑（HTTP 429 / 100034）：交由全局「人机验证解封」弹窗处理，这里静默派发事件
    if (error.response && error.response.status === 429) {
      const body = error.response.data || {}
      const id = body.error?.id || 100034
      window.dispatchEvent(new CustomEvent('rate-limited'))
      return Promise.reject({ id, msg: errorMessage(id, body.error?.msg || t('common.rateLimited')), status: 429 })
    }
    // 代理层直接拒绝的请求体过大（nginx client_max_body_size / 413）：
    // 后端不会返回 JSON，浏览器只能拿到英文的 nginx 错误页，
    // 这里统一按后端的 100102「文件超过大小限制」提示，避免出现英文报错。
    if (error.response && error.response.status === 413) {
      return Promise.reject({ id: 100102, msg: errorMessage(100102, ''), status: 413 })
    }
    ElMessage.error(error.message || t('common.networkError'))
    return Promise.reject(error)
  }
)

export default service
