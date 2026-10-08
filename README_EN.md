# FaFa Content Community: Frontend

> 🌐 [简体中文](README.md) · English

[![GitHub forks](https://img.shields.io/github/forks/hunterhug/fafafront.svg?style=social&label=Forks)](https://github.com/hunterhug/fafafront/network)
[![GitHub stars](https://img.shields.io/github/stars/hunterhug/fafafront.svg?style=social&label=Stars)](https://github.com/hunterhug/fafafront/stargazers)
[![GitHub last commit](https://img.shields.io/github/last-commit/hunterhug/fafafront.svg)](https://github.com/hunterhug/fafafront)
[![GitHub issues](https://img.shields.io/github/issues/hunterhug/fafafront.svg)](https://github.com/hunterhug/fafafront/issues)

The frontend repo of FaFa CMS (花花内容社区), built with **Vue 3 + Vite + Element Plus**. Currently paired with backend [hunterhug/fafacms](https://github.com/hunterhug/fafacms).

## Features

- Homepage recommend / explore hot / latest content, ranked by interaction heat, with title search
- Personal site (/u/xxx): node tree + article list, supporting multi-level content nodes
- SEO URLs: node pages at `/u/xxx/node/<nodeSeo>`, articles at `/u/xxx/node/<nodeSeo>/<articleSeo>`; slugs are generated randomly by default, editable with uniqueness checks, and a node can be hidden (its articles then leave the public lists while the author still sees them)
- Configurable branding: site title, subtitle, community intro and footer intro are edited in the admin console; header logo and favicon use a cat paw mark
- Long reads: articles over 2000 characters get a right-hand table of contents that highlights the current section and scrolls itself as you read
- Article reading: Markdown typesetting, likes, comments (nested), favorites, password articles
- Writing: full-screen WYSIWYG editor, drag-and-drop sorting, draft/publish/history versions
- Message center: in-app notifications (comment/like/follow/ban) categorized, private-message conversations
- Personal center: profile, account security (2FA), file management, content management, recycle bin
- Admin: users/content/comments/reports/notifications/friend links/site config, RBAC permission groups
- Internationalization: 10 UI languages (zh/en/ja/ko/de/fr/es/pt/it/ru)
- Fully adapted for mobile (responsive layout, bottom navigation, full-screen chat/editor)

## Product showcase

| Home feed | Article | User profile |
| --- | --- | --- |
| ![Home feed](./docs/screenshots/home.png) | ![Article](./docs/screenshots/content.png) | ![User profile](./docs/screenshots/profile.png) |

| Explore | Fans | Following |
| --- | --- | --- |
| ![Explore](./docs/screenshots/explore.png) | ![Fans](./docs/screenshots/fans.png) | ![Following](./docs/screenshots/follows.png) |

| Login | Personal center | Admin console |
| --- | --- | --- |
| ![Login](./docs/screenshots/login.png) | ![Personal center](./docs/screenshots/personal.png) | ![Admin console](./docs/screenshots/admin.png) |

| Notifications | Private chat |
| --- | --- |
| ![Notifications](./docs/screenshots/notifications.png) | ![Private chat](./docs/screenshots/chat.png) |

## Tech Stack

Vue 3 · Vite · Element Plus · Pinia · vue-router · md-editor-v3 · vuedraggable

## Local Development

Start the backend first (see the backend repo `install/README.md`, one-click via `./deploy.sh`).

```bash
cd web
npm install
npm run dev
```

Then visit [http://127.0.0.1:3000](http://127.0.0.1:3000/).

The dev server (`web/vite.config.js`) auto-proxies to the backend at `127.0.0.1:8080`:

- `/app/*` → backend `/*` (public APIs)
- `/api/*` → backend `/v1/*` (authenticated APIs)
- `/storage/*`, `/storage_x/*` → backend static files

## Docker One-Click Deploy

From the repo root:

```bash
./deploy.sh
```

It builds the frontend image (Vite build → nginx static hosting), runs an nginx container on `:3000`, and reverse-proxies `/api`, `/app`, `/storage` to the backend. The console prints the access URLs (including the LAN IP).

```bash
./deploy.sh up        # start (default)
./deploy.sh down      # stop
./deploy.sh logs      # view logs
./deploy.sh rebuild   # rebuild
```

- The backend is reached over the shared Docker network `fafacms:8080` by default (no config needed when deployed on the same machine as the backend).
- For cross-machine deployment set: `BACKEND_UPSTREAM=<backend-ip>:8080 ./deploy.sh rebuild`.

## Product / Frontend Docs

`docs/` in this repo is the product documentation (docsify, same style as the backend API docs), recording recommendation rules, pages & interactions, and requirement/change history.

After deploy (`./deploy.sh up`) it is served together with the frontend as a docsify container at **http://127.0.0.1:8889**.

- Recommendation rules: [docs/recommendation.md](docs/recommendation.md)
- Pages & interactions: [docs/pages.md](docs/pages.md)
- Requirements & change history: [docs/changelog.md](docs/changelog.md)

# License

Licensed under the [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) (AGPL-3.0).

You are free to use, modify and distribute this project, including for commercial purposes. However, if you offer it to users over a network, AGPL-3.0 requires you to provide those users with the corresponding complete source code. See [LICENSE](LICENSE) for the full terms.

## Acknowledgments

- [Acknowledgments](ACKNOWLEDGMENTS.md): thanks to every developer who has contributed to this project.
