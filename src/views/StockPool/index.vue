<template>
  <div class="stock-pool-container">
    <!-- 买入信号洞察区域 -->
    <div class="insights-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="insight-card">
            <div class="insight-content">
              <div class="insight-label">股票池总数</div>
              <div class="insight-value">{{ insightsData.totalCount || 0 }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="insight-card">
            <div class="insight-content">
              <div class="insight-label">活跃股票</div>
              <div class="insight-value" style="color: #409eff">{{ insightsData.activeCount || 0 }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="insight-card">
            <div class="insight-content">
              <div class="insight-label">失效股票</div>
              <div class="insight-value" style="color: #909399">{{ insightsData.inactiveCount || 0 }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="insight-card">
            <div class="insight-content">
              <div class="insight-label">平均加入天数</div>
              <div class="insight-value">{{ insightsData.avgDays || 0 }} 天</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和操作区域 -->
    <div class="search-title">
      <el-input
        class="search-input"
        v-model="searchQuery"
        placeholder="搜索股票代码、名称"
        clearable
        @keyup.enter="searchHandler"
        @change="searchHandler"
      />
      <el-select
        v-model="filterParams.exchange_code"
        placeholder="交易所"
        clearable
        style="width: 150px; margin-right: 10px;"
        @change="searchHandler"
      >
        <el-option label="上交所" value="SH" />
        <el-option label="深交所" value="SZ" />
        <el-option label="港交所" value="HK" />
        <el-option label="美股" value="US" />
      </el-select>
      <el-select
        v-model="filterParams.status"
        placeholder="状态"
        clearable
        style="width: 150px; margin-right: 10px;"
        @change="searchHandler"
      >
        <el-option label="活跃" value="active" />
        <el-option label="失效" value="inactive" />
      </el-select>
      <el-select
        v-model="filterParams.add_method"
        placeholder="加入方式"
        clearable
        style="width: 150px; margin-right: 10px;"
        @change="searchHandler"
      >
        <el-option label="手动加入" value="manual" />
        <el-option label="策略加入" value="strategy" />
        <el-option label="导入" value="import" />
        <el-option label="其他" value="other" />
      </el-select>
      <el-select
        v-model="filterParams.priority_level"
        placeholder="优先级"
        clearable
        style="width: 150px; margin-right: 10px;"
        @change="searchHandler"
      >
        <el-option
          v-for="level in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
          :key="level"
          :label="`优先级 ${level}`"
          :value="level"
        />
      </el-select>
      <el-button class="search-btn" type="primary" @click="searchHandler">搜索</el-button>
      <el-button class="search-btn" @click="reset">重置</el-button>
      <el-button
        class="add-stock-btn"
        type="primary"
        @click="addStockFn"
      >
        添加股票
      </el-button>
    </div>

    <!-- 股票列表表格 -->
    <el-table
      class="stock-table"
      max-height="calc(100vh - 380px)"
      :data="stockList"
      v-loading="tableLoading"
      element-loading-text="加载股票数据中..."
      @sort-change="handleSortChange"
    >
      <el-table-column
        v-for="item in columns"
        :key="item.key"
        :prop="item.prop"
        :label="item.label"
        :sortable="!!item.sortable"
        :width="item.width"
        :min-width="item.minWidth"
      >
        <template #default="{ row, $index }">
          <span v-if="item.key === 'index'">
            {{ $index + 1 + (page.pageNo - 1) * page.pageSize }}
          </span>
          <span v-else-if="item.key === 'code'" class="code-cell" style="cursor: pointer;" @click="handleCodeClick(row)">
            {{ row[item.prop] || '--' }}
          </span>
          <span v-else-if="item.key === 'exchange'">
            {{ row.exchange === 'SH' ? '上交所' : row.exchange === 'SZ' ? '深交所' : row.exchange === 'HK' ? '港交所' : row.exchange === 'US' ? '美股' : row[item.prop] || '--' }}
          </span>
          <span v-else-if="item.key === 'addMethod'">
            <el-tag :type="getAddMethodTagType(row.addMethod)">
              {{ getAddMethodLabel(row.addMethod) }}
            </el-tag>
          </span>
          <span v-else-if="item.key === 'status'">
            <el-switch
              v-model="row.status"
              :active-value="'active'"
              :inactive-value="'inactive'"
              @change="(val) => handleStatusChange(row, val)"
              :loading="row.statusLoading"
            />
          </span>
          <span v-else-if="item.key === 'priorityLevel'">
            {{ row.priorityLevel !== null && row.priorityLevel !== undefined ? `优先级 ${row.priorityLevel}` : '--' }}
          </span>
          <span v-else-if="item.key === 'notes'">
            <span class="ellipsis" :title="row.notes || '--'">
              {{ row.notes || '--' }}
            </span>
          </span>
          <span v-else-if="item.key === 'addTime'">
            {{ row[item.prop] ? formatDateTime(row[item.prop]) : '--' }}
          </span>
          <span v-else-if="item.key === 'daysAdded'">
            {{ row[item.prop] !== undefined ? `${row[item.prop]} 天` : '--' }}
          </span>
          <span v-else-if="item.key === 'initialPrice'">
            {{ formatPrice(getFieldValue(row, item.prop)) }}
          </span>
          <span v-else-if="item.key === 'last_price'">
            <span :style="{ color: getQuoteColor(row.quote?.change_rate) }">
              {{ formatPrice(row.quote?.last_price) }}
            </span>
          </span>
          <span v-else-if="item.key === 'change_rate'">
            <span :style="{ color: getQuoteColor(row.quote?.change_rate) }">
              {{ formatChangePercent(row.quote?.change_rate) }}
            </span>
          </span>
          <span v-else-if="item.key === 'selfChangeRate'">
            <span :style="{ color: getQuoteColor(row.selfChangeRate) }">
              {{ formatChangePercent(row.selfChangeRate) }}
            </span>
          </span>
          <span v-else-if="item.key === 'highPrice'">
            {{ formatPrice(row.quote?.high_price) }}
          </span>
          <span v-else-if="item.key === 'lowPrice'">
            {{ formatPrice(row.quote?.low_price) }}
          </span>
          <span v-else-if="item.key === 'volume'">
            {{ formatVolume(row.quote?.volume) }}
          </span>
          <span v-else-if="item.key === 'turnover'">
            {{ formatTurnover(row.quote?.turnover) }}
          </span>
          <span v-else-if="item.key === 'turnover_rate'">
            {{ formatChangePercent(row.quote?.turnover_rate) }}
          </span>
          <!-- <span v-else-if="item.key === 'quoteTime'">
            {{ row.quote?.time || '--' }}
          </span> -->
          <span v-else class="ellipsis" :title="row[item.prop] || '--'">
            {{ row[item.prop] || '--' }}
          </span>
        </template>
      </el-table-column>

      <el-table-column fixed="right" label="操作" width="200">
        <template v-slot="scope">
          <el-button
            link
            type="primary"
            @click="operateHandler('view', scope.row.id)"
          >
            查看
          </el-button>
          <el-button
            link
            type="primary"
            @click="operateHandler('edit', scope.row.id)"
          >
            编辑
          </el-button>
          <el-popconfirm
            title="确定要删除该股票吗？"
            confirm-button-text="确定"
            cancel-button-text="取消"
            @confirm="operateHandler('delete', scope.row.id)"
          >
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      class="pagination"
      v-model:current-page="page.pageNo"
      v-model:page-size="page.pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="page.total"
      layout="total, sizes, prev, pager, next"
      @current-change="handlePageChange"
      @size-change="handlePageSizeChange"
    />

    <!-- 股票添加/编辑对话框 -->
    <StockDialog
      v-model:visible="dialogVisible"
      :form-data="stockForm"
      :is-view-mode="isViewMode"
      :is-edit-mode="isEditMode"
      @submit="submitStock"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getStockPoolList,
  getStockPoolListWithQuotes,
  getStockDetail,
  addStock,
  updateStock,
  deleteStock,
  getBuySignals,
  updateStockStatus
} from '@/api/modules/stockPool'
import StockDialog from './components/StockDialog.vue'
import { formatDateTime } from '@/utils/time'
import moment from 'moment'

// 响应式数据
const searchQuery = ref('')
const stockList = ref([])
const tableLoading = ref(false)
const dialogVisible = ref(false)
const isViewMode = ref(false)
const isEditMode = ref(false)
const insightsData = ref({
  totalCount: 0,
  activeCount: 0,
  inactiveCount: 0,
  avgDays: 0
})

// 分页参数
const page = reactive({
  pageNo: 1,
  pageSize: 20,
  total: 0
})

// 筛选参数
const filterParams = reactive({
  exchange_code: '',
  status: '',
  add_method: '',
  priority_level: ''
})

// 排序参数（前端排序）
const sortParams = reactive({
  prop: null,
  order: null // 'ascending' 或 'descending'
})

// 表格列配置
const columns = reactive([
  {
    key: 'index',
    label: '序号',
    width: 80
  },
  {
    key: 'code',
    label: '股票代码',
    prop: 'code',
    width: 120
  },
  {
    key: 'symbol',
    label: '股票名称',
    prop: 'symbol',
    minWidth: 120
  },
  {
    key: 'exchange',
    label: '交易所',
    prop: 'exchange',
    width: 100
  },
  {
    key: 'initialPrice',
    label: '初始价',
    prop: 'initialPrice',
    width: 110,
    sortable: true
  },
  {
    key: 'last_price',
    label: '当前价',
    prop: 'last_price',
    width: 100,
    sortable: true
  },
  {
    key: 'selfChangeRate',
    label: '自选涨跌幅',
    prop: 'selfChangeRate',
    width: 120,
    sortable: true
  },
  {
    key: 'change_rate',
    label: '当日涨跌幅',
    prop: 'change_rate',
    width: 120,
    sortable: true
  },
  // {
  //   key: 'highPrice',
  //   label: '最高价',
  //   prop: 'highPrice',
  //   width: 100
  // },
  // {
  //   key: 'lowPrice',
  //   label: '最低价',
  //   prop: 'lowPrice',
  //   width: 100
  // },
  // {
  //   key: 'volume',
  //   label: '成交量',
  //   prop: 'volume',
  //   width: 120
  // },
  {
    key: 'turnover_rate',
    label: '当日换手率',
    prop: 'turnover_rate',
    width: 120,
    sortable: true
  },
  // {
  //   key: 'turnover',
  //   label: '市值',
  //   prop: 'turnover',
  //   width: 120,
  //   sortable: true
  // },
  // {
  //   key: 'quoteTime',
  //   label: '行情时间',
  //   prop: 'quoteTime',
  //   width: 160
  // },
  {
    key: 'addMethod',
    label: '加入方式',
    prop: 'addMethod',
    width: 110
  },
  {
    key: 'addTime',
    label: '加入时间',
    prop: 'addTime',
    width: 200,
    sortable: true
  },
  {
    key: 'daysAdded',
    label: '加入天数',
    prop: 'daysAdded',
    width: 120,
    sortable: true
  },
  {
    key: 'reason',
    label: '加入原因',
    prop: 'reason',
    minWidth: 150
  },
  {
    key: 'notes',
    label: '备注',
    prop: 'notes',
    minWidth: 300
  },
  {
    key: 'creator',
    label: '创建人',
    prop: 'creator',
    width: 100
  },
  {
    key: 'status',
    label: '是否活跃',
    prop: 'status',
    width: 100
  },
  {
    key: 'priorityLevel',
    label: '优先级',
    prop: 'priorityLevel',
    width: 100,
    sortable: true
  },
])

// 初始化股票表单
const initStockForm = () => {
  return {
    id: null,
    code: '',
    name: '',
    exchange_code: '',
    status: 'active',
    priorityLevel: null,
    initialPrice: null,
    addMethod: 'manual',
    addTime: null,
    daysAdded: 0,
    reason: '',
    notes: '',
    creator: ''
  }
}

const stockForm = ref(initStockForm())

// WebSocket 连接管理器
let wsManager = null

// 页面加载时获取股票列表和洞察数据
onMounted(() => {
  getStockList()
  // loadInsights()
})

// 组件卸载时关闭 WebSocket 连接
onBeforeUnmount(() => {
  if (wsManager) {
    wsManager.close()
    wsManager = null
  }
})

const handleCodeClick = (row) => {
  // 去掉非数字
  const numberCode = row.code.replace(/[^0-9]/g, '')
  window.open(`https://gushitong.baidu.com/stock/ab-${numberCode}`, '_blank')
}

// 获取股票列表（首次使用 HTTP 接口，然后建立 WebSocket 连接更新行情）
const getStockList = async () => {
  // 如果已有 WebSocket 连接，先关闭
  if (wsManager) {
    wsManager.close()
    wsManager = null
  }

  tableLoading.value = true

  const params = {
    page: page.pageNo,
    page_size: page.pageSize,
    ...filterParams
    // 移除排序参数，改为前端排序
  }

  // 处理搜索关键词：根据输入判断是股票代码还是名称
  // 如果输入是纯数字，认为是股票代码；否则认为是股票名称
  if (searchQuery.value) {
    const query = searchQuery.value.trim()
    if (/^\d+$/.test(query)) {
      // 纯数字，认为是股票代码
      params.stock_code = query
    } else {
      // 非纯数字，认为是股票名称
      params.stock_name = query
    }
  }

  // 移除空值
  Object.keys(params).forEach(key => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) {
      delete params[key]
    }
  })

  try {
    // 首次调用 HTTP 接口获取完整数据
    const response = await getStockPoolList(params)
    if (response?.success) {
      stockList.value = (response.payload?.items || []).map(stock => {
        // 字段映射：后端字段 -> 前端显示字段
        const mappedStock = {
          id: stock.id,
          code: stock.stock_code || '',
          symbol: stock.stock_name || '',
          name: stock.stock_name || '',
          exchange: stock.exchange_code || '',
          addMethod: stock.add_method || '',
          addTime: stock.add_time || '',
          initialPrice: stock.initial_price ? Number(stock.initial_price) : null,
          reason: stock.add_reason || '',
          creator: stock.created_by || '',
          status: stock.status || 'active',
          priorityLevel: stock.priority_level || null,
          notes: stock.notes || '',
          updatedTime: stock.updated_time || '',
          statusLoading: false, // 状态切换加载状态
          // 行情数据（初始为空，等待 WebSocket 更新）
          quote: stock?.quote,
          // 自选涨跌幅（根据初始价格和最新价格计算，在 WebSocket 更新时计算）
          selfChangeRate: null
        }

        // 计算加入天数
        if (mappedStock.addTime) {
          const days = moment().diff(moment(mappedStock.addTime), 'days')
          mappedStock.daysAdded = days
        }

        return mappedStock
      })
      page.total = response.payload?.total || 0

      // 前端排序：如果有排序参数，对当前页数据进行排序
      if (sortParams.prop && sortParams.order) {
        sortCurrentPageData()
      }

      // 更新洞察数据
      calculateInsightsFromList()
      tableLoading.value = false

      // HTTP 接口调用成功后，建立 WebSocket 连接用于实时更新行情数据
      // connectWebSocketForQuotes(params)
    } else {
      ElMessage.error(response?.message || '获取股票列表失败')
      tableLoading.value = false
    }
  } catch (error) {
    console.error('获取股票列表失败:', error)
    ElMessage.error('获取股票列表失败，请稍后重试')
    tableLoading.value = false
  }
}

// 建立 WebSocket 连接用于更新行情数据
const connectWebSocketForQuotes = (params) => {
  // 创建 WebSocket 连接
  wsManager = getStockPoolListWithQuotes(params, {
    onMessage: (response) => {
      // WebSocket 只更新行情数据，不替换整个列表
      // 兼容两种数据格式：response.items 或 response.payload.items
      const items = response?.items || response?.payload?.items
      if (items && Array.isArray(items)) {
        // 创建一个以股票ID为key的映射，便于快速查找
        const quoteMap = new Map()
        items.forEach(stock => {
          if (stock.id && stock.quote) {
            quoteMap.set(stock.id, stock.quote)
          }
        })

        // 只更新现有股票的行情数据，并计算自选涨跌幅
        stockList.value.forEach(stock => {
          if (quoteMap.has(stock.id)) {
            stock.quote = quoteMap.get(stock.id)
            // 根据初始价格和最新价格计算自选涨跌幅
            // 公式：(最新价格 - 初始价格) / 初始价格 * 100
            // 注意：selfChangeRate 存储为百分比数值（如 -0.56 表示 -0.56%），不是小数格式
            if (stock.initialPrice && stock.quote?.last_price !== null && stock.quote?.last_price !== undefined) {
              const lastPrice = Number(stock.quote.last_price)
              const initialPrice = Number(stock.initialPrice)
              if (initialPrice > 0) {
                // 计算百分比：结果已经是百分比格式（如 -0.56 表示 -0.56%）
                stock.selfChangeRate = ((lastPrice - initialPrice) / initialPrice) * 100
              } else {
                stock.selfChangeRate = null
              }
            } else {
              stock.selfChangeRate = null
            }
          }
        })

        // WebSocket 更新后，如果当前有排序，重新排序
        if (sortParams.prop && sortParams.order) {
          sortCurrentPageData()
        }
      }
    },
    onOpen: () => {
      console.log('WebSocket 连接已建立，开始接收行情数据')
    },
    onClose: () => {
      console.log('WebSocket 连接已关闭')
    },
    onError: (error) => {
      console.error('WebSocket 连接错误:', error)
      // WebSocket 错误不影响主流程，只记录日志
    }
  })
}

// 加载买入信号洞察数据
const loadInsights = async () => {
  try {
    const response = await getBuySignals()
    if (response.success) {
      insightsData.value = {
        totalCount: response.result?.totalCount || 0,
        upCount: response.result?.upCount || 0,
        downCount: response.result?.downCount || 0,
        avgDays: response.result?.avgDays || 0
      }
    } else {
      // 如果接口失败，从列表数据计算
      calculateInsightsFromList()
    }
  } catch (error) {
    console.error('获取买入信号洞察失败:', error)
    // 从列表数据计算
    calculateInsightsFromList()
  }
}

// 从列表数据计算洞察数据
const calculateInsightsFromList = () => {
  // 如果列表为空，使用总数统计
  if (stockList.value.length === 0 && page.total === 0) {
    insightsData.value = {
      totalCount: 0,
      activeCount: 0,
      inactiveCount: 0,
      avgDays: 0
    }
    return
  }

  let activeCount = 0
  let inactiveCount = 0
  let totalDays = 0
  let validDaysCount = 0

  stockList.value.forEach(stock => {
    if (stock.status === 'active') {
      activeCount++
    } else if (stock.status === 'inactive') {
      inactiveCount++
    }
    if (stock.daysAdded !== null && stock.daysAdded !== undefined) {
      totalDays += stock.daysAdded
      validDaysCount++
    }
  })

  // 使用总数而不是当前页数量
  insightsData.value = {
    totalCount: page.total,
    activeCount,
    inactiveCount,
    avgDays: validDaysCount > 0 ? Math.round(totalDays / validDaysCount) : 0
  }
}

// 字段类型映射：快速查找字段类型，避免多次 includes 检查
const FIELD_TYPE_MAP = {
  // 数值类型字段（从 quote 对象获取）
  last_price: { type: 'number', source: 'quote' },
  change_rate: { type: 'number', source: 'quote' },
  turnover_rate: { type: 'number', source: 'quote' },
  // 数值类型字段（从 row 直接获取）
  initialPrice: { type: 'number', source: 'row' },
  priorityLevel: { type: 'number', source: 'row' },
  daysAdded: { type: 'number', source: 'row' },
  selfChangeRate: { type: 'number', source: 'row' },
  // 日期类型字段
  addTime: { type: 'date', source: 'row' }
}

// 获取字段值用于排序（优化版本：使用映射快速查找，减少重复检查）
const getSortValue = (row, prop) => {
  const fieldConfig = FIELD_TYPE_MAP[prop]

  // 获取原始值
  let value
  if (fieldConfig?.source === 'quote') {
    value = row.quote?.[prop]
  } else {
    value = row[prop]
  }

  // null/undefined 处理
  if (value === null || value === undefined) {
    return null
  }

  // 根据字段类型转换
  if (fieldConfig?.type === 'number') {
    const num = Number(value)
    return isNaN(num) ? null : num
  }

  if (fieldConfig?.type === 'date') {
    return new Date(value).getTime() || 0
  }

  // 默认返回原值
  return value
}

// 前端排序：对当前页数据进行排序（优化版本：简化比较逻辑）
const sortCurrentPageData = () => {
  if (!sortParams.prop || !sortParams.order) {
    return
  }

  const prop = sortParams.prop
  const order = sortParams.order === 'ascending' ? 1 : -1
  const fieldConfig = FIELD_TYPE_MAP[prop]

  // 创建数组副本进行排序
  const sortedList = [...stockList.value].sort((a, b) => {
    const valueA = getSortValue(a, prop)
    const valueB = getSortValue(b, prop)

    // null 值排在最后
    if (valueA === null && valueB === null) return 0
    if (valueA === null) return 1
    if (valueB === null) return -1

    // 数值类型直接比较（getSortValue 已确保返回数字）
    if (fieldConfig?.type === 'number') {
      return (valueA - valueB) * order
    }

    // 日期类型直接比较（getSortValue 已确保返回时间戳）
    if (fieldConfig?.type === 'date') {
      return (valueA - valueB) * order
    }

    // 字符串类型比较
    const strA = String(valueA)
    const strB = String(valueB)
    return strA.localeCompare(strB, 'zh-CN', { numeric: true }) * order
  })

  // 更新列表
  stockList.value = sortedList
}

// 排序处理（前端排序）
const handleSortChange = (sort) => {
  if (sort.prop) {
    sortParams.prop = sort.prop
    sortParams.order = sort.order
  } else {
    sortParams.prop = null
    sortParams.order = null
  }
  // 对当前页数据进行排序
  sortCurrentPageData()
}

// 分页处理
const handlePageChange = (newPage) => {
  page.pageNo = newPage
  getStockList()
}

// 每页数量变化处理
const handlePageSizeChange = (newPageSize) => {
  page.pageSize = newPageSize
  page.pageNo = 1 // 重置到第一页
  getStockList()
}

// 搜索处理
const searchHandler = () => {
  page.pageNo = 1
  getStockList()
}

// 重置搜索
const reset = () => {
  searchQuery.value = ''
  filterParams.exchange_code = ''
  filterParams.status = ''
  filterParams.add_method = ''
  filterParams.priority_level = ''
  sortParams.prop = null
  sortParams.order = null
  searchHandler()
}

// 操作处理
const operateHandler = (type, id) => {
  switch (type) {
    case 'edit':
    case 'view':
      getStockDetail(id).then(res => {
        if (!res.success) {
          ElMessage.error(res.message || '获取股票详情失败')
          return
        }
        // 字段映射：后端字段 -> 前端表单字段
        const payload = res.payload || {}
        const formData = {
          id: payload.id,
          code: payload.stock_code || '',
          name: payload.stock_name || '',
          exchange_code: payload.exchange_code || '',
          addMethod: payload.add_method || 'manual',
          addTime: payload.add_time || '',
          initialPrice: payload.initial_price ? Number(payload.initial_price) : null,
          reason: payload.add_reason || '',
          creator: payload.created_by || '',
          status: payload.status || 'active',
          priorityLevel: payload.priority_level || null,
          notes: payload.notes || ''
        }
        stockForm.value = formData
        isViewMode.value = type === 'view'
        isEditMode.value = type === 'edit'
        dialogVisible.value = true
      })
      break
    case 'delete':
      deleteStock(id).then((res) => {
        if (!res || !res.success) {
          ElMessage.error(res?.message || '删除股票失败')
          return
        }
        ElMessage.success('删除股票成功')
        searchHandler()
        loadInsights()
      })
      break
    default:
      break
  }
}

// 新增股票
const addStockFn = () => {
  dialogVisible.value = true
  isViewMode.value = false
  isEditMode.value = false
  stockForm.value = initStockForm()
}

// 提交股票表单
const submitStock = async (formData) => {
  try {
    let result
    if (formData.id) {
      // 更新股票：只更新允许的字段（status, priority_level, notes, add_reason）
      const updateData = {
        status: formData.status,
        priority_level: formData.priorityLevel,
        notes: formData.notes,
        add_reason: formData.reason
      }
      result = await updateStock(formData.id, updateData)
    } else {
      // 添加新股票：字段映射到后端字段
      const addData = {
        stock_code: formData.code,
        stock_name: formData.name,
        exchange_code: formData.exchange_code,
        add_method: formData.addMethod,
        initial_price: formData.initialPrice,
        add_reason: formData.reason,
        status: formData.status || 'active',
        priority_level: formData.priorityLevel,
        notes: formData.notes,
        created_by: formData.creator
      }
      result = await addStock(addData)
    }

    if (result && result.success !== false) {
      ElMessage.success(formData.id ? '更新股票成功' : '添加股票成功')
      dialogVisible.value = false
      searchHandler()
      stockForm.value = initStockForm()
    } else {
      ElMessage.error(result?.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败：' + (error.response?.data?.message || error.message))
  }
}

// 格式化涨幅
const formatChangePercent = (value) => {
  if (value === null || value === undefined) return '--'
  const sign = value >= 0 ? '+' : ''
  let percentValue = value
  // 否则直接使用原值（已经是百分比格式）
  return `${sign}${percentValue.toFixed(2)}%`
}

// 获取涨幅颜色
const getChangeColor = (value) => {
  if (value === null || value === undefined) return '#606266'
  return value >= 0 ? '#f56c6c' : '#67c23a'
}

// 获取行情涨跌幅颜色（涨红跌绿）
const getQuoteColor = (changeRate) => {
  if (changeRate === null || changeRate === undefined) return '#606266'
  return changeRate >= 0 ? '#f56c6c' : '#67c23a'
}

// 格式化价格
const formatPrice = (value) => {
  if (value === null || value === undefined) return '--'
  return Number(value).toFixed(2)
}

// 格式化市值
const formatmarket_value = (value) => {
  if (value === null || value === undefined) return '--'
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 格式化涨跌额
const formatPriceChange = (value) => {
  if (value === null || value === undefined) return '--'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(2)}`
}

// 格式化成交量（手）
const formatVolume = (value) => {
  if (value === null || value === undefined) return '--'
  const volume = Number(value)
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(2)}亿`
  } else if (volume >= 10000) {
    return `${(volume / 10000).toFixed(2)}万`
  }
  return volume.toLocaleString('zh-CN')
}

// 格式化成交额（元）
const formatTurnover = (value) => {
  if (value === null || value === undefined) return '--'
  const turnover = Number(value)
  if (turnover >= 100000000) {
    return `${(turnover / 100000000).toFixed(2)}亿`
  } else if (turnover >= 10000) {
    return `${(turnover / 10000).toFixed(2)}万`
  }
  return turnover.toLocaleString('zh-CN')
}

// 获取字段值（使用RiceQuant字段）
const getFieldValue = (row, prop) => {
  if (row[prop] !== null && row[prop] !== undefined) {
    return row[prop]
  }
  return null
}

// 获取加入方式标签类型
const getAddMethodTagType = (addMethod) => {
  const typeMap = {
    manual: 'primary',
    strategy: 'success',
    import: 'warning',
    other: 'info'
  }
  return typeMap[addMethod] || 'info'
}

// 获取加入方式标签文本
const getAddMethodLabel = (addMethod) => {
  const labelMap = {
    manual: '手动加入',
    strategy: '策略加入',
    import: '导入',
    other: '其他'
  }
  return labelMap[addMethod] || addMethod || '--'
}

// 处理状态变更
const handleStatusChange = async (row, newStatus) => {
  const oldStatus = newStatus === 'active' ? 'inactive' : 'active'

  try {
    // 设置加载状态
    row.statusLoading = true

    const result = await updateStockStatus(row.id, newStatus)

    if (result && result.success !== false) {
      ElMessage.success(`状态已${newStatus === 'active' ? '激活' : '失效'}`)
      // 更新洞察数据
      calculateInsightsFromList()
    } else {
      // 恢复原状态
      row.status = oldStatus
      ElMessage.error(result?.message || '状态变更失败')
    }
  } catch (error) {
    // 恢复原状态
    row.status = oldStatus
    console.error('状态变更失败:', error)
    ElMessage.error('状态变更失败，请稍后重试')
  } finally {
    row.statusLoading = false
  }
}
</script>

<style scoped lang="less">
.stock-pool-container {
  height: calc(100vh - 130px);
  background-color: #fff;
  padding: 20px;

  .insights-section {
    margin-bottom: 20px;

    .insight-card {
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .insight-content {
        text-align: center;
        padding: 10px 0;

        .insight-label {
          font-size: 14px;
          color: #909399;
          margin-bottom: 12px;
        }

        .insight-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          line-height: 1.2;
        }
      }
    }
  }

  .search-title {
    overflow: hidden;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;

    .search-input {
      width: 250px;
    }

    .search-btn {
      margin-right: 0;
    }

    .add-stock-btn {
      margin-left: auto;
    }
  }

  .stock-table {
    margin-top: 20px;
    width: 100%;

    .code-cell {
      font-weight: 500;
      color: #409eff;
    }
  }

  .pagination {
    float: right;
    margin-top: 20px;
  }
}

.ellipsis {
  display: inline-block;
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  box-orient: vertical;
  overflow: hidden;
}
</style>


