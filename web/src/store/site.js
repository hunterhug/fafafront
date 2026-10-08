import { defineStore } from 'pinia'
import request from '@/api'

// 站点全局配置（标题 / 副标题 / 社区介绍 / 底部介绍 / 友情链接），公开接口 /app/site/config
// 默认值与后端 model.Default* 保持一致，接口失败时降级使用
export const DEFAULT_SITE_TITLE = '花花世界'
export const DEFAULT_SITE_SUBTITLE = '发现更大的世界'
export const DEFAULT_SITE_INTRO = '是一个围绕内容互动的社区：写文章、交朋友、发现世界'

export const useSiteStore = defineStore('site', {
  state: () => ({
    siteTitle: DEFAULT_SITE_TITLE,
    siteSubtitle: DEFAULT_SITE_SUBTITLE,
    siteIntro: DEFAULT_SITE_INTRO,
    footerIntro: '花花世界 · 一个围绕内容互动的社区',
    friendLinks: [],
    loaded: false
  }),
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return
      try {
        const res = await request.post('/app/site/config')
        const d = res.data || {}
        if (d.site_title) this.siteTitle = d.site_title
        if (d.site_subtitle) this.siteSubtitle = d.site_subtitle
        if (d.site_intro) this.siteIntro = d.site_intro
        if (d.footer_intro) this.footerIntro = d.footer_intro
        this.friendLinks = Array.isArray(d.friend_links) ? d.friend_links : []
      } catch (e) {
        // 静默：保持默认值
      } finally {
        this.loaded = true
      }
    }
  }
})
