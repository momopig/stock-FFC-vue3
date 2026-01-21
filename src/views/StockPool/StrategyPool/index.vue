<template>
  <div class="strategy-pool-container">
    <!-- 策略Tab选项卡 -->
    <el-tabs v-model="activeStrategy" @tab-click="handleStrategyChange" v-loading="strategiesLoading">
      <el-tab-pane
        v-for="strategy in strategies"
        :key="strategy.id"
        :label="strategy.name"
        :name="strategy.name"
      >
        <!-- 使用 v-if 确保只渲染当前激活的 tab，避免多个 StockList 实例同时存在 -->
        <template v-if="activeStrategy === strategy.name">
          <!-- 洞察数据 -->
          <StockInsights :insightsData="insightsData" />

          <!-- 股票列表 -->
          <StockList
            :stockList="displayStockList"
            :loading="tableLoading"
            :total="page.total"
            :currentPage="page.pageNo"
            :pageSize="page.pageSize"
            :showAddButton="false"
            :showAddToSelfButton="true"
            @page-change="handlePageChange"
            @size-change="handlePageSizeChange"
            @search="handleSearchEvent"
            @view-stock="handleViewStock"
            @edit-stock="handleEditStock"
            @delete-stock="handleDeleteStock"
            @status-change="handleStatusChange"
            @add-stock="addStockFn"
            @add-to-self="handleAddToSelf"
            @remove-from-self="handleRemoveFromSelf"
            @filter-change="handleFilterChange"
          />
        </template>
      </el-tab-pane>

      <!-- 无策略时的提示 -->
      <template v-if="strategies.length === 0 && !strategiesLoading">
        <el-empty description="暂无可用策略" />
      </template>
    </el-tabs>

    <!-- 股票添加/编辑对话框 -->
    <StockDialog
      v-model:visible="dialogVisible"
      :form-data="stockForm"
      :is-view-mode="isViewMode"
      :is-edit-mode="isEditMode"
      @submit="submitStock"
    />

    <!-- 添加到自选分组对话框 -->
    <AddToGroupDialog
      v-model:visible="addToGroupDialogVisible"
      :stock-data="selectedStockData"
      @submit="handleAddToGroupSubmit"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getStrategyList } from '@/api/modules/strategy'
import {
  getStockPoolList,
  getStockDetail,
  addStock,
  updateStock,
  deleteStock,
  updateStockStatus
} from '@/api/modules/stockPool'
import StockInsights from '@/components/StockInsights/index.vue'
import StockList from '@/components/StockList/index.vue'
import StockDialog from '../components/StockDialog.vue'
import AddToGroupDialog from '../components/AddToGroupDialog.vue'
import { addStockToGroups } from '@/api/modules/stockGroup'
import moment from 'moment'

// 策略列表
const strategies = ref([])
const strategiesLoading = ref(false)
const activeStrategy = ref('')

// 股票列表数据
const stockList = ref([])
const tableLoading = ref(false)
const dialogVisible = ref(false)
const isViewMode = ref(false)
const isEditMode = ref(false)
const addToGroupDialogVisible = ref(false)
const selectedStockData = ref(null)
const insightsData = ref({
  totalCount: 0,
  avgDays: 0,
  selfAvgChange: null,
  selfMaxChange: null,
  selfMinChange: null,
  todayAvgChange: null,
  todayMaxChange: null,
  todayMinChange: null,
  // 记录极值对应的股票名称，方便在洞察卡片中 hover / 点击交互
  selfMaxStockName: null,
  selfMinStockName: null,
  todayMaxStockName: null,
  todayMinStockName: null
})

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
    add_method: 'strategy',
    add_time: null,
    days_added: 0,
    add_reason: '',
    notes: '',
    created_by: ''
  }
}

const stockForm = ref(initStockForm())

// 根据当前策略筛选股票列表
const displayStockList = computed(() => {
  if (!activeStrategy.value) return []

  // 筛选条件：strategy_name 匹配当前选中策略，且不是自选股票
  return stockList.value.filter(stock => {
    const matchStrategy = stock.strategy_name === activeStrategy.value || stock.add_reason === activeStrategy.value
    return matchStrategy
  })
})

// 页面加载时获取策略列表
onMounted(async () => {
  await loadStrategies()
})

// 加载策略列表
const loadStrategies = async () => {
  strategiesLoading.value = true
  try {
    const params = {
      enabled: true,
      page: 1,
      page_size: 100
    }
    const response = await getStrategyList(params)
    if (response?.success) {
      strategies.value = response.payload?.items || []

      // 默认选中第一个策略
      if (strategies.value.length > 0) {
        activeStrategy.value = strategies.value[0].name
        getStockList()
      }
    } else {
      ElMessage.error(response?.message || '获取策略列表失败')
    }
  } catch (error) {
    console.error('获取策略列表失败:', error)
    ElMessage.error('获取策略列表失败，请稍后重试')
  } finally {
    strategiesLoading.value = false
  }
}

// 策略切换处理
const handleStrategyChange = (tab) => {
  page.pageNo = 1
  // 使用 tab.name 获取最新的策略名称，因为此时 activeStrategy.value 可能还未更新
  getStockList(tab?.props?.name)
}

// 获取股票列表
const getStockList = async (strategyName = null, additionalSearchParams = {}) => {
  tableLoading.value = true

  // 如果传入了策略名称，使用传入的值；否则使用 activeStrategy.value
  const currentStrategy = strategyName ?? activeStrategy.value

  const params = {
    page: page.pageNo,
    page_size: page.pageSize,
    // 合并搜索参数
    ...searchParams,
    ...additionalSearchParams,
    strategy_name: currentStrategy,
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
      stockList.value = (response.payload?.items || []).map(flattenStockData)
      page.total = response.payload?.total || 0
      calculateInsightsFromList()
      tableLoading.value = false
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

// 从列表数据计算洞察数据
// 使用 currentFilteredList 来存储当前筛选后的列表，以便计算洞察数据
const currentFilteredList = ref([])

const calculateInsightsFromList = (filteredList = null) => {
  // 如果传入了筛选后的列表，则使用该列表；否则使用 displayStockList
  const listToUse = filteredList || displayStockList.value

  // 更新当前筛选列表引用
  if (filteredList) {
    currentFilteredList.value = filteredList
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

  // 这里额外记录“极值对应的股票名称”，方便在洞察卡片中反查是哪只股票贡献了 High / Low
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
}

// 处理筛选变化（从子组件 StockList 传来）
const handleFilterChange = (filteredList) => {
  calculateInsightsFromList(filteredList)
}

// 分页处理
const handlePageChange = (newPage) => {
  page.pageNo = newPage
  getStockList()
}

// 每页数量变化处理
const handlePageSizeChange = (newPageSize) => {
  page.pageSize = newPageSize
  page.pageNo = 1
  getStockList()
}

// 搜索事件处理
const handleSearchEvent = (searchParamsFromChild) => {
  // 更新搜索参数
  if (searchParamsFromChild) {
    Object.assign(searchParams, {
      stock_code: searchParamsFromChild.stock_code || '',
      stock_name: searchParamsFromChild.stock_name || '',
      exchange_code: searchParamsFromChild.exchange_code || '',
      strategy_name: searchParamsFromChild.strategy_name || ''
    })
  } else {
    // 重置搜索参数
    Object.assign(searchParams, {
      stock_code: '',
      stock_name: '',
      exchange_code: '',
      strategy_name: ''
    })
  }
  page.pageNo = 1
  getStockList()
}

// 查看股票详情
const handleViewStock = (id) => {
  getStockDetail(id).then(res => {
    if (!res.success) {
      ElMessage.error(res.message || '获取股票详情失败')
      return
    }
    const payload = res.payload || {}
    const formData = {
      id: payload.id,
      stock_code: payload.stock_code || '',
      stock_name: payload.stock_name || '',
      exchange_code: payload.exchange_code || '',
      add_method: payload.add_method || 'strategy',
      add_time: payload.add_time || '',
      initial_price: payload.initial_price ? Number(payload.initial_price) : null,
      add_reason: payload.add_reason || '',
      created_by: payload.created_by || '',
      status: payload.status || 'active',
      priority_level: payload.priority_level || null,
      notes: payload.notes || ''
    }
    stockForm.value = formData
    isViewMode.value = true
    isEditMode.value = false
    dialogVisible.value = true
  })
}

// 编辑股票
const handleEditStock = (id) => {
  getStockDetail(id).then(res => {
    if (!res.success) {
      ElMessage.error(res.message || '获取股票详情失败')
      return
    }
    const payload = res.payload || {}
    const formData = {
      id: payload.id,
      stock_code: payload.stock_code || '',
      stock_name: payload.stock_name || '',
      exchange_code: payload.exchange_code || '',
      add_method: payload.add_method || 'strategy',
      add_time: payload.add_time || '',
      initial_price: payload.initial_price ? Number(payload.initial_price) : null,
      add_reason: payload.add_reason || '',
      created_by: payload.created_by || '',
      status: payload.status || 'active',
      priority_level: payload.priority_level || null,
      notes: payload.notes || ''
    }
    stockForm.value = formData
    isViewMode.value = false
    isEditMode.value = true
    dialogVisible.value = true
  })
}

// 删除股票
const handleDeleteStock = (id) => {
  deleteStock(id).then((res) => {
    if (!res || !res.success) {
      ElMessage.error(res?.message || '删除股票失败')
      return
    }
    ElMessage.success('删除股票成功')
    getStockList()
  })
}

// 处理状态变更
const handleStatusChange = async (row, newStatus) => {
  const oldStatus = newStatus === 'active' ? 'inactive' : 'active'

  try {
    row.statusLoading = true

    const result = await updateStockStatus(row.id, newStatus)

    if (result && result.success !== false) {
      ElMessage.success(`状态已${newStatus === 'active' ? '激活' : '失效'}`)
      // 使用当前筛选列表重新计算洞察数据
      calculateInsightsFromList(currentFilteredList.value.length > 0 ? currentFilteredList.value : null)
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

// 添加到自选（打开弹窗）
const handleAddToSelf = (row) => {
  // 准备股票数据
  selectedStockData.value = {
    stock_code: row.stock_code,
    stock_name: row.stock_name,
    exchange_code: row.exchange_code,
    last_price: row.last_price,
    initial_price: row.initial_price
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
      initial_price: submitData.initial_price || 0,
      add_reason: submitData.add_reason || '',
      remark: submitData.remark || ''
    }

    const result = await addStockToGroups(addData)

    if (result && result.success !== false) {
      ElMessage.success('已添加到自选分组')
      addToGroupDialogVisible.value = false
      selectedStockData.value = null
      // 刷新列表
      getStockList()
    } else {
      ElMessage.error(result?.message || '添加自选失败')
    }
  } catch (error) {
    console.error('添加自选失败:', error)
    ElMessage.error('添加自选失败，请稍后重试')
  }
}

// 取消自选（修改 is_self_selected 为 false）
const handleRemoveFromSelf = async (row) => {
  try {
    // 使用 updateStock API，只更新 is_self_selected 字段
    const result = await updateStock(row.id, {
      is_self_selected: false
    })

    if (result && result.success !== false) {
      ElMessage.success('已取消自选')
      // 更新本地数据
      row.is_self_selected = false
      // 刷新列表
      getStockList()
    } else {
      ElMessage.error(result?.message || '取消自选失败')
    }
  } catch (error) {
    console.error('取消自选失败:', error)
    ElMessage.error('取消自选失败，请稍后重试')
  }
}

// 新增股票
const addStockFn = () => {
  dialogVisible.value = true
  isViewMode.value = false
  isEditMode.value = false
  stockForm.value = initStockForm()
  // 自动设置加入原因为当前策略
  stockForm.value.add_reason = activeStrategy.value
}

// 提交股票表单
const submitStock = async (formData) => {
  try {
    let result
    if (formData.id) {
      const updateData = {
        status: formData.status,
        priority_level: formData.priority_level,
        notes: formData.notes,
        add_reason: formData.add_reason
      }
      result = await updateStock(formData.id, updateData)
    } else {
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
        created_by: formData.created_by
      }
      result = await addStock(addData)
    }

    if (result && result.success !== false) {
      ElMessage.success(formData.id ? '更新股票成功' : '添加股票成功')
      dialogVisible.value = false
      getStockList()
      stockForm.value = initStockForm()
    } else {
      ElMessage.error(result?.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败：' + (error.response?.data?.message || error.message))
  }
}
</script>

<style scoped lang="less">
.strategy-pool-container {
  height: calc(100vh - 120px);
  background-color: #fff;
  padding: 10px 20px 20px 20px;
}
</style>
