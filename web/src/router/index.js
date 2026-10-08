import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { t } from '@/i18n'
import { pageAllowed, fetchAndCachePerm } from '@/utils/adminPerms'

// 前台布局
import FrontLayout from '@/layouts/FrontLayout.vue'
// 个人后台布局
import UserLayout from '@/layouts/UserLayout.vue'
// 管理后台布局
import AdminLayout from '@/layouts/AdminLayout.vue'

const routes = [
  // ============ 前台（游客/所有用户） ============
  {
    path: '/',
    component: FrontLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/Home.vue') },
      {
        path: 'explore',
        name: 'explore',
        component: () => import('@/views/Explore.vue')
      },
      {
        path: 'about',
        name: 'about',
        component: () => import('@/views/About.vue')
      },
      {
        path: 'acknowledgments',
        name: 'acknowledgments',
        component: () => import('@/views/Acknowledgments.vue')
      },
      {
        path: 'versions',
        name: 'versions',
        component: () => import('@/views/VersionLog.vue')
      },
      {
        path: 'roadmap',
        name: 'roadmap',
        component: () => import('@/views/TodoList.vue')
      },
      {
        path: 'blocked',
        name: 'blocked',
        component: () => import('@/views/Blocked.vue')
      },
      {
        path: 'messages',
        name: 'messages',
        redirect: '/user/messages'
      },
      {
        path: 'u/:name/node/:nodeSeo',
        name: 'user-node',
        component: () => import('@/views/UserPage.vue')
      },
      {
        path: 'u/:name/node/:nodeSeo/:seo',
        name: 'content-detail-seo',
        component: () => import('@/views/ContentDetail.vue')
      },
      {
        path: 'u/:name/fans',
        name: 'user-relations-fans',
        component: () => import('@/views/Relations.vue')
      },
      {
        path: 'u/:name/follows',
        name: 'user-relations-follows',
        component: () => import('@/views/Relations.vue')
      },
      {
        path: 'u/:name',
        name: 'user-page',
        component: () => import('@/views/UserPage.vue')
      },
      // 认证相关
      { path: 'user/login', name: 'login', component: () => import('@/views/Login.vue') },
      { path: 'user/register', name: 'register', component: () => import('@/views/Register.vue') },
      { path: 'user/activate', name: 'activate', component: () => import('@/views/Activate.vue') },
      { path: 'user/forget', name: 'forget', component: () => import('@/views/Forget.vue') }
    ]
  },
  // ============ 个人后台（登录用户） ============
  {
    path: '/user',
    component: UserLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'user-home', component: () => import('@/views/user/Index.vue') },
      { path: 'profile', name: 'user-profile', component: () => import('@/views/user/Profile.vue') },
      { path: 'password', name: 'user-password', component: () => import('@/views/user/Password.vue') },
      { path: 'security', name: 'user-security', component: () => import('@/views/user/Security.vue') },
      { path: 'write', name: 'user-write', redirect: '/user/manage?write=1' },
      {
        path: 'manage',
        name: 'user-manage',
        component: () => import('@/views/user/Manage.vue')
      },
      {
        path: 'content/:id/edit',
        name: 'user-content-edit',
        redirect: (to) => ({ path: '/user/manage', query: { edit: to.params.id } })
      },
      { path: 'contents', name: 'user-contents', component: () => import('@/views/user/Contents.vue') },
      { path: 'nodes', name: 'user-nodes', component: () => import('@/views/user/Nodes.vue') },
      { path: 'files', name: 'user-files', component: () => import('@/views/user/Files.vue') },
      {
        path: 'messages',
        name: 'user-messages',
        component: () => import('@/views/Messages.vue')
      },
      {
        path: 'chat/:userId',
        name: 'user-chat',
        redirect: (to) => ({ path: '/user/messages', query: { peer: to.params.userId } })
      },
      { path: 'follows', name: 'user-follows', component: () => import('@/views/user/Follows.vue') }
    ]
  },
  // ============ 管理总后台（管理员） ============
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', name: 'admin-home', component: () => import('@/views/admin/Dashboard.vue') },
      { path: 'dashboard', redirect: '/admin' },
      { path: 'users', name: 'admin-users', component: () => import('@/views/admin/Users.vue') },
      { path: 'groups', name: 'admin-groups', component: () => import('@/views/admin/Groups.vue') },
      { path: 'contents', name: 'admin-contents', component: () => import('@/views/admin/Contents.vue') },
      { path: 'comments', name: 'admin-comments', component: () => import('@/views/admin/Comments.vue') },
      { path: 'reports', name: 'admin-reports', component: () => import('@/views/admin/Reports.vue') },
      { path: 'nodes', name: 'admin-nodes', component: () => import('@/views/admin/Nodes.vue') },
      { path: 'files', name: 'admin-files', component: () => import('@/views/admin/Files.vue') },
      { path: 'relations', name: 'admin-relations', component: () => import('@/views/admin/Relations.vue') },
      { path: 'messages', name: 'admin-messages', component: () => import('@/views/admin/Messages.vue') },
      { path: 'settings', name: 'admin-settings', component: () => import('@/views/admin/Settings.vue') },
      { path: 'friends', name: 'admin-friends', component: () => import('@/views/admin/Friends.vue') }
    ]
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// 路由守卫：登录态检查
// 个人中心路由需要 VIP（用户信息可能缺失，此时放行到页面再提示）
const vipRoutes = ['/user/write', '/user/manage', '/user/files', '/user/nodes', '/user/contents', '/user/content']

router.beforeEach(async (to) => {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null
  const isVip = user && (user.is_vip === true || user.vip === 1)

  if (to.meta.requiresAuth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // 非 VIP：拦截内容管理相关页面（提示联系管理员）；个人中心首页/消息/私信/资料等普通用户可用
  if (token && user && !isVip) {
    const p = to.path
    const vipBlocked =
      p.startsWith('/user/write') ||
      p.startsWith('/user/manage') ||
      p.startsWith('/user/files') ||
      p.startsWith('/user/nodes') ||
      p.startsWith('/user/contents') ||
      p.startsWith('/user/content/')
    if (vipBlocked) {
      ElMessage.warning(t('common.vipRequired'))
      return false // 只弹窗，不跳转
    }
  }
  if (to.meta.requiresAdmin) {
    if (!token) return { name: 'login', query: { redirect: to.fullPath } }
    // 超管（名字 admin）或组授权用户可进；具体页面再按 pageAllowed 校验
    const isSuper = user && user.name === 'admin'
    let perm = null
    const permRaw = localStorage.getItem('adminPerm')
    try {
      perm = permRaw ? JSON.parse(permRaw) : null
    } catch (e) {
      perm = null
    }
    // 非超管且本地无权限缓存：拉取一次（避免登录瞬态/缓存被清后误拦）
    if (!isSuper && !(perm && (perm.super_admin || (perm.resources || []).length > 0))) {
      perm = await fetchAndCachePerm()
    }
    const allowed = isSuper || (perm && (perm.super_admin || pageAllowed(to.path, perm)))
    if (!allowed) {
      ElMessage.warning(t('admin.noPermission') || '无权限访问')
      return { name: 'home' }
    }
  }
  return true
})

export default router
