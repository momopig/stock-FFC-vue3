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
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getStockPoolList,
  updateStock,
  updateStockStatus,
} from '@/api/modules/stockPool';
import StockInsights from '@/components/StockInsights/index.vue';
import StockList from '@/components/StockList/index.vue';
import AddToGroupDialog from './AddToGroupDialog.vue';
import { flattenPoolStockRow } from '../utils/flattenPoolStock';
import { buildStockListRequestParams } from '../composables/useStockListRequestCache';
import { useStockInsights } from '../composables/useStockInsights';
import { useStockListPagingHandlers } from '../composables/useStockListPagingHandlers';
import { useAddToGroupDialogFlow } from '../composables/useAddToGroupDialogFlow';
import { useStockRowStatusChange } from '../composables/useStockRowStatusChange';

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
      const allStocks = (response.payload?.items || []).map((stock) =>
        flattenPoolStockRow(stock, {
          snapshotDate: searchParams.snapshot_date,
        })
      );
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

const { handlePageChange, handlePageSizeChange, handleSearchEvent } =
  useStockListPagingHandlers({
    page,
    searchParams,
    reload: () => getWatchStockList(),
  });

const {
  addToGroupDialogVisible,
  selectedStockData,
  selectedStrategyInfo,
  handleAddToSelf,
  handleAddToGroupSubmit,
} = useAddToGroupDialogFlow({
  onSuccess: () => getWatchStockList(),
});

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

const { handleStatusChange } = useStockRowStatusChange({
  updateStockStatus,
  calculateInsightsFromList,
  currentFilteredList,
});
</script>

<style scoped lang="less">
.watch-list-container {
  height: 100%;
}
</style>
