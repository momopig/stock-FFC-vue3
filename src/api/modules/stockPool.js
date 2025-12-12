import request from '../common'
import qs from 'qs'

/**
 * Mock数据开关
 * 设置为 true 时使用mock数据（用于开发测试）
 * 设置为 false 时使用真实后端API接口
 *
 * 切换方式：将 USE_MOCK_DATA 设置为 false 即可切换到真实API
 */
const USE_MOCK_DATA = false

/**
 * 生成mock股票数据
 *
 * 包含的字段类别（使用RiceQuant字段）：
 * 1. 核心行情数据：
 *    - order_book_id: 标的代码（含市场）
 *    - symbol: 标的简称
 *    - datetime: 时间戳（K线开始时间）
 *    - open: 开盘价
 *    - high: 最高价
 *    - low: 最低价
 *    - close: 收盘价
 *    - volume: 成交量（股/手）
 *    - total_turnover: 成交额（元）
 *    - pct_change: 涨跌幅（%）
 *    - change: 涨跌额
 *    - prev_close: 昨收盘价
 *    - bid1: 买一价
 *    - ask1: 卖一价
 *    - open_interest: 持仓量（期货专属，股票为null）
 *
 * 2. 合约基础信息：
 *    - exchange: 交易所/市场代码（SSE/SZSE）
 *    - tick_size: 最小变动价位
 *    - contract_multiplier: 合约乘数
 *    - maturity_date: 到期日（期货，股票为null）
 *    - instrument_type: 标的类型（stock/期货）
 *
 * 3. 股票池管理字段：
 *    - code: 股票代码（6位数字）
 *    - theme: 所属题材
 *    - board: 所属板块
 *    - marketCap: 市值（万元）
 *    - currentPrice: 当前股价
 *    - changePercent: 涨幅（%）
 *    - initialPrice: 初始价格
 *    - addMethod: 加入方式（manual/program）
 *    - addTime: 加入时间
 *    - daysAdded: 加入天数
 *    - reason: 加入原因/策略
 *    - creator: 创建人
 *    - createdAt/updatedAt: 创建/更新时间
 */
const generateMockStock = (index) => {
  const symbols = ['000001', '000002', '600000', '600036', '000858', '002415', '300015', '688001']
  const names = ['平安银行', '万科A', '浦发银行', '招商银行', '五粮液', '海康威视', '爱尔眼科', '华兴源创']
  const themes = ['金融', '地产', '金融', '金融', '消费', '科技', '医疗', '科技']
  const boards = ['主板', '主板', '主板', '主板', '主板', '中小板', '创业板', '科创板']
  const exchanges = ['SZSE', 'SZSE', 'SSE', 'SSE', 'SZSE', 'SZSE', 'SZSE', 'SSE']

  const basePrice = 10 + Math.random() * 50
  const changeRate = (Math.random() - 0.5) * 10 // -5% 到 +5%
  const currentPrice = basePrice * (1 + changeRate / 100)
  const volume = Math.floor(Math.random() * 10000000)
  const turnover = currentPrice * volume

  const addTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // 30天内随机时间

  return {
    id: index + 1,
    // 核心行情数据（使用RiceQuant字段）
    order_book_id: symbols[index % symbols.length] + (exchanges[index % exchanges.length] === 'SSE' ? '.SH' : '.SZ'),
    symbol: names[index % names.length],
    name: names[index % names.length],
    datetime: new Date().toISOString(),
    open: basePrice * (1 + (Math.random() - 0.5) * 0.02),
    high: basePrice * (1 + Math.abs(changeRate) / 100 + Math.random() * 0.02),
    low: basePrice * (1 - Math.abs(changeRate) / 100 - Math.random() * 0.02),
    close: currentPrice,
    volume: volume,
    total_turnover: turnover,
    pct_change: changeRate,
    change: currentPrice - basePrice,
    prev_close: basePrice,
    bid1: currentPrice * 0.999,
    ask1: currentPrice * 1.001,
    open_interest: null,

    // 合约基础信息
    exchange: exchanges[index % exchanges.length],
    tick_size: 0.01,
    contract_multiplier: 100,
    maturity_date: null,
    instrument_type: 'stock',

    // 股票池管理字段
    code: symbols[index % symbols.length],
    theme: themes[index % themes.length],
    board: boards[index % boards.length],
    marketCap: Math.floor(basePrice * volume / 10000), // 市值（万元）
    currentPrice: currentPrice,
    changePercent: changeRate,
    initialPrice: basePrice,
    addMethod: index % 3 === 0 ? 'program' : 'manual',
    addTime: addTime.toISOString(),
    daysAdded: Math.floor((Date.now() - addTime.getTime()) / (24 * 60 * 60 * 1000)),
    reason: index % 2 === 0 ? '技术面突破' : '基本面良好',
    creator: '系统管理员',
    createdAt: addTime.toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Mock获取股票池列表
 */
const mockGetStockPoolList = async (params) => {
  const { pageNo = 1, pageSize = 10, search = '', theme = '', board = '', addMethod = '' } = params

  // 生成所有mock数据
  const allStocks = Array.from({ length: 50 }, (_, i) => generateMockStock(i))

  // 搜索过滤
  let filteredStocks = allStocks.filter(stock => {
    if (search && !stock.code.includes(search) && !stock.symbol.includes(search)) {
      return false
    }
    if (theme && stock.theme !== theme) {
      return false
    }
    if (board && stock.board !== board) {
      return false
    }
    if (addMethod && stock.addMethod !== addMethod) {
      return false
    }
    return true
  })

  // 分页
  const start = (pageNo - 1) * pageSize
  const end = start + pageSize
  const data = filteredStocks.slice(start, end)

  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300))

  return {
    success: true,
    result: {
      data,
      count: filteredStocks.length
    }
  }
}

/**
 * 获取股票池列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.stock_name - 股票名称模糊查询
 * @param {string} params.stock_code - 股票代码模糊查询
 * @param {string} params.exchange_code - 交易所代码（SH/SZ/HK/US）
 * @param {string} params.status - 股票状态（active/inactive）
 * @param {string} params.add_method - 添加方式（manual/strategy/import/other）
 * @param {number} params.priority_level - 优先级（1-10）
 * @param {string} params.created_by - 创建者筛选
 * @returns {Promise}
 */
export const getStockPoolList = async (params) => {
  if (USE_MOCK_DATA) {
    return await mockGetStockPoolList(params)
  }
  const queryString = qs.stringify(params)
  const res = await request.get(`/stock-api/api/stock-watchlist/?` + queryString)
  return res
}

/**
 * Mock获取股票详情
 */
const mockGetStockDetail = async (id) => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 200))

  const stock = generateMockStock(id - 1)
  stock.id = id

  return {
    success: true,
    result: stock
  }
}

/**
 * 根据ID获取关注股票详情
 * @param {number} stock_id - 股票ID
 * @returns {Promise}
 */
export const getStockDetail = async (stock_id) => {
  if (USE_MOCK_DATA) {
    return await mockGetStockDetail(stock_id)
  }
  const res = await request.get(`/stock-api/api/stock-watchlist/${stock_id}`)
  return res
}

/**
 * Mock添加股票到池中
 */
const mockAddStock = async (data) => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500))

  const now = new Date()
  const basePrice = data.initialPrice || 10
  const currentPrice = data.currentPrice || basePrice
  const changeRate = data.currentPrice && data.initialPrice
    ? ((data.currentPrice - data.initialPrice) / data.initialPrice) * 100
    : 0

  // 生成完整的股票数据，包含所有必要字段
  const stockData = {
    ...data,
    id: Math.floor(Math.random() * 10000),
    // 核心行情数据（使用RiceQuant字段）
    order_book_id: (data.code || '000001') + (data.exchange === 'SSE' ? '.SH' : '.SZ'),
    symbol: data.name || '股票',
    datetime: now.toISOString(),
    open: currentPrice,
    high: currentPrice * 1.02,
    low: currentPrice * 0.98,
    close: currentPrice,
    volume: 0,
    total_turnover: 0,
    pct_change: changeRate,
    change: currentPrice - basePrice,
    prev_close: basePrice,
    bid1: currentPrice * 0.999,
    ask1: currentPrice * 1.001,
    open_interest: null,
    // 合约基础信息
    exchange: data.exchange || 'SZSE',
    tick_size: 0.01,
    contract_multiplier: 100,
    maturity_date: null,
    instrument_type: 'stock',
    // 股票池管理字段
    code: data.code || '000001',
    currentPrice: currentPrice,
    changePercent: changeRate,
    addTime: now.toISOString(),
    daysAdded: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  }

  return {
    success: true,
    result: stockData
  }
}

/**
 * 添加股票到池中
 * @param {Object} data - 股票数据
 * @returns {Promise}
 */
export const addStock = async (data) => {
  // if (USE_MOCK_DATA) {
  //   return await mockAddStock(data)
  // }
  // 注意：接口文档中没有提供添加接口，这里保持原有逻辑或需要确认后端是否提供
  const res = await request.post(`/stock-api/api/stock-watchlist/`, data)
  return res
}

/**
 * Mock更新股票信息
 */
const mockUpdateStock = async (id, data) => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500))

  return {
    success: true,
    result: {
      ...data,
      id,
      updatedAt: new Date().toISOString()
    }
  }
}

/**
 * 根据ID更新关注股票
 * @param {number} stock_id - 股票ID
 * @param {Object} data - 更新数据（可更新字段：status, priority_level, notes, add_reason）
 * @returns {Promise}
 */
export const updateStock = async (stock_id, data) => {
  if (USE_MOCK_DATA) {
    return await mockUpdateStock(stock_id, data)
  }
  const res = await request.patch(`/stock-api/api/stock-watchlist/${stock_id}`, data)
  return res
}

/**
 * Mock从池中删除股票
 */
const mockDeleteStock = async (id) => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300))

  return {
    success: true,
    result: { id }
  }
}

/**
 * 根据ID删除关注股票
 * @param {number} stock_id - 股票ID
 * @returns {Promise}
 */
export const deleteStock = async (stock_id) => {
  if (USE_MOCK_DATA) {
    return await mockDeleteStock(stock_id)
  }
  const res = await request.delete(`/stock-api/api/stock-watchlist/${stock_id}`)
  return res
}

/**
 * 变更股票状态
 * @param {number} stock_id - 股票ID
 * @param {string} status - 股票状态（active/inactive）
 * @returns {Promise}
 */
export const updateStockStatus = async (stock_id, status) => {
  const res = await request.patch(`/stock-api/api/stock-watchlist/${stock_id}/status?status=${status}`)
  return res
}

/**
 * Mock获取买入信号洞察数据
 */
const mockGetBuySignals = async (params = {}) => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 200))

  // 生成所有mock数据来计算统计
  const allStocks = Array.from({ length: 50 }, (_, i) => generateMockStock(i))

  let upCount = 0
  let downCount = 0
  let totalDays = 0
  let validDaysCount = 0

  allStocks.forEach(stock => {
    if (stock.changePercent > 0) {
      upCount++
    } else if (stock.changePercent < 0) {
      downCount++
    }
    if (stock.daysAdded !== null && stock.daysAdded !== undefined) {
      totalDays += stock.daysAdded
      validDaysCount++
    }
  })

  return {
    success: true,
    result: {
      totalCount: allStocks.length,
      upCount,
      downCount,
      avgDays: validDaysCount > 0 ? Math.round(totalDays / validDaysCount) : 0
    }
  }
}

/**
 * 获取买入信号洞察数据
 * @param {Object} params - 查询参数（可选）
 * @returns {Promise}
 */
export const getBuySignals = async (params = {}) => {
  if (USE_MOCK_DATA) {
    return await mockGetBuySignals(params)
  }
  const queryString = qs.stringify(params)
  const res = await request.get(`/stock-api/api/stock-pool/buy-signals?` + queryString)
  return res
}

