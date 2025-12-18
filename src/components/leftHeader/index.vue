<template>
  <aside class="left-sider" :class="{ collapsed: isCollapsed }" :style="siderInlineStyle">
    <div class="menu-header">
      <!-- <img class="logo-img" src="/logo.webp" /> -->
      <div :class="['logo-text']">FFC</div>
    </div>
    <div class="menu-scroll" @mouseleave="onMouseLeaveAll">
      <ul class="menu-list">
        <li v-for="(item, pIndex) in menus" :key="item.name" class="menu-item" :class="{ open: isOpen(pIndex) }"
          @mouseenter="onMouseEnterTop(item, pIndex, $event)">
          <div :class="['menu-item-header', isCollapsed ? 'collapsed-header' : '']"
            :data-guide="item.dataGuide || null"
            @click="onToggleOpen(item, pIndex)">
            <span class="icon-wrap">
              <component v-if="getElIcon(item.icon)" :is="getElIcon(item.icon)" class="el-svg-icon" />
              <i v-else-if="isCssIcon(item.icon)" :class="['menu-custom-icon', item.icon]" />
            </span>
            <div class="menu-title-wrap">
              <span class="menu-title" :title="item.name">{{ isCollapsed ? item.foldName : item.name }}</span>
              <!-- 通用的菜单数字提示红点 -->
              <span v-if="shouldShowBadge(item)" class="menu-badge">
                {{ getBadgeText(item) }}
              </span>
            </div>

            <span class="arrow" v-if="item.children && item.children.length && !isCollapsed"><el-icon>
                <ArrowDown v-if="isOpen(pIndex)" />
                <ArrowRight v-else />
              </el-icon></span>
          </div>

          <!-- 展开态：内联二级菜单（两列网格，后续仅调 grid 样式即可扩展） -->
          <transition name="slide">
            <div v-show="!isCollapsed && isOpen(pIndex)" class="submenu-inline">
              <ul class="submenu-flex">
                <li v-for="(sub, cIndex) in item.children" :key="sub.name" class="submenu-item">
                  <span class="submenu-link"
                    :class="{ active: isActive(sub) }"
                    :data-guide="sub.dataGuide || null"
                    @click="onClickItem(sub)"
                    :title="sub.name">{{ sub.name }}</span>
                </li>
              </ul>
            </div>
          </transition>
        </li>
      </ul>
    </div>

    <div class="collapse-trigger" @click="toggleCollapse">
      <el-icon>
        <component :is="isCollapsed ? Expand : Fold" />
      </el-icon>
    </div>

    <!-- 收起态：悬浮二级菜单浮层（两列网格） -->
    <div v-if="isCollapsed && popup.visible" class="submenu-popup shadow" :style="popup.style"
      @mouseenter="popup.inside = true" @mouseleave="hidePopup">
      <ul class="submenu-flex">
        <li v-for="(sub, idx) in popup.items" :key="idx" class="submenu-item">
          <span class="submenu-link"
            :class="{ active: isActive(sub) }"
            :data-guide="sub.dataGuide || null"
            @click="onClickItem(sub)"
            :title="sub.name">{{ sub.name }}</span>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup>
import { computed, defineEmits, defineProps, reactive, onMounted, ref, onUnmounted, inject, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { menuList } from './config';
import * as Icons from '@element-plus/icons-vue';
import { Expand, Fold, ArrowDown, ArrowRight } from '@element-plus/icons-vue';
import { useTabsStore } from '@/composables/useTabsStore';
import { UserStore } from '@/state/user';
import { usePermissions } from '@/composables/usePermissions';
import { watchGlobalInitState, getGlobalInitState } from '@/utils/permission-guard';
import { useGuide } from '@/composables/useGuide';
// 注入 badge 刷新功能
const badgeRefresh = inject('badgeRefresh', null);

const props = defineProps({
  collapsed: { type: Boolean, default: false },
  topOffset: { type: Number, default: 0 },
});
const emit = defineEmits(['update:collapsed']);

const route = useRoute();
const router = useRouter();
const { addTab } = useTabsStore();
const userStore = UserStore();
const { checkMenuPermission, initPermissions, hasPermission } = usePermissions();
const { shouldShowGuide, startGuide } = useGuide();


// 通用的badge数据存储，键为菜单路径，值为数字
const badgeData = reactive({});
const activePath = computed(() => route.path || '/');
const isCollapsed = computed(() => props.collapsed);
const siderInlineStyle = computed(() => ({ top: `${props.topOffset}px` }));

// 暴露给父组件使用的刷新方法
const refreshBadgeData = async () => {
  console.log('开始刷新 badge 数据...');
  await loadBadgeData();
  console.log('badge 数据刷新完成');
};

// 暴露方法给父组件
defineExpose({
  refreshBadgeData
});

// API方法映射表，根据配置中的apiMethod名称调用对应的API
const apiMethods = {
  // getPriceCount: priceApi.getPriceCount,
  // 可以在这里添加更多API方法映射
  // getMonitorCount: monitorApi.getMonitorCount,
};

/**
 * 通用的badge数据加载函数
 * 遍历所有菜单，为有badge配置的菜单项加载对应的数据
 * @param {Array|string} targetApiMethods - 可选参数，指定要更新的API方法名称。
 *                                         - 如果为空，则更新所有badge
 *                                         - 如果为字符串，则只更新该API方法对应的badge
 *                                         - 如果为数组，则只更新数组中指定的API方法对应的badge
 */
const loadBadgeData = async (targetApiMethods = null) => {
  // 标准化 targetApiMethods 为数组形式
  let targetMethods = null;
  if (targetApiMethods) {
    targetMethods = Array.isArray(targetApiMethods) ? targetApiMethods : [targetApiMethods];
    console.log('选择性更新 badge，目标方法:', targetMethods);
  } else {
    console.log('更新所有 badge 数据');
  }

  const loadBadgeForMenu = async (menu) => {
    // 检查菜单是否有badge配置且已启用
    if (menu.badge?.enabled && menu.badge.apiMethod) {
      // 如果指定了目标方法，检查当前菜单的API方法是否在目标列表中
      if (targetMethods && !targetMethods.includes(menu.badge.apiMethod)) {
        console.log(`跳过 ${menu.badge.apiMethod}，不在更新目标中`);
        return; // 跳过此菜单项
      }

      const apiMethod = apiMethods[menu.badge.apiMethod];
      if (apiMethod && typeof apiMethod === 'function') {
        try {
          console.log(`开始调用 ${menu.badge.apiMethod} 接口...`);
          const res = await apiMethod();
          console.log(`${menu.badge.apiMethod} 接口响应:`, res);

          if (res && res.success) {
            console.log(`接口调用成功，${menu.name} badge值:`, res.result);
            badgeData[menu.path] = res.result;
          } else {
            console.log(`接口调用失败或无数据:`, res);
            badgeData[menu.path] = 0;
          }
        } catch (err) {
          console.log(`${menu.badge.apiMethod} 接口调用出错:`, err);
          badgeData[menu.path] = 0;
        }
      } else {
        console.warn(`API方法 ${menu.badge.apiMethod} 未找到或不是函数`);
      }
    }

    // 递归处理子菜单
    if (menu.children && Array.isArray(menu.children)) {
      for (const child of menu.children) {
        await loadBadgeForMenu(child);
      }
    }
  };

  // 遍历所有菜单项
  for (const menu of menuList) {
    await loadBadgeForMenu(menu);
  }
};

let unwatchBadgeRefresh = null;

onMounted(async () => {
  console.log('leftHeader组件挂载，等待全局初始化完成...');

  // 监听全局初始化状态变化
  const unwatchGlobalInit = watchGlobalInitState((initState) => {
    console.log('leftHeader：收到全局初始化状态变化:', initState);

    if (initState.isInitialized) {
      console.log('leftHeader：全局初始化完成，开始执行组件逻辑...');
      executeComponentLogic();
    } else if (initState.error) {
      console.error('leftHeader：全局初始化失败:', initState.error);
    }
  });

  // 如果已经初始化完成，立即执行组件逻辑
  const currentState = getGlobalInitState();
  if (currentState.isInitialized) {
    console.log('leftHeader：全局初始化已完成，立即执行组件逻辑...');
    executeComponentLogic();
  }

  // 组件卸载时清理监听
  onUnmounted(() => {
    unwatchGlobalInit();
  });
});

/**
 * 执行组件特有的逻辑
 */
async function executeComponentLogic() {
  try {
    // 等待权限系统初始化完成
    // await initPermissions();

    // 如果有调价管理权限，加载badge数据
    if (hasPermission(['adv:priceManagement'])) {
      console.log('leftHeader：开始加载badge数据...');
      setTimeout(() => {
        loadBadgeData();
      }, 2000);

      // 监听 badge 刷新事件
      if (badgeRefresh?.refreshBadge) {
        unwatchBadgeRefresh = watch(badgeRefresh.refreshBadge, (newVal) => {
          console.log('检测到 badge 刷新触发，开始刷新数据...');
          // newVal.targetMethods 包含要更新的目标方法
          const targetMethods = newVal?.targetMethods || null;
          setTimeout(() => {
            loadBadgeData(targetMethods);
          }, 2000);
        });
      }
    }

    // 启动引导功能（在菜单 DOM 完全渲染后）
    // await nextTick();
    // 等待一小段时间确保菜单完全渲染
    // setTimeout(() => {
    //   if (shouldShowGuide()) {
    //     console.log('leftHeader：开始启动引导...');
    //     startGuide().catch(err => {
    //       console.error('[引导] 引导启动失败:', err);
    //     });
    //   } else {
    //     console.log('[引导] 跳过引导启动（已完成或无权限）');
    //   }
    // }, 500);

    console.log('leftHeader：组件逻辑执行完成');
  } catch (error) {
    console.error('leftHeader：组件逻辑执行失败:', error);
  }
}

onUnmounted(() => {
  // 清理 watch 监听
  if (unwatchBadgeRefresh) {
    unwatchBadgeRefresh();
    unwatchBadgeRefresh = null;
  }
});

/**
 * 检查用户是否有访问权限
 * @param {Object} menu - 菜单项
 * @returns {boolean} - 是否有权限
 */
const hasMenuPermission = (menu) => {
  // 使用统一的权限检查逻辑
  return checkMenuPermission(menu);
};

/**
 * 过滤菜单列表，根据用户权限显示可访问的菜单
 */
const menus = computed(() => {
  return menuList
    .filter(menu => {
      // 检查父菜单权限
      if (!hasMenuPermission(menu)) {
        return false;
      }

      // 如果有子菜单，检查是否至少有一个子菜单有权限访问
      if (menu.children?.length > 0) {
        const accessibleChildren = menu.children
          .filter(child => hasMenuPermission(child));
        // 只有当至少有一个子菜单可访问时，才显示父菜单
        return accessibleChildren.length > 0;
      }

      return true;
    })
    .map(menu => {
      // 如果有子菜单，过滤掉没有权限的子菜单
      if (menu.children?.length > 0) {
        return {
          ...menu,
          children: menu.children
            .filter(child => hasMenuPermission(child))
        };
      }

      return menu;
    });
});

// 打开集合（独立展开，可多开）
const openSet = reactive(new Set());
const isOpen = (pIndex) => openSet.has(pIndex);
function onToggleOpen(item, pIndex) {
  if (!(item.children && item.children.length)) {
    onClickItem(item);
    return;
  }
  if (openSet.has(pIndex)) openSet.delete(pIndex);
  else openSet.add(pIndex);
}

function onClickItem(item) {
  const path = (item.path || '').trim();
  if (path && path !== '/') {
    // 添加标签页
    addTab(path, item.name);
    // 跳转路由
    router.push(path);
  }
}

// 收起态悬浮弹层控制
const popup = reactive({ visible: false, style: {}, items: [], inside: false });
function onMouseEnterTop(item, pIndex, evt) {
  if (!isCollapsed.value) return;
  if (!(item.children && item.children.length)) {
    hidePopup();
    return;
  }
  const rect = evt.currentTarget.getBoundingClientRect();
  const left = rect.right + 4;
  // 获取过滤后的子菜单项
  const filteredChildren = item.children?.filter(child => hasMenuPermission(child)) || [];
  const estimatedHeight = Math.min(360, filteredChildren.length * 40);
  const top = Math.min(Math.max(8, rect.top), window.innerHeight - 8 - estimatedHeight);
  popup.items = filteredChildren;
  popup.style = { left: `${left}px`, top: `${top}px`, maxHeight: '70vh' };
  popup.visible = true;
}
function onMouseLeaveAll() {
  if (!isCollapsed.value) return;
  setTimeout(() => {
    if (!popup.inside) popup.visible = false;
    popup.inside = false;
  }, 100);
}
function hidePopup() {
  popup.visible = false;
  popup.inside = false;
}

// 动态解析 element-plus 图标：传入图标组件名字符串，例如 'HomeFilled'
function getElIcon(iconName) {
  if (!iconName) return null;
  return Icons[iconName] || null;
}
// 兼容自定义字体图标类名（例如 'icon-xxx'、'fa-xxx'）
function isCssIcon(iconName) {
  return !!iconName && typeof iconName === 'string' && /^(icon-|el-icon-|fa |fa-)/.test(iconName);
}

function isActive(menu) {
  const path = (menu.path || '').trim();
  return !!path && path === activePath.value;
}

/**
 * 判断是否应该显示badge
 * @param {Object} menu - 菜单项
 * @returns {boolean} - 是否显示badge
 */
function shouldShowBadge(menu) {
  const path = (menu.path || '').trim();
  return menu.badge?.enabled &&
         badgeData[path] !== undefined &&
         badgeData[path] > 0;
}

/**
 * 获取badge显示文本
 * @param {Object} menu - 菜单项
 * @returns {string} - badge文本
 */
function getBadgeText(menu) {
  const path = (menu.path || '').trim();
  const count = badgeData[path] || 0;
  const maxCount = menu.badge?.maxCount || 99;

  return count > maxCount ? `${maxCount}+` : String(count);
}

function toggleCollapse() {
  emit('update:collapsed', !props.collapsed);
}
</script>

<style scoped lang="less">
.left-sider {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 256px;
  background: #fff;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  z-index: 100;

  &.collapsed {
    width: 80px;
  }
}

.menu-header {
  height: 56px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: center;

  .logo-img {
    width: 30px;
  }

  .logo-text {
    font-size: 20px;
    font-weight: 500;
    color: #2055a6;
    margin-left: 10px;
    transition: display 0.2s ease;
  }

  .collapsed-logo-text {
    display: none;
  }
}

.menu-scroll {
  flex: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
  // padding-inline-end: 4px;
  padding-left: 8px;

  /* Webkit 浏览器（Chrome、Edge、Safari） */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  /* 添加滚动条过渡效果 */
  transition: scrollbar-color 0.3s ease;
}

.menu-scroll:hover {
  scrollbar-color: rgba(0, 0, 0, 0.3) #fff;
}

/* Webkit 浏览器滚动条样式 */
.menu-scroll::-webkit-scrollbar {
  width: 6px;
}

.menu-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.menu-scroll::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
  transition: background-color 0.3s ease;
}

.menu-scroll:hover::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
}

.menu-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.menu-list {
  list-style: none;
  margin: 0;
  padding: 8px 0;
}

.menu-item {
  position: relative;
  border-bottom: 1px solid #f5f5f5;
}

.menu-item-header {
  position: relative;  /* 为红色圆点提供相对定位基准 */
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 5px;
  gap: 10px;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.8);
  font-size: 14px;
  font-weight: 500;
}

.collapsed-header {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 10px 0;
  gap: 2px;
}

.menu-item-header:hover {
  color: #409eff;
  background: transparent;

  .arrow {
    color: #409eff;
  }
}

.menu-item-header:hover .menu-title {
  color: #409eff;
}

.menu-item-header:hover .el-svg-icon,
.menu-item-header:hover .menu-custom-icon {
  color: #409eff;
  fill: #409eff;
}

.menu-item.open>.menu-item-header {
  color: rgba(0, 0, 0, 0.8);
  background: transparent;
}

.menu-title-wrap {
  display: flex;
}

.menu-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.submenu-inline {
  padding: 10px 5px;
}

.submenu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 5px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.submenu-flex {
  display: flex;
  flex-wrap: wrap;
  padding: 0px;
  gap: 10px 0px;
  list-style: none;
}

.submenu-popup {
  .submenu-flex {
    padding: 5px;
    margin: 5px;
  }
}

.submenu-item {
  overflow: hidden;
  margin-right: 4px;
  width: calc(50% - 4px);
}

.submenu-link {
  display: block;
  padding: 3px 2px;
  border-radius: 0;
  color: rgba(0, 0, 0, 0.8);
  cursor: pointer;
  font-size: 12px;
  text-align: left;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.submenu-link:hover,
.submenu-link.active {
  color: #409eff;
  background: transparent;
}

/* 浮层阴影增强可见性 */
.shadow {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  border: 1px solid #ebeef5;
}

.collapse-trigger {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #ebeef5;
  cursor: pointer;
  color: #409eff;
  position: sticky;
  bottom: 0;
  background: #fff;
}

/* 自定义图标占位（按配置出现） */
.menu-custom-icon {
  margin-right: 8px;
  font-size: 16px;
}

.el-svg-icon {
  font-size: 18px;
  color: rgba(0, 0, 0, 0.8);
}

.arrow {
  color: rgba(0, 0, 0, 0.8);
  font-size: 14px;
  margin-left: auto;
}

/* 通用的菜单数字提示红点 */
.menu-badge {
  position: relative;
  top: -5px;
  right: -5px;
  background: #f56c6c;
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: bold;
  line-height: 1;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  z-index: 10;
}

/* 悬浮弹层样式 */
.submenu-popup {
  position: fixed;
  min-width: 220px;
  background: #fff;
  padding: 5px;
  border-radius: 4px;
  z-index: 1000;
}

/* 折叠样式优化 */
.left-sider.collapsed .arrow {
  display: none;
}

// .left-sider.collapsed .menu-title { display: none; }
.icon-wrap {
  width: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.8);
  font-weight: 500;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

/* 过渡 */
.slide-enter-active,
.slide-leave-active {
  transition: all .2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
