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
      @submit="handleAddToGroupSubmit"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
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
import { addStockToGroups } from '@/api/modules/stockGroup';
import { UserStore } from '@/state/user';
import { calculateDaysAdded } from '@/utils/time';
import { mapQuoteToFlatRowFields } from '../utils/stockQuoteFields';
import { applySearchParamsFromStockList } from '../utils/stockPoolSearchParams';
import {
  buildStockListRequestParams,
  useStockListRequestCache,
} from '../composables/useStockListRequestCache';
import { useStockInsights } from '../composables/useStockInsights';

// 用户状态管理
const userStore = UserStore();

// 策略列表
const strategies = ref([]);
const strategiesLoading = ref(false);
const activeStrategy = ref('');

// 股票列表数据
const stockList = ref([]);
const tableLoading = ref(false);
const dialogVisible = ref(false);
const isViewMode = ref(false);
const isEditMode = ref(false);
const addToGroupDialogVisible = ref(false);
const selectedStockData = ref(null);
const selectedStrategyInfo = ref(null);

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

const { readHit, write } = useStockListRequestCache();

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
        activeStrategy.value = strategies.value[0].name;
        getStockList();
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
  debugger
  const tabName = tab?.props?.name || tab?.name;
  activeStrategy.value = tabName;
  if (tabName !== 'watch') {
    page.pageNo = 1;
    await getStockList(tabName);
  }
};

// 获取股票列表（按策略名缓存；切换策略且分页/搜索未变时复用缓存）
const getStockList = async (
  strategyName = null,
  additionalSearchParams = {},
  { force = false } = {}
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

  if (!force) {
    const hit = readHit(currentStrategy, params);
    if (hit) {
      // 第一帧：先显示 loading，让浏览器绘制出 tab 高亮（v-if 已切换，StockList 以空数据挂载）
      tableLoading.value = true;
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      // 第二帧：apply 缓存数据，el-table 在 loading 遮罩覆盖下完成渲染
      stockList.value = hit.items;
      page.total = hit.total;
      calculateInsightsFromList();
      // 第三帧：el-table 已渲染完毕，此时再移除 loading 遮罩，数据立即可见
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      tableLoading.value = false;
      return;
    }
  }

  tableLoading.value = true;

  try {
    const response = await getStockPoolList(params);
    if (response?.success) {
      const rows = (response.payload?.items || []).map(flattenStockData);
      stockList.value = rows;
      page.total = response.payload?.total || 0;
      write(currentStrategy, params, rows, page.total);
      calculateInsightsFromList();
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

// 将股票数据扁平化处理
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

  // 计算加入天数
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
  getStockList();
};

// 每页数量变化处理
const handlePageSizeChange = (newPageSize) => {
  page.pageSize = newPageSize;
  page.pageNo = 1;
  getStockList();
};

// 搜索事件处理
const handleSearchEvent = (searchParamsFromChild) => {
  applySearchParamsFromStockList(searchParams, searchParamsFromChild);
  page.pageNo = 1;
  getStockList();
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

// 处理状态变更
const handleStatusChange = async (row, newStatus) => {
  const oldStatus = newStatus === 'active' ? 'inactive' : 'active';

  try {
    row.statusLoading = true;

    const result = await updateStockStatus(row.id, newStatus);

    if (result && result.success !== false) {
      ElMessage.success(`状态已${newStatus === 'active' ? '激活' : '失效'}`);
      // 使用当前筛选列表重新计算洞察数据
      calculateInsightsFromList(
        currentFilteredList.value.length > 0 ? currentFilteredList.value : null
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
  // 准备股票数据（包含加入日期，用于在保持策略信息时传递）
  selectedStockData.value = {
    stock_code: row.stock_code,
    stock_name: row.stock_name,
    exchange_code: row.exchange_code,
    last_price: row.last_price,
    initial_price: row.initial_price,
    add_time: row.add_time || null,
  };

  // 准备策略信息（从当前股票数据中获取）
  selectedStrategyInfo.value = {
    add_time: row.add_time || null,
    initial_price: row.initial_price || null,
    add_reason: row.add_reason || '',
    notes: row.notes || '',
  };

  addToGroupDialogVisible.value = true;
};

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

// 处理添加到分组的提交
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
      getStockList(null, {}, { force: true });
    } else {
      ElMessage.error(result?.message || '添加自选失败');
    }
  } catch (error) {
    console.error('添加自选失败:', error);
    ElMessage.error('添加自选失败，请稍后重试');
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
