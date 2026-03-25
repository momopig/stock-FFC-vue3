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
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getStockPoolList,
  updateStock,
  updateStockStatus,
} from '@/api/modules/stockPool';
import { addStockToGroups } from '@/api/modules/stockGroup';
import StockInsights from '@/components/StockInsights/index.vue';
import StockList from '@/components/StockList/index.vue';
import AddToGroupDialog from './AddToGroupDialog.vue';
import { calculateDaysAdded } from '@/utils/time';
import { mapQuoteToFlatRowFields } from '../utils/stockQuoteFields';
import { applySearchParamsFromStockList } from '../utils/stockPoolSearchParams';
import { buildStockListRequestParams } from '../composables/useStockListRequestCache';
import { useStockInsights } from '../composables/useStockInsights';

const emit = defineEmits(['view-stock', 'edit-stock', 'add-stock']);

// 不做数据缓存：每次挂载/切换/搜索都直接请求接口

// 股票列表数据
const stockList = ref([]);
const loading = ref(false);

// 分页参数
const page = reactive({
  pageNo: 1,
  pageSize: 50,
  total: 0,
});

// 搜索参数
const searchParams = reactive({
  stock_code: '',
  stock_name: '',
  exchange_code: '',
  strategy_name: '',
  snapshot_date: '',
});

const displayStockList = computed(() => stockList.value);

const {
  insightsData,
  calculateInsightsFromList,
  handleFilterChange,
  currentFilteredList,
} = useStockInsights(displayStockList);

// 添加到分组对话框相关
const addToGroupDialogVisible = ref(false);
const selectedStockData = ref(null);
const selectedStrategyInfo = ref(null);

// 页面加载时获取重点观察列表（每次 v-if 挂载时触发）
onMounted(() => {
  getWatchStockList();
});

const _buildParams = (additional = {}) =>
  buildStockListRequestParams(page, searchParams, additional, {
    is_self_selected: true,
  });

// 获取重点观察股票列表（不走缓存）
const getWatchStockList = async (additional = {}) => {
  const params = _buildParams(additional);

  loading.value = true;

  try {
    const response = await getStockPoolList(params);
    if (response?.success) {
      const allStocks = (response.payload?.items || []).map(flattenStockData);
      const watchStocks = allStocks.filter((s) => s.is_self_selected === true);
      stockList.value = watchStocks;
      page.total = watchStocks.length;
      calculateInsightsFromList();
      loading.value = false;
    } else {
      ElMessage.error(response?.message || '获取重点观察列表失败');
      loading.value = false;
    }
  } catch (error) {
    console.error('获取重点观察列表失败:', error);
    ElMessage.error('获取重点观察列表失败，请稍后重试');
    loading.value = false;
  }
};

const flattenStockData = (stock) => {
  const quote = stock?.quote || {};
  const initialPrice = stock.initial_price ? Number(stock.initial_price) : null;

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
    ...mapQuoteToFlatRowFields(quote, initialPrice),
  };

  if (mappedStock.add_time) {
    mappedStock.days_added = calculateDaysAdded(
      mappedStock.add_time,
      searchParams.snapshot_date
    );
  }

  return mappedStock;
};

// 分页处理
const handlePageChange = (newPage) => {
  page.pageNo = newPage;
  getWatchStockList();
};

const handlePageSizeChange = (newPageSize) => {
  page.pageSize = newPageSize;
  page.pageNo = 1;
  getWatchStockList();
};

// 搜索事件处理
const handleSearchEvent = (searchParamsFromChild) => {
  applySearchParamsFromStockList(searchParams, searchParamsFromChild);
  page.pageNo = 1;
  getWatchStockList();
};

// 查看 / 编辑（交给父级处理）
const handleViewStock = (id) => emit('view-stock', id);
const handleEditStock = (id) => emit('edit-stock', id);
const handleAddStock = () => emit('add-stock');

// 取消观察
const handleCancelWatch = async (id) => {
  try {
    const stock = stockList.value.find((s) => s.id === id);
    if (!stock) {
      ElMessage.error('股票数据不存在');
      return;
    }
    const result = await updateStock(id, { is_self_selected: false });
    if (result && result.success !== false) {
      ElMessage.success('已取消观察');
      stock.is_self_selected = false;
      await getWatchStockList();
    } else {
      ElMessage.error(result?.message || '取消观察失败');
    }
  } catch (error) {
    console.error('取消观察失败:', error);
    ElMessage.error('取消观察失败，请稍后重试');
  }
};

// 状态变更
const handleStatusChange = async (row, newStatus) => {
  const oldStatus = newStatus === 'active' ? 'inactive' : 'active';
  try {
    row.statusLoading = true;
    const result = await updateStockStatus(row.id, newStatus);
    if (result && result.success !== false) {
      ElMessage.success(`状态已${newStatus === 'active' ? '激活' : '失效'}`);
      calculateInsightsFromList(
        currentFilteredList.value?.length > 0 ? currentFilteredList.value : null
      );
    } else {
      row.status = oldStatus;
      ElMessage.error(result?.message || '状态变更失败');
    }
  } catch (error) {
    row.status = oldStatus;
    console.error('状态变更失败:', error);
    ElMessage.error('状态变更失败，请稍后重试');
  } finally {
    row.statusLoading = false;
  }
};

// 添加到自选（打开弹窗）
const handleAddToSelf = (row) => {
  selectedStockData.value = {
    stock_code: row.stock_code,
    stock_name: row.stock_name,
    exchange_code: row.exchange_code,
    last_price: row.last_price,
    initial_price: row.initial_price,
    add_time: row.add_time || null,
  };
  selectedStrategyInfo.value = {
    add_time: row.add_time || null,
    initial_price: row.initial_price || null,
    add_reason: row.add_reason || '',
    notes: row.notes || '',
  };
  addToGroupDialogVisible.value = true;
};

// 提交添加到分组
const handleAddToGroupSubmit = async (submitData) => {
  try {
    if (!selectedStockData.value) {
      ElMessage.error('股票数据不存在');
      return;
    }
    const addData = {
      group_ids: submitData.group_ids,
      exchange_code: selectedStockData.value.exchange_code,
      stock_code: selectedStockData.value.stock_code,
      stock_name: selectedStockData.value.stock_name,
      add_time: submitData.add_time || null,
      initial_price: submitData.initial_price || 0,
      add_reason: submitData.add_reason || '',
      remark: submitData.remark || '',
    };
    const result = await addStockToGroups(addData);
    if (result && result.success !== false) {
      ElMessage.success('已添加到自选分组');
      addToGroupDialogVisible.value = false;
      selectedStockData.value = null;
      selectedStrategyInfo.value = null;
      await getWatchStockList();
    } else {
      ElMessage.error(result?.message || '添加自选失败');
    }
  } catch (error) {
    console.error('添加自选失败:', error);
    ElMessage.error('添加自选失败，请稍后重试');
  }
};
</script>

<style scoped lang="less">
.watch-list-container {
  height: 100%;
}
</style>
