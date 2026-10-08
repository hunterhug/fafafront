// 管理后台正文安全渲染（两类数据源）：
// 1) 评论正文 comment.describe / message.comment_describe —— 后端入库时已转义 `<` `>`
//    （见后端 comment.go htmlEscaper），可直接信任为安全片段，仅做 markdown 图片替换（白名单 URL）。
// 2) 私信/公告 send_message —— 后端未转义，必须先整体 HTML 转义，再做图片替换，防 XSS。
// 图片 url 只放行 /storage(/storage_x)、/gifs 内置贴纸与 http(s):// 前缀。

const IMG_STYLE = 'max-width:120px;max-height:56px;border-radius:4px;vertical-align:middle;margin:0 2px;'

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// url 属性值安全校验：只放行白名单前缀，且不允许引号/尖括号等可逃逸属性/标签的字符
const URL_OK = /^[\w.\-/:%?#@[\]!$&'()*+,;=~]+$/

function imgReplacer(m, alt, urlRaw) {
  const url = urlRaw.replace(/&amp;/g, '&')
  const allowedPrefix = /^\/storage/.test(url) || /^\/gifs\//.test(url) || /^https?:\/\//i.test(url)
  // 前缀合法 且 整体字符集安全（无引号/空格/尖括号/反引号），否则保持原文不渲染
  if (!allowedPrefix || !URL_OK.test(url)) return m
  // 防御性：alt/title 做属性级转义（& " '），防止引号逃逸属性
  const attr = escapeHtml(alt)
  return `<img src="${url}" alt="${attr}" title="${attr}" loading="lazy" style="${IMG_STYLE}">`
}

// 匹配 markdown 图片：支持 alt 含嵌套方括号（如 ![[图片]](url)，alt=[图片]），
// 非贪婪到第一个 ]( 结束；url 不含空白
const MD_IMG = /!\[([\s\S]*?)\]\(([^)\s]+)\)/g

// 对"未转义"的原始文本（私信/公告 send_message）：先整体转义再白名单替换图片
export function renderTextContent(text) {
  if (!text) return ''
  return escapeHtml(text).replace(MD_IMG, imgReplacer)
}

// 对"后端已转义"的评论正文（describe / comment_describe）：信任为安全片段，
// 仅把 markdown 图片语法替换为 <img>（不二次转义，避免 &lt; → &amp;lt;）
export function renderCommentContent(text) {
  if (!text) return ''
  return String(text).replace(MD_IMG, imgReplacer)
}
