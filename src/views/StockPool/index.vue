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
          <span v-else-if="item.key === 'code'" class="code-cell">
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
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '活跃' : '失效' }}
            </el-tag>
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
  activeCount: 0,
  inactiveCount: 0,
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
  exchange_code: '',
  status: '',
  add_method: '',
  priority_level: ''
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
    key: 'status',
    label: '状态',
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
    label: '加入原因',
    prop: 'reason',
    minWidth: 150
  },
  {
    key: 'notes',
    label: '备注',
    prop: 'notes',
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
      page: page.pageNo,
      page_size: page.pageSize,
      ...filterParams,
      ...sortParams
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

    const response = await getStockPoolList(params)
    if (response.success) {
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
          status: stock.status || '',
          priorityLevel: stock.priority_level || null,
          notes: stock.notes || '',
          updatedTime: stock.updated_time || ''
        }

        // 计算加入天数
        if (mappedStock.addTime) {
          const days = moment().diff(moment(mappedStock.addTime), 'days')
          mappedStock.daysAdded = days
        }

        return mappedStock
      })
      page.total = response.payload?.total || 0
      // 更新洞察数据
      calculateInsightsFromList()
    } else {
      ElMessage.error(response.message || '获取股票列表失败')
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
  filterParams.exchange_code = ''
  filterParams.status = ''
  filterParams.add_method = ''
  filterParams.priority_level = ''
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
      debugger
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


