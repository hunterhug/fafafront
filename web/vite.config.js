import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // 公开接口：/app/xxx -> http://127.0.0.1:8080/xxx
      '/app/': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/app\//, '/')
      },
      // 登录后接口：/api/xxx -> http://127.0.0.1:8080/v1/xxx
      '/api/': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\//, '/v1/')
      },
      // 静态文件：/storage/xxx、/storage_x/xxx -> http://127.0.0.1:8080（上传的图片和缩略图）
      '/storage/': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      },
      '/storage_x/': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 分包优化：框架/UI/编辑器独立 chunk（缓存友好，首屏更快）
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          'element-plus': ['element-plus'],
          'md-editor': ['md-editor-v3']
        }
      }
    }
  }
})
