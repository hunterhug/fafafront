// 轻量请求签名（防重放）。secret 与后端一致（后端可用 FAFA_SIGN_SECRET 覆盖）。
// 纯 SPA 中 secret 会打包进前端，只能抬高逆向门槛；配合限流/验证码使用。
// 用 crypto-js 纯 JS 实现 HMAC-SHA256：在 HTTP（非安全上下文，如局域网 IP）下也可用。
import CryptoJS from 'crypto-js'

const SIGN_SECRET = 'fafacms-sign-v1-2026'

// 为请求附加签名头；失败时返回 false。
export function attachSign(config) {
  try {
    const ts = String(Math.floor(Date.now() / 1000))
    const nonce =
      typeof crypto !== 'undefined' && crypto.randomUUID && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : String(Math.random()).slice(2) + Date.now()
    const sign = CryptoJS.HmacSHA256(`${ts}:${nonce}`, SIGN_SECRET).toString(CryptoJS.enc.Hex)
    config.headers = config.headers || {}
    config.headers['X-Ts'] = ts
    config.headers['X-Nonce'] = nonce
    config.headers['X-Sign'] = sign
    return true
  } catch (e) {
    return false
  }
}
