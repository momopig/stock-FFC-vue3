import request from '../common'
import qs from 'qs'
import { createWebSocket } from '@/utils/websocket'

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
 * 获取股票池列表（HTTP 方式，已废弃，保留用于兼容）
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.stock_name - 股票名称模糊查询
 * @param {string} params.stock_code - 股票代码模糊查询
 * @param {string} params.exchange_code - 交易所代码（SH/SZ/HK/US）
 * @param {string} params.strategy_name - 策略名称模糊查询
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
  const res = await request.get(`/stock-api/api/stock-watchlist/with-quotes?` + queryString)
  return res
}

/**
 * 通过 WebSocket 获取股票池列表（带行情数据）
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.stock_name - 股票名称模糊查询
 * @param {string} params.stock_code - 股票代码模糊查询
 * @param {string} params.exchange_code - 交易所代码（SH/SZ/HK/US）
 * @param {string} params.strategy_name - 策略名称模糊查询
 * @param {string} params.status - 股票状态（active/inactive）
 * @param {string} params.add_method - 添加方式（manual/strategy/import/other）
 * @param {number} params.priority_level - 优先级（1-10）
 * @param {string} params.created_by - 创建者筛选
 * @param {number} params.interval - 推送间隔（秒），<=0 则只推一次，默认 3
 * @param {boolean} params.once_if_closed - 非交易时段是否只推一次，默认 false
 * @param {Object} callbacks - 回调函数
 * @param {Function} callbacks.onMessage - 消息接收回调，参数为响应数据
 * @param {Function} callbacks.onOpen - 连接打开回调
 * @param {Function} callbacks.onClose - 连接关闭回调
 * @param {Function} callbacks.onError - 错误回调
 * @returns {Object} WebSocket 连接管理器对象，包含 close 方法用于关闭连接
 */
export const getStockPoolListWithQuotes = (params = {}, callbacks = {}) => {
  // WebSocket 基础 URL
  // 根据环境判断：开发环境直接连接后端服务器，生产环境使用当前域名
  const isDev = import.meta.env.DEV
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // WebSocket 主机地址：只包含主机名和端口，不包含协议
  const wsHost = isDev
    ? `119.23.68.187:8000` // 开发环境直接连接后端
    : window.location.hostname + ':8000' // 生产环境使用当前域名

  // 构建查询参数
  const queryParams = {
    ...params,
    interval: params.interval ?? 5, // 默认推送间隔 3 秒
    once_if_closed: params.once_if_closed ?? false
  }

  // 移除空值参数
  Object.keys(queryParams).forEach(key => {
    if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined) {
      delete queryParams[key]
    }
  })

  const queryString = qs.stringify(queryParams)
  // WebSocket URL：根据用户提供的示例，WebSocket 直接连接 /api/stock-watchlist/with-quotes
  // 注意：WebSocket 不使用 /stock-api 前缀，直接使用 /api 路径
  const wsUrl = `${wsProtocol}//${wsHost}/api/stock-watchlist/with-quotes?${queryString}`

  // 创建 WebSocket 连接
  const wsManager = createWebSocket(wsUrl, {
    onMessage: (data) => {
      // WebSocket 返回的数据格式应该与 HTTP 接口一致
      callbacks.onMessage?.(data)
    },
    onOpen: callbacks.onOpen,
    onClose: callbacks.onClose,
    onError: callbacks.onError,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5
  })

  return wsManager
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

/**
 * 获取股票搜索列表（第三方接口）
 * @param {string} search - 搜索关键词（股票代码/名称/拼音）
 * @param {boolean} onlyA - 是否只返回A股（market === 'ab'），默认 false
 * @returns {Promise}
 */
export const getStock = async (search, onlyA = false) => {
  const result = await request.get(`/nest-api/stock?search=${search}`)
  let data = result?.payload
  // 根据接口返回格式处理数据
  if (data?.Result?.stock) {
    data.Result.stock = data?.Result?.stock?.filter((stock) => {
      const isStock = stock.type === 'stock'
      if (onlyA) {
        // 香港的market对应hk，A股的market对应ab
        return isStock && stock.market === 'ab'
      }
      return isStock
    })
  }
  return data
}

