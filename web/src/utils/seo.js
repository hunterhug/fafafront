// SEO 短码生成（与后端 util.GenSeo 保持一致的字符集与形态）
//
// 用途：新建文章/节点时**预填**一个随机 SEO，用户可见、可改；
// 最终是否可用由后端按唯一范围校验（节点：同一用户内唯一；文章：所属节点内唯一）。

// 小写字母 + 数字，去掉容易看错的 o / l / i 与 0 / 1
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const LETTER_NUM = 23 // 字母段长度：首位只取字母

/**
 * 生成 n 位随机 SEO 短码（首字符为字母）。
 * @param {number} n 长度，默认 8
 */
export function genSeo(n = 8) {
  const len = n > 0 ? n : 8
  const bytes = new Uint8Array(len)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  let out = ''
  for (let i = 0; i < len; i++) {
    const limit = i === 0 ? LETTER_NUM : ALPHABET.length
    out += ALPHABET[bytes[i] % limit]
  }
  return out
}

/** SEO 合法字符：字母 / 数字 / 中文（与后端 alphanumunicode 一致） */
export function isSeoValid(seo) {
  return /^[A-Za-z0-9\u4e00-\u9fa5]+$/.test(String(seo || ''))
}
