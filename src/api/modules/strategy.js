import request from '../common'
import qs from 'qs'

/**
 * 获取策略列表
 * @param {Object} params - 查询参数
 * @param {string} params.name - 策略名称
 * @param {string} params.type - 策略类型（system/custom）
 * @param {boolean} params.enabled - 是否开启（true/false）
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @returns {Promise}
 */
export const getStrategyList = async (params) => {
  const queryString = qs.stringify(params)
  const res = await request.get(`/stock-api/api/strategy/?${queryString}`)
  return res
}

/**
 * 根据ID获取策略详情
 * @param {number} strategyId - 策略ID
 * @returns {Promise}
 */
export const getStrategyDetail = async (strategyId) => {
  const res = await request.get(`/stock-api/api/strategy/${strategyId}`)
  return res
}
