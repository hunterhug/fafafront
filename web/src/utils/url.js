// 文章与节点的地址拼接（唯一出口，避免各页面手写拼错）
//
// 规则（与后端一致）：
//   节点页   /u/<用户名>/node/<节点SEO>
//   文章页   /u/<用户名>/node/<节点SEO>/<文章SEO>
// 节点 SEO 在同一用户内唯一，文章 SEO 在所属节点内唯一，
// 所以「用户名 + 节点 SEO + 文章 SEO」三者一起才能唯一定位一篇文章。
//
// 地址里**不出现 id**：拿不齐 SEO 三元组时不渲染链接（或先用 openContentById 解析）。

/** 文章地址；SEO 不全时返回空字符串（调用方据此禁用链接） */
export function contentUrl(c) {
  if (!c) return ''
  if (c.user_name && c.node_seo && c.seo) {
    return `/u/${c.user_name}/node/${c.node_seo}/${c.seo}`
  }
  return ''
}

/** 节点地址 */
export function nodeUrl(userName, nodeSeo) {
  if (!userName || !nodeSeo) return ''
  return `/u/${userName}/node/${nodeSeo}`
}

/** 节点页（带节点对象） */
export function nodeUrlOf(userName, node) {
  if (!node) return ''
  return nodeUrl(userName, node.seo)
}

/**
 * 只有 id 时的跳转：先按 id 取文章，拿到 SEO 三元组后再跳到 SEO 地址。
 * 用于站内信、后台列表这类只带 content_id 的入口，保证地址栏不出现 id。
 * @returns {Promise<string>} 目标地址；取不到返回空字符串
 */
export async function resolveContentUrlById(request, id) {
  if (!id) return ''
  try {
    const res = await request.post('/app/content', { id })
    const d = res?.data || {}
    return contentUrl({ user_name: d.user_name, node_seo: d.node_seo, seo: d.seo })
  } catch (e) {
    return ''
  }
}
