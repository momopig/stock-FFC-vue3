import request from '../common'
import qs from 'qs'
import { UserStore } from '@/state/user';
// 注意：不要在模块顶层实例化 Pinia 的 store，否则会在 app.use(pinia) 之前运行导致报错
// 通过懒获取的方式在调用处再拿 store，确保 Pinia 已经激活
const getUserStore = () => UserStore();

/**
 * 获取用户列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @returns {Promise} 返回用户列表
 */
export const getUserList = async (params) => {
  const queryString = qs.stringify({
    page: params.page,
    page_size: params.page_size,
  })
  const res = await request.get(`/stock-api/api/users/?` + queryString)

  // 当前格式处理：返回 {total, page, page_size, items: [...]}
  // 统一格式处理（注释）：如果返回 {success, payload: {data: [...], total}, ...}
  // const items = res?.success ? res?.payload?.data : res?.data?.items
  // const total = res?.success ? res?.payload?.total : res?.data?.total
  const items = res?.items || []
  const total = res?.total || 0

  return {
    ...res,
    data: items,
    items: items,
    total: total,
    // 为了兼容性，同时提供 result
    result: {
      data: items,
      count: total,
      total: total
    }
  }
}

/**
 * 创建用户
 * @param {Object} body - 用户信息
 * @param {string} body.username - 用户名
 * @param {string} body.email - 邮箱
 * @param {string} body.full_name - 全名
 * @param {string} body.password - 密码
 * @param {boolean} body.is_active - 是否激活
 * @param {boolean} body.is_superuser - 是否超级管理员
 * @returns {Promise} 返回创建的用户信息
 */
export const createUser = async (body) => {
  const res = await request.post(`/stock-api/api/users/`, body)

  // 当前格式处理：直接返回用户对象 response.data
  // 统一格式处理（注释）：如果返回 {success, payload: {data: {...}}, ...}
  // const userInfo = res?.success ? res?.payload?.data : res?.data
  const userInfo = res

  return {
    ...res,
    data: userInfo,
    // 为了兼容性，同时提供 result
    result: userInfo,
    success: true
  }
}

/**
 * 获取用户详情
 * @param {number} userId - 用户ID
 * @returns {Promise} 返回用户详情
 */
export const getUserDetail = async (userId) => {
  const res = await request.get(`/stock-api/api/users/${userId}`)

  // 当前格式处理：直接返回用户对象 response.data
  // 统一格式处理（注释）：如果返回 {success, payload: {data: {...}}, ...}
  // const userInfo = res?.success ? res?.payload?.data : res?.data
  const userInfo = res

  return {
    ...res,
    data: userInfo,
    // 为了兼容性，同时提供 result
    result: userInfo,
    success: true
  }
}

/**
 * 更新用户
 * @param {number} userId - 用户ID
 * @param {Object} body - 更新的用户信息
 * @param {string} [body.username] - 用户名
 * @param {string} [body.email] - 邮箱
 * @param {string} [body.full_name] - 全名
 * @param {string} [body.password] - 密码
 * @param {boolean} [body.is_active] - 是否激活
 * @param {boolean} [body.is_superuser] - 是否超级管理员
 * @returns {Promise} 返回更新后的用户信息
 */
export const updateUser = async (userId, body) => {
  const res = await request.patch(`/stock-api/api/users/${userId}`, body)

  // 当前格式处理：直接返回用户对象 response.data
  // 统一格式处理（注释）：如果返回 {success, payload: {data: {...}}, ...}
  // const userInfo = res?.success ? res?.payload?.data : res?.data
  const userInfo = res

  return {
    ...res,
    data: userInfo,
    // 为了兼容性，同时提供 result
    result: userInfo,
    success: true
  }
}

/**
 * 删除用户
 * @param {number} userId - 用户ID
 * @returns {Promise} 返回删除结果
 */
export const deleteUser = async (userId) => {
  const res = await request.delete(`/stock-api/api/users/${userId}`)

  // 当前格式处理：返回 {message: "用户已删除"}
  // 统一格式处理（注释）：如果返回 {success, payload, message, ...}
  // const result = res?.success ? res?.payload : res?.data
  const result = res

  return {
    ...res,
    data: result,
    // 为了兼容性，同时提供 result
    result: result,
    success: true
  }
}

/**
 * 获取当前登录用户信息
 * @returns {Promise} 返回当前用户信息
 */
export const getCurrentUserInfo = async () => {
  // 使用新的认证接口获取当前用户信息
  const { getCurrentUser } = await import('./auth')
  const res = await getCurrentUser()

  // 当前格式处理：直接返回用户对象 response.data
  // 统一格式处理（注释）：如果返回 {success, payload: {data: {...}}, ...}
  // const userInfo = res?.success ? res?.payload?.data : res?.data
  const userInfo = res?.data

  if (userInfo) {
    const userStore = getUserStore();
    // 设置用户基础信息（简化处理，移除复杂的权限、角色、主账号等逻辑）
    userStore.setUserInfo(userInfo)
  }

  return {
    ...res,
    data: userInfo,
    result: userInfo,
    success: !!userInfo
  }
}

export const addUser = async (body) => {
  const res = await request.post(`/stock-api/api/users/`, body)
  return res
}
