<template>
  <div class="stock-pool-container">
    <!-- 洞察数据区域 -->
    <div class="insights-section">
      <el-row :gutter="16">
        <!-- 自选以来 - 三角形布局 -->
        <el-col :span="9">
          <el-card class="insight-card triangle-card">
            <div class="triangle-content">
              <div class="triangle-title">📈 自选以来</div>
              <div class="triangle-layout">
                <div class="triangle-top">
                  <span class="label">AVG</span>
                  <span class="value" :style="{ color: getQuoteColor(insightsData.selfAvgChange) }">
                    {{ formatChangePercent(insightsData.selfAvgChange) }}
                  </span>
                </div>
                <div class="triangle-bottom">
                  <div class="triangle-left">
                    <span class="label">High</span>
                    <span class="value" :style="{ color: getQuoteColor(insightsData.selfMaxChange) }">
                      {{ formatChangePercent(insightsData.selfMaxChange) }}
                    </span>
                  </div>
                  <div class="triangle-right">
                    <span class="label">Low</span>
                    <span class="value" :style="{ color: getQuoteColor(insightsData.selfMinChange) }">
                      {{ formatChangePercent(insightsData.selfMinChange) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <!-- 当日 - 三角形布局 -->
        <el-col :span="9">
          <el-card class="insight-card triangle-card">
            <div class="triangle-content">
              <div class="triangle-title">📊 当日行情</div>
              <div class="triangle-layout">
                <div class="triangle-top">
                  <span class="label">AVG</span>
                  <span class="value" :style="{ color: getQuoteColor(insightsData.todayAvgChange) }">
                    {{ formatChangePercent(insightsData.todayAvgChange) }}
                  </span>
                </div>
                <div class="triangle-bottom">
                  <div class="triangle-left">
                    <span class="label">High</span>
                    <span class="value" :style="{ color: getQuoteColor(insightsData.todayMaxChange) }">
                      {{ formatChangePercent(insightsData.todayMaxChange) }}
                    </span>
                  </div>
                  <div class="triangle-right">
                    <span class="label">Low</span>
                    <span class="value" :style="{ color: getQuoteColor(insightsData.todayMinChange) }">
                      {{ formatChangePercent(insightsData.todayMinChange) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <!-- 基础统计 -->
        <el-col :span="3">
          <el-card class="insight-card basic-card">
            <div class="insight-content">
              <div class="insight-label">股票池总数</div>
              <div class="insight-value">{{ insightsData.totalCount || 0 }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="3">
          <el-card class="insight-card basic-card">
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
      max-height="calc(100vh - 475px)"
      :data="stockList"
      v-loading="tableLoading"
      element-loading-text="加载股票数据中..."
      :default-sort="{ prop: 'selfChangeRate', order: 'descending' }"
    >
      <el-table-column
        v-for="item in columns"
        :key="item.key"
        :prop="item.prop"
        :label="item.label"
        :sortable="item.sortable"
        :sort-method="item.sortable ? (a, b) => sortNumber(a[item.prop], b[item.prop]) : undefined"
        :filters="item.key === 'add_reason' ? addReasonFilters : item.filters"
        :filter-method="item.filterMethod"
        :column-key="item.columnKey"
        :width="item.width"
        :min-width="item.minWidth"
      >
        <template #default="{ row, $index }">
          <span v-if="item.key === 'index'">
            {{ $index + 1 + (page.pageNo - 1) * page.pageSize }}
          </span>
          <span v-else-if="item.key === 'stock_code'" class="code-cell" style="cursor: pointer;" @click="handleCodeClick(row)">
            {{ row.stock_code || '--' }}
          </span>
          <span v-else-if="item.key === 'exchange_code'">
            {{ row.exchange_code === 'SH' ? '上交所' : row.exchange_code === 'SZ' ? '深交所' : row.exchange_code === 'HK' ? '港交所' : row.exchange_code === 'US' ? '美股' : row.exchange_code || '--' }}
          </span>
          <span v-else-if="item.key === 'add_method'">
            <el-tag :type="getAddMethodTagType(row.add_method)">
              {{ getAddMethodLabel(row.add_method) }}
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
          <span v-else-if="item.key === 'priority_level'">
            {{ row.priority_level !== null && row.priority_level !== undefined ? `优先级 ${row.priority_level}` : '--' }}
          </span>
          <span v-else-if="item.key === 'notes'">
            <span class="ellipsis" :title="row.notes || '--'">
              {{ row.notes || '--' }}
            </span>
          </span>
          <span v-else-if="item.key === 'add_time'">
            {{ row.add_time ? formatDateTime(row.add_time) : '--' }}
          </span>
          <span v-else-if="item.key === 'days_added'">
            {{ row.days_added !== undefined ? `${row.days_added} 天` : '--' }}
          </span>
          <span v-else-if="item.key === 'initial_price'">
            {{ formatPrice(row.initial_price) }}
          </span>
          <span v-else-if="item.key === 'last_price'">
            <span :style="{ color: getQuoteColor(row.change_rate) }">
              {{ formatPrice(row.last_price) }}
            </span>
          </span>
          <span v-else-if="item.key === 'change_rate'">
            <span :style="{ color: getQuoteColor(row.change_rate) }">
              {{ formatChangePercent(row.change_rate) }}
            </span>
          </span>
          <span v-else-if="item.key === 'selfChangeRate'">
            <span :style="{ color: getQuoteColor(row.selfChangeRate) }">
              {{ formatChangePercent(row.selfChangeRate) }}
            </span>
          </span>
          <span v-else-if="item.key === 'high_price'">
            {{ formatPrice(row.high_price) }}
          </span>
          <span v-else-if="item.key === 'low_price'">
            {{ formatPrice(row.low_price) }}
          </span>
          <span v-else-if="item.key === 'volume'">
            {{ formatVolume(row.volume) }}
          </span>
          <span v-else-if="item.key === 'turnover'">
            {{ formatVolume(row.turnover) }}
          </span>
          <span v-else-if="item.key === 'turnover_rate'">
            {{ formatChangePercent(row.turnover_rate, false) }}
          </span>
          <span v-else-if="item.key === 'volume_ratio'">
            {{ row.volume_ratio?.toFixed(2) ?? '--' }}
          </span>
          <span v-else-if="item.key === 'pe_ttm_ratio'">
            {{ row.pe_ttm_ratio ?? '--' }}
          </span>
          <span v-else-if="item.key === 'circular_market_val_yi'">
            {{ row.circular_market_val_yi ?? '--' }}
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
  avgDays: 0,
  selfAvgChange: null,  // 自选平均涨跌幅
  selfMaxChange: null,  // 自选最大涨跌幅
  selfMinChange: null,  // 自选最小涨跌幅
  todayAvgChange: null, // 当日平均涨跌幅
  todayMaxChange: null, // 当日最大涨跌幅
  todayMinChange: null  // 当日最小涨跌幅
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
  priority_level: ''
})

// 动态生成加入原因的筛选项
const addReasonFilters = computed(() => {
  const reasons = new Set()
  stockList.value.forEach(stock => {
    if (stock.add_reason && stock.add_reason.trim()) {
      reasons.add(stock.add_reason.trim())
    }
  })
  return Array.from(reasons)
    .sort()
    .map(reason => ({ text: reason, value: reason }))
})

// 表格列配置
const columns = reactive([
  {
    key: 'index',
    label: '序号',
    width: 80
  },
  {
    key: 'stock_code',
    label: '股票代码',
    prop: 'stock_code',
    width: 120
  },
  {
    key: 'stock_name',
    label: '股票名称',
    prop: 'stock_name',
    minWidth: 120
  },
  {
    key: 'exchange_code',
    label: '交易所',
    prop: 'exchange_code',
    width: 100
  },
  {
    key: 'initial_price',
    label: '初始价',
    prop: 'initial_price',
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
  //   key: 'high_price',
  //   label: '最高价',
  //   prop: 'high_price',
  //   width: 100
  // },
  // {
  //   key: 'low_price',
  //   label: '最低价',
  //   prop: 'low_price',
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
  {
    key: 'volume_ratio',
    label: '量比',
    prop: 'volume_ratio',
    width: 100,
    sortable: true
  },
    {
    key: 'pe_ttm_ratio',
    label: '滚动市盈率(TTM)',
    prop: 'pe_ttm_ratio',
    width: 160,
    sortable: true
  },
  {
    key: 'circular_market_val_yi',
    label: '流通市值(亿)',
    prop: 'circular_market_val_yi',
    width: 130,
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
    key: 'add_method',
    label: '加入方式',
    prop: 'add_method',
    width: 110,
    columnKey: 'add_method',
    filters: [
      { text: '手动加入', value: 'manual' },
      { text: '策略加入', value: 'strategy' },
      { text: '导入', value: 'import' },
      { text: '其他', value: 'other' }
    ],
    filterMethod: (value, row) => row.add_method === value
  },
  {
    key: 'add_time',
    label: '加入时间',
    prop: 'add_time',
    width: 200,
    sortable: true
  },
  {
    key: 'days_added',
    label: '加入天数',
    prop: 'days_added',
    width: 120,
    sortable: true
  },
  {
    key: 'add_reason',
    label: '加入原因',
    prop: 'add_reason',
    minWidth: 150,
    columnKey: 'add_reason',
    filterMethod: (value, row) => row.add_reason === value
  },
  {
    key: 'notes',
    label: '备注',
    prop: 'notes',
    minWidth: 300
  },
  {
    key: 'created_by',
    label: '创建人',
    prop: 'created_by',
    width: 100
  },
  // {
  //   key: 'status',
  //   label: '是否活跃',
  //   prop: 'status',
  //   width: 100
  // },
  {
    key: 'priority_level',
    label: '优先级',
    prop: 'priority_level',
    width: 100,
    sortable: true
  },
])

// 初始化股票表单
const initStockForm = () => {
  return {
    id: null,
    stock_code: '',
    stock_name: '',
    exchange_code: '',
    status: 'active',
    priority_level: null,
    initial_price: null,
    add_method: 'manual',
    add_time: null,
    days_added: 0,
    add_reason: '',
    notes: '',
    created_by: ''
  }
}

const stockForm = ref(initStockForm())

// WebSocket 连接管理器
let wsManager = null

// 页面加载时获取股票列表和洞察数据
onMounted(() => {
  getStockList()
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
  const numberCode = row.stock_code?.replace(/[^0-9]/g, '') || ''
  window.open(`https://gushitong.baidu.com/stock/ab-${numberCode}`, '_blank')
}

// 获取股票列表
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
    const response = await getStockPoolList(params)
    if (response?.success) {
      // 使用统一的数据扁平化函数处理
      stockList.value = (response.payload?.items || []).map(flattenStockData)
      page.total = response.payload?.total || 0
      calculateInsightsFromList()
      tableLoading.value = false

      // 可选：建立 WebSocket 连接用于实时更新行情数据
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

  // 直接使用 WebSocket 连接获取全部数据
  // connectWebSocketForQuotes(params)
}

/**
 * 将股票数据扁平化处理（统一 HTTP 和 WebSocket 的数据格式）
 * @param {Object} stock - 原始股票数据
 * @returns {Object} - 扁平化后的股票数据
 */
const flattenStockData = (stock) => {
  const quote = stock?.quote || {}
  const initialPrice = stock.initial_price ? Number(stock.initial_price) : null
  const lastPrice = quote.last_price != null ? Number(quote.last_price) : null

  const mappedStock = {
    id: stock.id,
    stock_code: stock.stock_code || '',
    stock_name: stock.stock_name || '',
    exchange_code: stock.exchange_code || '',
    add_method: stock.add_method || '',
    add_time: stock.add_time || '',
    initial_price: initialPrice,
    add_reason: stock.add_reason || '',
    created_by: stock.created_by || '',
    status: stock.status || 'active',
    priority_level: stock.priority_level || null,
    notes: stock.notes || '',
    updated_time: stock.updated_time || '',
    statusLoading: false,
    // 扁平化 quote 字段
    last_price: lastPrice,
    pe_ttm_ratio: quote.pe_ttm_ratio != null ? Number(quote.pe_ttm_ratio) : null,
    change_rate: quote.change_rate != null ? Number(quote.change_rate) : null,
    high_price: quote.high_price != null ? Number(quote.high_price) : null,
    low_price: quote.low_price != null ? Number(quote.low_price) : null,
    volume: quote.volume != null ? Number(quote.volume) : null,
    turnover: quote.turnover != null ? Number(quote.turnover) : null,
    turnover_rate: quote.turnover_rate != null ? Number(quote.turnover_rate) : null,
    volume_ratio: quote.volume_ratio != null ? Number(quote.volume_ratio) : null,
    circular_market_val_yi: quote.circular_market_val_yi || null,
    pe_ttm_ratio: quote.pe_ttm_ratio != null ? Number(quote.pe_ttm_ratio) : null,
    // 计算自选涨跌幅
    selfChangeRate: (initialPrice && lastPrice && initialPrice > 0)
      ? ((lastPrice - initialPrice) / initialPrice) * 100
      : null,
    // 扁平化风险信号数据
    risk_signs: quote?.risk_signal?.risk_signs || null,
  }

  // 计算加入天数
  if (mappedStock.add_time) {
    mappedStock.days_added = moment().diff(moment(mappedStock.add_time), 'days')
  }

  return mappedStock
}

/**
 * 建立 WebSocket 连接用于实时更新股票行情数据
 * @param {Object} params - 查询参数
 */
const connectWebSocketForQuotes = (params) => {
  wsManager = getStockPoolListWithQuotes(params, {
    onMessage: (response) => {
      const items = response?.items || response?.payload?.items
      const total = response?.total || response?.payload?.total || 0

      if (!items?.length) return

      if (response.type === 'init') {
        // 首次消息：初始化整个列表
        stockList.value = items.map(flattenStockData)
        page.total = total
        tableLoading.value = false
        calculateInsightsFromList()
      } else {
        // 后续消息：增量更新行情数据
        const stockMap = new Map(items.map(s => [s.id, s]))

        stockList.value.forEach(stock => {
          const updated = stockMap.get(stock.id)
          if (!updated) return

          const quote = updated.quote || {}
          // 更新扁平化的行情字段
          stock.last_price = quote.last_price != null ? Number(quote.last_price) : stock.last_price
          stock.change_rate = quote.change_rate != null ? Number(quote.change_rate) : stock.change_rate
          stock.turnover_rate = quote.turnover_rate != null ? Number(quote.turnover_rate) : stock.turnover_rate
          stock.volume_ratio = quote.volume_ratio != null ? Number(quote.volume_ratio) : stock.volume_ratio

          // 更新状态（如有变化）
          if (updated.status !== undefined) {
            stock.status = updated.status
          }

          // 重新计算自选涨跌幅
          if (stock.initial_price && stock.last_price && stock.initial_price > 0) {
            stock.selfChangeRate = ((stock.last_price - stock.initial_price) / stock.initial_price) * 100
          }
        })

        // 更新洞察数据
        calculateInsightsFromList()
      }
    },
    onOpen: () => console.log('WebSocket 连接已建立'),
    onClose: () => console.log('WebSocket 连接已关闭'),
    onError: (error) => {
      console.error('WebSocket 连接错误:', error)
      ElMessage.error('实时行情连接失败')
      tableLoading.value = false
    }
  })
}

// 从列表数据计算洞察数据
const calculateInsightsFromList = () => {
  if (stockList.value.length === 0) {
    insightsData.value = {
      totalCount: page.total,
      avgDays: 0,
      selfAvgChange: null,
      selfMaxChange: null,
      selfMinChange: null,
      todayAvgChange: null,
      todayMaxChange: null,
      todayMinChange: null
    }
    return
  }

  let totalDays = 0
  let validDaysCount = 0
  const selfChanges = []  // 自选涨跌幅数组
  const todayChanges = [] // 当日涨跌幅数组

  stockList.value.forEach(stock => {
    // 统计加入天数
    if (stock.days_added != null) {
      totalDays += stock.days_added
      validDaysCount++
    }
    // 收集自选涨跌幅
    if (stock.selfChangeRate != null) {
      selfChanges.push(stock.selfChangeRate)
    }
    // 收集当日涨跌幅
    if (stock.change_rate != null) {
      todayChanges.push(stock.change_rate)
    }
  })

  // 计算统计数据
  const calcStats = (arr) => {
    if (arr.length === 0) return { avg: null, max: null, min: null }
    const sum = arr.reduce((a, b) => a + b, 0)
    return {
      avg: sum / arr.length,
      max: Math.max(...arr),
      min: Math.min(...arr)
    }
  }

  const selfStats = calcStats(selfChanges)
  const todayStats = calcStats(todayChanges)

  insightsData.value = {
    totalCount: page.total,
    avgDays: validDaysCount > 0 ? Math.round(totalDays / validDaysCount) : 0,
    selfAvgChange: selfStats.avg,
    selfMaxChange: selfStats.max,
    selfMinChange: selfStats.min,
    todayAvgChange: todayStats.avg,
    todayMaxChange: todayStats.max,
    todayMinChange: todayStats.min
  }
}

// 数值排序方法：用于表格列排序，null 值排最后
const sortNumber = (a, b) => {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a - b
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
        // 直接使用后端字段，不做映射
        const payload = res.payload || {}
        const formData = {
          id: payload.id,
          stock_code: payload.stock_code || '',
          stock_name: payload.stock_name || '',
          exchange_code: payload.exchange_code || '',
          add_method: payload.add_method || 'manual',
          add_time: payload.add_time || '',
          initial_price: payload.initial_price ? Number(payload.initial_price) : null,
          add_reason: payload.add_reason || '',
          created_by: payload.created_by || '',
          status: payload.status || 'active',
          priority_level: payload.priority_level || null,
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
        priority_level: formData.priority_level,
        notes: formData.notes,
        add_reason: formData.add_reason
      }
      result = await updateStock(formData.id, updateData)
    } else {
      // 添加新股票：直接使用后端字段
      const addData = {
        stock_code: formData.stock_code,
        stock_name: formData.stock_name,
        exchange_code: formData.exchange_code,
        add_method: formData.add_method,
        initial_price: formData.initial_price,
        add_reason: formData.add_reason,
        status: formData.status || 'active',
        priority_level: formData.priority_level,
        notes: formData.notes,
        created_by: formData.created_by,
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
const formatChangePercent = (value, showSign = true) => {
  if (value === null || value === undefined) return '--'
  const sign = showSign && value >= 0 ? '+' : ''
  let percentValue = value
  // 否则直接使用原值（已经是百分比格式）
  return `${sign}${percentValue.toFixed(2)}%`
}

// 获取行情涨跌幅颜色（涨红跌绿）
const getQuoteColor = (changeRate) => {
  if (changeRate == null) return '#606266'
  return changeRate >= 0 ? '#f56c6c' : '#67c23a'
}

// 格式化价格
const formatPrice = (value) => {
  if (value == null) return '--'
  return Number(value).toFixed(2)
}

// 格式化成交量
const formatVolume = (value) => {
  if (value == null) return '--'
  const volume = Number(value)
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(2)}亿`
  } else if (volume >= 10000) {
    return `${(volume / 10000).toFixed(2)}万`
  }
  return volume.toLocaleString('zh-CN')
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
      transition: all 0.3s ease;
      // height: 100%;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      // 基础卡片样式
      &.basic-card {
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

      // 三角形布局卡片
      &.triangle-card {
        .triangle-content {
          // padding: 8px 0;

          .triangle-title {
            text-align: center;
            font-size: 14px;
            font-weight: 600;
            color: #606266;
            margin-bottom: 12px;
          }

          .triangle-layout {
            .triangle-top {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 8px;

              .label {
                font-size: 14px;
                font-weight: 500;
                color: #909399;
                margin-bottom: 2px;
              }

              .value {
                font-size: 30px;
                font-weight: bold;
              }
            }

            .triangle-bottom {
              display: flex;
              justify-content: space-between;
              padding: 0 20px;

              .triangle-left,
              .triangle-right {
                display: flex;
                flex-direction: column;
                align-items: center;

                .label {
                  font-size: 14px;
                  color: #909399;
                  margin-bottom: 2px;
                  font-weight: 500;
                }

                .value {
                  font-size: 25px;
                  font-weight: 600;
                }
              }
            }
          }
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


