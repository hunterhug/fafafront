import { defineStore } from 'pinia'
import { fetchAndCachePerm } from '@/utils/adminPerms'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    adminPerm: (() => {
      try {
        return JSON.parse(localStorage.getItem('adminPerm') || 'null')
      } catch (e) {
        return null
      }
    })()
  }),
  getters: {
    isLogin: (state) => !!state.token,
    // 超管：名字 admin（后端 id=-1 的 root 在此体系不常用，前端按名字即可）
    isAdmin: (state) => !!state.user && state.user.name === 'admin',
    // 能否进管理后台：超管 或 组授权资源非空
    canAdmin: (state) =>
      (!!state.user && state.user.name === 'admin') ||
      !!(state.adminPerm && (state.adminPerm.super_admin || (state.adminPerm.resources || []).length > 0)),
    // 能否访问「用户管理」页（VIP 管理入口）：超管或组内勾了用户列表资源
    canManageUsers: (state) =>
      (!!state.user && state.user.name === 'admin') ||
      !!(
        state.adminPerm &&
        (state.adminPerm.super_admin || (state.adminPerm.resources || []).includes('/v1/user/list'))
      ),
    // 公开接口 /u/info 返回 is_vip(bool)，/v1/user/info 返回 vip(int)，两者兼容
    isVip: (state) =>
      !!state.user && (state.user.is_vip === true || state.user.vip === 1)
  },
  actions: {
    setLogin(token, user) {
      this.token = token
      this.user = user || null
      localStorage.setItem('token', token)
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
      }
    },
    setUser(user) {
      this.user = user
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
      } else {
        localStorage.removeItem('user')
      }
    },
    setAdminPerm(perm) {
      this.adminPerm = perm || null
      if (perm) {
        localStorage.setItem('adminPerm', JSON.stringify(perm))
      } else {
        localStorage.removeItem('adminPerm')
      }
    },
    // 拉取管理后台可见资源（组权限），登录后调用；30s 内不重复请求
    async loadPerm(force = false) {
      const now = Date.now()
      if (!force && this._permFetchedAt && now - this._permFetchedAt < 30000) return
      this._permFetchedAt = now
      const perm = await fetchAndCachePerm()
      this.setAdminPerm(perm)
    },
    logout() {
      // 通知后端清理 session（尽力而为，失败不影响本地登出）
      // 注意：先取 token 再发起请求，避免下面清 localStorage 后拦截器带不上 Auth 头
      const tk = this.token || localStorage.getItem('token') || ''
      try {
        import('@/api').then(({ default: request }) => {
          request
            .post('/app/user/token/delete', null, { headers: { Auth: tk } })
            .catch(() => {})
        })
      } catch (e) {}
      this.token = ''
      this.user = null
      this.adminPerm = null
      this._permFetchedAt = 0
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('adminPerm')
    },
    // 拉取最新用户信息（头像等），登录后/页面加载时调用
    async refresh() {
      const request = (await import('@/api')).default
      try {
        const res = await request.get('/api/user/info')
        if (res.data) this.setUser(res.data)
      } catch (e) {
        // 静默失败
      }
    },
    // 登录态保活：定期调 token/refresh 延长后端 session 有效期（避免长时间挂页被踢）
    keepAlive() {
      if (this._kaTimer) return
      this._kaTimer = setInterval(() => {
        if (!this.isLogin) return
        import('@/api').then(({ default: request }) => {
          request.post('/app/user/token/refresh').catch(() => {})
        })
      }, 30 * 60 * 1000)
    },
    stopKeepAlive() {
      if (this._kaTimer) {
        clearInterval(this._kaTimer)
        this._kaTimer = null
      }
    }
  }
})
