<!-- RouterPage.vue -->
<template>
  <div class="layout-root">
    <!-- 店铺信息快速链接 -->
    <!-- <div class="shop-list" v-if="userStore.mallList.length">
      <a :href="`https://seller.kuajingmaihuo.com/`" target="_blank">temu后台</a>
    </div> -->

    <template v-if="isBlankLayout">
      <div class="blank-content">
        <router-view />
      </div>
    </template>
    <template v-else>
      <LeftHeader v-model:collapsed="collapsed" :top-offset="0" />
      <main class="content" :style="contentInlineStyle">
        <TopHeader :left-offset="collapsed ? 80 : 256" />
        <div class="content-container">
          <router-view v-slot="{ Component, route }">
            <keep-alive :max="10">
              <component :is="Component" :key="route.path" />
            </keep-alive>
          </router-view>
        </div>
      </main>
    </template>
  </div>
</template>

<script setup>
import '@/css/common.less';
import LeftHeader from '@/components/leftHeader/index.vue';
import TopHeader from '@/components/topHeader/TopHeader.vue';
import { computed, ref, watch, provide, readonly, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Loading } from '@element-plus/icons-vue';
import { UserStore } from '@/state/user';

// 设置页面标题
if (window.location.hostname === 'localhost') {
  window.document.title = 'localhost-' + window.document.title;
}

const collapsed = ref(window.localStorage.getItem('shop-left-header-collapsed') === 'true' ? true : false);

const userStore = UserStore();

// 新增权限就绪状态检查
const isPermissionsReady = computed(() => {
  return userStore.permissions?.length > 0;
});

// 提供 badge 刷新功能给子组件
const refreshBadge = ref({ counter: 0, targetMethods: null });

/**
 * 触发 badge 刷新
 * @param {Array|string} targetMethods - 可选参数，指定要更新的API方法名称
 *                                      - 如果为空，则更新所有badge
 *                                      - 如果为字符串，则只更新该API方法对应的badge
 *                                      - 如果为数组，则只更新数组中指定的API方法对应的badge
 */
const triggerBadgeRefresh = (targetMethods = null) => {
  refreshBadge.value = {
    counter: refreshBadge.value.counter + 1,
    targetMethods
  };
  console.log('触发 badge 刷新，目标方法:', targetMethods || '全部');
};

provide('badgeRefresh', {
  refreshBadge: readonly(refreshBadge),
  triggerBadgeRefresh
});

const route = useRoute();
const isBlankLayout = computed(() => (route.meta?.layout === 'blank' || window.location.pathname === '/login' || window.location.pathname === '/register'));

const contentInlineStyle = computed(() => ({
  padding: '16px',
  marginLeft: collapsed.value ? '80px' : '256px',
  marginTop: '56px',
  overflow: 'auto',
  height: `calc(100vh - 88px)`,
}));

watch(collapsed, (newVal) => {
  window.localStorage.setItem('shop-left-header-collapsed', newVal);
});

</script>

<style scoped lang="less">
.layout-root {
  width: 100%;
  min-height: 100vh;
  background: #f5f7fa;
}
.content {
  transition: margin-left 0.2s ease;
}

.auth-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shop-list {
  position: fixed;
  top: 2px;
  right: 2px;
  z-index: 999;
}

/* 全局加载状态样式 */
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.loading-content .el-icon {
  font-size: 24px;
  color: #409eff;
}

.loading-content span {
  color: #606266;
  font-size: 14px;
}

.auth-required {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 40px;
}

.auth-required h3 {
  margin-bottom: 20px;
  color: #303133;
}

.auth-required .el-button {
  margin: 0 5px;
}

.content-container {
  position: relative;
}

.blank-content {
  min-height: 100vh;
}
</style>
