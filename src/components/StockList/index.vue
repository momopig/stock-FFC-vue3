<template>
  <div class="stock-list-container">
    <!-- 搜索和操作区域 -->
    <div class="search-title">
      <el-input
        class="search-input"
        v-model="localSearchQuery"
        placeholder="搜索股票代码、名称"
        clearable
        @keyup.enter="handleSearch"
      />
      <el-select
        v-model="localFilterParams.exchange_code"
        placeholder="交易所"
        clearable
        style="width: 150px; margin-right: 10px;"
      >
        <el-option label="上交所" value="SH" />
        <el-option label="深交所" value="SZ" />
        <el-option label="港交所" value="HK" />
        <el-option label="美股" value="US" />
      </el-select>
      <el-select
        v-model="localFilterParams.status"
        placeholder="状态"
        clearable
        style="width: 150px; margin-right: 10px;"
      >
        <el-option label="活跃" value="active" />
        <el-option label="失效" value="inactive" />
      </el-select>
      <el-select
        v-model="localFilterParams.priority_level"
        placeholder="优先级"
        clearable
        style="width: 150px; margin-right: 10px;"
      >
        <el-option
          v-for="level in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
          :key="level"
          :label="`优先级 ${level}`"
          :value="level"
        />
      </el-select>
      <el-button class="search-btn" type="primary" @click="handleSearch">搜索</el-button>
      <el-button class="search-btn" @click="handleReset">重置</el-button>
      <el-button
        v-if="showAddButton"
        class="add-stock-btn"
        type="primary"
        @click="$emit('add-stock')"
      >
        添加股票
      </el-button>
    </div>

    <!-- 股票列表表格 -->
    <el-table
      class="stock-table"
      max-height="calc(100vh - 495px)"
      :data="filteredStockList"
      v-loading="loading"
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
        :filters="item.filterMethod ? addTypeFilters(item.key) : item.filters"
        :filter-method="item.filterMethod || getDefaultFilterMethod(item.key)"
        :column-key="item.columnKey || item.key"
        :width="item.width"
        :min-width="item.minWidth"
      >
        <template #default="{ row, $index }">
          <span v-if="item.key === 'index'">
            {{ $index + 1 + (currentPage - 1) * pageSize }}
          </span>
          <span v-else-if="item.key === 'stock_name'">
            <div class="stock-name-container">
              <div class="code-cell" style="cursor: pointer;" @click="handleCodeClick(row)">
                {{ row.stock_code || '--' }}
              </div>
              <div class="stock-name-cell">
                {{ row.stock_name || '--' }}
              </div>
            </div>
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
              @change="(val) => $emit('status-change', row, val)"
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
          <span v-else-if="item.key === 'circular_market_val_yi'">
            {{ row.circular_market_val_yi ?? '--' }}
          </span>
          <span v-else-if="item.key === 'stability_analysis'">
            <template v-for="(analysis, idx) in getStabilityAnalysis(row)" :key="idx">
              <el-tag
                :class="analysis.matched ? 'tag-matched' : 'tag-unmatched'"
                size="small"
                style="margin-right: 4px;"
              >
                {{ analysis.text }}
              </el-tag>
            </template>
          </span>
          <span v-else-if="item.key === 'ma_trend'">
            <el-tag
              :class="getMaTrend(row).matched ? 'tag-matched' : 'tag-unmatched'"
              size="small"
            >
              {{ getMaTrend(row).text }}
            </el-tag>
          </span>
          <span v-else class="ellipsis" :title="row[item.prop] || '--'">
            {{ row[item.prop] || '--' }}
          </span>
        </template>
      </el-table-column>

      <el-table-column fixed="right" label="操作" :width="showAddToSelfButton || showRemoveFromSelfButton ? 280 : 200">
        <template v-slot="scope">
          <el-button
            link
            type="primary"
            @click="$emit('view-stock', scope.row.id)"
          >
            查看
          </el-button>
          <el-button
            link
            type="primary"
            @click="$emit('edit-stock', scope.row.id)"
          >
            编辑
          </el-button>
          <!-- 策略股票池：根据是否已添加自选显示不同按钮 -->
          <el-button
            v-if="showAddToSelfButton && !scope.row.is_self_selected"
            link
            type="success"
            @click="$emit('add-to-self', scope.row)"
          >
            添加自选
          </el-button>
          <el-button
            v-if="showAddToSelfButton && scope.row.is_self_selected"
            link
            type="warning"
            @click="$emit('remove-from-self', scope.row)"
          >
            取消自选
          </el-button>
          <!-- 自选股票池：显示取消自选按钮 -->
          <el-button
            v-if="showRemoveFromSelfButton"
            link
            type="warning"
            @click="$emit('remove-from-self', scope.row)"
          >
            取消自选
          </el-button>
          <el-popconfirm
            title="确定要删除该股票吗？"
            confirm-button-text="确定"
            cancel-button-text="取消"
            @confirm="$emit('delete-stock', scope.row.id)"
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
      :current-page="currentPage"
      :page-size="pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="total"
      layout="total, sizes, prev, pager, next"
      @current-change="$emit('page-change', $event)"
      @size-change="$emit('size-change', $event)"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { formatDateTime } from '@/utils/time'

// Props 定义
const props = defineProps({
  stockList: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  total: {
    type: Number,
    default: 0
  },
  currentPage: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 20
  },
  showAddButton: {
    type: Boolean,
    default: true
  },
  // 是否显示"添加自选"按钮（策略股票池专用）
  showAddToSelfButton: {
    type: Boolean,
    default: false
  },
  // 是否显示"取消自选"按钮（自选股票池专用）
  showRemoveFromSelfButton: {
    type: Boolean,
    default: false
  }
})

// Emits 定义
const emit = defineEmits(['page-change', 'size-change', 'search', 'reset', 'view-stock', 'edit-stock', 'delete-stock', 'status-change', 'add-stock', 'add-to-self', 'remove-from-self', 'filter-change'])

// 本地搜索和筛选状态
const localSearchQuery = ref('')
const localFilterParams = reactive({
  exchange_code: '',
  status: '',
  add_method: '',
  priority_level: ''
})

// 前端过滤后的股票列表（搜索框 + 过滤条件）
const filteredStockList = computed(() => {
  let result = props.stockList

  // 1. 搜索框过滤（股票代码、名称）
  if (localSearchQuery.value?.trim()) {
    const query = localSearchQuery.value.trim().toLowerCase()
    result = result.filter(stock => {
      const code = stock?.stock_code?.toLowerCase() || ''
      const name = stock?.stock_name?.toLowerCase() || ''
      return code.includes(query) || name.includes(query)
    })
  }

  // 2. 交易所过滤
  if (localFilterParams.exchange_code) {
    result = result.filter(stock => stock?.exchange_code === localFilterParams.exchange_code)
  }

  // 3. 状态过滤
  if (localFilterParams.status) {
    result = result.filter(stock => stock?.status === localFilterParams.status)
  }

  // 4. 优先级过滤
  if (localFilterParams.priority_level !== '' && localFilterParams.priority_level !== null && localFilterParams.priority_level !== undefined) {
    result = result.filter(stock => stock?.priority_level === localFilterParams.priority_level)
  }

  return result
})

// 监听筛选变化，通知父组件更新洞察数据
watch(filteredStockList, (newList) => {
  emit('filter-change', newList)
}, { deep: true })

// 动态生成筛选项（基于完整列表，显示所有可能的选项）
const addTypeFilters = (type) => {
  // 如果 stockList 为空，返回 undefined（不显示筛选器）
  if (!props.stockList?.length) {
    return undefined
  }

  const setItem = new Set()
  props.stockList.forEach(stock => {
    const value = stock?.[type]
    // 处理不同类型的值：字符串、数字、null、undefined
    if (value !== null && value !== undefined && value !== '') {
      // 如果是字符串，去除首尾空格
      const stringValue = typeof value === 'string' ? value.trim() : String(value)
      if (stringValue) {
        setItem.add(stringValue)
      }
    }
  })

  // 如果没有有效的筛选值，返回 undefined
  if (setItem.size === 0) {
    return undefined
  }

  return Array.from(setItem)
    .sort()
    .map(item => ({ text: String(item), value: item }))
}

// 表格列配置
const columns = reactive([
  // {
  //   key: 'index',
  //   label: '序号',
  //   width: 70
  // },
  {
    key: 'stock_name',
    label: '股票名称',
    prop: 'stock_name',
    minWidth: 110
  },
  {
    key: 'initial_price',
    label: '初始价',
    prop: 'initial_price',
    width: 90,
    sortable: true
  },
  {
    key: 'last_price',
    label: '当前价',
    prop: 'last_price',
    width: 90,
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
    width: 80,
    sortable: true
  },
  {
    key: 'circular_market_val_yi',
    label: '流通市值(亿)',
    prop: 'circular_market_val_yi',
    width: 130,
    sortable: true
  },
  {
    key: 'stability_analysis',
    label: '站稳分析',
    prop: 'stability_analysis',
    minWidth: 150
  },
  {
    key: 'ma_trend',
    label: '均线趋势',
    prop: 'ma_trend',
    minWidth: 120
  },
  {
    key: 'days_added',
    label: '加入天数',
    prop: 'days_added',
    width: 110,
    sortable: true
  },
  {
    key: 'add_time',
    label: '加入日期',
    prop: 'add_time',
    width: 110,
    sortable: true
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
  {
    key: 'strategy_name',
    label: '策略名称',
    prop: 'strategy_name',
    width: 150
  },
  {
    key: 'add_reason',
    label: '加入原因',
    prop: 'add_reason',
    minWidth: 150,
    columnKey: 'add_reason',
    filterMethod: (value, row) => row.add_reason === value
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

// 获取默认的过滤方法
const getDefaultFilterMethod = (key) => {
  // 对于 exchange_code，使用自定义过滤方法
  if (key === 'exchange_code') {
    return (value, row) => {
      if (!value) return true
      return row.exchange_code === value
    }
  }
  return undefined
}

// 防抖定时器
let searchTimer = null

// 处理搜索（只有搜索框变化时才触发接口调用）
const handleSearch = () => {
  // 清除之前的定时器
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  // 防抖处理，300ms 后触发
  searchTimer = setTimeout(() => {
    const searchParams = {
      searchQuery: localSearchQuery.value,
      // 注意：过滤条件不传递给接口，只用于前端过滤
    }
    // 触发搜索事件，由父组件处理（只传递搜索关键词）
    emit('search', searchParams)
  }, 300)
}

// 处理重置
const handleReset = () => {
  localSearchQuery.value = ''
  localFilterParams.exchange_code = ''
  localFilterParams.status = ''
  localFilterParams.add_method = ''
  localFilterParams.priority_level = ''
  // 重置时也需要触发搜索接口，清空搜索条件
  handleSearch()
}

// 数值排序方法
const sortNumber = (a, b) => {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a - b
}

// 格式化涨幅
const formatChangePercent = (value, showSign = true) => {
  if (value === null || value === undefined) return '--'
  const sign = showSign && value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// 获取行情涨跌幅颜色
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

// 处理股票代码点击
const handleCodeClick = (row) => {
  const numberCode = row.stock_code?.replace(/[^0-9]/g, '') || ''
  window.open(`https://gushitong.baidu.com/stock/ab-${numberCode}`, '_blank')
}

// 获取K线数据（最近3天）
const getKlineData = (row) => {
  const klineData = row?.kline_data
  if (!klineData || !Array.isArray(klineData) || klineData.length < 3) {
    return null
  }
  // 取最近3天的数据（数组最后3个元素）
  return klineData.slice(-3)
}

// 站稳分析判断
const getStabilityAnalysis = (row) => {
  const results = []

  // 1. 判断 M1 > M3
  const maData = row.ma_data
  if (maData?.MA1 != null && maData?.MA3 != null) {
    if (maData.MA1 > maData.MA3) {
      results.push({ text: 'M1 > M3', matched: true })
    }
  }

  // 2. 判断 3日最低价：底分型（中间那一天是最低的）
  const klineData = getKlineData(row)
  if (klineData && klineData.length === 3) {
    const lows = klineData.map(k => k.low).filter(low => low != null)
    if (lows.length === 3) {
      // 底分型：low[1] < low[0] && low[1] < low[2]
      if (lows[1] < lows[0] && lows[1] < lows[2]) {
        results.push({ text: '3日最低价：底分型', matched: true })
      }
      // 上涨型：low[0] < low[1] < low[2]
      if (lows[0] < lows[1] && lows[1] < lows[2]) {
        results.push({ text: '3日最低价：上涨型', matched: true })
      }
    }
  }

  // 如果没有任何匹配项，返回"无"
  if (results.length === 0) {
    return [{ text: '无', matched: false }]
  }

  return results
}

// 均线趋势判断
const getMaTrend = (row) => {
  const maData = row.ma_data

  // 判断多头向上：M1 > M3 > M5 > M10 > M20
  if (maData?.MA1 != null && maData?.MA3 != null && maData?.MA5 != null &&
      maData?.MA10 != null && maData?.MA20 != null) {
    if (maData.MA1 > maData.MA3 &&
        maData.MA3 > maData.MA5 &&
        maData.MA5 > maData.MA10 &&
        maData.MA10 > maData.MA20) {
      return { text: '多头向上', matched: true }
    }
  }

  return { text: '无', matched: false }
}
</script>

<style scoped lang="less">
.stock-list-container {
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

    :deep(.el-table__cell) {
      padding: 4px 0;
    }

    .stock-name-container {
      display: flex;
      flex-direction: column;
    }

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

// 标签样式：符合的用红色，不符合的用灰色
:deep(.tag-matched) {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: #fff;
}

:deep(.tag-unmatched) {
  background-color: #e4e7ed;
  border-color: #e4e7ed;
  color: #909399;
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
