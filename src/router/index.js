import { createRouter, createWebHistory } from 'vue-router';
import { lazy } from '@/utils/lazy';
import { getLocal, setLocal } from '@/utils/storage';
import permissionGuard from '@/utils/permission-guard';
import { PermissionCodes } from '@/config/permissionCodes';

const routes = [
  { path: '/', redirect: '/home' },
  {
    path: '/login',
    component: lazy(() => import('@/views/Login/index.vue')),
    meta: { layout: 'blank', requiresAuth: false },
  },
  {
    path: '/register',
    component: lazy(() => import('@/views/Register/index.vue')),
    meta: { layout: 'blank', requiresAuth: false },
  },
  {
    path: '/user-mgt',
    component: lazy(() => import('@/views/UserMgt/index.vue')),
    meta: { permissionCodes: [PermissionCodes.SYSTEM_USER_READ] },
  },
  {
    path: '/account-mgt/roles',
    component: lazy(() => import('@/views/RoleMgt/index.vue')),
    meta: { permissionCodes: [PermissionCodes.SYSTEM_ROLE_READ] },
  },
  {
    path: '/system/log-management',
    component: lazy(() => import('@/views/System/LogManagement/index.vue')),
    meta: { permissionCodes: [PermissionCodes.SYSTEM_LOG_READ] },
  },
  {
    path: '/system/dump-snapshots',
    component: lazy(
      () => import('@/views/System/DumpSnapshotManager/index.vue')
    ),
    meta: { permissionCodes: [PermissionCodes.SYSTEM_DUMP_READ] },
  },
  {
    path: '/system/stock-search-settings',
    component: lazy(
      () => import('@/views/System/StockSearchSettings/index.vue')
    ),
    meta: { permissionCodes: [PermissionCodes.SYSTEM_STOCK_SEARCH_SOURCE_READ] },
  },
  {
    path: '/system/stock-search-index-management',
    component: lazy(
      () => import('@/views/System/StockSearchIndexManagement/index.vue')
    ),
    meta: { permissionCodes: [PermissionCodes.SYSTEM_STOCK_SEARCH_INDEX_READ] },
  },
  { path: '/home', component: lazy(() => import('@/App.vue')) },
  {
    path: '/futu-opend-subscriptions',
    component: lazy(
      () => import('@/views/StockPool/FutuSubscription/index.vue')
    ),
    meta: { permissionCodes: [PermissionCodes.SYSTEM_FUTU_SUBSCRIPTION_READ] },
  },
  {
    path: '/stock-pool/futu-subscriptions',
    redirect: '/futu-opend-subscriptions',
  },
  // 股票池子路由
  {
    path: '/stock-pool/strategy',
    component: lazy(() => import('@/views/StockPool/StrategyPool/index.vue')),
  },
  {
    path: '/stock-pool/self-selected',
    component: lazy(
      () => import('@/views/StockPool/SelfSelectedPool/index.vue')
    ),
  },
  {
    path: '/stock-pool/buy-signal',
    component: lazy(() => import('@/views/StockPool/BuySignalPool/index.vue')),
  },
  {
    path: '/stock-pool/sell-signal',
    component: lazy(() => import('@/views/StockPool/SellSignalPool/index.vue')),
  },
  {
    path: '/trading-strategy/execution/account-risk',
    component: lazy(
      () => import('@/views/TradingStrategy/StrategyList/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_EXECUTION_READ],
      strategyCategoryPreset: 'ACCOUNT_RISK',
      executionMenuTitle: '仓位风控策略',
    },
  },
  {
    path: '/trading-strategy/execution/open-position',
    component: lazy(
      () => import('@/views/TradingStrategy/StrategyList/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_EXECUTION_READ],
      strategyCategoryPreset: 'OPEN_POSITION',
      executionMenuTitle: '建仓策略',
    },
  },
  {
    path: '/trading-strategy/execution/close-position',
    component: lazy(
      () => import('@/views/TradingStrategy/StrategyList/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_EXECUTION_READ],
      strategyCategoryPreset: 'CLOSE_POSITION',
      executionMenuTitle: '清仓策略',
    },
  },
  {
    path: '/trading-strategy/execution/intraday-t',
    component: lazy(
      () => import('@/views/TradingStrategy/StrategyList/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_EXECUTION_READ],
      strategyCategoryPreset: 'INTRADAY_T',
      executionMenuTitle: '做T策略',
    },
  },
  {
    path: '/trading-strategy/execution',
    component: lazy(
      () => import('@/views/TradingStrategy/StrategyList/index.vue')
    ),
    meta: { permissionCodes: [PermissionCodes.STRATEGY_EXECUTION_READ] },
  },
  {
    path: '/trading-strategy/signal-strategies/buy',
    component: lazy(
      () => import('@/views/TradingStrategy/SignalStrategy/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_SIGNAL_READ],
      signalUsageScopePreset: 'buy',
      signalMenuTitle: '买点策略',
    },
  },
  {
    path: '/trading-strategy/signal-strategies/sell',
    component: lazy(
      () => import('@/views/TradingStrategy/SignalStrategy/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_SIGNAL_READ],
      signalUsageScopePreset: 'sell',
      signalMenuTitle: '卖点策略',
    },
  },
  {
    path: '/trading-strategy/signal-strategies/common',
    component: lazy(
      () => import('@/views/TradingStrategy/SignalStrategy/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_SIGNAL_READ],
      signalUsageScopePreset: 'both',
      signalMenuTitle: '买卖通用策略',
    },
  },
  {
    path: '/trading-strategy/signal-strategies/chip-prices',
    component: lazy(
      () => import('@/views/TradingStrategy/ChipPriceManager/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_SIGNAL_READ],
      signalMenuTitle: '筹码集中价管理',
    },
  },
  {
    path: '/trading-strategy/signal-strategies/key-prices',
    component: lazy(
      () => import('@/views/TradingStrategy/KeyPriceManager/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_SIGNAL_READ],
      signalMenuTitle: '关键价格管理',
    },
  },
  {
    path: '/trading-strategy/intraday-constraints/buy-risk-block',
    component: lazy(
      () => import('@/views/TradingStrategy/SignalStrategy/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_INTRADAY_CONSTRAINT_READ],
      signalUsageScopePreset: 'buy',
      signalBusinessCategoryPreset: 'BUY_RISK_BLOCK',
      signalMenuTitle: '买入风控约束策略',
    },
  },
  {
    path: '/trading-strategy/intraday-constraints/sell-trend-guard',
    component: lazy(
      () => import('@/views/TradingStrategy/SignalStrategy/index.vue')
    ),
    meta: {
      permissionCodes: [PermissionCodes.STRATEGY_INTRADAY_CONSTRAINT_READ],
      signalUsageScopePreset: 'sell',
      signalBusinessCategoryPreset: 'SELL_TREND_GUARD',
      signalMenuTitle: '卖出趋势保护策略',
    },
  },
  {
    path: '/trading-strategy/signal-strategies',
    component: lazy(
      () => import('@/views/TradingStrategy/SignalStrategy/index.vue')
    ),
    meta: { permissionCodes: [PermissionCodes.STRATEGY_SIGNAL_READ] },
  },
  {
    path: '/trading-strategy/execution/usage',
    component: lazy(
      () => import('@/views/TradingStrategy/StrategyUsage/index.vue')
    ),
    meta: { permissionCodes: [PermissionCodes.STRATEGY_EXECUTION_READ] },
  },
  {
    path: '/sim-trading/accounts',
    component: lazy(() => import('@/views/SimTrading/AccountList/index.vue')),
    meta: { permissionCodes: [PermissionCodes.SIM_TRADING_ACCOUNT_READ] },
  },
  {
    path: '/sim-trading/account-detail',
    component: lazy(() => import('@/views/SimTrading/AccountDetail/index.vue')),
    meta: { permissionCodes: [PermissionCodes.SIM_TRADING_ACCOUNT_READ] },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 启用权限守卫
router.beforeEach(permissionGuard);

export default router;
