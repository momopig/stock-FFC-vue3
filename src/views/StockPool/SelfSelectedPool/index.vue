<template>
  <div class="self-selected-pool-container">
    <!-- 分组标签页 -->
    <div class="groups-tabs-container" v-loading="groupLoading">
      <div class="groups-tabs-wrapper">
        <el-tabs
          v-model="activeGroupId"
          ref="tabRef"
          @tab-change="handleGroupChange"
          @edit="handleTabEdit"
          type="card"
          editable
          class="groups-tabs"
        >
          <el-tab-pane
            v-for="group in groups"
            :key="group.id"
            :label="group.name"
            :name="String(group.id)"
            :closable="group.create_type !== 'system'"
          />
          <!-- 自定义添加按钮插槽 -->
          <template #add-icon>
            <div
              class="add-group-btn"
              @click.stop="handleCreateGroup"
              title="新建分组"
            >
              <el-icon><Plus /></el-icon>
            </div>
          </template>
        </el-tabs>
      </div>
    </div>

    <!-- 洞察数据 -->
    <StockInsights :insightsData="insightsData" />

    <!-- 股票列表 -->
    <StockList
      :stockList="displayStockList"
      :loading="tableLoading"
      :total="page.total"
      :currentPage="page.pageNo"
      :pageSize="page.pageSize"
      :isSelfSelected="true"
      @page-change="handlePageChange"
      @size-change="handlePageSizeChange"
      @search="handleSearchEvent"
      @view-stock="handleViewStock"
      @edit-stock="handleEditStock"
      @delete-stock="handleDeleteStock"
      @status-change="handleStatusChange"
      @add-stock="addStockFn"
      @remove-from-self="handleRemoveFromSelf"
      @filter-change="handleFilterChange"
    />

    <!-- 股票添加/编辑对话框 -->
    <StockDialog
      v-model:visible="dialogVisible"
      :form-data="stockForm"
      :is-view-mode="isViewMode"
      :is-edit-mode="isEditMode"
      :groups="groups"
      :active-group-id="activeGroupId"
      @submit="submitStock"
      @group-created="handleGroupCreated"
    />
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
  computed,
  nextTick,
} from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { useGetDerivedNamespace } from 'element-plus';
import Sortable from 'sortablejs';
import {
  getUserGroups,
  createGroup,
  deleteGroup,
  reorderGroups,
  getGroupStocks,
  removeStockFromGroup,
  updateGroupStock,
  addStockToGroups,
} from '@/api/modules/stockGroup';
import StockInsights from '@/components/StockInsights/index.vue';
import StockList from '@/components/StockList/index.vue';
import StockDialog from '../components/StockDialog.vue';
import { calculateDaysAdded } from '@/utils/time';
import { mapQuoteToFlatRowFields } from '../utils/stockQuoteFields';
import { applySearchParamsFromStockList } from '../utils/stockPoolSearchParams';
import {
  buildStockListRequestParams,
  useStockListRequestCache,
} from '../composables/useStockListRequestCache';
import { useStockInsights } from '../composables/useStockInsights';

// 分组相关数据
const groups = ref([]);
const activeGroupId = ref('');
const groupLoading = ref(false);
const tabRef = ref(null);
let sortable = null;
const ns = useGetDerivedNamespace().value;

// 股票列表数据
const stockList = ref([]);
const tableLoading = ref(false);
const dialogVisible = ref(false);
const isViewMode = ref(false);
const isEditMode = ref(false);

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

const { invalidate: invalidateGroupStockCache, readHit, write } =
  useStockListRequestCache();

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
    add_method: 'manual',
    add_time: null,
    days_added: 0,
    add_reason: '',
    notes: '',
    created_by: '',
    group_ids: [],
  };
};

const stockForm = ref(initStockForm());

// 显示股票列表（直接使用 stockList，不再筛选）
const displayStockList = computed(() => stockList.value);

const {
  insightsData,
  calculateInsightsFromList,
  handleFilterChange,
} = useStockInsights(displayStockList);

// 页面加载时获取分组列表
onMounted(async () => {
  await fetchGroups();
  // 初始化拖拽排序
  nextTick(() => {
    initSortable();
  });
});

// 组件卸载时销毁 Sortable 实例
onBeforeUnmount(() => {
  if (sortable) {
    sortable.destroy();
    sortable = null;
  }
});

// 初始化拖拽排序
const initSortable = () => {
  if (!tabRef.value?.tabNavRef) return;

  const { tabListRef, tabBarRef } = tabRef.value.tabNavRef;
  if (!tabListRef) return;

  sortable = new Sortable(tabListRef, {
    animation: 150,
    draggable: `.${ns}-tabs__item`,
    filter: '.is-disabled',
    onChange: (event) => {
      // 清除 tabBar 的动画状态
      if (sortable && tabBarRef) {
        sortable.removeAnimationState(tabBarRef.$el);
        tabBarRef.update();
      }
    },
    onEnd: (event) => {
      // 拖拽结束时调用排序接口
      const { oldDraggableIndex, newDraggableIndex } = event;
      if (
        oldDraggableIndex !== null &&
        newDraggableIndex !== null &&
        oldDraggableIndex !== newDraggableIndex
      ) {
        handleReorderGroups(oldDraggableIndex, newDraggableIndex);
      }
    },
  });
};

// 处理分组顺序变更
const handleReorderGroups = async (oldIndex, newIndex) => {
  // 创建分组数组的副本
  const reorderedGroups = [...groups.value];

  // 重新排序分组数组
  const movedGroup = reorderedGroups[oldIndex];
  reorderedGroups.splice(oldIndex, 1);
  reorderedGroups.splice(newIndex, 0, movedGroup);

  // 构建顺序列表
  const orderList = reorderedGroups.map((group, index) => ({
    id: group.id,
    display_order: index,
  }));

  try {
    const result = await reorderGroups(orderList);
    if (result?.success) {
      // 刷新分组列表以同步最新顺序
      await fetchGroups();
    } else {
      ElMessage.error(result?.message || '调整分组顺序失败');
      // 恢复原顺序
      await fetchGroups();
    }
  } catch (error) {
    console.error('调整分组顺序失败:', error);
    ElMessage.error('调整分组顺序失败，请稍后重试');
    // 恢复原顺序
    await fetchGroups();
  }
};

// 获取分组列表
const fetchGroups = async () => {
  groupLoading.value = true;
  try {
    const response = await getUserGroups();
    if (response?.success) {
      const items = response.payload?.items || [];
      // 按 display_order 排序
      groups.value = items.sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      );

      // 如果没有选中分组或当前分组不存在，默认选中第一个分组
      if (
        !activeGroupId.value ||
        !groups.value.find((g) => String(g.id) === activeGroupId.value)
      ) {
        if (groups.value.length > 0) {
          activeGroupId.value = String(groups.value[0].id);
        }
      }

      // 如果选中了分组，加载该分组的股票
      if (activeGroupId.value && activeGroupId.value !== 'add') {
        await getStockList();
      }
    } else {
      ElMessage.error(response?.message || '获取分组列表失败');
    }
  } catch (error) {
    console.error('获取分组列表失败:', error);
    ElMessage.error('获取分组列表失败，请稍后重试');
  } finally {
    groupLoading.value = false;
  }
};

// 处理分组创建事件
const handleGroupCreated = async (newGroup) => {
  // 刷新分组列表
  await fetchGroups();
  // 如果创建了新分组，可以自动选中它（可选）
  if (newGroup?.id) {
    // 这里不自动切换，让用户继续当前操作
  }
};

// 创建分组
const handleCreateGroup = async () => {
  try {
    const { value: groupName } = await ElMessageBox.prompt(
      '请输入分组名称',
      '新建分组',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^.{1,20}$/,
        inputErrorMessage: '分组名称长度为1-20个字符',
      }
    );

    if (!groupName) return;

    groupLoading.value = true;
    try {
      const result = await createGroup({
        name: groupName,
        is_hidden: false,
        display_order: groups.value.length,
        remark: '',
        create_type: 'custom',
      });

      if (result?.success) {
        ElMessage.success('创建分组成功');
        await fetchGroups();
        // 选中新创建的分组
        if (result.payload?.id) {
          activeGroupId.value = String(result.payload.id);
          await getStockList();
        }
      } else {
        ElMessage.error(result?.message || '创建分组失败');
      }
    } catch (error) {
      console.error('创建分组失败:', error);
      ElMessage.error('创建分组失败，请稍后重试');
    } finally {
      groupLoading.value = false;
    }
  } catch (error) {
    // 用户取消
  }
};

// 处理标签页编辑（删除）
const handleTabEdit = async (targetName, action) => {
  if (action === 'remove') {
    const groupId = Number(targetName);
    const group = groups.value.find((g) => g.id === groupId);
    if (!group) return;

    // 系统分组不允许删除
    if (group.create_type === 'system') {
      ElMessage.warning('系统分组不允许删除');
      return;
    }

    try {
      await ElMessageBox.confirm(
        `确定要删除分组"${group.name}"吗？删除后该分组下的股票将被移除。`,
        '删除分组',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      groupLoading.value = true;
      try {
        const result = await deleteGroup(groupId);
        if (result?.success) {
          ElMessage.success('删除分组成功');
          invalidateGroupStockCache(groupId);
          // 如果删除的是当前分组，切换到第一个分组
          if (String(groupId) === activeGroupId.value) {
            const remainingGroups = groups.value.filter(
              (g) => g.id !== groupId
            );
            if (remainingGroups.length > 0) {
              activeGroupId.value = String(remainingGroups[0].id);
            } else {
              activeGroupId.value = '';
            }
          }
          await fetchGroups();
          // 如果还有选中分组，重新加载股票列表
          if (activeGroupId.value && activeGroupId.value !== 'add') {
            await getStockList();
          }
        } else {
          ElMessage.error(result?.message || '删除分组失败');
          // 删除失败时刷新分组列表以恢复标签页
          await fetchGroups();
        }
      } catch (error) {
        console.error('删除分组失败:', error);
        ElMessage.error('删除分组失败，请稍后重试');
        // 删除失败时刷新分组列表以恢复标签页
        await fetchGroups();
      } finally {
        groupLoading.value = false;
      }
    } catch (error) {
      // 用户取消，刷新分组列表以恢复标签页
      await fetchGroups();
    }
  }
};

// 切换分组
const handleGroupChange = async (groupId) => {
  if (groupId === 'add') return; // 新建分组按钮不处理

  activeGroupId.value = groupId;
  page.pageNo = 1;
  await getStockList();
};

// 获取股票列表（默认走缓存；数据变更处传 force: true）
const getStockList = async (
  additionalSearchParams = {},
  { force = false } = {}
) => {
  if (!activeGroupId.value || activeGroupId.value === 'add') {
    stockList.value = [];
    page.total = 0;
    return;
  }

  const params = buildStockListRequestParams(
    page,
    searchParams,
    additionalSearchParams
  );
  const gid = String(activeGroupId.value);

  if (!force) {
    const hit = readHit(gid, params);
    if (hit) {
      // 第一帧：先显示 loading + 清空表格，让浏览器绘制出 tab 高亮和空表格
      tableLoading.value = true;
      stockList.value = [];
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
    const response = await getGroupStocks(Number(activeGroupId.value), params);
    if (response?.success) {
      const rows = (response.payload?.items || []).map(flattenGroupStockData);
      stockList.value = rows;
      page.total = response.payload?.total || 0;
      write(gid, params, rows, page.total);
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

// 将分组股票数据扁平化处理
const flattenGroupStockData = (stock) => {
  const quote = stock?.quote || {};
  const initialPrice = stock.initial_price ? Number(stock.initial_price) : null;

  const mappedStock = {
    id: stock.id, // 这是分组内的 item_id，用于编辑和删除
    stock_code: stock.stock_code || '',
    stock_name: stock.stock_name || '',
    exchange_code: stock.exchange_code || '',
    add_method: 'manual',
    add_time: stock.joined_at || '',
    initial_price: initialPrice,
    add_reason: stock.add_reason || '',
    strategy_name: '',
    is_self_selected: true,
    created_by: '',
    status: 'active',
    priority_level: null,
    notes: stock.remark || '',
    updated_time: stock.updated_at || '',
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
  // 从当前列表中找到股票数据
  const stock = stockList.value.find((s) => s.id === id);
  if (!stock) {
    ElMessage.error('股票数据不存在');
    return;
  }

  const formData = {
    id: stock.id,
    stock_code: stock.stock_code || '',
    stock_name: stock.stock_name || '',
    exchange_code: stock.exchange_code || '',
    add_method: stock.add_method || 'manual',
    add_time: stock.add_time || '',
    initial_price: stock.initial_price,
    add_reason: stock.add_reason || '',
    created_by: stock.created_by || '',
    status: stock.status || 'active',
    priority_level: stock.priority_level || null,
    notes: stock.notes || '',
  };
  stockForm.value = formData;
  isViewMode.value = true;
  isEditMode.value = false;
  dialogVisible.value = true;
};

// 编辑股票
const handleEditStock = (id) => {
  // 从当前列表中找到股票数据
  const stock = stockList.value.find((s) => s.id === id);
  if (!stock) {
    ElMessage.error('股票数据不存在');
    return;
  }

  const formData = {
    id: stock.id, // 这是分组内的 item_id
    stock_code: stock.stock_code || '',
    stock_name: stock.stock_name || '',
    exchange_code: stock.exchange_code || '',
    add_method: stock.add_method || 'manual',
    add_time: stock.add_time || '',
    initial_price: stock.initial_price,
    add_reason: stock.add_reason || '',
    created_by: stock.created_by || '',
    status: stock.status || 'active',
    priority_level: stock.priority_level || null,
    notes: stock.notes || '',
  };
  stockForm.value = formData;
  isViewMode.value = false;
  isEditMode.value = true;
  dialogVisible.value = true;
};

// 删除股票
const handleDeleteStock = async (id) => {
  try {
    const result = await removeStockFromGroup(id);
    if (result?.success) {
      ElMessage.success('删除股票成功');
      await getStockList({}, { force: true });
    } else {
      ElMessage.error(result?.message || '删除股票失败');
    }
  } catch (error) {
    console.error('删除股票失败:', error);
    ElMessage.error('删除股票失败，请稍后重试');
  }
};

// 处理状态变更（分组内股票可能不支持状态变更，保留接口）
const handleStatusChange = async (row, newStatus) => {
  ElMessage.warning('分组内股票暂不支持状态变更');
};

// 取消自选（从分组移除股票）
const handleRemoveFromSelf = async (row) => {
  try {
    ElMessageBox.confirm('确定要从当前分组移除这只股票吗？', '移除股票', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(async () => {
        const result = await removeStockFromGroup(row.id);
        if (result?.success) {
          ElMessage.success('已移除股票');
          await getStockList({}, { force: true });
        } else {
          ElMessage.error(result?.message || '移除股票失败');
        }
      })
      .catch(() => {
        // 用户取消
      });
  } catch (error) {
    console.error('移除股票失败:', error);
    ElMessage.error('移除股票失败，请稍后重试');
  }
};

// 新增股票
const addStockFn = () => {
  dialogVisible.value = true;
  isViewMode.value = false;
  isEditMode.value = false;
  stockForm.value = initStockForm();
  // 默认选中当前激活的分组
  if (activeGroupId.value && activeGroupId.value !== 'add') {
    stockForm.value.group_ids = [Number(activeGroupId.value)];
  }
};

// 提交股票表单
const submitStock = async (formData) => {
  try {
    // 批量添加模式
    if (formData?.batchMode && Array.isArray(formData?.stocks)) {
      const groupIds = formData.group_ids || [];
      if (groupIds.length === 0) {
        ElMessage.error('请至少选择一个分组');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const stock of formData.stocks) {
        try {
          const addData = {
            group_ids: groupIds,
            exchange_code: stock.exchange_code,
            stock_code: stock.stock_code,
            stock_name: stock.stock_name,
            initial_price: stock.initial_price ?? 0,
            add_reason: formData.add_reason || '',
            remark: formData.notes || '',
          };
          const result = await addStockToGroups(addData);
          if (result?.success !== false) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      ElMessage.success(
        `批量添加完成：成功 ${successCount} 只${failCount > 0 ? `，失败 ${failCount} 只` : ''}`
      );
      dialogVisible.value = false;
      invalidateGroupStockCache(groupIds);
      await getStockList({}, { force: true });
      stockForm.value = initStockForm();
      return;
    }

    let result;
    if (formData.id) {
      // 编辑模式：更新分组内股票
      const updateData = {
        add_reason: formData.add_reason || '',
        remark: formData.notes || '',
        initial_price: formData.initial_price || 0,
      };
      result = await updateGroupStock(formData.id, updateData);
    } else {
      // 新增模式：添加到分组
      const groupIds =
        formData.group_ids && formData.group_ids.length > 0
          ? formData.group_ids
          : activeGroupId.value && activeGroupId.value !== 'add'
            ? [Number(activeGroupId.value)]
            : [];

      if (groupIds.length === 0) {
        ElMessage.error('请至少选择一个分组');
        return;
      }

      const addData = {
        group_ids: groupIds,
        exchange_code: formData.exchange_code,
        stock_code: formData.stock_code,
        stock_name: formData.stock_name,
        initial_price: formData.initial_price || 0,
        add_reason: formData.add_reason || '',
        remark: formData.notes || '',
      };
      result = await addStockToGroups(addData);
    }

    if (result && result.success !== false) {
      ElMessage.success(formData.id ? '更新股票成功' : '添加股票成功');
      dialogVisible.value = false;
      const touchedGroups = formData.id
        ? activeGroupId.value && activeGroupId.value !== 'add'
          ? [Number(activeGroupId.value)]
          : []
        : formData.group_ids?.length
          ? formData.group_ids
          : activeGroupId.value && activeGroupId.value !== 'add'
            ? [Number(activeGroupId.value)]
            : [];
      invalidateGroupStockCache(touchedGroups);
      await getStockList({}, { force: true });
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
.self-selected-pool-container {
  height: calc(100vh - 130px);
  background-color: #fff;
  padding: 20px;
}

.groups-tabs-container {
  margin-bottom: 20px;
}

.groups-tabs-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.groups-tabs {
  flex: 1;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }

  :deep(.el-tabs__item) {
    padding: 0 20px;
    height: 40px;
    line-height: 40px;
  }

  :deep(.is-disabled) {
    cursor: default;
  }
}

.add-group-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
  color: #909399;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }
}
</style>
