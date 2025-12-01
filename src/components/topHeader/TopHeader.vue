<template>
  <header class="top-header" :style="topInlineStyle">
    <!-- 标签页区域 -->
    <div class="tabs-container" ref="tabsContainerRef">
      <div class="tabs-wrapper" ref="tabsWrapperRef">
        <div
          v-for="(tab, index) in visibleTabs"
          :key="tab.key"
          :class="['tab-item', {
            active: tab.key === activeTabKey,
            'drag-over': dragOverIndex === index,
            'draggable': tab.key !== '/home'
          }]"
          :draggable="tab.key !== '/home'"
          :title="tab.title"
          @click="switchTab(tab.key)"
          @dragstart="handleDragStart($event, index)"
          @dragend="handleDragEnd"
          @dragover="handleDragOver($event, index)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, index)"
        >
          <span class="tab-title">{{ tab.title }}</span>
          <el-icon
            v-if="tab.closable"
            class="tab-close"
            @click.stop="closeTab(tab.key)"
          >
            <Close />
          </el-icon>
        </div>
      </div>
      <!-- 添加按钮 -->
      <div class="add-tab-btn" @click="toggleAddPopover">
        <el-icon><Plus /></el-icon>
      </div>

      <!-- 溢出更多（使用 Element Plus 下拉） -->
      <div v-if="hasOverflow" class="more-container">
        <el-dropdown trigger="hover" :teleported="false">
          <span class="more-icon">
            <el-icon><MoreFilled /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="item in overflowTabs" :key="item.key">
                <div class="more-item" @click.stop="handleMoreItemClick(item)" :title="item.title">
                  <span class="more-title">{{ item.title }}</span>
                  <el-icon v-if="item.closable" class="more-close" @click.stop="closeTab(item.key)"><Close /></el-icon>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 右侧操作区 -->
    <div class="actions">
      <div class="subject-item">
        {{ userStore.userInfo?.subject }}
      </div>
      <!-- 帮助中心按钮 -->
      <div @click="openHelp" class="help-btn" title="帮助中心">
        <el-icon><QuestionFilled /></el-icon>
        帮助中心
      </div>
      <!-- 用户信息下拉菜单 -->
      <el-dropdown trigger="hover" :teleported="false" v-if="displayName">
        <div class="user-info">
          <el-avatar :size="32" class="user-avatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="user-details">
            <div class="user-name">{{ displayName }}</div>
            <div class="user-role" v-if="userRole">{{ userRole }}</div>
          </div>
          <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="jumpToTemu('seller')">
              <el-icon><ShoppingBag /></el-icon>
              TEMU后台
            </el-dropdown-item>
            <el-dropdown-item @click="jumpToTemu('agent')">
              <el-icon><ShoppingBag /></el-icon>
              TEMU新后台
            </el-dropdown-item>
            <el-dropdown-item @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <slot />
    </div>

    <!-- 添加页面弹窗 -->
    <div
      v-if="showAddPopover"
      class="add-popover"
      :style="popoverStyle"
      @click.stop
    >
      <!-- 搜索区域 -->
      <div class="search-section">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索功能菜单"
          size="small"
          clearable
          @input="onSearchInput"
          @focus="showSearchDropdown = true"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <!-- 搜索下拉框 -->
        <div v-if="showSearchDropdown" class="search-dropdown">
          <div class="dropdown-section" v-if="authorizedRecentMenus.length && !searchKeyword">
            <div class="section-title">最近使用</div>
            <div
              v-for="item in authorizedRecentMenus"
              :key="item.path"
              class="dropdown-item"
              @click="openMenu(item)"
            >
              <!-- <component v-if="getElIcon(item.icon)" :is="getElIcon(item.icon)" class="item-icon" /> -->
              <span>{{ item.name }}</span>
            </div>
          </div>

          <div v-if="filteredMenus.length" class="dropdown-section">
            <div class="section-title">搜索结果</div>
            <div
              v-for="item in filteredMenus"
              :key="item.path"
              class="dropdown-item"
              @click="openMenu(item)"
            >
              <!-- <component v-if="getElIcon(item.icon)" :is="getElIcon(item.icon)" class="item-icon" /> -->
              <span>{{ item.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 常用功能区域 -->
      <!-- <div class="common-section">
        <div class="section-title">常用功能</div>
        <div class="common-grid">
          <div
            v-for="item in commonMenus"
            :key="item.path"
            class="common-item"
            @click="openMenu(item)"
          >
            <component :is="StarFilled" class="common-icon" />
            <span class="common-name">{{ item.name }}</span>
          </div>
        </div>
      </div> -->
    </div>

    <!-- 遮罩层 -->
    <div
      v-if="showAddPopover"
      class="popover-mask"
      @click="toggleAddPopover"
    ></div>
  </header>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Close, Plus, Search, MoreFilled, User, ArrowDown, SwitchButton, ShoppingBag, StarFilled, QuestionFilled } from '@element-plus/icons-vue';
import { menuList } from '@/components/leftHeader/config';
import * as Icons from '@element-plus/icons-vue';
import { useTabsStore } from '@/composables/useTabsStore';
import { UserStore } from '@/state/user';
import { removeToken } from '@/utils/auth';
import { usePermissions } from '@/composables/usePermissions';

const props = defineProps({
  leftOffset: { type: Number, default: 80 },
});

const route = useRoute();
const router = useRouter();
const { tabs, activeTabKey, addTab, switchTab, closeTab, reorderTabs } = useTabsStore();
const userStore = UserStore();
const { checkMenuPermission } = usePermissions();

const topInlineStyle = computed(() => ({
  left: `${props.leftOffset}px`,
}));

// 弹窗控制
const showAddPopover = ref(false);
const popoverStyle = ref({});
const tabsWrapperRef = ref(null);
const tabsContainerRef = ref(null);
const hasOverflow = ref(false);
const visibleTabs = ref([]);
const overflowTabs = ref([]);

// 固定标签宽度（与样式保持一致）。如果 UI 调整了宽度，这里也要同步。
const TAB_FIXED_WIDTH = 140; // px
const TAB_MARGIN_RIGHT = 4; // 与 .tab-item margin-right 对应
const TAB_TOTAL_WIDTH = TAB_FIXED_WIDTH + TAB_MARGIN_RIGHT; // 每个标签占用总宽度
const ADD_BTN_WIDTH = 32;
const ADD_BTN_MARGIN_LEFT = 8;
const MORE_BTN_WIDTH = 32;
const MORE_BTN_MARGIN_LEFT = 8;

// 搜索相关
const searchKeyword = ref('');
const showSearchDropdown = ref(false);
const recentMenus = ref([]);
const filteredMenus = ref([]);

// 拖拽相关
const dragOverIndex = ref(-1);
const dragStartIndex = ref(-1);

// 获取所有菜单项（包括子菜单），并按权限过滤
const allMenus = computed(() => {
  const menus = [];

  function flattenMenus(menuItems) {
    menuItems.forEach(item => {
      // 仅加入有路径且通过权限校验的菜单项
      if (item.path && item.path !== '/' && checkMenuPermission(item)) {
        menus.push({
          name: item.name,
          path: item.path,
          icon: item.icon
        });
      }
      if (item.children) {
        flattenMenus(item.children);
      }
    });
  }

  flattenMenus(menuList);
  return menus;
});

// 常用功能（取前8个有路径的菜单项）
const commonMenus = computed(() => {
  return allMenus.value.slice(0, 8);
});

// 根据 path 在原始菜单定义中查找菜单项（用于校验权限）
function findMenuDefByPathFromConfig(path) {
  let found = null;
  function dfs(items) {
    for (const it of items) {
      if (it.path === path) {
        found = it;
        return;
      }
      if (it.children) dfs(it.children);
      if (found) return;
    }
  }
  dfs(menuList);
  return found;
}

// 仅展示有权限的最近使用
const authorizedRecentMenus = computed(() => {
  return recentMenus.value.filter(item => {
    const def = findMenuDefByPathFromConfig(item?.path);
    return def ? checkMenuPermission(def) : false;
  });
});

// 展示当前登录用户：注册用户名或 cookie 方式的用户手机尾号
const displayName = computed(() => {
  const info = userStore?.userInfo || {};
  const name = info.nickName || '';
  const phone = info.maskOwnerMobile;
  // 优先显示注册/账号登录的用户名
  if (name) return name;
  // 否则尝试从手机号展示尾号
  return `尾号${phone}`;
});

// 获取用户角色信息
const userRole = computed(() => {
  const info = userStore?.userInfo || {};
  // 根据用户信息判断角色
  if (info.isMaster) return '超级管理员';
  if (info.isWarehouseManager) return '仓库管理员';
  if (info.isShopOperator) return '店铺运营';
  // 如果有角色信息，显示角色名称
  if (userStore?.userInfo?.role?.displayName) return userStore.userInfo.role.displayName;
  return '用户';
});

// 退出登录处理
const handleLogout = () => {
  // 清空用户数据
  userStore.clearUserData();
  removeToken();
  // 清空本地存储
  localStorage.clear();
  // 跳转到登录页
  router.push('/login');
};

// 跳转temu seller
function jumpToTemu(type) {
  if (type === 'agent') {
    window.open(`https://agentseller.temu.com/`, '_blank');
  } else {
    window.open(`https://seller.kuajingmaihuo.com/`, '_blank');
  }
}

// 打开帮助中心
function openHelp() {
  // 开发环境：打开 VitePress 开发服务器（5174端口）
  // 生产环境：打开同域 /help 路径
  const helpUrl = import.meta.env.DEV
    ? 'http://localhost:5174/help/'
    : '/help/';
  window.open(helpUrl, '_blank');
}

// 智能添加标签：确保在出现 more 时，新标签不会被直接挤进 more
function addTabSmart(path, title) {
  const wasActiveKey = activeTabKey.value;
  const lastVisibleKey = visibleTabs.value?.[visibleTabs.value.length - 1]?.key;
  const isActiveAtBoundary = wasActiveKey && lastVisibleKey && wasActiveKey === lastVisibleKey;

  // 先按默认规则在当前激活标签后插入
  addTab(path, title);

  // 如果当前激活标签是边界，则把新标签移动到它前面，满足“若为 more 前最后一个，则新增到其前面”的规则
  if (isActiveAtBoundary) {
    const newIndex = tabs.value.findIndex(t => t.key === path);
    const boundaryIndex = tabs.value.findIndex(t => t.key === wasActiveKey);
    if (newIndex !== -1 && boundaryIndex !== -1 && newIndex > boundaryIndex) {
      reorderTabs(newIndex, Math.max(0, boundaryIndex));
    }
  }

  // 添加后确保选中标签始终在可见区
  nextTick(() => ensureActiveVisible());
}

// 监听路由变化，自动添加标签页
watch(() => route.path, (newPath) => {
  if (newPath && newPath !== '/') {
    // 从菜单配置中找到对应的菜单项
    const menuItem = findMenuByPath(newPath);
    const title = menuItem ? menuItem.name : newPath.replace('/', '');
    addTabSmart(newPath, title);
    // 更新最近使用
    updateRecentMenus(menuItem);
  }
}, { immediate: true });

// 计算溢出标签（当标签总宽度超出可视宽度时，统计剩余的标签）
function updateOverflowTabs() {
  const container = tabsContainerRef.value;
  if (!container) {
    hasOverflow.value = false;
    visibleTabs.value = tabs.value;
    overflowTabs.value = [];
    return;
  }

  // 第一次假设没有更多按钮，仅保留添加按钮空间
  const containerWidth = container.clientWidth || 0;
  const reservedAdd = ADD_BTN_WIDTH + ADD_BTN_MARGIN_LEFT;
  const availableNoMore = Math.max(0, containerWidth - reservedAdd);
  const capNoMore = Math.max(0, Math.floor((availableNoMore + TAB_MARGIN_RIGHT) / TAB_TOTAL_WIDTH));

  if (tabs.value.length > capNoMore) {
    // 若溢出，则为更多按钮预留空间并重新计算
    const reservedMore = MORE_BTN_WIDTH + MORE_BTN_MARGIN_LEFT;
    const availableWithMore = Math.max(0, availableNoMore - reservedMore);
    const capWithMore = Math.max(0, Math.floor((availableWithMore + TAB_MARGIN_RIGHT) / TAB_TOTAL_WIDTH));
    visibleTabs.value = tabs.value.slice(0, capWithMore);
    overflowTabs.value = tabs.value.slice(capWithMore);
    hasOverflow.value = overflowTabs.value.length > 0;
  } else {
    visibleTabs.value = tabs.value.slice(0, capNoMore);
    overflowTabs.value = tabs.value.slice(capNoMore);
    hasOverflow.value = false;
  }

  // 若发生溢出，尝试把当前选中标签保持在可见区
  nextTick(() => ensureActiveVisible());
}

// 监听依赖变化与窗口尺寸变化
watch([tabs, activeTabKey], () => nextTick(updateOverflowTabs), { deep: true });
watch(() => props.leftOffset, () => nextTick(updateOverflowTabs));
onMounted(() => {
  updateOverflowTabs();
  window.addEventListener('resize', updateOverflowTabs);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateOverflowTabs);
});

// 查找菜单项
function findMenuByPath(path) {
  return allMenus.value.find(item => item.path === path);
}

// 切换添加弹窗
function toggleAddPopover() {
  showAddPopover.value = !showAddPopover.value;
  showSearchDropdown.value = false;

  if (showAddPopover.value) {
    nextTick(() => {
      calculatePopoverPosition();
    });
  }
}

// 计算弹窗位置
function calculatePopoverPosition() {
  const addBtn = document.querySelector('.add-tab-btn');
  if (addBtn) {
    const rect = addBtn.getBoundingClientRect();
    const popoverWidth = 320; // 弹窗宽度
    const left = rect.left + (rect.width / 2) - (popoverWidth / 2); // 居中对齐

    popoverStyle.value = {
      top: `${rect.bottom + 8}px`,
      left: `${Math.max(16, left)}px`, // 确保不超出左边界
    };
  }
}

// 搜索输入处理
function onSearchInput() {
  if (!searchKeyword.value.trim()) {
    filteredMenus.value = [];
    return;
  }

  filteredMenus.value = allMenus.value.filter(item => {
    const def = findMenuDefByPathFromConfig(item.path);
    // 先检查权限再进行搜索
    return def ? checkMenuPermission(def) && item.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) : false;
  }).slice(0, 10);
}

// 打开菜单
function openMenu(menuItem) {
  if (menuItem && menuItem.path) {
    // 兜底权限校验，防止无权限路径被打开
    const def = findMenuDefByPathFromConfig(menuItem.path);
    if (def && !checkMenuPermission(def)) return;
    addTabSmart(menuItem.path, menuItem.name);
    router.push(menuItem.path);
    updateRecentMenus(menuItem);
    showAddPopover.value = false;
    showSearchDropdown.value = false;
    searchKeyword.value = '';
  }
}

// 更新最近使用
function updateRecentMenus(menuItem) {
  if (!menuItem) return;

  // 移除已存在的项
  recentMenus.value = recentMenus.value.filter(item => item.path !== menuItem.path);
  // 只有子菜单或者没有子菜单的菜单才添加到最近使用
  if (!menuItem.children || menuItem.children.length === 0) {
    recentMenus.value.unshift(menuItem);
  }
  // 保持最多5个
  recentMenus.value = recentMenus.value.slice(0, 5);

  // 持久化到本地存储
  localStorage.setItem('recentMenus', JSON.stringify(recentMenus.value));
}

// 获取图标组件
function getElIcon(iconName) {
  if (!iconName) return null;
  return Icons[iconName] || null;
}

// 拖拽事件处理
function handleDragStart(event, index) {
  // 首页标签页不允许拖拽
  if (tabs.value[index].key === '/home') {
    event.preventDefault();
    return;
  }

  dragStartIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/html', event.target.outerHTML);

  // 添加拖拽样式
  event.target.style.opacity = '0.5';
}

function handleDragEnd(event) {
  event.target.style.opacity = '';
  dragStartIndex.value = -1;
  dragOverIndex.value = -1;
}

function handleDragOver(event, index) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';

  // 首页标签页不能作为放置目标
  if (tabs.value[index].key === '/home') {
    return;
  }

  dragOverIndex.value = index;
}

function handleDragLeave() {
  dragOverIndex.value = -1;
}

function handleDrop(event, toIndex) {
  event.preventDefault();

  const fromIndex = dragStartIndex.value;

  // 首页标签页不允许参与拖拽排序
  if (fromIndex === -1 ||
      tabs.value[fromIndex].key === '/home' ||
      tabs.value[toIndex].key === '/home') {
    return;
  }

  // 执行重排序
  reorderTabs(fromIndex, toIndex);

  // 重置状态
  dragStartIndex.value = -1;
  dragOverIndex.value = -1;
}

// 将 more 中的标签移动到可见区（边界前）并切换
function handleMoreItemClick(item) {
  const boundaryKey = visibleTabs.value?.[visibleTabs.value.length - 1]?.key;
  const fromIndex = tabs.value.findIndex(t => t.key === item.key);
  const toIndex = boundaryKey ? tabs.value.findIndex(t => t.key === boundaryKey) : -1;
  if (fromIndex !== -1 && toIndex !== -1) {
    // 插入到边界标签前面
    reorderTabs(fromIndex, Math.max(0, toIndex));
  }
  switchTab(item.key);
}

// 确保当前激活标签在可见区，如果被分配到 more，则移动到边界前
function ensureActiveVisible() {
  if (!hasOverflow.value) return;
  const currentKey = activeTabKey.value;
  if (!currentKey) return;
  const isInOverflow = overflowTabs.value.some(t => t.key === currentKey);
  if (!isInOverflow) return;

  const boundaryKey = visibleTabs.value?.[visibleTabs.value.length - 1]?.key;
  const fromIndex = tabs.value.findIndex(t => t.key === currentKey);
  const toIndex = boundaryKey ? tabs.value.findIndex(t => t.key === boundaryKey) : -1;
  if (fromIndex !== -1 && toIndex !== -1) {
    reorderTabs(fromIndex, Math.max(0, toIndex));
  }
}



// 初始化最近使用
onMounted(async () => {
  const stored = localStorage.getItem('recentMenus');
  if (stored) {
    try {
      recentMenus.value = JSON.parse(stored);
    } catch (e) {
      recentMenus.value = [];
    }
  }
});
</script>

<style scoped lang="less">
.top-header {
  position: fixed;
  top: 0;
  transition: left 0.2s ease;
  right: 0;
  height: 56px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #ebeef5;
  z-index: 101;
}

.tabs-container {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  height: 100%;
  min-width: 0; // 允许子项在 flex 布局中收缩，从而触发滚动
  max-width: 70%; // 标签区域最多不超过 header 的 70%
}

.tabs-wrapper {
  display: flex;
  align-items: center;
  height: 100%;
  flex: 0 0 auto; // 仅占据可见标签宽度，保证添加按钮紧挨右侧标签
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden; // 固定宽度后不使用横向滚动，改由 More 承载溢出
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.tab-item {
  display: flex;
  align-items: center;
  height: 32px;
  box-sizing: border-box;
  width: 120px;
  padding: 0 8px;
  text-align: left;
  margin-right: 4px;
  background: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  transition: all 0.2s ease;
  user-select: none;

  &:first-child {
   width: 80px;
  }

  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }

  &.active {
    background: #409eff;
    color: #fff;
  }

  // 可拖拽的标签页样式
  &.draggable {
    cursor: move;

    &:active {
      cursor: grabbing;
    }
  }

  // 拖拽放置目标样式
  &.drag-over {
    border: 2px dashed #409eff;
    background: #ecf5ff;
    transform: scale(1.05);
  }

  // 不可拖拽的标签页（首页）
  &:not(.draggable) {
    cursor: pointer;
  }
}

.tab-title {
  flex: 1 1 auto;
  margin-right: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  font-size: 12px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  cursor: pointer;
  &:hover {
    opacity: 1;
  }
}

.add-tab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-left: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
  color: #909399;
  transition: all 0.2s ease;

  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }
}

.more-container {
  position: relative;
  margin-left: 8px;
}

.more-icon {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
  color: #909399;
  transition: all 0.2s ease;

  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }
}

/* 下拉菜单样式使用 Element Plus 默认样式，此处仅保留条目内布局样式 */

.more-item {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 120px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:hover {
    background: #f5f7fa;
    color: #409eff;
    cursor: pointer;
  }
  .more-title {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 10px;
  }
}

.actions {
  margin-left: 16px;
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;

  &:hover {
    background: #e9ecef;
    border-color: #409eff;
  }
}

.user-avatar {
  margin-right: 8px;
  background: #409eff;
  color: #fff;
}

.user-details {
  display: flex;
  flex-direction: column;
  margin-right: 8px;
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.user-role {
  font-size: 11px;
  color: #909399;
  line-height: 1.2;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.dropdown-arrow {
  font-size: 12px;
  color: #909399;
  transition: transform 0.2s ease;
}

.user-info:hover .dropdown-arrow {
  color: #409eff;
  transform: rotate(180deg);
}

.popover-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.add-popover {
  position: fixed;
  width: 320px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  border: 1px solid #ebeef5;
  z-index: 1000;
  padding: 16px;
}

.search-section {
  position: relative;
  margin-bottom: 16px;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-section {
  padding: 8px 0;

  &:not(:last-child) {
    border-bottom: 1px solid #f0f0f0;
  }
}

.section-title {
  font-size: 12px;
  color: #909399;
  padding: 4px 12px;
  font-weight: 500;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;

  &:hover {
    background: #f5f7fa;
    color: #409eff;
  }
}

.item-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  color: #909399;
}

.common-section {
  .section-title {
    margin-bottom: 12px;
  }
}

.common-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.common-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #f5f7fa;
    color: #409eff;
  }
}

.common-icon {
  width: 16px;
  height: 16px;
  margin-bottom: 6px;
  color: #f27a00;
}

.common-name {
  font-size: 12px;
  color: #606266;
  text-align: center;
  line-height: 1.2;
}

.common-item:hover .common-name {
  color: #409eff;
}

.subject-item {
  font-size: 16px;
  margin-right: 8px;
}

.help-btn {
  display: flex;
  align-items: center;
  font-size: 16px;
  cursor: pointer;
  border-radius: 16px;
  padding: 4px 8px;
  background: #ecf5ff;
  color: #409eff;
  .el-icon {
    margin-right: 4px;
  }
  &:hover {
    background: #d9ecff;
  }
}

</style>


