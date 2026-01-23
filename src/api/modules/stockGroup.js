import request from '../common'
import qs from 'qs'

/**
 * 获取用户分组列表
 * @returns {Promise}
 */
export const getUserGroups = async () => {
  const res = await request.get(`/stock-api/api/stock-groups/user-groups`)
  return res
}

/**
 * 创建股票分组
 * @param {Object} data - 分组数据
 * @param {string} data.name - 分组名称
 * @param {boolean} data.is_hidden - 是否隐藏
 * @param {number} data.display_order - 显示顺序
 * @param {string} data.remark - 备注
 * @param {string} data.create_type - 创建类型（system/custom）
 * @returns {Promise}
 */
export const createGroup = async (data) => {
  const res = await request.post(`/stock-api/api/stock-groups/user-groups`, data)
  return res
}

/**
 * 更新股票分组
 * @param {number} groupId - 分组ID
 * @param {Object} data - 更新数据
 * @param {string} data.name - 分组名称
 * @param {boolean} data.is_hidden - 是否隐藏
 * @param {number} data.display_order - 显示顺序
 * @param {string} data.remark - 备注
 * @returns {Promise}
 */
export const updateGroup = async (groupId, data) => {
  const res = await request.put(`/stock-api/api/stock-groups/user-groups/${groupId}`, data)
  return res
}

/**
 * 删除股票分组
 * @param {number} groupId - 分组ID
 * @returns {Promise}
 */
export const deleteGroup = async (groupId) => {
  const res = await request.delete(`/stock-api/api/stock-groups/user-groups/${groupId}`)
  return res
}

/**
 * 批量调整分组顺序
 * @param {Array} orderList - 顺序列表，包含 {id, display_order}
 * @returns {Promise}
 */
export const reorderGroups = async (orderList) => {
  const res = await request.post(`/stock-api/api/stock-groups/user-groups/reorder`, orderList)
  return res
}

/**
 * 查询分组内股票（含行情）
 * @param {number} groupId - 分组ID
 * @param {Object} params - 查询参数
 * @param {string} params.exchange_code - 交易所代码（SH/SZ/HK/US），搜索字段非必填
 * @param {string} params.stock_code - 股票代码，搜索字段非必填
 * @param {string} params.stock_name - 股票名称，搜索字段非必填
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @returns {Promise}
 */
export const getGroupStocks = async (groupId, params = {}) => {
  const queryString = qs.stringify(params)
  const res = await request.get(`/stock-api/api/stock-groups/${groupId}/stocks?${queryString}`)
  return res
}

/**
 * 从分组移除股票
 * @param {number} itemId - 分组内的数据id（不是股票ID）
 * @returns {Promise}
 */
export const removeStockFromGroup = async (itemId) => {
  const res = await request.delete(`/stock-api/api/stock-groups/stocks/${itemId}`)
  return res
}

/**
 * 更新分组内股票备注
 * @param {number} itemId - 分组内的数据id（不是股票ID）
 * @param {Object} data - 更新数据
 * @param {string} data.add_reason - 添加原因
 * @param {string} data.remark - 备注
 * @param {number} data.initial_price - 初始价格
 * @returns {Promise}
 */
export const updateGroupStock = async (itemId, data) => {
  const res = await request.patch(`/stock-api/api/stock-groups/stocks/${itemId}`, data)
  return res
}

/**
 * 股票加入多个分组
 * @param {Object} data - 股票数据
 * @param {Array<number>} data.group_ids - 分组ID列表
 * @param {string} data.exchange_code - 交易所代码（SH/SZ/HK/US）
 * @param {string} data.stock_code - 股票代码
 * @param {string} data.stock_name - 股票名称
 * @param {string} data.add_time - 加入日期，非必填
 * @param {number} data.initial_price - 初始价格，非必填
 * @param {string} data.add_reason - 添加原因，非必填
 * @param {string} data.remark - 备注，非必填
 * @returns {Promise}
 */
export const addStockToGroups = async (data) => {
  const res = await request.post(`/stock-api/api/stock-groups/stocks`, data)
  return res
}
