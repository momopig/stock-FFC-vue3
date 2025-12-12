import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Markdown from 'vite-plugin-md';
import path from 'path';
export default defineConfig({
  plugins: [
    vue({ include: [/\.vue$/, /\.md$/] }), // 允许 .md 文件作为 Vue 组件
    Markdown()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    // 严格限制包大小，超过 500KB 警告，超过 1MB 报错
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 将常见的大型依赖拆分为独立 chunk，避免单块过大
          if (id.includes('node_modules')) {
            // Element Plus 相关拆分（避免过度拆分导致运行时初始化顺序问题）
            if (id.includes('@element-plus/icons-vue')) return 'el-icons';
            if (id.includes('element-plus')) return 'element-plus-core';

            // Vue 生态拆分
            if (id.includes('/vue/') || id.includes('@vue/')) return 'vue-vendor';
            if (id.includes('pinia')) return 'pinia';
            if (id.includes('vue-router')) return 'vue-router';

            // 工具库拆分
            if (id.includes('xlsx')) return 'xlsx';
            if (id.includes('dayjs')) return 'dayjs';
            if (id.includes('axios')) return 'axios';
            if (id.includes('lodash')) return 'lodash';
            if (id.includes('moment')) return 'moment';

            // 按包名进一步拆分大型依赖（兼容 pnpm 布局）
            if (id.includes('node_modules/')) {
              const nmToken = 'node_modules/';
              const lastIndex = id.lastIndexOf(nmToken);
              let subPath = id.slice(lastIndex + nmToken.length);
              let packageName = '';
              // 处理作用域包名 @scope/name
              if (subPath.startsWith('@')) {
                const parts = subPath.split('/');
                packageName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
              } else {
                packageName = subPath.split('/')[0];
              }

              // 跳过已单独处理的包
              const excluded = ['element-plus', '@element-plus', 'vue', '@vue', 'pinia', 'vue-router', 'xlsx', 'dayjs', 'axios', 'lodash', 'moment'];
              if (!excluded.some(pkg => packageName === pkg || packageName.startsWith(`${pkg}/`))) {
                const safeName = packageName.replace(/^@/, '').replace('/', '-');
                return `vendor-${safeName}`;
              }
            }

            // 其他三方库统一打到 vendor
            return 'vendor';
          }

          // 避免对业务代码进行强制分包，交由 Rollup 自动优化，减少初始化顺序问题
        },
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        entryFileNames: 'assets/entry-[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  server: {
    // 添加这个配置来处理 history 模式的路由刷新
    historyApiFallback: true,
    proxy: {
      '/stock-api': {
        target: 'http://119.23.68.187:3004',
        changeOrigin: true,
      },
      // 使用正则表达式匹配需要代理的路径
      '^/nest-api/': {
        target: 'http://119.23.68.187:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    },
  },
});
