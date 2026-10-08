# FaFa 前端产品文档

花花 CMS（fafacms）的前端仓库，一个围绕内容互动的社区站点。本文档记录产品需求、设计决策与页面交互，接口文档见后端仓库 `fafacms/docs/`。

## 技术栈

- Vue 3 + Vite 6
- Element Plus（UI 组件库）
- Pinia（状态管理）+ Vue Router 4
- md-editor-v3（Markdown 编辑/预览）
- vuedraggable（拖拽排序）

## 目录结构

```
web/src/
├── api/          # axios 实例（/app 公开、/api 登录后，自动带 Auth）
├── components/   # 通用组件（CommentNode 等）
├── layouts/      # 布局（FrontLayout 前台 / UserLayout 个人中心 / AdminLayout 后台）
├── router/       # 路由
├── store/        # Pinia（user）
├── utils/        # format（时间/摘要）、relation（关注）
└── views/        # 页面（前台 / user 个人中心 / admin 后台）
```

## 本地开发

```bash
cd web
npm install
npm run dev   # http://localhost:3000（vite 代理 /app /api /storage 到后端）
```

## Docker 部署

仓库根目录 `./deploy.sh`，构建 Vite → nginx 容器，反代后端，见仓库 `README.md`。

## 约定

- 接口响应统一为 `{flag, data, error}`，`flag=true` 表示成功；错误码见后端 `docs/http/errcode.md`。
- 前端对接后端以实际代码为准（后端 controller 在 `fafacms/core/controllers/`）。
- 每个需求/变动记录到 [changelog.md](changelog.md)，设计/交互沉淀到 [pages.md](pages.md)。
