import { ref, computed } from 'vue';
// import { permissionApi } from '@/api/modules/permission';
import { UserStore } from '@/state/user';

/**
 * 权限管理组合式函数
 * 统一管理权限常量、权限检查等功能
 */

// 模块级单例缓存，避免多处调用各自维护一份导致取不到数据
const permissionsCache = ref(null);
const permissionGroupsCache = ref(null);
const rolePermissionsCache = ref(null);
const roleDisplayNamesCache = ref(null);
const loadingCache = ref(false);
const errorCache = ref(null);

export const usePermissions = () => {
  const userStore = UserStore();

  /**
   * 初始化权限数据
   * 从后端API获取权限常量定义
   */
  const initPermissions = async () => {
    if (permissionsCache.value) {
      return permissionsCache.value; // 已缓存，直接返回
    }

    try {
      loadingCache.value = true;
      errorCache.value = null;

      return permissionsCache.value;
    } catch (err) {
      errorCache.value = err;
      console.error('初始化权限数据失败:', err);

      // 返回空对象，避免应用崩溃
      return {};
    } finally {
      loadingCache.value = false;
    }
  };

  // 判定函数统一复用 UserStore
  const hasPermission = (permission) => userStore.hasPermission(permission);
  const hasAnyPermission = (permissions) => userStore.hasAnyPermission(permissions);
  const hasAllPermissions = (permissions) => userStore.hasAllPermissions(permissions);

  /**
   * 检查菜单权限（支持新旧权限格式）
   */
  const checkMenuPermission = (menu) => {
    if (!menu.permissions && !menu.permissionCodes) {
      return true;
    }
    if (menu.permissionCodes) {
      return hasAnyPermission(menu.permissionCodes);
    }
    if (menu.permissions) {
      return checkLegacyRolePermission(menu.permissions);
    }
    return true;
  };

  /**
   * 检查传统角色权限（向后兼容）
   */
  const checkLegacyRolePermission = (rolePermissions) => {
    if (!Array.isArray(rolePermissions)) return false;
    const userInfo = userStore.userInfo || {};
    return rolePermissions.some(permission => {
      switch (permission) {
        case 'is_superuser':
          return !!userInfo.is_superuser;
        case 'isWarehouseManager':
          return !!userInfo.isWarehouseManager;
        case 'isShopOperator':
          return !!userInfo.isShopOperator;
        default:
          return false;
      }
    });
  };

  // 权限常量与配置（来自模块级缓存）
  const getPermissions = computed(() => permissionsCache.value || {});
  const getPermissionGroups = computed(() => permissionGroupsCache.value || []);
  const getRolePermissions = computed(() => rolePermissionsCache.value || {});
  const getRoleDisplayNames = computed(() => roleDisplayNamesCache.value || {});

  // 清除缓存
  const clearCache = () => {
    permissionsCache.value = null;
    permissionGroupsCache.value = null;
    rolePermissionsCache.value = null;
    roleDisplayNamesCache.value = null;
  };

  // 提供同步获取权限常量的方法
  const getPermissionsSync = () => permissionsCache.value || {};

  // 暴露用户态（用于迁移 usePermission 的使用场景）
  const userRole = computed(() => userStore.role);
  const isMainAccount = computed(() => userStore.isMainAccount);
  const availableRoles = computed(() => userStore.availableRoles);

  return {
    // 状态
    loading: computed(() => loadingCache.value),
    error: computed(() => errorCache.value),

    // 权限常量与配置
    permissions: getPermissions,
    permissionGroups: getPermissionGroups,
    rolePermissions: getRolePermissions,
    roleDisplayNames: getRoleDisplayNames,

    // 用户态
    userRole,
    isMainAccount,
    availableRoles,

    // 方法
    initPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkMenuPermission,
    checkLegacyRolePermission,
    clearCache,
    getPermissionsSync,
  };
};

export default usePermissions;
