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

  return res
}

/**
 * 获取当前登录用户信息
 * @returns {Promise} 返回当前用户信息
 */
export const getCurrentUser = async () => {
  const res = await request.get(`/stock-api/api/auth/me`)

  return res
}
