<template>
  <div class="watch-list-container">
    <!-- 洞察数据 -->
    <StockInsights :insightsData="insightsData" />

    <!-- 股票列表 -->
    <StockList
      :stockList="stockList"
      :loading="loading"
      :total="page.total"
      :currentPage="page.pageNo"
      :pageSize="page.pageSize"
      :showAddButton="false"
      :showAddToSelfButton="true"
      :showAddToWatchButton="false"
      :isWatchMode="true"
      @page-change="handlePageChange"
      @size-change="handlePageSizeChange"
      @search="handleSearchEvent"
      @view-stock="handleViewStock"
      @edit-stock="handleEditStock"
      @delete-stock="handleCancelWatch"
      @status-change="handleStatusChange"
      @add-stock="handleAddStock"
      @add-to-self="handleAddToSelf"
      @filter-change="handleFilterChange"
    />

    <!-- 添加到自选分组对话框 -->
    <AddToGroupDialog
      v-model:visible="addToGroupDialogVisible"
      :stock-data="selectedStockData"
      :strategy-info="selectedStrategyInfo"
      @submit="handleAddToGroupSubmit"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getStockPoolList, updateStock, updateStockStatus, getStockDetail } from '@/api/modules/stockPool'
import { addStockToGroups } from '@/api/modules/stockGroup'
import StockInsights from '@/components/StockInsights/index.vue'
import StockList from '@/components/StockList/index.vue'
import AddToGroupDialog from './AddToGroupDialog.vue'
import moment from 'moment'

const emit = defineEmits(['view-stock', 'edit-stock', 'add-stock'])

// 股票列表数据
const stockList = ref([])
const loading = ref(false)

// 分页参数
const page = reactive({
  pageNo: 1,
  pageSize: 50,
  total: 0
})

// 搜索参数
const searchParams = reactive({
  stock_code: '',
  stock_name: '',
  exchange_code: '',
  strategy_name: ''
})

// 洞察数据
const insightsData = ref({
  totalCount: 0,
  avgDays: 0,
  selfAvgChange: null,
  selfMaxChange: null,
  selfMinChange: null,
  todayAvgChange: null,
  todayMaxChange: null,
  todayMinChange: null,
  selfMaxStockName: null,
  selfMinStockName: null,
  todayMaxStockName: null,
  todayMinStockName: null
})

// 筛选列表
const filteredList = ref([])

// 添加到分组对话框相关
const addToGroupDialogVisible = ref(false)
const selectedStockData = ref(null)
const selectedStrategyInfo = ref(null)

// 页面加载时获取重点观察列表
onMounted(() => {
  getWatchStockList()
})

// 获取重点观察股票列表（加载所有is_self_selected为true的股票）
const getWatchStockList = async (additionalSearchParams = {}) => {
  loading.value = true

  const params = {
    page: page.pageNo,
    page_size: page.pageSize,
    is_self_selected: true,
    // 合并搜索参数
    ...searchParams,
    ...additionalSearchParams
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
      // 先加载所有股票，然后筛选is_self_selected为true的
      const allStocks = (response.payload?.items || []).map(flattenStockData)
      // 筛选重点观察股票
      const watchStocks = allStocks.filter(stock => stock.is_self_selected === true)
      stockList.value = watchStocks
      page.total = watchStocks.length
      calculateInsights()
      loading.value = false
    } else {
      ElMessage.error(response?.message || '获取重点观察列表失败')
      loading.value = false
    }
  } catch (error) {
    console.error('获取重点观察列表失败:', error)
    ElMessage.error('获取重点观察列表失败，请稍后重试')
    loading.value = false
  }
}

// 将股票数据扁平化处理
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
    strategy_name: stock.strategy_name || '',
    is_self_selected: stock.is_self_selected || false,
    created_by: stock.created_by || '',
    status: stock.status || 'active',
    priority_level: stock.priority_level || null,
    notes: stock.notes || '',
    updated_time: stock.updated_time || '',
    statusLoading: false,
    // 扁平化 quote 字段
    last_price: lastPrice,
    change_rate: quote.change_rate != null ? Number(quote.change_rate) : null,
    high_price: quote.high_price != null ? Number(quote.high_price) : null,
    low_price: quote.low_price != null ? Number(quote.low_price) : null,
    volume: quote.volume != null ? Number(quote.volume) : null,
    turnover: quote.turnover != null ? Number(quote.turnover) : null,
    turnover_rate: quote.turnover_rate != null ? Number(quote.turnover_rate) : null,
    volume_ratio: quote.volume_ratio != null ? Number(quote.volume_ratio) : null,
    circular_market_val_yi: quote.circular_market_val_yi || null,
    // 计算自选涨跌幅
    selfChangeRate: (initialPrice && lastPrice && initialPrice > 0)
      ? ((lastPrice - initialPrice) / initialPrice) * 100
      : null,
    kline_data: quote.ma_response?.kline_data || null,
    ma_data: quote.ma_response?.ma_data || null,
    // 扁平化风险信号数据
    risk_signs: quote?.risk_signs || null,
  }

  // 计算加入天数
  if (mappedStock.add_time) {
    mappedStock.days_added = moment().diff(moment(mappedStock.add_time), 'days')
  }

  return mappedStock
}

// 计算洞察数据
const calculateInsights = (filteredListData = null) => {
  const listToUse = filteredListData || stockList.value

  if (filteredListData) {
    filteredList.value = filteredListData
  }

  if (listToUse.length === 0) {
    insightsData.value = {
      totalCount: 0,
      avgDays: 0,
      selfAvgChange: null,
      selfMaxChange: null,
      selfMinChange: null,
      todayAvgChange: null,
      todayMaxChange: null,
      todayMinChange: null,
      selfMaxStockName: null,
      selfMinStockName: null,
      todayMaxStockName: null,
      todayMinStockName: null
    }
    page.total = 0
    return
  }

  let totalDays = 0
  let validDaysCount = 0
  const selfChanges = []
  const todayChanges = []

  listToUse.forEach(stock => {
    if (stock.days_added != null) {
      totalDays += stock.days_added
      validDaysCount++
    }
    if (stock.selfChangeRate != null) {
      selfChanges.push(stock.selfChangeRate)
    }
    if (stock.change_rate != null) {
      todayChanges.push(stock.change_rate)
    }
  })

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

  let selfMaxStockName = null
  let selfMinStockName = null
  let todayMaxStockName = null
  let todayMinStockName = null

  if (
    selfStats.max != null ||
    selfStats.min != null ||
    todayStats.max != null ||
    todayStats.min != null
  ) {
    listToUse.forEach((stock) => {
      if (selfMaxStockName == null && selfStats.max != null && stock.selfChangeRate === selfStats.max) {
        selfMaxStockName = stock.stock_name || stock.stock_code || ''
      }
      if (selfMinStockName == null && selfStats.min != null && stock.selfChangeRate === selfStats.min) {
        selfMinStockName = stock.stock_name || stock.stock_code || ''
      }
      if (todayMaxStockName == null && todayStats.max != null && stock.change_rate === todayStats.max) {
        todayMaxStockName = stock.stock_name || stock.stock_code || ''
      }
      if (todayMinStockName == null && todayStats.min != null && stock.change_rate === todayStats.min) {
        todayMinStockName = stock.stock_name || stock.stock_code || ''
      }
    })
  }

  insightsData.value = {
    totalCount: listToUse.length,
    avgDays: validDaysCount > 0 ? Math.round(totalDays / validDaysCount) : 0,
    selfAvgChange: selfStats.avg,
    selfMaxChange: selfStats.max,
    selfMinChange: selfStats.min,
    todayAvgChange: todayStats.avg,
    todayMaxChange: todayStats.max,
    todayMinChange: todayStats.min,
    selfMaxStockName,
    selfMinStockName,
    todayMaxStockName,
    todayMinStockName
  }

  page.total = listToUse.length
}

// 分页处理
const handlePageChange = (newPage) => {
  page.pageNo = newPage
  getWatchStockList()
}

// 每页数量变化处理
const handlePageSizeChange = (newPageSize) => {
  page.pageSize = newPageSize
  page.pageNo = 1
  getWatchStockList()
}

// 搜索事件处理
const handleSearchEvent = (searchParamsFromChild) => {
  if (searchParamsFromChild) {
    Object.assign(searchParams, {
      stock_code: searchParamsFromChild.stock_code || '',
      stock_name: searchParamsFromChild.stock_name || '',
      exchange_code: searchParamsFromChild.exchange_code || '',
      strategy_name: searchParamsFromChild.strategy_name || ''
    })
  } else {
    Object.assign(searchParams, {
      stock_code: '',
      stock_name: '',
      exchange_code: '',
      strategy_name: ''
    })
  }
  page.pageNo = 1
  getWatchStockList()
}

// 筛选变化处理
const handleFilterChange = (filteredListData) => {
  calculateInsights(filteredListData)
}

// 查看股票详情
const handleViewStock = (id) => {
  emit('view-stock', id)
}

// 编辑股票
const handleEditStock = (id) => {
  emit('edit-stock', id)
}

// 取消观察（修改 is_self_selected 为 false）
const handleCancelWatch = async (id) => {
  try {
    // 找到对应的股票
    const stock = stockList.value.find(s => s.id === id)
    if (!stock) {
      ElMessage.error('股票数据不存在')
      return
    }

    const result = await updateStock(id, {
      is_self_selected: false
    })

    if (result && result.success !== false) {
      ElMessage.success('已取消观察')
      // 更新本地数据
      stock.is_self_selected = false
      // 刷新列表
      getWatchStockList()
    } else {
      ElMessage.error(result?.message || '取消观察失败')
    }
  } catch (error) {
    console.error('取消观察失败:', error)
    ElMessage.error('取消观察失败，请稍后重试')
  }
}

// 处理状态变更
const handleStatusChange = async (row, newStatus) => {
  const oldStatus = newStatus === 'active' ? 'inactive' : 'active'

  try {
    row.statusLoading = true

    const result = await updateStockStatus(row.id, newStatus)

    if (result && result.success !== false) {
      ElMessage.success(`状态已${newStatus === 'active' ? '激活' : '失效'}`)
      calculateInsights(filteredList.value.length > 0 ? filteredList.value : null)
    } else {
      row.status = oldStatus
      ElMessage.error(result?.message || '状态变更失败')
    }
  } catch (error) {
    row.status = oldStatus
    console.error('状态变更失败:', error)
    ElMessage.error('状态变更失败，请稍后重试')
  } finally {
    row.statusLoading = false
  }
}

// 新增股票
const handleAddStock = () => {
  emit('add-stock')
}

// 添加到自选（打开弹窗）
const handleAddToSelf = (row) => {
  // 准备股票数据（包含加入日期，用于在保持策略信息时传递）
  selectedStockData.value = {
    stock_code: row.stock_code,
    stock_name: row.stock_name,
    exchange_code: row.exchange_code,
    last_price: row.last_price,
    initial_price: row.initial_price,
    add_time: row.add_time || null
  }

  // 准备策略信息（从当前股票数据中获取，重点观察的股票可能没有策略信息）
  selectedStrategyInfo.value = {
    add_time: row.add_time || null,
    initial_price: row.initial_price || null,
    add_reason: row.add_reason || '',
    notes: row.notes || ''
  }

  addToGroupDialogVisible.value = true
}

// 处理添加到分组的提交
const handleAddToGroupSubmit = async (submitData) => {
  try {
    if (!selectedStockData.value) {
      ElMessage.error('股票数据不存在')
      return
    }

    const addData = {
      group_ids: submitData.group_ids,
      exchange_code: selectedStockData.value.exchange_code,
      stock_code: selectedStockData.value.stock_code,
      stock_name: selectedStockData.value.stock_name,
      add_time: submitData.add_time || null,
      initial_price: submitData.initial_price || 0,
      add_reason: submitData.add_reason || '',
      remark: submitData.remark || ''
    }

    const result = await addStockToGroups(addData)

    if (result && result.success !== false) {
      ElMessage.success('已添加到自选分组')
      addToGroupDialogVisible.value = false
      selectedStockData.value = null
      selectedStrategyInfo.value = null
      // 刷新列表
      getWatchStockList()
    } else {
      ElMessage.error(result?.message || '添加自选失败')
    }
  } catch (error) {
    console.error('添加自选失败:', error)
    ElMessage.error('添加自选失败，请稍后重试')
  }
}
</script>

<style scoped lang="less">
.watch-list-container {
  height: 100%;
}
</style>
