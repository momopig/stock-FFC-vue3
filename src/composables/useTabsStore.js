import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';

// 从 localStorage 读取保存的 tabs 状态
const loadTabsFromStorage = () => {
  try {
    const savedTabs = localStorage.getItem('shopHeaderTabs');
    const savedActiveTabKey = localStorage.getItem('shopHeaderActiveTabKey');

    if (savedTabs) {
      const parsedTabs = JSON.parse(savedTabs);
      // 确保首页标签页始终存在且不可关闭
      const hasHome = parsedTabs.find(tab => tab.key === '/home');
      if (!hasHome) {
        parsedTabs.unshift({ key: '/home', title: '首页', closable: false });
      }
      return {
        tabs: parsedTabs,
        activeTabKey: savedActiveTabKey || '/home'
      };
    }
  } catch (error) {
    console.error('加载tabs缓存失败:', error);
  }

  // 默认状态
  return {
    tabs: [{ key: '/home', title: '首页', closable: false }],
    activeTabKey: '/home'
  };
};

// 保存 tabs 状态到 localStorage
const saveTabsToStorage = (tabsValue, activeKeyValue) => {
  try {
    localStorage.setItem('shopHeaderTabs', JSON.stringify(tabsValue));
    localStorage.setItem('shopHeaderActiveTabKey', activeKeyValue);
  } catch (error) {
    console.error('保存tabs缓存失败:', error);
  }
};

// 初始化状态
const initialState = loadTabsFromStorage();
const tabs = ref(initialState.tabs);
const activeTabKey = ref(initialState.activeTabKey);

// 监听状态变化，自动保存到 localStorage
watch(
  [tabs, activeTabKey],
  ([newTabs, newActiveKey]) => {
    saveTabsToStorage(newTabs, newActiveKey);
  },
  { deep: true }
);

export function useTabsStore() {
  const router = useRouter();

  // 添加标签页
  const addTab = (path, title) => {
    const existingTab = tabs.value.find(tab => tab.key === path);
    if (existingTab) {
      activeTabKey.value = path;
      return;
    }

    // 计算插入位置：在当前激活标签的右侧
    const currentIndex = tabs.value.findIndex(tab => tab.key === activeTabKey.value);
    const insertIndex = currentIndex >= 0 ? currentIndex + 1 : tabs.value.length;

    tabs.value.splice(insertIndex, 0, {
      key: path,
      title: title || path.replace('/', ''),
      closable: true
    });

    activeTabKey.value = path;
  };

  // 切换标签页
  const switchTab = (key) => {
    activeTabKey.value = key;
    router.push(key);
  };

  // 关闭标签页
  const closeTab = (key) => {
    const index = tabs.value.findIndex(tab => tab.key === key);
    if (index === -1) return;

    tabs.value.splice(index, 1);

    // 如果关闭的是当前激活的标签页，需要切换到其他标签页
    if (key === activeTabKey.value) {
      const newActiveIndex = Math.min(index, tabs.value.length - 1);
      const newActiveKey = tabs.value[newActiveIndex].key;
      switchTab(newActiveKey);
    }
  };

  // 重排序标签页
  const reorderTabs = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    const tab = tabs.value.splice(fromIndex, 1)[0];
    tabs.value.splice(toIndex, 0, tab);
  };

  return {
    tabs: computed(() => tabs.value),
    activeTabKey: computed(() => activeTabKey.value),
    addTab,
    switchTab,
    closeTab,
    reorderTabs
  };
}
