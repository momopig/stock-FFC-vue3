<template>
  <div class="self-selected-pool-container">
    <!-- 分组标签页：全量 el-tab-pane，横向溢出由 Element Plus 箭头滚动 -->
    <div class="groups-tabs-container" v-loading="groupLoading">
      <div class="groups-tabs-row" ref="groupsTabsContainerRef">
        <div class="groups-tabs-wrapper">
          <el-tabs
            v-model="activeGroupId"
            ref="tabRef"
            @tab-change="handleGroupChange"
            @tab-remove="(name) => handleTabEdit(name, 'remove')"
            type="card"
            class="groups-tabs"
          >
            <el-tab-pane :name="ALL_GROUP_TAB_ID" :closable="false">
              <template #label>
                <span class="group-tab-label" title="全部">全部</span>
              </template>
            </el-tab-pane>
            <el-tab-pane
              v-for="group in groups"
              :key="group.id"
              :name="String(group.id)"
              :closable="group.create_type !== 'system'"
            >
              <template #label>
                <span class="group-tab-label" :title="group?.name">{{
                  group?.name
                }}</span>
              </template>
            </el-tab-pane>
          </el-tabs>
        </div>
        <div
          class="add-group-btn"
          @click.stop="handleCreateGroup"
          title="新建分组"
        >
          <el-icon><Plus /></el-icon>
        </div>
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
import {
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
  computed,
  nextTick,
  watch,
} from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { useGetDerivedNamespace } from 'element-plus';
import Sortable from 'sortablejs';
import {
  getUserGroups,
  createGroup,
  deleteGroup,
  getGroupStocksByGroups,
  reorderGroups,
  getGroupStocks,
  removeStockFromGroup,
  updateGroupStock,
  addStockToGroups,
} from '@/api/modules/stockGroup';
import StockInsights from '@/components/StockInsights/index.vue';
import StockList from '@/components/StockList/index.vue';
import StockDialog from '../components/StockDialog.vue';
import AddToGroupDialog from '../components/AddToGroupDialog.vue';
import { calculateDaysAdded } from '@/utils/time';
import { mapQuoteToFlatRowFields } from '../utils/stockQuoteFields';
import { buildStockListRequestParams } from '../composables/useStockListRequestCache';
import { useStockInsights } from '../composables/useStockInsights';
import { useStockListPagingHandlers } from '../composables/useStockListPagingHandlers';
import { useAddToGroupDialogFlow } from '../composables/useAddToGroupDialogFlow';

// 分组相关数据
const ALL_GROUP_TAB_ID = 'all';
const groups = ref([]);
const activeGroupId = ref(ALL_GROUP_TAB_ID);
const groupLoading = ref(false);
const tabRef = ref(null);
const groupsTabsContainerRef = ref(null);
let sortable = null;
let groupTabsResizeObserver = null;
const ns = useGetDerivedNamespace().value;

/** 拖拽时边缘滚动的节流间隔（ms），避免连续 click 箭头快于 EP 内部状态更新 */
const TAB_DRAG_EDGE_SCROLL_MS = 420;
const TAB_DRAG_EDGE_ZONE_PX = 52;

function destroySortable() {
  sortable?.destroy?.();
  sortable = null;
}

let tabDragEdgeScrollCleanup = null;
function clearTabDragEdgeScroll() {
  tabDragEdgeScrollCleanup?.();
  tabDragEdgeScrollCleanup = null;
}

let lastSortableGroupOrderKey = '';
function flushGroupTabsLayout() {
  const orderKey = groups.value.map((g) => g.id).join(',');
  if (orderKey === lastSortableGroupOrderKey) return;
  lastSortableGroupOrderKey = orderKey;
  nextTick(() => {
    destroySortable();
    initSortable();
  });
}

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

// 不做数据缓存：每次切换/搜索都直接请求接口

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

const { insightsData, calculateInsightsFromList, handleFilterChange } =
  useStockInsights(displayStockList);

watch(
  () => groups.value,
  () => nextTick(flushGroupTabsLayout),
  { deep: true, immediate: true }
);

watch(activeGroupId, () => {
  nextTick(() => tabRef.value?.tabNavRef?.scrollToActiveTab?.());
});

// 页面加载时获取分组列表（分组变化由 watch 触发 flush；ResizeObserver 覆盖窗口与侧栏变宽）
onMounted(async () => {
  await fetchGroups();
  await nextTick();
  groupTabsResizeObserver = new ResizeObserver(() => {
    nextTick(flushGroupTabsLayout);
  });
  groupsTabsContainerRef.value &&
    groupTabsResizeObserver.observe(groupsTabsContainerRef.value);
});

onBeforeUnmount(() => {
  groupTabsResizeObserver?.disconnect?.();
  groupTabsResizeObserver = null;
  clearTabDragEdgeScroll();
  destroySortable();
});

// 初始化拖拽排序（全量 tab 与 groups 顺序一致）
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
    onStart: () => {
      // 避免异常未触发 onEnd 时残留监听
      clearTabDragEdgeScroll();
      let lastEdgeScrollAt = 0;
      // nativeDraggable 为 true 时 Sortable 走 HTML5 拖拽，不会在 document 上派发 move（见 sortablejs _triggerDragStart）；用 dragover 取坐标
      const moveListenerOpts = { capture: true };
      let lastMoveDedupeAt = 0;
      let lastMoveX = -99999;
      let lastMoveY = -99999;
      const tryEdgeScroll = (clientX, clientY) => {
        if (clientX == null || clientY == null) return;
        const tPerf = performance.now?.() ?? Date.now();
        if (
          tPerf - lastMoveDedupeAt < 20 &&
          Math.abs(clientX - lastMoveX) < 2 &&
          Math.abs(clientY - lastMoveY) < 2
        ) {
          return;
        }
        lastMoveDedupeAt = tPerf;
        lastMoveX = clientX;
        lastMoveY = clientY;
        const root = tabRef.value?.$el;
        const scrollEl = root?.querySelector?.(`.${ns}-tabs__nav-scroll`);
        if (!scrollEl) return;
        const rect = scrollEl.getBoundingClientRect?.();
        if (!rect) return;
        const x = clientX;
        const prev = root?.querySelector?.(`.${ns}-tabs__nav-prev`);
        const next = root?.querySelector?.(`.${ns}-tabs__nav-next`);
        const now = Date.now();
        if (now - lastEdgeScrollAt < TAB_DRAG_EDGE_SCROLL_MS) return;
        if (
          x <= rect.left + TAB_DRAG_EDGE_ZONE_PX &&
          prev &&
          !prev.classList?.contains?.('is-disabled')
        ) {
          prev.click?.();
          lastEdgeScrollAt = now;
        } else if (
          x >= rect.right - TAB_DRAG_EDGE_ZONE_PX &&
          next &&
          !next.classList?.contains?.('is-disabled')
        ) {
          next.click?.();
          lastEdgeScrollAt = now;
        }
      };
      const onPointerMove = (e) => tryEdgeScroll(e.clientX, e.clientY);
      const onDragOver = (e) => tryEdgeScroll(e.clientX, e.clientY);
      const stop = () => {
        document.removeEventListener(
          'pointermove',
          onPointerMove,
          moveListenerOpts
        );
        document.removeEventListener(
          'mousemove',
          onPointerMove,
          moveListenerOpts
        );
        document.removeEventListener('dragover', onDragOver, moveListenerOpts);
        document.removeEventListener('pointerup', stop, moveListenerOpts);
        document.removeEventListener('pointercancel', stop, moveListenerOpts);
        document.removeEventListener('mouseup', stop, moveListenerOpts);
        document.removeEventListener('drop', stop, moveListenerOpts);
        document.removeEventListener('dragend', stop, moveListenerOpts);
        if (tabDragEdgeScrollCleanup === stop) tabDragEdgeScrollCleanup = null;
      };
      document.addEventListener('pointermove', onPointerMove, moveListenerOpts);
      document.addEventListener('mousemove', onPointerMove, moveListenerOpts);
      document.addEventListener('dragover', onDragOver, moveListenerOpts);
      document.addEventListener('pointerup', stop, moveListenerOpts);
      document.addEventListener('pointercancel', stop, moveListenerOpts);
      document.addEventListener('mouseup', stop, moveListenerOpts);
      document.addEventListener('drop', stop, moveListenerOpts);
      document.addEventListener('dragend', stop, moveListenerOpts);
      tabDragEdgeScrollCleanup = stop;
    },
    onEnd: (event) => {
      clearTabDragEdgeScroll();
      const { oldDraggableIndex, newDraggableIndex } = event;
      if (
        oldDraggableIndex == null ||
        newDraggableIndex == null ||
        oldDraggableIndex === newDraggableIndex
      ) {
        return;
      }
      if (oldDraggableIndex === 0 || newDraggableIndex === 0) {
        nextTick(() => tabRef.value?.tabNavRef?.scrollToActiveTab?.());
        return;
      }
      const oldGroupIndex = oldDraggableIndex - 1;
      const newGroupIndex = newDraggableIndex - 1;
      const list = groups.value;
      const moved = list?.[oldGroupIndex];
      if (!moved?.id) return;
      handleReorderGroups(oldGroupIndex, newGroupIndex);
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

      // 如果没有选中分组或当前分组不存在，默认选中“全部”标签
      if (
        !activeGroupId.value ||
        (activeGroupId.value !== ALL_GROUP_TAB_ID &&
          !groups.value.find((g) => String(g.id) === activeGroupId.value))
      ) {
        activeGroupId.value = ALL_GROUP_TAB_ID;
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
          // 如果删除的是当前分组，切换到第一个分组
          if (String(groupId) === activeGroupId.value) {
            const remainingGroups = groups.value.filter(
              (g) => g.id !== groupId
            );
            if (remainingGroups.length > 0) {
              activeGroupId.value = ALL_GROUP_TAB_ID;
            } else {
              activeGroupId.value = ALL_GROUP_TAB_ID;
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
        const detail = error?.response?.data?.detail;
        const blockedPayload = detail?.payload;
        const monitorConfigs = blockedPayload?.monitor_configs || [];
        if (blockedPayload?.group_id && monitorConfigs.length > 0) {
          const messageHtml = `
            <div style="line-height:1.8;">
              <div>分组“${blockedPayload.group_name || group.name}”已被以下监控配置引用，无法删除：</div>
              <ul style="margin:8px 0 0 18px;padding:0;">
                ${monitorConfigs
                  .map(
                    (item) =>
                      `<li>${item.config_name || '--'}（${item.is_enabled ? '启用中' : '已停用'}）</li>`
                  )
                  .join('')}
              </ul>
            </div>
          `;
          await ElMessageBox.alert(messageHtml, '分组删除受限', {
            dangerouslyUseHTMLString: true,
            confirmButtonText: '知道了',
            type: 'warning',
          });
        } else {
          ElMessage.error(
            detail?.message ||
              error?.response?.data?.message ||
              '删除分组失败，请稍后重试'
          );
        }
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

// 获取股票列表（不走缓存）
const getStockList = async (additionalSearchParams = {}) => {
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

  tableLoading.value = true;

  try {
    const response =
      activeGroupId.value === ALL_GROUP_TAB_ID
        ? await getGroupStocksByGroups([], params)
        : await getGroupStocks(Number(activeGroupId.value), params);
    if (response?.success) {
      const rows = (response.payload?.items || []).map(flattenGroupStockData);
      stockList.value = rows;
      page.total = response.payload?.total || 0;
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
      await getStockList();
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
          await getStockList();
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
  if (
    activeGroupId.value &&
    activeGroupId.value !== 'add' &&
    activeGroupId.value !== ALL_GROUP_TAB_ID
  ) {
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
      await getStockList();
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
          : activeGroupId.value &&
              activeGroupId.value !== 'add' &&
              activeGroupId.value !== ALL_GROUP_TAB_ID
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
      await getStockList();
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

.groups-tabs-row {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 8px;
}

/* 占满除「新建」外的横向空间，约束宽度后 EP 才能出现 is-scrollable 与左右箭头 */
.groups-tabs-wrapper {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  max-width: calc(100% - 40px);
}

.groups-tabs {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
    width: 100%;
    min-width: 0;
  }

  :deep(.el-tabs__nav-wrap) {
    max-width: 100%;
  }

  :deep(.el-tabs__item) {
    padding: 0 16px;
    max-width: 220px;
    height: 40px;
    line-height: 40px;
    box-sizing: border-box;
    overflow: hidden;
  }

  :deep(.is-disabled) {
    cursor: default;
  }
}

/* 供 #label 插槽内省略，悬停由 el-tooltip 展示全称 */
.group-tab-label {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
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
  align-self: center;

  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }
}
</style>
