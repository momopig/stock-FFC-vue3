<template>
  <div class="strategy-pool-container">
    <!-- 策略Tab选项卡 -->
    <el-tabs
      v-model="activeStrategy"
      @tab-click="handleStrategyChange"
      v-loading="strategiesLoading"
    >
      <el-tab-pane
        v-for="strategy in strategies"
        :key="strategy.id"
        :label="strategy.name"
        :name="strategy.name"
      >
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
          :showAddToWatchButton="userStore.userInfo?.is_superuser"
          :enableBatchActions="true"
          :showBulkDeleteButton="true"
          :showBulkAddToGroupButton="true"
          :showBulkAddToWatchButton="userStore.userInfo?.is_superuser"
          @page-change="handlePageChange"
          @size-change="handlePageSizeChange"
          @search="handleSearchEvent"
          @view-stock="handleViewStock"
          @edit-stock="handleEditStock"
          @delete-stock="handleDeleteStock"
          @status-change="handleStatusChange"
          @add-stock="addStockFn"
          @add-to-self="handleAddToSelf"
          @add-to-watch="handleAddToWatch"
          @remove-from-self="handleRemoveFromSelf"
          @filter-change="handleFilterChange"
          @selection-change="handleSelectionChange"
          @bulk-delete="handleBulkDelete"
          @bulk-add-to-group="handleBulkAddToGroup"
          @bulk-add-to-watch="handleBulkAddToWatch"
        />
      </el-tab-pane>

      <!-- 重点观察Tab（仅超管可见） -->
      <el-tab-pane
        v-if="userStore.userInfo?.is_superuser"
        label="重点观察"
        name="watch"
        key="watch"
      >
        <template v-if="activeStrategy === 'watch'">
          <WatchList
            @view-stock="handleViewStock"
            @edit-stock="handleEditStock"
            @add-stock="addStockFn"
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
      :strategy-info="selectedStrategyInfo"
      @submit="handleAddToGroupSubmitWrapped"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getStrategyList } from '@/api/modules/strategy';
import {
  getStockPoolList,
  getStockDetail,
  addStock,
  updateStock,
  deleteStock,
  updateStockStatus,
} from '@/api/modules/stockPool';
import StockInsights from '@/components/StockInsights/index.vue';
import StockList from '@/components/StockList/index.vue';
import StockDialog from '../components/StockDialog.vue';
import AddToGroupDialog from '../components/AddToGroupDialog.vue';
import WatchList from '../components/WatchList.vue';
import { UserStore } from '@/state/user';
import { flattenPoolStockRow } from '../utils/flattenPoolStock';
import { buildStockListRequestParams } from '../composables/useStockListRequestCache';
import { useStockInsights } from '../composables/useStockInsights';
import { useStockListPagingHandlers } from '../composables/useStockListPagingHandlers';
import { useAddToGroupDialogFlow } from '../composables/useAddToGroupDialogFlow';
import { useStockRowStatusChange } from '../composables/useStockRowStatusChange';
import { addStockToGroups } from '@/api/modules/stockGroup';

// 用户状态管理
const userStore = UserStore();

// 策略列表
const strategies = ref([]);
const strategiesLoading = ref(false);
const activeStrategy = ref('');
const ENABLE_STRATEGY_TAB_SWITCH_REFRESH = false;
const strategyTabStateCache = reactive({});

// 股票列表数据
const stockList = ref([]);
const tableLoading = ref(false);
const dialogVisible = ref(false);
const isViewMode = ref(false);
const isEditMode = ref(false);
const selectedRows = ref([]);
const bulkAddRows = ref([]);

// 分页参数
const page = reactive({
  pageNo: 1,
  pageSize: 50,
  total: 0,
});

// 搜索参数
function createDefaultSearchParams() {
  return {
    stock_code: '',
    stock_name: '',
    exchange_code: '',
    strategy_name: '',
    snapshot_date: '',
  };
}

const searchParams = reactive(createDefaultSearchParams());

function cloneSearchParams() {
  return {
    stock_code: searchParams.stock_code || '',
    stock_name: searchParams.stock_name || '',
    exchange_code: searchParams.exchange_code || '',
    strategy_name: searchParams.strategy_name || '',
    snapshot_date: searchParams.snapshot_date || '',
  };
}

function applySearchParams(nextSearchParams = {}) {
  Object.assign(searchParams, createDefaultSearchParams(), nextSearchParams);
}

function getStrategyTabCacheKey(strategyName = activeStrategy.value) {
  return String(strategyName || '');
}

function updateCurrentStrategyCache(strategyName = activeStrategy.value) {
  const cacheKey = getStrategyTabCacheKey(strategyName);
  if (!cacheKey || cacheKey === 'watch') {
    return;
  }
  strategyTabStateCache[cacheKey] = {
    stockList: Array.isArray(stockList.value) ? [...stockList.value] : [],
    total: Number(page.total || 0),
    pageNo: Number(page.pageNo || 1),
    pageSize: Number(page.pageSize || 50),
    searchParams: cloneSearchParams(),
  };
}

function restoreStrategyCache(strategyName = activeStrategy.value) {
  const cachedState = strategyTabStateCache[getStrategyTabCacheKey(strategyName)];
  if (!cachedState) {
    return false;
  }
  stockList.value = Array.isArray(cachedState.stockList)
    ? [...cachedState.stockList]
    : [];
  page.total = Number(cachedState.total || 0);
  page.pageNo = Number(cachedState.pageNo || 1);
  page.pageSize = Number(cachedState.pageSize || 50);
  applySearchParams(cachedState.searchParams || {});
  calculateInsightsFromList();
  tableLoading.value = false;
  return true;
}

async function activateStrategyTab(
  strategyName,
  { preferCache = !ENABLE_STRATEGY_TAB_SWITCH_REFRESH, resetFilters = true } = {}
) {
  if (!strategyName || strategyName === 'watch') {
    activeStrategy.value = strategyName;
    stockList.value = [];
    page.total = 0;
    return;
  }
  const nextStrategyName = String(strategyName);
  if (String(activeStrategy.value || '') !== nextStrategyName) {
    updateCurrentStrategyCache(activeStrategy.value);
    activeStrategy.value = nextStrategyName;
  }
  if (preferCache && restoreStrategyCache(nextStrategyName)) {
    return;
  }
  if (resetFilters) {
    page.pageNo = 1;
    applySearchParams();
  }
  await getStockList(nextStrategyName);
}

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
    created_by: '',
  };
};

const stockForm = ref(initStockForm());

// 根据当前策略筛选股票列表
const displayStockList = computed(() => {
  if (!activeStrategy.value) return [];

  // 筛选条件：strategy_name 匹配当前选中策略，且不是自选股票
  return stockList.value.filter((stock) => {
    const matchStrategy =
      stock.strategy_name === activeStrategy.value ||
      stock.add_reason === activeStrategy.value;
    return matchStrategy;
  });
});

const {
  insightsData,
  currentFilteredList,
  calculateInsightsFromList,
  handleFilterChange,
} = useStockInsights(displayStockList);

// 不做数据缓存：每次切换/搜索都直接请求接口

// 页面加载时获取策略列表
onMounted(async () => {
  await loadStrategies();
});

// 加载策略列表
const loadStrategies = async () => {
  strategiesLoading.value = true;
  try {
    const params = {
      enabled: true,
      page: 1,
      page_size: 100,
    };
    const response = await getStrategyList(params);
    if (response?.success) {
      strategies.value = response.payload?.items || [];

      // 默认选中第一个策略
      if (strategies.value.length > 0) {
        await activateStrategyTab(strategies.value[0].name, {
          preferCache: true,
          resetFilters: false,
        });
      }
    } else {
      ElMessage.error(response?.message || '获取策略列表失败');
    }
  } catch (error) {
    console.error('获取策略列表失败:', error);
    ElMessage.error('获取策略列表失败，请稍后重试');
  } finally {
    strategiesLoading.value = false;
  }
};

// 策略切换处理
const handleStrategyChange = async (tab) => {
  const tabName = tab?.props?.name || tab?.name;
  await activateStrategyTab(tabName, { preferCache: true });
};

// 获取股票列表（不走缓存）
const getStockList = async (
  strategyName = null,
  additionalSearchParams = {}
) => {
  const currentStrategy = strategyName ?? activeStrategy.value;
  if (!currentStrategy || currentStrategy === 'watch') {
    stockList.value = [];
    page.total = 0;
    return;
  }

  const params = buildStockListRequestParams(
    page,
    searchParams,
    additionalSearchParams,
    { strategy_name: currentStrategy }
  );

  tableLoading.value = true;

  try {
    const response = await getStockPoolList(params);
    if (response?.success) {
      const rows = (response.payload?.items || []).map((stock) =>
        flattenPoolStockRow(stock, {
          snapshotDate: searchParams.snapshot_date,
        })
      );
      stockList.value = rows;
      page.total = response.payload?.total || 0;
      calculateInsightsFromList();
      updateCurrentStrategyCache(currentStrategy);
      tableLoading.value = false;
    } else {
      ElMessage.error(response?.message || '获取股票列表失败');
      tableLoading.value = false;
    }
  } catch (error) {
    console.error('获取股票列表失败:', error);
    ElMessage.error('获取股票列表失败，请稍后重试');
    tableLoading.value = false;
  }
};

const { handlePageChange, handlePageSizeChange, handleSearchEvent } =
  useStockListPagingHandlers({
    page,
    searchParams,
    reload: () => getStockList(),
  });

const {
  addToGroupDialogVisible,
  selectedStockData,
  selectedStrategyInfo,
  handleAddToSelf,
  handleAddToGroupSubmit,
} = useAddToGroupDialogFlow({
  onSuccess: () => getStockList(),
});

const handleSelectionChange = (rows) => {
  selectedRows.value = Array.isArray(rows) ? rows : [];
};

const handleBulkDelete = async (rows) => {
  const targets = Array.isArray(rows) ? rows : selectedRows.value;
  if (!targets.length) {
    ElMessage.warning('请先选择要删除的股票');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定批量删除 ${targets.length} 只股票吗？`,
      '批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch {
    return;
  }

  let successCount = 0;
  let failCount = 0;
  for (const row of targets) {
    try {
      const result = await deleteStock(row.id);
      if (result?.success !== false) {
        successCount += 1;
      } else {
        failCount += 1;
      }
    } catch {
      failCount += 1;
    }
  }

  ElMessage.success(
    `批量删除完成：成功 ${successCount} 只${failCount ? `，失败 ${failCount} 只` : ''}`
  );
  selectedRows.value = [];
  getStockList(null, {}, { force: true });
};

const handleBulkAddToGroup = (rows) => {
  const targets = Array.isArray(rows) ? rows : selectedRows.value;
  if (!targets.length) {
    ElMessage.warning('请先选择要加入分组的股票');
    return;
  }
  bulkAddRows.value = [...targets];
  handleAddToSelf(targets[0]);
};

const handleAddToGroupSubmitWrapped = async (submitData) => {
  if (!bulkAddRows.value.length) {
    await handleAddToGroupSubmit(submitData);
    return;
  }

  let successCount = 0;
  let failCount = 0;
  for (const row of bulkAddRows.value) {
    try {
      const result = await addStockToGroups({
        group_ids: submitData.group_ids,
        exchange_code: row.exchange_code,
        stock_code: row.stock_code,
        stock_name: row.stock_name,
        add_time: submitData.add_time || null,
        initial_price: submitData.initial_price || row.initial_price || 0,
        add_reason: submitData.add_reason || row.add_reason || '',
        remark: submitData.remark || row.notes || '',
      });
      if (result?.success !== false) {
        successCount += 1;
      } else {
        failCount += 1;
      }
    } catch {
      failCount += 1;
    }
  }

  ElMessage.success(
    `批量加入分组完成：成功 ${successCount} 只${failCount ? `，失败 ${failCount} 只` : ''}`
  );
  bulkAddRows.value = [];
  addToGroupDialogVisible.value = false;
  selectedStockData.value = null;
  selectedStrategyInfo.value = null;
  selectedRows.value = [];
  getStockList(null, {}, { force: true });
};

const handleBulkAddToWatch = async (rows) => {
  const targets = Array.isArray(rows) ? rows : selectedRows.value;
  if (!targets.length) {
    ElMessage.warning('请先选择要加入观察的股票');
    return;
  }

  let successCount = 0;
  let failCount = 0;
  for (const row of targets) {
    try {
      const result = await updateStock(row.id, {
        is_self_selected: true,
      });
      if (result?.success !== false) {
        successCount += 1;
      } else {
        failCount += 1;
      }
    } catch {
      failCount += 1;
    }
  }

  ElMessage.success(
    `批量加入观察完成：成功 ${successCount} 只${failCount ? `，失败 ${failCount} 只` : ''}`
  );
  selectedRows.value = [];
  getStockList(null, {}, { force: true });
};

// 查看股票详情
const handleViewStock = (id) => {
  getStockDetail(id).then((res) => {
    if (!res.success) {
      ElMessage.error(res.message || '获取股票详情失败');
      return;
    }
    const payload = res.payload || {};
    const formData = {
      id: payload.id,
      stock_code: payload.stock_code || '',
      stock_name: payload.stock_name || '',
      exchange_code: payload.exchange_code || '',
      add_method: payload.add_method || 'strategy',
      add_time: payload.add_time || '',
      initial_price: payload.initial_price
        ? Number(payload.initial_price)
        : null,
      add_reason: payload.add_reason || '',
      created_by: payload.created_by || '',
      status: payload.status || 'active',
      priority_level: payload.priority_level || null,
      notes: payload.notes || '',
    };
    stockForm.value = formData;
    isViewMode.value = true;
    isEditMode.value = false;
    dialogVisible.value = true;
  });
};

// 编辑股票
const handleEditStock = (id) => {
  getStockDetail(id).then((res) => {
    if (!res.success) {
      ElMessage.error(res.message || '获取股票详情失败');
      return;
    }
    const payload = res.payload || {};
    const formData = {
      id: payload.id,
      stock_code: payload.stock_code || '',
      stock_name: payload.stock_name || '',
      exchange_code: payload.exchange_code || '',
      add_method: payload.add_method || 'strategy',
      add_time: payload.add_time || '',
      initial_price: payload.initial_price
        ? Number(payload.initial_price)
        : null,
      add_reason: payload.add_reason || '',
      created_by: payload.created_by || '',
      status: payload.status || 'active',
      priority_level: payload.priority_level || null,
      notes: payload.notes || '',
    };
    stockForm.value = formData;
    isViewMode.value = false;
    isEditMode.value = true;
    dialogVisible.value = true;
  });
};

// 删除股票
const handleDeleteStock = (id) => {
  deleteStock(id).then((res) => {
    if (!res || !res.success) {
      ElMessage.error(res?.message || '删除股票失败');
      return;
    }
    ElMessage.success('删除股票成功');
    getStockList(null, {}, { force: true });
  });
};

const { handleStatusChange } = useStockRowStatusChange({
  updateStockStatus,
  calculateInsightsFromList,
  currentFilteredList,
});

// 加入观察（修改is_self_selected为true）
const handleAddToWatch = async (row) => {
  try {
    const result = await updateStock(row.id, {
      is_self_selected: true,
    });

    if (result && result.success !== false) {
      ElMessage.success('已加入重点观察');
      // 更新本地数据
      row.is_self_selected = true;
      getStockList(null, {}, { force: true });
    } else {
      ElMessage.error(result?.message || '加入观察失败');
    }
  } catch (error) {
    console.error('加入观察失败:', error);
    ElMessage.error('加入观察失败，请稍后重试');
  }
};

// 取消自选（修改 is_self_selected 为 false）
const handleRemoveFromSelf = async (row) => {
  try {
    // 使用 updateStock API，只更新 is_self_selected 字段
    const result = await updateStock(row.id, {
      is_self_selected: false,
    });

    if (result && result.success !== false) {
      ElMessage.success('已取消自选');
      // 更新本地数据
      row.is_self_selected = false;
      getStockList(null, {}, { force: true });
    } else {
      ElMessage.error(result?.message || '取消自选失败');
    }
  } catch (error) {
    console.error('取消自选失败:', error);
    ElMessage.error('取消自选失败，请稍后重试');
  }
};

// 新增股票
const addStockFn = () => {
  dialogVisible.value = true;
  isViewMode.value = false;
  isEditMode.value = false;
  stockForm.value = initStockForm();
  // 自动设置加入原因为当前策略
  stockForm.value.add_reason = activeStrategy.value;
};

// 提交股票表单
const submitStock = async (formData) => {
  try {
    let result;
    if (formData.id) {
      const updateData = {
        status: formData.status,
        priority_level: formData.priority_level,
        notes: formData.notes,
        add_reason: formData.add_reason,
      };
      result = await updateStock(formData.id, updateData);
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
        created_by: formData.created_by,
      };
      result = await addStock(addData);
    }

    if (result && result.success !== false) {
      ElMessage.success(formData.id ? '更新股票成功' : '添加股票成功');
      dialogVisible.value = false;
      getStockList(null, {}, { force: true });
      stockForm.value = initStockForm();
    } else {
      ElMessage.error(result?.message || '保存失败');
    }
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error(
      '保存失败：' + (error.response?.data?.message || error.message)
    );
  }
};
</script>

<style scoped lang="less">
.strategy-pool-container {
  height: calc(100vh - 120px);
  background-color: #fff;
  padding: 10px 20px 20px 20px;
}
</style>
