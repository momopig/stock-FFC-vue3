import request from '../common'
import qs from 'qs'

/**
 * 用户登录
 * @param {Object} body - 登录参数
 * @param {string} body.username - 用户名
 * @param {string} body.password - 密码
 * @returns {Promise} 返回登录结果
 */
export const login = async (body) => {
  // 登录接口需要使用 application/x-www-form-urlencoded 格式
  // 确保 grant_type 有默认值
  const loginData = {
    grant_type: 'password',
    ...body
  }
  const formData = qs.stringify(loginData)
  const res = await request.post(`/stock-api/api/auth/login`, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
  // 当前格式处理：返回 {access_token, token_type}
  // 统一格式处理（注释）：如果返回 {success, payload: {data: {access_token, token_type}}, ...}
  // const token = res?.success ? res?.payload?.data?.access_token : res?.data?.access_token
  const token = res?.access_token

  return {
    ...res,
    // 为了兼容性，同时提供 access_token 和 accessToken
    access_token: token,
    accessToken: token,
    token_type: res?.token_type || 'bearer'
  }
}

/**
 * 获取当前登录用户信息
 * @returns {Promise} 返回当前用户信息
 */
export const getCurrentUser = async () => {
  const res = await request.get(`/stock-api/api/auth/me`)

  // 当前格式处理：直接返回用户对象 response.data
  // 统一格式处理（注释）：如果返回 {success, payload: {data: {...}}, ...}
  // const userInfo = res?.success ? res?.payload?.data : res?.data
  const userInfo = res

  return {
    ...res,
    data: userInfo,
    // 为了兼容性，同时提供 result
    result: userInfo
  }
}
