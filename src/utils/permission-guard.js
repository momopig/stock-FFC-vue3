import { UserStore } from '@/state/user';
import { usePermissions } from '@/composables/usePermissions';
import { getCurrentUserInfo } from '@/api/modules/customerUser';
// import { exchangeRateApi } from '@/api/modules/exchangeRate.js'

// 全局初始化状态管理，避免多个路由同时触发初始化
let isInitializing = false;
let initializationPromise = null;
let isGlobalInitialized = false; // 全局初始化完成标记

// 全局初始化状态，供组件监听
const globalInitState = {
  isInitialized: false,
  isInitializing: false,
  error: null
};

// 全局初始化完成事件，供组件监听
let globalInitCallbacks = [];

/**
 * 通知全局初始化状态变化
 */
function notifyGlobalInitState() {
  globalInitCallbacks.forEach(callback => {
    try {
      callback(globalInitState);
    } catch (error) {
      console.error('全局初始化状态通知回调执行失败:', error);
    }
  });
}

/**
 * 监听全局初始化状态变化
 * @param {Function} callback - 状态变化回调函数
 * @returns {Function} - 取消监听的函数
 */
export function watchGlobalInitState(callback) {
  globalInitCallbacks.push(callback);

  // 如果已经初始化完成，立即调用回调
  if (globalInitState.isInitialized) {
    callback(globalInitState);
  }

  // 返回取消监听的函数
  return () => {
    const index = globalInitCallbacks.indexOf(callback);
    if (index > -1) {
      globalInitCallbacks.splice(index, 1);
    }
  };
}

/**
 * 获取当前全局初始化状态
 * @returns {Object} - 当前状态
 */
export function getGlobalInitState() {
  return { ...globalInitState };
}

/**
 * 全局应用初始化（包含用户信息获取、权限初始化等）
 * @returns {Promise<boolean>} 是否初始化成功
 */
async function initializeApplication() {
  // 如果已经在初始化中，等待当前初始化完成
  if (isInitializing && initializationPromise) {
    return await initializationPromise;
  }

  // 如果已经全局初始化完成，直接返回成功
  if (isGlobalInitialized) {
    const userStore = UserStore();
    return !!(userStore.userInfo?.id);
  }

  // 开始初始化
  isInitializing = true;
  globalInitState.isInitializing = true;
  globalInitState.error = null;
  notifyGlobalInitState();

  initializationPromise = (async () => {
    try {
      console.log('权限守卫：开始全局应用初始化...');

      // 1. 获取用户信息
      const userInfoResult = await getCurrentUserInfo();

      // 2. 初始化权限系统
      const { initPermissions } = usePermissions();
      initPermissions();

      if (userInfoResult?.success && userInfoResult?.payload?.data?.id) {
        console.log('权限守卫：全局应用初始化成功');
        isGlobalInitialized = true;
        globalInitState.isInitialized = true;
        globalInitState.isInitializing = false;
        notifyGlobalInitState();
        return true;
      } else {
        console.log('权限守卫：用户信息获取失败');
        globalInitState.error = '用户信息获取失败';
        globalInitState.isInitializing = false;
        notifyGlobalInitState();
        return false;
      }
    } catch (error) {
      console.error('权限守卫：全局应用初始化失败:', error);
      globalInitState.error = error.message || '初始化失败';
      globalInitState.isInitializing = false;
      notifyGlobalInitState();
      return false;
    } finally {
      isInitializing = false;
      initializationPromise = null;
    }
  })();

  return await initializationPromise;
}

/**
 * 路由权限守卫工具函数
 * 用于在路由跳转前检查用户权限
 */

/**
 * 检查路由权限
 * @param {Object} route - 路由对象
 * @param {Object} userStore - 用户状态管理
 * @returns {Object} 权限检查结果
 */
export function checkRoutePermission(route, userStore) {
  const { meta } = route;

  // 如果路由不需要认证，直接通过
  if (meta?.requiresAuth === false) {
    return { hasPermission: true, reason: 'no_auth_required' };
  }

  // 如果没有权限要求，默认通过
  if (!meta?.permissionCodes && !meta?.permissions) {
    return { hasPermission: true, reason: 'no_permission_required' };
  }

  // 注意：登录状态检查已在主函数中处理，这里假设用户已登录

  // 检查细粒度权限码
  if (meta.permissionCodes) {
    const hasPermission = userStore.hasAnyPermission(meta.permissionCodes);
    if (!hasPermission) {
      return {
        hasPermission: false,
        reason: 'insufficient_permissions',
        requiredPermissions: meta.permissionCodes,
        redirectTo: '/home' // 重定向到首页
      };
    }
  }

  // 检查传统角色权限（向后兼容）
  if (meta.permissions) {
    const perms = usePermissions();
    const hasPermission = perms.checkLegacyRolePermission(meta.permissions);
    if (!hasPermission) {
      return {
        hasPermission: false,
        reason: 'insufficient_role_permissions',
        requiredRoles: meta.permissions,
        redirectTo: '/home' // 重定向到首页
      };
    }
  }

  return { hasPermission: true, reason: 'permission_granted' };
}

/**
 * 获取权限检查失败时的错误信息
 * @param {Object} checkResult - 权限检查结果
 * @returns {string} 错误信息
 */
export function getPermissionErrorMessage(checkResult) {
  const { reason, requiredPermissions, requiredRoles } = checkResult;

  switch (reason) {
    case 'not_logged_in':
      return '请先登录后再访问此页面';
    case 'insufficient_permissions':
      return `您没有访问此页面的权限。需要权限：${requiredPermissions?.join(', ') || '未知'}`;
    case 'insufficient_role_permissions':
      return `您没有访问此页面的权限。需要角色：${requiredRoles?.join(', ') || '未知'}`;
    default:
      return '权限检查失败';
  }
}

/**
 * 记录权限检查失败事件（用于安全审计）
 * @param {Object} route - 路由对象
 * @param {Object} checkResult - 权限检查结果
 * @param {Object} userStore - 用户状态管理
 */
export function logPermissionFailure(route, checkResult, userStore) {
  const logData = {
    timestamp: new Date().toISOString(),
    route: route.path,
    reason: checkResult.reason,
    userId: userStore.userInfo?.id,
    userRole: userStore.role,
    userPermissions: userStore.permissions,
    requiredPermissions: checkResult.requiredPermissions,
    requiredRoles: checkResult.requiredRoles,
    userAgent: navigator.userAgent,
    referrer: document.referrer
  };

  // 在开发环境下打印详细日志
  if (process.env.NODE_ENV === 'development') {
    console.warn('权限检查失败:', logData);
  }

  // 在生产环境下，可以发送到监控系统
}

/**
 * 权限守卫主函数
 * @param {Object} to - 目标路由
 * @param {Object} from - 来源路由
 * @param {Function} next - 路由跳转函数
 * @returns {Promise<void>}
 */
export async function permissionGuard(to, from, next) {
  try {
    const userStore = UserStore();

    // 如果路由不需要认证，直接通过
    if (to.meta?.requiresAuth === false) {
      next();
      return;
    }

    // 如果用户信息为空或未全局初始化，进行全局应用初始化
    if (!userStore.userInfo || !userStore.userInfo.id || !isGlobalInitialized) {
      console.log('权限守卫：开始全局应用初始化，等待完成...');
      const initSuccess = await initializeApplication();

      if (!initSuccess) {
        console.log('权限守卫：全局应用初始化失败，重定向到登录页');
        const checkResult = {
          hasPermission: false,
          reason: 'not_logged_in',
          redirectTo: '/login'
        };

        logPermissionFailure(to, checkResult, userStore);
        next('/login');
        return;
      }
      console.log('权限守卫：全局应用初始化完成，继续权限检查...');
    }

    // 执行权限检查
    const checkResult = checkRoutePermission(to, userStore);

    if (checkResult.hasPermission) {
      // 权限检查通过，允许访问
      next();
    } else {
      // 权限检查失败
      logPermissionFailure(to, checkResult, userStore);

      // 显示错误提示
      const errorMessage = getPermissionErrorMessage(checkResult);

      // 使用 ElMessage 显示错误信息（如果可用）
      if (window.ElMessage) {
        window.ElMessage.error(errorMessage);
      } else {
        console.error(errorMessage);
      }

      // 重定向到指定页面
      if (checkResult.redirectTo) {
        // 如果是权限不足，重定向到无权限页面并传递相关信息
        if (checkResult.reason === 'insufficient_permissions' || checkResult.reason === 'insufficient_role_permissions') {
          next({
            path: '/permission-denied',
            query: {
              requiredPermissions: checkResult.requiredPermissions?.join(','),
              requiredRoles: checkResult.requiredRoles?.join(','),
              currentRole: userStore.role,
              reason: checkResult.reason,
              from: to.path
            }
          });
        } else {
          next(checkResult.redirectTo);
        }
      } else {
        next('/home'); // 默认重定向到首页
      }
    }
  } catch (error) {
    console.error('权限守卫执行失败:', error);

    // 权限检查出错时，为了安全起见，重定向到首页
    next('/home');
  }
}

export default permissionGuard;
