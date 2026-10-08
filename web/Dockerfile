# ---- 构建阶段：Vite build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- 运行阶段：nginx 静态托管 + 反代后端 ----
FROM nginx:alpine
ARG BACKEND_UPSTREAM=fafacms:8080
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i "s#__BACKEND_UPSTREAM__#${BACKEND_UPSTREAM}#g" /etc/nginx/conf.d/default.conf
EXPOSE 80
