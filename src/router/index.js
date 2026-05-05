import { createRouter, createWebHistory } from 'vue-router';
import { lazy } from '@/utils/lazy';
import { getLocal, setLocal } from '@/utils/storage';
import permissionGuard from '@/utils/permission-guard';

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/login', component: lazy(() => import('@/views/Login/index.vue')), meta: { layout: 'blank', requiresAuth: false } },
  { path: '/register', component: lazy(() => import('@/views/Register/index.vue')), meta: { layout: 'blank', requiresAuth: false } },
  { path: '/user-mgt', component: lazy(() => import('@/views/UserMgt/index.vue')), meta: { permissions: ['is_superuser'] } },
  { path: '/home', component: lazy(() => import('@/App.vue'))},
  // 股票池子路由
  { path: '/stock-pool/strategy', component: lazy(() => import('@/views/StockPool/StrategyPool/index.vue'))},
  { path: '/stock-pool/self-selected', component: lazy(() => import('@/views/StockPool/SelfSelectedPool/index.vue'))},
  { path: '/stock-pool/buy-signal', component: lazy(() => import('@/views/StockPool/BuySignalPool/index.vue'))},
  { path: '/stock-pool/sell-signal', component: lazy(() => import('@/views/StockPool/SellSignalPool/index.vue'))},
  { path: '/trading-strategy/execution', component: lazy(() => import('@/views/TradingStrategy/StrategyList/index.vue')), meta: { permissions: ['is_superuser'] } },
  { path: '/trading-strategy/execution/usage', component: lazy(() => import('@/views/TradingStrategy/StrategyUsage/index.vue')), meta: { permissions: ['is_superuser'] } },
  { path: '/sim-trading/accounts', component: lazy(() => import('@/views/SimTrading/AccountList/index.vue')), meta: { permissions: ['is_superuser'] } },
  { path: '/sim-trading/account-detail', component: lazy(() => import('@/views/SimTrading/AccountDetail/index.vue')), meta: { permissions: ['is_superuser'] } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 启用权限守卫
router.beforeEach(permissionGuard);

export default router;
