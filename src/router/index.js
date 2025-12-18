import { createRouter, createWebHistory } from 'vue-router';
import { lazy } from '@/utils/lazy';
import { getLocal, setLocal } from '@/utils/storage';
import permissionGuard from '@/utils/permission-guard';

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/login', component: lazy(() => import('@/views/Login/index.vue')), meta: { layout: 'blank', requiresAuth: false } },
  { path: '/register', component: lazy(() => import('@/views/Register/index.vue')), meta: { layout: 'blank', requiresAuth: false } },
  { path: '/user-mgt', component: lazy(() => import('@/views/UserMgt/index.vue'))},
  { path: '/home', component: lazy(() => import('@/App.vue'))},
  { path: '/stock-pool', component: lazy(() => import('@/views/StockPool/index.vue'))},
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 启用权限守卫
router.beforeEach(permissionGuard);

export default router;
