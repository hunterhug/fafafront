<template>
  <el-config-provider :locale="epLocale">
    <router-view />
    <RateLimitUnblock />
  </el-config-provider>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useSiteStore } from '@/store/site'
import RateLimitUnblock from '@/components/RateLimitUnblock.vue'
import { locale } from '@/i18n'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import ja from 'element-plus/es/locale/lang/ja'
import ko from 'element-plus/es/locale/lang/ko'
import de from 'element-plus/es/locale/lang/de'
import fr from 'element-plus/es/locale/lang/fr'
import es from 'element-plus/es/locale/lang/es'
import ptBr from 'element-plus/es/locale/lang/pt-br'
import it from 'element-plus/es/locale/lang/it'
import ru from 'element-plus/es/locale/lang/ru'

const EP_LOCALES = { zh: zhCn, en, ja, ko, de, fr, es, pt: ptBr, it, ru }
const epLocale = computed(() => EP_LOCALES[locale.value] || zhCn)

onMounted(() => {
  useSiteStore().load()
})
</script>

<style>
/* ============ 知乎风格全局主题 ============ */
:root {
  /* 温馨暖色调（小红书风珊瑚红） */
  --zh-blue: #ff5f57;
  --zh-blue-hover: #f04840;
  --zh-orange: #ff8c42;
  --zh-gradient: linear-gradient(135deg, #ff5f57 0%, #ff8c42 100%);
  --zh-gradient-hover: linear-gradient(135deg, #f04840 0%, #ff7a2f 100%);
  --zh-bg: #f7f5f2;
  --zh-card: #ffffff;
  --zh-text: #242424;
  --zh-text-2: #4f4b49;
  --zh-text-3: #99948f;
  --zh-border: #efeae6;
  --zh-radius: 8px;
  --zh-shadow: 0 1px 2px rgba(24, 18, 16, 0.03), 0 4px 16px rgba(24, 18, 16, 0.04);
  --zh-shadow-hover: 0 6px 20px rgba(255, 95, 87, 0.16), 0 12px 32px rgba(24, 18, 16, 0.10);

  /* Element Plus 主题对齐暖色 */
  --el-color-primary: #ff5f57;
  --el-color-primary-light-3: #ff8580;
  --el-color-primary-light-5: #ffafab;
  --el-color-primary-light-7: #ffd6d3;
  --el-color-primary-light-8: #ffe4e2;
  --el-color-primary-light-9: #fff1f0;
  --el-color-primary-dark-2: #cc4c45;
  --el-border-radius-base: 8px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  background-color: var(--zh-bg);
  color: var(--zh-text);
  font-size: 15px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

a {
  color: var(--zh-blue);
  text-decoration: none;
}

a:hover {
  color: var(--zh-blue-hover);
}

/* 知乎风卡片 */
.zh-card {
  background: var(--zh-card);
  border-radius: var(--zh-radius);
  margin-bottom: 12px;
  box-shadow: var(--zh-shadow);
  transition: transform 0.28s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.28s ease, border-color 0.28s ease;
  border: 1px solid transparent;
  animation: zhFadeUp 0.45s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.zh-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--zh-shadow-hover);
  border-color: #ffe0dc;
}

/* 卡片入场动画 */
@keyframes zhFadeUp {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 知乎风主按钮（渐变） */
.zh-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 999px;
  background: var(--zh-gradient);
  color: #fff;
  font-size: 14px;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(255, 95, 87, 0.28);
  transition: transform 0.18s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.22s ease, background 0.22s ease;
}

.zh-btn-primary:hover {
  background: var(--zh-gradient-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 95, 87, 0.38);
}

.zh-btn-primary:active {
  transform: scale(0.96);
}

/* 已关注（灰底）/ 互相关注（珊瑚红实心，覆盖灰底） */
.zh-btn-primary.followed {
  background: #f0f0f0;
  color: #9b9491;
}

.zh-btn-primary.followed:hover {
  background: #f0f0f0;
}

.zh-btn-primary.mutual {
  background: var(--zh-blue);
  color: #fff;
}

.zh-btn-primary.mutual:hover {
  background: var(--zh-blue-hover);
}

.zh-btn-plain {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 999px;
  background: #fff;
  color: var(--zh-blue);
  font-size: 14px;
  border: 1px solid var(--zh-blue);
  cursor: pointer;
  transition: all 0.2s;
}

.zh-btn-plain:hover {
  background: var(--zh-blue);
  color: #fff;
}

/* 国际化适配：按钮/标签不换行，避免长词（德/俄等）挤压换行 */
.zh-btn-primary,
.zh-btn-plain,
.zh-like-btn,
.zh-nav-link,
.zh-footer-link,
.side-link,
.nav-name,
.session-name,
.cn-nick,
.feed-tab,
.msg-tab,
.notice-cat {
  white-space: nowrap;
}

/* 知乎风赞同按钮（蓝色胶囊） */
.zh-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid var(--zh-blue);
  color: var(--zh-blue);
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.zh-like-btn:hover {
  background: var(--zh-blue);
  color: #fff;
}

.zh-like-btn.liked {
  background: var(--zh-blue);
  color: #fff;
}

.zh-like-btn:active {
  transform: scale(0.92);
  transition: transform 0.1s;
}

/* 文本色 */
.zh-text-2 { color: var(--zh-text-2); }
.zh-text-3 { color: var(--zh-text-3); }

/* 渐变文字（品牌 logo / 标题点缀） */
.zh-gradient-text {
  background: var(--zh-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* 毛玻璃（顶部导航 / 移动端 tabbar） */
.zh-glass {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
}

/* 点赞/关注点击弹跳 */
@keyframes zhBounce {
  0% { transform: scale(1); }
  40% { transform: scale(1.18); }
  70% { transform: scale(0.94); }
  100% { transform: scale(1); }
}

.zh-bounce {
  animation: zhBounce 0.38s cubic-bezier(0.22, 0.61, 0.36, 1);
}

/* Element Plus 卡片对齐知乎风格 */
.el-card {
  border: none;
  border-radius: var(--zh-radius);
  box-shadow: var(--zh-shadow);
}

.el-card__header {
  border-bottom: 1px solid var(--zh-border);
  font-weight: 600;
  color: var(--zh-text);
}

/* 表格/分页等细节 */
.el-table {
  --el-table-header-bg-color: #faf6f4;
  --el-table-header-text-color: var(--zh-text-2);
  --el-table-border-color: var(--zh-border);
  border-radius: var(--zh-radius);
}

.el-pagination {
  --el-pagination-hover-color: var(--zh-blue);
}

/* 滚动条（知乎风细滚动条） */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: #d3d3d3;
  border-radius: 3px;
}

::-webkit-scrollbar-track {
  background: transparent;
}
/* ===== 移动端适配（全局） ===== */
@media (max-width: 768px) {
  /* 移动端输入字号 ≥16px，避免 iOS Safari 聚焦时自动放大页面 */
  input,
  textarea,
  select,
  .el-input__inner,
  .el-textarea__inner {
    font-size: 16px !important;
  }

  .zh-main {
    padding: 10px;
  }
  .zh-nav-inner {
    padding: 0 10px;
  }
  .zh-logo-text {
    font-size: 16px;
  }

  /* 触控目标：主要按钮/赞同按钮在窄屏加大可点区域（≥40px） */
  .zh-btn-primary,
  .zh-btn-plain,
  .zh-like-btn {
    min-height: 40px;
    padding: 8px 18px;
  }

  /* 触控目标：feed 操作、评论操作、作者名/节点标签等小可点元素加大（≥40px） */
  .feed-action,
  .cn-action,
  .feed-author-name,
  .da-name,
  .detail-node-tag,
  .more-btn,
  .load-more-btn {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
  }

  .feed-action,
  .cn-action {
    padding: 4px 8px;
  }

  .feed-author-name,
  .da-name {
    padding: 0 8px;
  }

  /* 对话框/弹窗在窄屏不溢出（固定宽度如 440/460px 的 dialog 自适应） */
  .el-dialog {
    max-width: calc(100vw - 24px) !important;
  }

  .el-message-box {
    max-width: calc(100vw - 24px) !important;
  }

  /* 管理后台：卡片头部/筛选表单在窄屏换行，表格保持横向滚动 */
  .el-card__header {
    height: auto !important;
  }

  .filter-form {
    flex-wrap: wrap;
  }

  .filter-form .el-form-item {
    margin-right: 10px;
    margin-bottom: 8px;
  }
}

</style>
