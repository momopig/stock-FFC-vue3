import { createApp } from 'vue';
import './style.css';
import RouterPage from './RouterPage.vue';
import router from './router';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import { createPinia } from 'pinia';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { permission } from '@/directives/permission';

const app = createApp(RouterPage);
app.use(router);
app.use(ElementPlus, {
  locale: zhCn,
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js')
      .then(function (registration) {
        console.log('Service Worker 注册成功！')
      })
      .catch(function (err) {
        console.error('Service Worker 注册失败！', err)
      })
  })
}

const pinia = createPinia();
app.use(pinia);

// 注册权限指令
app.directive('permission', permission);

// 立即挂载应用，避免阻塞首次渲染
app.mount('#app');
