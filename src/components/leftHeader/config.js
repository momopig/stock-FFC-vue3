// 权限类型定义
// 支持两种权限配置方式：
// 1. 传统角色权限：is_superuser, isWarehouseManager, isShopOperator
// 2. 细粒度权限code：基于后端权限常量的具体权限code
// 多个权限用数组表示，满足任一权限即可访问
//
// 注意：权限code字符串需要与后端权限常量保持一致
// 建议通过 usePermissions 组合式函数动态获取权限常量

// Badge 配置说明：
// badge: {
//   enabled: true,           // 是否启用数字提示红点
//   apiMethod: 'methodName', // 对应的API方法名，需要在 leftHeader/index.vue 的 apiMethods 中注册
//   maxCount: 99,           // 可选：最大显示数字，超过显示 99+，默认为 99
// }
//
// 使用示例：
// 1. 在菜单项中添加 badge 配置
// 2. 在 leftHeader/index.vue 的 apiMethods 对象中注册对应的API方法
// 3. 确保API方法返回格式为 { success: boolean, result: number }
// 4. 系统会自动加载并显示红点数字
//
// Badge 选择性更新说明：
// 在任何组件中，你可以通过以下方式触发 badge 更新：
// 在任何组件中使用
// const badgeRefresh = inject('badgeRefresh');
//
// // 更新所有 badge
// badgeRefresh.triggerBadgeRefresh();
//
// // 只更新特定的 badge（单个）
// badgeRefresh.triggerBadgeRefresh('getPriceCount');
//
// // 只更新特定的 badge（多个）
// badgeRefresh.triggerBadgeRefresh(['getPriceCount', 'getMonitorCount']);
//
// 使用场景示例：
// - 调价管理：拒绝调价后只更新 getPriceCount
// - 批量操作：同时更新多个相关的 badge

export const menuList = [
  // {
  //   name: '首页',
  //   foldName: '首页',
  //   icon: 'HomeFilled',
  //   path: '/home',
  // },

  {
    name: '股票池',
    foldName: '股票池',
    icon: 'Box', // 股票
    path: '/stock-pool',
    children: [
      {
        name: '策略股票池',
        foldName: '策略股票池',
        path: '/stock-pool/strategy',
      },
      {
        name: '自选分组股票池',
        foldName: '自选分组股票池',
        path: '/stock-pool/self-selected',
      },
      {
        name: '买入信号监控',
        foldName: '买入监控',
        path: '/stock-pool/buy-signal',
      },
      {
        name: '卖出信号股票池',
        foldName: '卖出信号',
        path: '/stock-pool/sell-signal',
      },
    ],
  },
  {
    name: '信号策略管理',
    foldName: '信号策略',
    icon: 'DataAnalysis',
    path: '/trading-strategy/signal-strategies',
    permissions: ['is_superuser'],
    children: [
      {
        name: '买点策略',
        foldName: '买点策略',
        path: '/trading-strategy/signal-strategies/buy',
        permissions: ['is_superuser'],
      },
      {
        name: '卖点策略',
        foldName: '卖点策略',
        path: '/trading-strategy/signal-strategies/sell',
        permissions: ['is_superuser'],
      },
      {
        name: '买卖通用策略',
        foldName: '通用策略',
        path: '/trading-strategy/signal-strategies/common',
        permissions: ['is_superuser'],
      },
      {
        name: '筹码集中价管理',
        foldName: '筹码表',
        path: '/trading-strategy/signal-strategies/chip-prices',
        permissions: ['is_superuser'],
      },
      {
        name: '关键价格管理',
        foldName: '关键价',
        path: '/trading-strategy/signal-strategies/key-prices',
        permissions: ['is_superuser'],
      },
    ],
  },
  {
    name: '执行策略管理',
    foldName: '执行策略',
    icon: 'DataAnalysis',
    path: '/trading-strategy/execution',
    permissions: ['is_superuser'],
    children: [
      {
        name: '仓位风控策略',
        foldName: '仓位风控',
        path: '/trading-strategy/execution/account-risk',
        permissions: ['is_superuser'],
      },
      {
        name: '建仓策略',
        foldName: '建仓策略',
        path: '/trading-strategy/execution/open-position',
        permissions: ['is_superuser'],
      },
      {
        name: '清仓策略',
        foldName: '清仓策略',
        path: '/trading-strategy/execution/close-position',
        permissions: ['is_superuser'],
      },
      {
        name: '做T策略',
        foldName: '做T策略',
        path: '/trading-strategy/execution/intraday-t',
        permissions: ['is_superuser'],
      },
    ],
  },
  {
    name: '做T策略买卖约束管理',
    foldName: '做T约束',
    icon: 'DataAnalysis',
    path: '/trading-strategy/intraday-constraints',
    permissions: ['is_superuser'],
    children: [
      {
        name: '买入风控约束策略',
        foldName: '买入约束',
        path: '/trading-strategy/intraday-constraints/buy-risk-block',
        permissions: ['is_superuser'],
      },
      {
        name: '卖出趋势保护策略',
        foldName: '卖出保护',
        path: '/trading-strategy/intraday-constraints/sell-trend-guard',
        permissions: ['is_superuser'],
      },
    ],
  },
  {
    name: '模拟交易',
    foldName: '模拟交易',
    icon: 'Coin',
    path: '/sim-trading',
    permissions: ['is_superuser'],
    children: [
      {
        name: '账号管理',
        foldName: '账号管理',
        path: '/sim-trading/accounts',
        permissions: ['is_superuser'],
      },
      {
        name: '账号详情',
        foldName: '账号详情',
        path: '/sim-trading/account-detail',
        permissions: ['is_superuser'],
      },
    ],
  },
  {
    name: '用户管理',
    foldName: '用户',
    icon: 'User', // 用户
    path: '/user-mgt',
    dataGuide: 'user-mgt', // 引导标记
    permissions: ['is_superuser'],
  },
  {
    name: '日志管理',
    foldName: '日志管理',
    icon: 'Files',
    path: '/system/log-management',
    permissions: ['is_superuser'],
  },
  {
    name: 'Dump版本管理',
    foldName: 'Dump版本',
    icon: 'Files',
    path: '/system/dump-snapshots',
    permissions: ['is_superuser'],
  },
  {
    name: '股票搜索设置',
    foldName: '搜索设置',
    icon: 'Setting',
    path: '/system/stock-search-settings',
    permissions: ['is_superuser'],
  },
  {
    name: '富途openD订阅管理',
    foldName: '富途openD订阅管理',
    icon: 'DataAnalysis',
    path: '/futu-opend-subscriptions',
    permissions: ['is_superuser'],
  },
];
