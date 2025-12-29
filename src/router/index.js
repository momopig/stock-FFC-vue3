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
  // 股票池子路由
  { path: '/stock-pool/strategy', component: lazy(() => import('@/views/StockPool/StrategyPool/index.vue'))},
  { path: '/stock-pool/self-selected', component: lazy(() => import('@/views/StockPool/SelfSelectedPool/index.vue'))},
  { path: '/stock-pool/buy-signal', component: lazy(() => import('@/views/StockPool/BuySignalPool/index.vue'))},
  { path: '/stock-pool/sell-signal', component: lazy(() => import('@/views/StockPool/SellSignalPool/index.vue'))},
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 启用权限守卫
router.beforeEach(permissionGuard);

export default router;
