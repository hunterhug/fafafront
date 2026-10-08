// 管理后台 RBAC：菜单/路由 → 所需后端资源 url（/v1 前缀）的映射 + 权限工具。
// 后端 /v1/user/perm 返回 super_admin + resources(url 列表)，
// 前端据此放行 /admin 路由与动态显示侧边菜单（展示层，接口安全仍由后端 AuthFilter 兜底）。

// 每个管理页对应"主操作接口"，组用户勾选任一即显示该菜单/放行该页
export const ADMIN_PAGE_PERMS = {
  '/admin': [], // Dashboard 概览：能进后台即显示
  '/admin/users': ['/v1/user/list', '/v1/user/admin/list'],
  '/admin/groups': ['/v1/group/list'],
  '/admin/contents': ['/v1/content/admin/list'],
  '/admin/comments': ['/v1/comment/admin/list'],
  '/admin/reports': ['/v1/content/admin/bad/list', '/v1/comment/admin/bad/list', '/v1/user/admin/bad/list'],
  '/admin/nodes': ['/v1/node/admin/list'],
  '/admin/files': ['/v1/file/admin/list'],
  '/admin/relations': ['/v1/relation/admin/list'],
  '/admin/messages': ['/v1/message/admin/list', '/v1/message/admin/global/list'],
  '/admin/settings': ['/v1/site/config/update'],
  '/admin/friends': ['/v1/friend/list']
}

// Dashboard 概览也读取各 admin list 做统计，统一归到 /admin 仅需"有任意后台权限"
export function pageNeeds(path) {
  return ADMIN_PAGE_PERMS[path] || []
}

// 判断某页对某用户是否放行
export function pageAllowed(path, perm) {
  if (!perm) return false
  if (perm.super_admin) return true
  const needs = pageNeeds(path)
  if (needs.length === 0) {
    // Dashboard：有任意后台权限即可
    return (perm.resources || []).length > 0
  }
  return needs.some((u) => (perm.resources || []).includes(u))
}

// 是否有任一接口权限（超管 true）；用于卡片 need 多资源任一
export function anyPerm(perm, urls) {
  if (!perm) return false
  if (perm.super_admin) return true
  return urls.some((u) => (perm.resources || []).includes(u))
}

// 侧边菜单可见列表（超管全量；组用户过滤）
export function filterMenus(allMenus, perm) {
  if (!perm) return []
  if (perm.super_admin) return allMenus
  return allMenus.filter((m) => pageAllowed(m.to, perm))
}

// 是否有某接口权限（超管 true；组用户看 resources url 是否包含）
export function hasPerm(perm, url) {
  if (!perm) return false
  if (perm.super_admin) return true
  return (perm.resources || []).includes(url)
}

let permPromise = null
// 拉取并缓存 /user/perm 结果到 localStorage；in-flight 去重，供守卫/菜单多处复用
export function fetchAndCachePerm() {
  if (permPromise) return permPromise
  permPromise = import('@/api')
    .then(({ default: request }) => request.get('/api/user/perm'))
    .then((res) => {
      const perm = res.data || null
      try {
        localStorage.setItem('adminPerm', JSON.stringify(perm))
      } catch (e) {}
      return perm
    })
    .catch(() => {
      try {
        localStorage.removeItem('adminPerm')
      } catch (e) {}
      return null
    })
    .finally(() => {
      permPromise = null
    })
  return permPromise
}
