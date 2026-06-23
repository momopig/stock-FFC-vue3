import { watch } from 'vue';
import { UserStore } from '@/state/user';
import router from '@/router';

// 存储元素与权限配置的映射，用于响应式更新
const elementPermissionMap = new WeakMap();

// 权限指令
export const permission = {
  mounted(el, binding) {
    const userStore = UserStore();

    // 存储元素的权限配置
    elementPermissionMap.set(el, binding);

    // 立即检查权限
    checkPermission(el, binding);

    // 🚀 监听权限数据变化，实现响应式权限检查
    const stopWatcher = watch(
      () => userStore.permissions,
      () => {
        // 权限数据变化时，重新检查当前元素的权限
        const currentBinding = elementPermissionMap.get(el);
        if (currentBinding) {
          checkPermission(el, currentBinding);
        }
      },
      {
        deep: true, // 深度监听数组变化
        immediate: false // 已经在上面立即检查过了
      }
    );

    // 存储停止监听的函数，在unmounted时清理
    el._permissionWatcher = stopWatcher;
  },

  updated(el, binding) {
    // 更新存储的权限配置
    elementPermissionMap.set(el, binding);
    // 重新检查权限
    checkPermission(el, binding);
  },

  unmounted(el) {
    // 🧹 清理监听器，避免内存泄漏
    if (el._permissionWatcher) {
      el._permissionWatcher();
      delete el._permissionWatcher;
    }
    // 清理WeakMap中的引用
    elementPermissionMap.delete(el);
  }
};

function checkPermission(el, binding) {
  const { value, modifiers } = binding;
  const userStore = UserStore();

  // 页面级默认放开策略：当路由本身可访问时，页面DOM默认可见。
  // 这样可避免“路由可见但页面元素全空”的体验问题。
  if (isCurrentRouteAccessible(userStore)) {
    restoreElement(el, modifiers);
    return;
  }

  if (!value) {
    return;
  }

  let hasPermission = false;

  if (Array.isArray(value)) {
    // 数组模式：检查是否有数组中的任一权限
    if (modifiers.all) {
      // v-permission.all 检查是否有所有权限
      hasPermission = userStore.hasAllPermissions(value);
    } else {
      // 默认检查是否有任一权限
      hasPermission = userStore.hasAnyPermission(value);
    }
  } else {
    // 字符串模式：检查单个权限
    hasPermission = userStore.hasPermission(value);
  }

  if (!hasPermission) {
    // 没有权限时的处理方式
    if (modifiers.disabled) {
      // v-permission.disabled 禁用元素而不是隐藏
      el.disabled = true;
      el.style.opacity = '0.5';
      el.style.cursor = 'not-allowed';
    } else {
      // 默认隐藏元素
      el.style.display = 'none';
    }
  } else {
    restoreElement(el, modifiers);
  }

  // // 兜底：如果权限常量还未初始化，触发初始化并二次检查
  // const constants = perms.getPermissionsSync();
  // if (!constants || !Object.keys(constants).length) {
  //   perms.initPermissions().finally(() => {
  //     // 初始化完成后再次校验，确保显示状态正确
  //     checkPermission(el, binding);
  //   });
  // }
}

function isCurrentRouteAccessible(userStore) {
  const currentRoute = router?.currentRoute?.value;
  if (!currentRoute) {
    return false;
  }

  if (currentRoute.meta?.requiresAuth === false) {
    return false;
  }

  const routePermissionCodes = currentRoute.meta?.permissionCodes;
  if (!Array.isArray(routePermissionCodes) || routePermissionCodes.length === 0) {
    return true;
  }

  return userStore.hasAnyPermission(routePermissionCodes);
}

function restoreElement(el, modifiers) {
  if (modifiers.disabled) {
    el.disabled = false;
    el.style.opacity = '';
    el.style.cursor = '';
  } else {
    el.style.display = '';
  }
}
