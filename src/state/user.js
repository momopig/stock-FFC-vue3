import { defineStore } from 'pinia';

export const UserStore = defineStore('user', {
  state: () => ({
    name: '123',
    mallList: [],
    mallIds: [],
    mallId_map_mallName: {},
    selectedMall: {},
    cookie: '',
    agentCookie: '',
    userInfo: {},
    initMonitorConfig: {},
    // 新增权限相关状态
    permissions: [], // 用户权限列表
    role: null, // 用户角色信息
    isMainAccount: false, // 是否为主账号
    availableRoles: [], // 可用角色列表（主账号使用）
    ownerId: null, // 主账号ID（租户ID）
    hasCookieAccess: false, // 是否有Cookie访问权限
    hasAgentCookieAccess: false, // 是否有代理商Cookie访问权限
  }),
  getters: {
    // 检查是否有指定权限
    hasPermission: (state) => (permission) => {
      if (Array.isArray(permission)) {
        return permission.some(item => state.permissions?.includes(item));
      } else {
        return state.permissions?.includes(permission) || false;
      }
    },
    // 检查是否有指定权限列表中的任一权限
    hasAnyPermission: (state) => (permissions) => {
      if (!Array.isArray(permissions)) return false;
      return permissions.some(permission => state.permissions?.includes(permission));
    },
    // 检查是否有指定权限列表中的所有权限
    hasAllPermissions: (state) => (permissions) => {
      if (!Array.isArray(permissions)) return false;
      return permissions.every(permission => state.permissions?.includes(permission));
    },
  },
  actions: {
    setMall(mall) {
      this.selectedMall = mall;
    },
    setUserInfo(userInfo) {
      this.userInfo = userInfo;
    },
    mapMallList(list) {
      list.forEach((mall) => {
        this.mallId_map_mallName[mall.mallId] = mall.mallName;
      });
    },
    setMallList(list) {
      this.mallList = list;
      this.mapMallList(list);
      this.setMallIds(list);
    },
    setMallIds(mallList) {
      this.mallIds = mallList.map(mall => mall.mallId)
    },
    setCookie(cookie) {
      this.cookie = cookie;
    },
    setAgentCookie(cookie) {
      this.agentCookie = cookie;
    },
    setInitMonitorConfig(config) {
      this.initMonitorConfig = config;
    },
    // 设置用户权限
    setPermissions(permissions) {
      this.permissions = permissions || [];
    },
    // 设置用户角色
    setRole(role) {
      this.role = role;
    },
    // 设置是否为主账号
    setIsMainAccount(isMainAccount) {
      this.isMainAccount = isMainAccount;
    },
    // 设置可用角色列表
    setAvailableRoles(roles) {
      this.availableRoles = roles || [];
    },
    // 设置主账号ID
    setOwnerId(ownerId) {
      this.ownerId = ownerId;
    },
    // 设置Cookie访问权限
    setHasCookieAccess(hasCookieAccess) {
      this.hasCookieAccess = hasCookieAccess;
    },
    // 设置代理商Cookie访问权限
    setHasAgentCookieAccess(hasAgentCookieAccess) {
      this.hasAgentCookieAccess = hasAgentCookieAccess;
    },
    // 清空用户信息（登出时使用）
    clearUserData() {
      this.userInfo = {};
      this.permissions = [];
      this.role = null;
      this.isMainAccount = false;
      this.availableRoles = [];
      this.ownerId = null;
      this.hasCookieAccess = false;
      this.hasAgentCookieAccess = false;
      this.mallList = [];
      this.mallIds = [];
      this.mallId_map_mallName = {};
      this.selectedMall = {};
    },
  },
});
