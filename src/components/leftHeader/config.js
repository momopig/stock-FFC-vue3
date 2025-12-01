// 权限类型定义
// 支持两种权限配置方式：
// 1. 传统角色权限：isMaster, isWarehouseManager, isShopOperator
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
  },
  {
    name: '用户管理',
    foldName: '用户',
    icon: 'User', // 用户
    path: '/user-mgt',
    dataGuide: 'user-mgt' // 引导标记
  },
]
