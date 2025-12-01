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
              <div class="insight-label">今日上涨</div>
              <div class="insight-value" style="color: #f56c6c">{{ insightsData.upCount || 0 }}</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="insight-card">
            <div class="insight-content">
              <div class="insight-label">今日下跌</div>
              <div class="insight-value" style="color: #67c23a">{{ insightsData.downCount || 0 }}</div>
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
      />
      <el-select
        v-model="filterParams.theme"
        placeholder="所属题材"
        clearable
        style="width: 150px; margin-right: 10px;"
        @change="searchHandler"
      >
        <el-option
          v-for="theme in themeOptions"
          :key="theme"
          :label="theme"
          :value="theme"
        />
      </el-select>
      <el-select
        v-model="filterParams.board"
        placeholder="所属板块"
        clearable
        style="width: 150px; margin-right: 10px;"
        @change="searchHandler"
      >
        <el-option
          v-for="board in boardOptions"
          :key="board"
          :label="board"
          :value="board"
        />
      </el-select>
      <el-select
        v-model="filterParams.addMethod"
        placeholder="加入方式"
        clearable
        style="width: 150px; margin-right: 10px;"
        @change="searchHandler"
      >
        <el-option label="手动加入" value="manual" />
        <el-option label="程序加入" value="program" />
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
          <span v-else-if="item.key === 'code'" class="code-cell">
            {{ row[item.prop] || '--' }}
          </span>
          <span v-else-if="item.key === 'exchange'">
            {{ row.exchange === 'SSE' ? '上交所' : row.exchange === 'SZSE' ? '深交所' : row[item.prop] || '--' }}
          </span>
          <span v-else-if="item.key === 'changePercent'" :style="{ color: getChangeColor(row.changePercent) }">
            {{ formatChangePercent(row.changePercent) }}
          </span>
          <span v-else-if="item.key === 'change'" :style="{ color: getChangeColor(row.pct_change || row.changePercent) }">
            {{ formatPriceChange(row.change) }}
          </span>
          <span v-else-if="item.key === 'addMethod'">
            <el-tag :type="row.addMethod === 'manual' ? 'primary' : 'success'">
              {{ row.addMethod === 'manual' ? '手动加入' : '程序加入' }}
            </el-tag>
          </span>
          <span v-else-if="item.key === 'addTime'">
            {{ row[item.prop] ? formatDateTime(row[item.prop]) : '--' }}
          </span>
          <span v-else-if="item.key === 'daysAdded'">
            {{ row[item.prop] !== undefined ? `${row[item.prop]} 天` : '--' }}
          </span>
          <span v-else-if="['open', 'high', 'low', 'close', 'prev_close', 'currentPrice', 'initialPrice', 'bid1', 'ask1'].includes(item.key)">
            {{ formatPrice(getFieldValue(row, item.prop)) }}
          </span>
          <span v-else-if="item.key === 'volume'">
            {{ formatVolume(row.volume) }}
          </span>
          <span v-else-if="item.key === 'total_turnover'">
            {{ formatTurnover(row.total_turnover) }}
          </span>
          <span v-else-if="item.key === 'market_value'">
            {{ formatmarket_value(row[item.prop]) }}
          </span>
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
      :page-size="page.pageSize"
      :total="page.total"
      layout="total, prev, pager, next"
      @current-change="handlePageChange"
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getStockPoolList,
  getStockDetail,
  addStock,
  updateStock,
  deleteStock,
  getBuySignals
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
  upCount: 0,
  downCount: 0,
  avgDays: 0
})

// 分页参数
const page = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

// 筛选参数
const filterParams = reactive({
  theme: '',
  board: '',
  addMethod: ''
})

// 排序参数
const sortParams = reactive({})

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
    key: 'theme',
    label: '所属题材',
    prop: 'theme',
    minWidth: 100
  },
  {
    key: 'board',
    label: '所属板块',
    prop: 'board',
    minWidth: 100
  },
  {
    key: 'open',
    label: '开盘价',
    prop: 'open',
    width: 100,
    sortable: true
  },
  {
    key: 'high',
    label: '最高价',
    prop: 'high',
    width: 100,
    sortable: true
  },
  {
    key: 'low',
    label: '最低价',
    prop: 'low',
    width: 100,
    sortable: true
  },
  {
    key: 'close',
    label: '收盘价',
    prop: 'close',
    width: 100,
    sortable: true
  },
  {
    key: 'prev_close',
    label: '昨收盘',
    prop: 'prev_close',
    width: 100,
    sortable: true
  },
  {
    key: 'currentPrice',
    label: '当前价',
    prop: 'currentPrice',
    width: 100,
    sortable: true
  },
  {
    key: 'changePercent',
    label: '涨跌幅(%)',
    prop: 'changePercent',
    width: 110,
    sortable: true
  },
  {
    key: 'change',
    label: '涨跌额',
    prop: 'change',
    width: 100,
    sortable: true
  },
  {
    key: 'volume',
    label: '成交量(手)',
    prop: 'volume',
    width: 120,
    sortable: true
  },
  {
    key: 'total_turnover',
    label: '成交额(元)',
    prop: 'total_turnover',
    width: 130,
    sortable: true
  },
  {
    key: 'bid1',
    label: '买一价',
    prop: 'bid1',
    width: 100
  },
  {
    key: 'ask1',
    label: '卖一价',
    prop: 'ask1',
    width: 100
  },
  {
    key: 'market_value',
    label: '市值(万元)',
    prop: 'market_value',
    width: 120,
    sortable: true
  },
  {
    key: 'initialPrice',
    label: '初始价格',
    prop: 'initialPrice',
    width: 110,
    sortable: true
  },
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
    width: 160,
    sortable: true
  },
  {
    key: 'daysAdded',
    label: '加入天数',
    prop: 'daysAdded',
    width: 100,
    sortable: true
  },
  {
    key: 'reason',
    label: '加入原因/策略',
    prop: 'reason',
    minWidth: 150
  },
  {
    key: 'creator',
    label: '创建人',
    prop: 'creator',
    width: 100
  }
])

// 初始化股票表单
const initStockForm = () => {
  return {
    id: null,
    code: '',
    symbol: '',
    theme: '',
    board: '',
    market_value: null,
    currentPrice: null,
    changePercent: null,
    initialPrice: null,
    addMethod: 'manual',
    addTime: null,
    daysAdded: 0,
    reason: '',
    creator: ''
  }
}

const stockForm = ref(initStockForm())

// 计算筛选选项（从现有数据中提取）
const themeOptions = computed(() => {
  const themes = new Set()
  stockList.value.forEach(stock => {
    if (stock.theme) {
      themes.add(stock.theme)
    }
  })
  return Array.from(themes).sort()
})

const boardOptions = computed(() => {
  const boards = new Set()
  stockList.value.forEach(stock => {
    if (stock.board) {
      boards.add(stock.board)
    }
  })
  return Array.from(boards).sort()
})

// 页面加载时获取股票列表和洞察数据
onMounted(() => {
  getStockList()
  // loadInsights()
})

// 获取股票列表
const getStockList = async () => {
  try {
    tableLoading.value = true
    const params = {
      skip: page.pageNo,
      limit: page.pageSize,
      search: searchQuery.value,
      ...filterParams,
      ...sortParams
    }

    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await getStockPoolList(params)
    if (response.success) {
      stockList.value = (response.payload?.data || []).map(stock => {
        // 涨跌幅：使用RiceQuant字段 pct_change
        if (stock.pct_change !== null && stock.pct_change !== undefined) {
          stock.changePercent = stock.pct_change
        }
        // 当前价格优先使用收盘价
        if (!stock.currentPrice && stock.close) {
          stock.currentPrice = stock.close
        }

        // 计算加入天数
        if (stock.addTime) {
          const days = moment().diff(moment(stock.addTime), 'days')
          stock.daysAdded = days
        }
        // 计算涨幅（如果有当前价格和初始价格，且没有涨跌幅数据）
        if ((stock.changePercent === null || stock.changePercent === undefined) &&
            stock.currentPrice !== null && stock.currentPrice !== undefined &&
            stock.initialPrice !== null && stock.initialPrice !== undefined && stock.initialPrice > 0) {
          stock.changePercent = ((stock.currentPrice - stock.initialPrice) / stock.initialPrice) * 100
        }
        return stock
      })
      page.total = response.payload?.total || 0
      // 更新洞察数据
      calculateInsightsFromList()
    } else {
      ElMessage.error('获取股票列表失败')
    }
  } catch (error) {
    console.error('获取股票列表失败:', error)
    ElMessage.error('获取股票列表失败，请稍后重试')
  } finally {
    tableLoading.value = false
  }
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
      upCount: 0,
      downCount: 0,
      avgDays: 0
    }
    return
  }

  let upCount = 0
  let downCount = 0
  let totalDays = 0
  let validDaysCount = 0

  stockList.value.forEach(stock => {
    if (stock.changePercent !== null && stock.changePercent !== undefined) {
      if (stock.changePercent > 0) {
        upCount++
      } else if (stock.changePercent < 0) {
        downCount++
      }
    }
    if (stock.daysAdded !== null && stock.daysAdded !== undefined) {
      totalDays += stock.daysAdded
      validDaysCount++
    }
  })

  // 使用总数而不是当前页数量
  insightsData.value = {
    totalCount: page.total,
    upCount,
    downCount,
    avgDays: validDaysCount > 0 ? Math.round(totalDays / validDaysCount) : 0
  }
}

// 排序处理
const handleSortChange = (sort) => {
  if (sort.prop) {
    sortParams.sortBy = sort.prop
    sortParams.sortOrder = sort.order === 'ascending' ? 'ASC' : 'DESC'
  } else {
    delete sortParams.sortBy
    delete sortParams.sortOrder
  }
  searchHandler()
}

// 分页处理
const handlePageChange = (newPage) => {
  page.pageNo = newPage
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
  filterParams.theme = ''
  filterParams.board = ''
  filterParams.addMethod = ''
  delete sortParams.sortBy
  delete sortParams.sortOrder
  searchHandler()
}

// 操作处理
const operateHandler = (type, id) => {
  switch (type) {
    case 'edit':
    case 'view':
      getStockDetail(id).then(res => {
        if (!res.success) return
        const data = { ...res.result }
        stockForm.value = data
        isViewMode.value = type === 'view'
        isEditMode.value = type === 'edit'
        dialogVisible.value = true
      })
      break
    case 'delete':
      deleteStock(id).then((res) => {
        if (!res || !res.success) return
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
      // 更新股票
      result = await updateStock(formData.id, formData)
    } else {
      // 添加新股票
      result = await addStock(formData)
    }

    if (result && result.success !== false) {
      ElMessage.success(formData.id ? '更新股票成功' : '添加股票成功')
      dialogVisible.value = false
      searchHandler()
      // loadInsights()
      stockForm.value = initStockForm()
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
  return `${sign}${value.toFixed(2)}%`
}

// 获取涨幅颜色
const getChangeColor = (value) => {
  if (value === null || value === undefined) return '#606266'
  return value >= 0 ? '#f56c6c' : '#67c23a'
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
</script>

<style scoped lang="less">
.stock-pool-container {
  height: 100vh;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>


