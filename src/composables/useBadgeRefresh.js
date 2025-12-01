import { inject } from 'vue';

/**
 * 通用 badge 刷新工具
 * 在任意组件/组合式函数中调用，用于触发左侧菜单的 badge 重新拉取
 *
 * 为了灵活选择性更新，支持三种入参：
 * - 不传/传 null：刷新所有 badge
 * - 传字符串：仅刷新对应方法的 badge（如 'getPriceCount'）
 * - 传字符串数组：仅刷新数组中方法对应的 badge
 *
 * 注意：依赖上层通过 provide 提供的 `badgeRefresh`，该对象中应包含：
 * - triggerBadgeRefresh(targetMethods)
 */
export function useBadgeRefresh() {
  const badgeRefresh = inject('badgeRefresh', null);

  const refreshBadge = (targetMethods = null) => {
    try {
      if (badgeRefresh?.triggerBadgeRefresh) {
        badgeRefresh.triggerBadgeRefresh(targetMethods);
        const methodsInfo = targetMethods
          ? (Array.isArray(targetMethods) ? targetMethods.join(', ') : targetMethods)
          : '全部';
        // 仅日志，便于排查调用来源与范围
        // eslint-disable-next-line no-console
        console.log(`[useBadgeRefresh] 已触发 badge 刷新，目标方法: ${methodsInfo}`);
      } else {
        // eslint-disable-next-line no-console
        console.warn('[useBadgeRefresh] 未找到 badge 刷新功能（缺少 provide("badgeRefresh")）');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[useBadgeRefresh] 触发 badge 刷新失败:', error);
    }
  };

  return { refreshBadge };
}


