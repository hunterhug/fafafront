// 时间格式化工具
// 后端时间有两种形态：
// 1. 字符串（如 "2019-05-27 00:41:28"，已按东八区格式化）—— 原样返回
// 2. 数字秒（如评论 create_time）—— 格式化为 yyyy-MM-dd HH:mm:ss
import { t } from '@/i18n'

export function formatTime(value) {
  if (value === 0 || value === null || value === undefined || value === '') {
    return ''
  }
  if (typeof value === 'number') {
    const d = new Date(value * 1000)
    return formatDate(d)
  }
  // 已是字符串
  return String(value)
}

export function formatDate(d) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes()) +
    ':' +
    pad(d.getSeconds())
  )
}

// 相对时间：刚刚 / N 分钟前 / N 小时前 / 昨天 / N 天前（数字秒）
export function formatRelative(value) {
  if (!value) return ''
  const ts = typeof value === 'number' ? value : Math.floor(new Date(value).getTime() / 1000)
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return t('time.justNow')
  if (diff < 3600) return t('time.minutesAgo', { n: Math.floor(diff / 60) })
  if (diff < 86400) return t('time.hoursAgo', { n: Math.floor(diff / 3600) })
  if (diff < 172800) return t('common.yesterday')
  if (diff < 604800) return t('time.daysAgo', { n: Math.floor(diff / 86400) })
  return formatTime(value)
}

// 社交账号规范化：去掉协议/域名前缀，只保留账号后缀
// 如 "https://weibo.com/xxx"、"weibo.com/xxx"、"xxx" -> "xxx"
export function normSocial(v, domain) {
  if (!v) return ''
  const d = String(domain).replace(/\./g, '\\.')
  return String(v)
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(new RegExp('^' + d + '\/', 'i'), '')
    .replace(/^\/+/, '')
}

// Markdown 正文 → 纯文本摘要
// 用于文章列表摘要，避免直接渲染正文时出现 #、**、`、[链接](url) 等 Markdown 语法“乱符”
export function stripMarkdown(md) {
  if (!md) return ''
  let s = String(md)
  // 代码块 ```...```
  s = s.replace(/```[\s\S]*?```/g, ' ')
  // 行内代码 `code`
  s = s.replace(/`([^`]*)`/g, '$1')
  // 图片 ![alt](url) → alt
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  // 链接 [text](url) → text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  // 后端列表接口把正文截断成摘要（200 字符），截断点可能落在语法结构中间：
  // 先清掉被截断的尾部构造，避免卡片上露出半截 HTML 标签或半截 URL
  // 未闭合注释 <!-- ...
  s = s.replace(/<!--[\s\S]*$/, ' ')
  // 未闭合 HTML 标签：只处理「带属性的开标签」`<img src="…`、「闭合标签」`</p`
  // 或「刚好截在标签名里」`<strong`，避免误伤 `a<b` 这类普通文本
  s = s.replace(/<(?:\/[a-zA-Z][^>]*|[a-zA-Z][a-zA-Z0-9-]*(?:[^>]*=[^>]*)?\s*)$/, ' ')
  // 未闭合的图片/链接 ![alt](url 或 [text](url
  s = s.replace(/!?\[[^\]]*\]\([^)\s]*$/, ' ')
  // 原始 HTML 标签
  s = s.replace(/<[^>]+>/g, ' ')
  // 标题/粗体/斜体/列表/引用等标记符号
  s = s.replace(/[#>*_~|+-]/g, ' ')
  // 反斜杠转义
  s = s.replace(/\\/g, '')
  // 压缩空白
  return s.replace(/\s+/g, ' ').trim()
}
