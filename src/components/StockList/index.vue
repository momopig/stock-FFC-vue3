<template>
  <FullscreenContainer v-slot="{ isFullscreen, toggleFullscreen }">
    <div class="stock-list-container" :class="{ 'is-fullscreen': isFullscreen }">
      <div class="top-container">
        <!-- 搜索和操作区域 -->
        <div class="search-title">
          <el-input class="search-input" v-model="localSearchQuery.stock_code" placeholder="搜索股票代码" clearable
            @keyup.enter="handleSearch" style="width: 150px; margin-right: 10px;" />
          <el-input class="search-input" v-model="localSearchQuery.stock_name" placeholder="搜索股票名称" clearable
            @keyup.enter="handleSearch" style="width: 150px; margin-right: 10px;" />
          <el-select v-model="localFilterParams.exchange_code" placeholder="交易所" clearable
            style="width: 150px; margin-right: 10px;">
            <el-option label="上交所" value="SH" />
            <el-option label="深交所" value="SZ" />
            <el-option label="港交所" value="HK" />
            <el-option label="美股" value="US" />
          </el-select>
          <!-- <el-select
          v-model="localFilterParams.status"
          placeholder="状态"
          clearable
          style="width: 150px; margin-right: 10px;"
        >
          <el-option label="活跃" value="active" />
          <el-option label="失效" value="inactive" />
        </el-select> -->
          <!-- <el-select
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
        </el-select> -->
          <el-button class="search-btn" type="primary" @click="handleSearch">搜索</el-button>
          <el-button class="search-btn" @click="handleReset">重置</el-button>
          <el-button v-if="showAddButton" class="add-stock-btn" type="primary" @click="$emit('add-stock')">
            添加股票
          </el-button>
        </div>
        <el-button class="fullscreen-btn" @click="toggleFullscreen">
          <el-icon>
            <FullScreen v-if="!isFullscreen" />
            <Aim v-else />
          </el-icon>
          <span>
            {{ isFullscreen ? '退出全屏' : '全屏' }}
            <span class="shortcut-hint">按 F9 全屏</span>
          </span>
        </el-button>
      </div>
      <!-- 股票列表表格 -->
      <el-table class="stock-table" :max-height="isFullscreen ? 'calc(100vh - 100px)' : showAddButton ? 'calc(100vh - 400px)' : 'calc(100vh - 450px)'"
        :data="props.stockList" v-loading="loading" element-loading-text="加载股票数据中..."
        :default-sort="{ prop: 'selfChangeRate', order: 'descending' }">
        <el-table-column v-for="item in columns" :key="item.key" :prop="item.prop" :label="item.label"
          :sortable="item.sortable"
          :sort-method="item.sortable ? (a, b) => sortNumber(a[item.prop], b[item.prop]) : undefined"
          :filters="getFiltersForColumn(item)" :filter-method="item.filterMethod || getDefaultFilterMethod(item.key)"
          :column-key="item.columnKey || item.key" :width="item.width" :min-width="item.minWidth">
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
                <!-- 自选按钮 -->
                <div class="self-select-buttons" v-if="showAddToSelfButton || showRemoveFromSelfButton">
                  <!-- 策略股票池：根据是否已添加自选显示不同按钮 -->
                  <el-button
                    v-if="showAddToSelfButton && !row.is_self_selected"
                    link
                    type="success"
                    @click.stop="$emit('add-to-self', row)">
                    + 添加自选
                  </el-button>
                  <el-button
                    v-if="showAddToSelfButton && row.is_self_selected"
                    link
                    type="warning"
                    @click.stop="$emit('remove-from-self', row)">
                    - 取消自选
                  </el-button>
                  <!-- 自选股票池：显示取消自选按钮 -->
                  <el-button
                    v-if="showRemoveFromSelfButton"
                    link
                    type="warning"
                    @click.stop="$emit('remove-from-self', row)">
                    - 删除自选
                  </el-button>
                </div>
              </div>
            </span>
            <span v-else-if="item.key === 'exchange_code'">
              {{ row.exchange_code === 'SH' ? '上交所' : row.exchange_code === 'SZ' ? '深交所' : row.exchange_code === 'HK' ?
                '港交所' : row.exchange_code === 'US' ? '美股' : row.exchange_code || '--' }}
            </span>
            <span v-else-if="item.key === 'add_method'">
              <el-tag :type="getAddMethodTagType(row.add_method)">
                {{ getAddMethodLabel(row.add_method) }}
              </el-tag>
            </span>
            <span v-else-if="item.key === 'status'">
              <el-switch v-model="row.status" :active-value="'active'" :inactive-value="'inactive'"
                @change="(val) => $emit('status-change', row, val)" :loading="row.statusLoading" />
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
                <el-tag :class="analysis.matched ? 'tag-matched' : 'tag-unmatched'" size="small"
                  style="margin-right: 4px;">
                  {{ analysis.text }}
                </el-tag>
              </template>
            </span>
            <span v-else-if="item.key === 'ma_trend'">
              <el-tooltip :content="getMaTrend(row).tooltip" placement="top" :disabled="!getMaTrend(row).tooltip">
                <el-tag :class="getMaTrend(row).matched ? 'tag-matched' : 'tag-unmatched'" size="small">
                  {{ getMaTrend(row).text }}
                </el-tag>
              </el-tooltip>
            </span>
            <span v-else-if="item.key === 'risk_signs'">
              <template v-if="getRiskSigns(row)?.length">
                <el-tooltip v-for="(riskSign, idx) in getRiskSigns(row)" :key="idx"
                  :content="riskSign.explain" placement="top">
                  <el-tag size="small" class="risk-tag-matched" style="margin-right: 4px;">
                    {{ riskSign.sign }}
                  </el-tag>
                </el-tooltip>
              </template>
              <el-tag v-else size="small" class="tag-unmatched" style="margin-right: 4px;">无</el-tag>
            </span>
            <span v-else class="ellipsis" :title="row[item.prop] || '--'">
              {{ row[item.prop] || '--' }}
            </span>
          </template>
        </el-table-column>

        <!-- 昨日涨幅、3日涨幅、20日涨幅列（冻结在右侧，操作列之前） -->
        <el-table-column fixed="right" prop="yesterday_change_rate" label="昨日涨跌幅" width="110" sortable
          :sort-method="(a, b) => sortNumber(calculateYesterdayChangeRate(a), calculateYesterdayChangeRate(b))">
          <template #default="{ row }">
            <span :style="{ color: getQuoteColor(calculateYesterdayChangeRate(row)) }">
              {{ formatChangePercent(calculateYesterdayChangeRate(row)) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column fixed="right" prop="three_day_change_rate" label="3日涨跌幅" width="110" sortable
          :sort-method="(a, b) => sortNumber(calculate3DayChangeRate(a), calculate3DayChangeRate(b))">
          <template #default="{ row }">
            <span :style="{ color: getQuoteColor(calculate3DayChangeRate(row)) }">
              {{ formatChangePercent(calculate3DayChangeRate(row)) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column fixed="right" prop="twenty_day_change_rate" label="20日涨跌幅" width="115" sortable
          :sort-method="(a, b) => sortNumber(calculate20DayChangeRate(a), calculate20DayChangeRate(b))">
          <template #default="{ row }">
            <span :style="{ color: getQuoteColor(calculate20DayChangeRate(row)) }">
              {{ formatChangePercent(calculate20DayChangeRate(row)) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column fixed="right" label="操作" :width="200">
          <template v-slot="scope">
            <el-button link type="primary" @click="$emit('view-stock', scope.row.id)">
              查看
            </el-button>
            <el-button link type="primary" @click="$emit('edit-stock', scope.row.id)">
              编辑
            </el-button>
            <el-popconfirm title="确定要删除该股票吗？" confirm-button-text="确定" cancel-button-text="取消"
              @confirm="$emit('delete-stock', scope.row.id)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination class="pagination" :current-page="currentPage" :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]" :total="total" layout="total, sizes, prev, pager, next"
        @current-change="$emit('page-change', $event)" @size-change="$emit('size-change', $event)" />
    </div>
  </FullscreenContainer>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { formatDateTime } from '@/utils/time'
import FullscreenContainer from '@/components/FullscreenContainer/index.vue'
import { FullScreen, Aim } from '@element-plus/icons-vue'

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
const localSearchQuery = reactive({
  stock_code: '',
  stock_name: ''
})
const localFilterParams = reactive({
  exchange_code: '',
  status: '',
  add_method: '',
  priority_level: ''
})

// 监听股票列表变化，通知父组件更新洞察数据
watch(() => props.stockList, (newList) => {
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


// 生成站稳分析的筛选项
const getStabilityAnalysisFilters = () => {
  if (!props.stockList?.length) {
    return undefined
  }

  const filterSet = new Set()
  props.stockList.forEach(stock => {
    const analysisResults = getStabilityAnalysis(stock)
    analysisResults?.forEach(result => {
      if (result?.text) {
        filterSet.add(result.text)
      }
    })
  })

  if (filterSet.size === 0) {
    return undefined
  }

  return Array.from(filterSet)
    .sort()
    .map(item => ({ text: String(item), value: item }))
}

// 生成均线趋势的筛选项
const getMaTrendFilters = () => {
  if (!props.stockList?.length) {
    return undefined
  }

  const filterSet = new Set()
  props.stockList.forEach(stock => {
    const trendResult = getMaTrend(stock)
    if (trendResult?.text) {
      filterSet.add(trendResult.text)
    }
  })

  if (filterSet.size === 0) {
    return undefined
  }

  return Array.from(filterSet)
    .sort()
    .map(item => ({ text: String(item), value: item }))
}

// 站稳分析的筛选方法
const filterStabilityAnalysis = (value, row) => {
  if (!value) return true
  const analysisResults = getStabilityAnalysis(row)
  return analysisResults?.some(result => result.text === value) || false
}

// 均线趋势的筛选方法
const filterMaTrend = (value, row) => {
  if (!value) return true
  const trendResult = getMaTrend(row)
  return trendResult?.text === value
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
    minWidth: 100,
    align: 'center'
  },
  {
    key: 'initial_price',
    label: '初始价',
    prop: 'initial_price',
    width: 85,
    sortable: true
  },
  {
    key: 'last_price',
    label: '当前价',
    prop: 'last_price',
    width: 85,
    sortable: true
  },
  {
    key: 'selfChangeRate',
    label: '自选涨跌幅',
    prop: 'selfChangeRate',
    width: 110,
    sortable: true
  },
  {
    key: 'change_rate',
    label: '当日涨跌幅',
    prop: 'change_rate',
    width: 110,
    sortable: true
  },
  {
    key: 'turnover_rate',
    label: '当日换手率',
    prop: 'turnover_rate',
    width: 110,
    sortable: true
  },
  {
    key: 'volume_ratio',
    label: '量比',
    prop: 'volume_ratio',
    width: 70,
    sortable: true
  },
  {
    key: 'circular_market_val_yi',
    label: '流通市值(亿)',
    prop: 'circular_market_val_yi',
    width: 125,
    sortable: true
  },
  {
    key: 'stability_analysis',
    label: '站稳分析',
    prop: 'stability_analysis',
    minWidth: 150,
    columnKey: 'stability_analysis',
    filterMethod: filterStabilityAnalysis
  },
  {
    key: 'ma_trend',
    label: '均线趋势',
    prop: 'ma_trend',
    minWidth: 100,
    columnKey: 'ma_trend',
    filterMethod: filterMaTrend
  },
  {
    key: 'risk_signs',
    label: '风险信号',
    prop: 'risk_signs',
    minWidth: 150
  },
  {
    key: 'days_added',
    label: '加入天数',
    prop: 'days_added',
    width: 100,
    sortable: true
  },
  {
    key: 'add_time',
    label: '加入日期',
    prop: 'add_time',
    width: 100,
    sortable: true
  },
  {
    key: 'notes',
    label: '备注',
    prop: 'notes',
    minWidth: 300
  },
  // {
  //   key: 'created_by',
  //   label: '创建人',
  //   prop: 'created_by',
  //   width: 100
  // },
  {
    key: 'strategy_name',
    label: '策略名称',
    prop: 'strategy_name',
    width: 120
  },
  {
    key: 'add_reason',
    label: '加入原因',
    prop: 'add_reason',
    minWidth: 120,
    columnKey: 'add_reason',
    filterMethod: (value, row) => row.add_reason === value
  },
  // {
  //   key: 'status',
  //   label: '是否活跃',
  //   prop: 'status',
  //   width: 100
  // },
  // {
  //   key: 'priority_level',
  //   label: '优先级',
  //   prop: 'priority_level',
  //   width: 100,
  //   sortable: true
  // },
])

// 根据列配置获取对应的筛选项
// 注意：由于搜索改为后端接口搜索，前端筛选功能保留但主要用于展示，实际筛选通过接口实现
const getFiltersForColumn = (item) => {
  // 如果列配置中已经指定了 filters，直接返回
  if (item.filters) {
    return item.filters
  }

  // 根据列类型返回对应的筛选项
  if (item.key === 'stability_analysis') {
    return getStabilityAnalysisFilters()
  }
  if (item.key === 'ma_trend') {
    return getMaTrendFilters()
  }

  // 对于有 filterMethod 的列，使用通用的 addTypeFilters
  if (item.filterMethod) {
    return addTypeFilters(item.key)
  }

  return undefined
}

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

// 处理搜索（调用接口搜索）
const handleSearch = () => {
  // 清除之前的定时器
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  // 防抖处理，300ms 后触发
  searchTimer = setTimeout(() => {
    // 构建搜索参数
    const searchParams = {}
    
    // 股票代码搜索
    const stockCode = localSearchQuery.stock_code?.trim() || ''
    if (stockCode) {
      searchParams.stock_code = stockCode
    }
    
    // 股票名称搜索
    const stockName = localSearchQuery.stock_name?.trim() || ''
    if (stockName) {
      searchParams.stock_name = stockName
    }
    
    // 交易所代码
    if (localFilterParams.exchange_code) {
      searchParams.exchange_code = localFilterParams.exchange_code
    }
    
    // 触发搜索事件，由父组件处理并调用接口
    emit('search', searchParams)
  }, 300)
}

// 处理重置
const handleReset = () => {
  localSearchQuery.stock_code = ''
  localSearchQuery.stock_name = ''
  localFilterParams.exchange_code = ''
  localFilterParams.status = ''
  localFilterParams.add_method = ''
  localFilterParams.priority_level = ''
  // 重置时触发搜索接口，清空搜索条件
  emit('search', {})
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

// 获取K线数据（最近N天）
const getKlineData = (row, days = 3) => {
  const klineData = row?.kline_data
  if (!klineData || !Array.isArray(klineData) || klineData.length < days) {
    return null
  }
  // 取最近N天的数据（数组最后N个元素）
  return klineData.slice(-days)
}

// 计算昨日涨幅：使用昨天的收盘价和今天的收盘价（或当前价）
const calculateYesterdayChangeRate = (row) => {
  const klineData = row?.kline_data
  if (!klineData || !Array.isArray(klineData) || klineData.length < 2) {
    return null
  }

  // 昨天的收盘价（倒数第二个）
  const yesterdayClose = klineData[klineData.length - 2]?.last_close
  // 今天的收盘价（最后一个）或当前价
  const todayPrice = klineData[klineData.length - 1]?.close ?? row?.last_price

  if (yesterdayClose == null || todayPrice == null || yesterdayClose === 0) {
    return null
  }

  return ((todayPrice - yesterdayClose) / yesterdayClose) * 100
}

// 计算3日涨幅：使用3天前的收盘价和今天的收盘价（或当前价）
const calculate3DayChangeRate = (row) => {
  const klineData = row?.kline_data
  if (!klineData || !Array.isArray(klineData) || klineData.length < 3) {
    return null
  }

  // 3天前的收盘价（倒数第三个）
  const threeDaysAgoClose = klineData[klineData.length - 3]?.last_close
  // 今天的收盘价（最后一个）或当前价
  const todayPrice = klineData[klineData.length - 1]?.close ?? row?.last_price

  if (threeDaysAgoClose == null || todayPrice == null || threeDaysAgoClose === 0) {
    return null
  }

  return ((todayPrice - threeDaysAgoClose) / threeDaysAgoClose) * 100
}

// 计算20日涨幅：使用20天前的收盘价和今天的收盘价（或当前价）
const calculate20DayChangeRate = (row) => {
  const klineData = row?.kline_data
  if (!klineData || !Array.isArray(klineData) || klineData.length < 20) {
    return null
  }

  // 20天前的收盘价（倒数第20个）
  const twentyDaysAgoClose = klineData[klineData.length - 20]?.last_close
  // 今天的收盘价（最后一个）或当前价
  const todayPrice = klineData[klineData.length - 1]?.close ?? row?.last_price

  if (twentyDaysAgoClose == null || todayPrice == null || twentyDaysAgoClose === 0) {
    return null
  }

  return ((todayPrice - twentyDaysAgoClose) / twentyDaysAgoClose) * 100
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
      return {
        text: '多头向上',
        matched: true,
        tooltip: 'M1 > M3 > M5 > M10 > M20'
      }
    }
  }

  return { text: '无', matched: false }
}

// 获取风险信号数据
// 支持两种数据格式：1. 扁平化后的risk_signs字段 2. quote.risk_signs字段
const getRiskSigns = (row) => {
  // 优先使用扁平化后的字段
  if (row?.risk_signs && Array.isArray(row.risk_signs)) {
    return row.risk_signs
  }
  // 如果不存在，尝试从quote字段中获取
  if (row?.quote?.risk_signs && Array.isArray(row.quote.risk_signs)) {
    return row.quote.risk_signs
  }
  return []
}
</script>

<style scoped lang="less">
.stock-list-container {
  .top-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .search-title {
    overflow: hidden;
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

  .fullscreen-btn {
    display: flex;
    align-items: center;
    gap: 4px;

    .shortcut-hint {
      font-size: 12px;
      color: #909399;
      margin-left: 4px;
    }
  }

  &.is-fullscreen {

    // 全屏状态下的样式调整
    .stock-table {
      max-height: calc(100vh - 250px) !important;
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
      gap: 4px;
    }

    .code-cell {
      font-weight: 500;
      color: #409eff;
    }

    .self-select-buttons {
      display: flex;
      margin-top: 2px;

      :deep(.el-button) {
        padding: 0;
        height: auto;
        font-size: 14px;
        line-height: 1;
      }
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
  cursor: pointer;
  margin-bottom: 8px;
}

:deep(.risk-tag-matched) {
  background-color: rgb(103, 194, 58);
  border-color: rgb(103, 194, 58);
  color: #fff;
  cursor: pointer;
  margin-bottom: 8px;
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

.el-table :deep(.cell) {
  padding: 0 8px;
}
</style>
