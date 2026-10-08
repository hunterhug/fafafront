import { Boot } from '@wangeditor/editor'
import markdownModule from '@wangeditor/plugin-md'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'md-editor-v3/lib/style.css'
import 'md-editor-v3/lib/preview.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { ElMessage } from 'element-plus'
import App from './App.vue'
import router from './router'
import { useUserStore } from './store/user'

// wangEditor Markdown 快捷输入（# 标题、- 列表、> 引用、--- 分割线、代码块），应用级只注册一次
Boot.registerModule(markdownModule)

const app = createApp(App)

// 全局错误处理：渲染错误不再静默（打印 + 弹窗提示，便于定位白屏/空白）
app.config.errorHandler = (err, instance, info) => {
  console.error('[花花世界 渲染错误]', err, info)
  try {
    ElMessage.error('页面渲染出错：' + (err?.message || err))
  } catch (e) {}
}

const pinia = createPinia()
app.use(pinia)
// 已登录：启动会话保活（定期续期）
if (localStorage.getItem('token')) {
  try {
    useUserStore(pinia).keepAlive()
  } catch (e) {}
}
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.mount('#app')
