<template>
  <el-popover
    v-model:visible="groupSearchVisible"
    trigger="click"
    placement="bottom-end"
    :width="panelWidth"
  >
    <template #reference>
      <div class="group-action-btn" :title="buttonTitle">
        <el-icon><Search /></el-icon>
      </div>
    </template>

    <div class="group-search-panel">
      <el-input
        ref="groupSearchInputRef"
        v-model.trim="groupSearchKeyword"
        :placeholder="placeholder"
        clearable
        @keydown="handleGroupSearchKeydown"
      />

      <div class="group-search-tips">
        可按名称快速定位，支持键盘上下选择和最近访问分组
      </div>

      <div ref="groupSearchListRef" class="group-search-list">
        <template v-if="!groupSearchKeyword && recentGroupOptions.length">
          <div class="group-search-section-title">最近访问</div>
          <div
            v-for="group in recentGroupOptions"
            :key="`recent-${group.id}`"
            class="group-search-item"
            :class="{
              'is-active': activeGroupId === group.id,
              'is-keyboard-active': highlightedGroupId === group.id,
            }"
            @mouseenter="setHighlightedGroup(group.id)"
            @click="handleQuickGroupSelect(group.id)"
          >
            <span
              class="group-search-item-name"
              :title="group.name"
              v-html="renderGroupNameHighlight(group.name)"
            />
            <span class="group-search-item-meta">
              <span class="group-search-item-badge">最近</span>
              <span
                v-if="activeGroupId === group.id"
                class="group-search-item-tag"
              >
                当前
              </span>
            </span>
          </div>

          <div
            v-if="remainingGroupOptions.length"
            class="group-search-section-title"
          >
            全部分组
          </div>
        </template>

        <div
          v-for="group in renderedGroupOptions"
          :key="group.id"
          class="group-search-item"
          :class="{
            'is-active': activeGroupId === group.id,
            'is-keyboard-active': highlightedGroupId === group.id,
          }"
          @mouseenter="setHighlightedGroup(group.id)"
          @click="handleQuickGroupSelect(group.id)"
        >
          <span
            class="group-search-item-name"
            :title="group.name"
            v-html="renderGroupNameHighlight(group.name)"
          />
          <span class="group-search-item-meta">
            <span
              v-if="activeGroupId === group.id"
              class="group-search-item-tag"
            >
              当前
            </span>
          </span>
        </div>

        <div v-if="!keyboardNavigableGroups.length" class="group-search-empty">
          未找到匹配分组
        </div>
      </div>
    </div>
  </el-popover>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { Search } from '@element-plus/icons-vue';

const props = defineProps({
  groups: {
    type: Array,
    default: () => [],
  },
  activeGroupId: {
    type: String,
    default: '',
  },
  allGroupId: {
    type: String,
    default: 'all',
  },
  allGroupName: {
    type: String,
    default: '全部',
  },
  buttonTitle: {
    type: String,
    default: '搜索分组',
  },
  placeholder: {
    type: String,
    default: '支持名称筛选，↑↓ 选择，Enter 切换',
  },
  panelWidth: {
    type: Number,
    default: 320,
  },
  storageKey: {
    type: String,
    default: 'stock:group-search:recent-group-ids',
  },
  maxRecentCount: {
    type: Number,
    default: 6,
  },
});

const emit = defineEmits(['select']);

const groupSearchVisible = ref(false);
const groupSearchKeyword = ref('');
const groupSearchInputRef = ref(null);
const groupSearchListRef = ref(null);
const highlightedGroupId = ref(props.allGroupId);
const recentGroupIds = ref([]);
let hasTrackedInitialActiveGroup = false;

const searchableGroupOptions = computed(() => [
  {
    id: props.allGroupId,
    name: props.allGroupName,
  },
  ...props.groups.map((group) => ({
    id: String(group.id),
    name: group?.name || '',
  })),
]);

const filteredGroupOptions = computed(() => {
  const keyword = groupSearchKeyword.value.trim().toLowerCase();
  if (!keyword) return searchableGroupOptions.value;

  return searchableGroupOptions.value.filter((group) =>
    group.name.toLowerCase().includes(keyword)
  );
});

const recentGroupOptions = computed(() => {
  const optionMap = new Map(
    searchableGroupOptions.value.map((group) => [group.id, group])
  );
  return recentGroupIds.value
    .map((groupId) => optionMap.get(groupId))
    .filter(Boolean);
});

const remainingGroupOptions = computed(() => {
  if (groupSearchKeyword.value.trim()) return filteredGroupOptions.value;

  const recentGroupIdSet = new Set(
    recentGroupOptions.value.map((group) => group.id)
  );
  return searchableGroupOptions.value.filter(
    (group) => !recentGroupIdSet.has(group.id)
  );
});

const renderedGroupOptions = computed(() => {
  if (groupSearchKeyword.value.trim()) return filteredGroupOptions.value;
  return remainingGroupOptions.value;
});

const keyboardNavigableGroups = computed(() => {
  if (groupSearchKeyword.value.trim()) return filteredGroupOptions.value;
  return [...recentGroupOptions.value, ...remainingGroupOptions.value];
});

watch(groupSearchVisible, (visible) => {
  if (!visible) {
    groupSearchKeyword.value = '';
    return;
  }

  nextTick(() => {
    groupSearchInputRef.value?.focus?.();
    groupSearchInputRef.value?.select?.();
    syncHighlightedGroup();
  });
});

watch(searchableGroupOptions, (options) => {
  const validGroupIds = new Set(options.map((group) => group.id));
  const normalizedIds = recentGroupIds.value.filter((groupId) =>
    validGroupIds.has(groupId)
  );
  if (normalizedIds.length !== recentGroupIds.value.length) {
    recentGroupIds.value = normalizedIds;
    persistRecentGroupIds();
  }
});

watch(keyboardNavigableGroups, () => {
  if (!groupSearchVisible.value) return;
  nextTick(() => {
    syncHighlightedGroup();
    scrollHighlightedGroupIntoView();
  });
});

watch(
  () => props.activeGroupId,
  (groupId, previousGroupId) => {
    if (!hasTrackedInitialActiveGroup) {
      hasTrackedInitialActiveGroup = true;
      return;
    }
    if (!groupId || groupId === previousGroupId) return;
    pushRecentGroup(groupId);
  },
  { immediate: true }
);

onMounted(() => {
  restoreRecentGroupIds();
});

function restoreRecentGroupIds() {
  if (typeof window === 'undefined') return;
  try {
    const storedValue = window.localStorage.getItem(props.storageKey);
    const parsedValue = JSON.parse(storedValue || '[]');
    recentGroupIds.value = normalizeRecentGroupIds(parsedValue);
  } catch {
    recentGroupIds.value = [];
  }
}

function persistRecentGroupIds() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      props.storageKey,
      JSON.stringify(recentGroupIds.value)
    );
  } catch {
    // ignore storage errors
  }
}

function normalizeRecentGroupIds(groupIds) {
  if (!Array.isArray(groupIds)) return [];
  return groupIds
    .map((groupId) => String(groupId || ''))
    .filter(
      (groupId, index, list) => groupId && list.indexOf(groupId) === index
    )
    .slice(0, props.maxRecentCount);
}

function pushRecentGroup(groupId) {
  const normalizedGroupId = String(groupId || '');
  if (!normalizedGroupId) return;
  recentGroupIds.value = normalizeRecentGroupIds([
    normalizedGroupId,
    ...recentGroupIds.value,
  ]);
  persistRecentGroupIds();
}

function syncHighlightedGroup() {
  const candidates = keyboardNavigableGroups.value;
  if (!candidates.length) {
    highlightedGroupId.value = '';
    return;
  }

  if (candidates.some((group) => group.id === highlightedGroupId.value)) {
    return;
  }

  const activeOption = candidates.find(
    (group) => group.id === props.activeGroupId
  );
  highlightedGroupId.value = activeOption?.id || candidates[0].id;
}

function setHighlightedGroup(groupId) {
  highlightedGroupId.value = groupId;
}

function scrollHighlightedGroupIntoView() {
  nextTick(() => {
    const highlightedItem = groupSearchListRef.value?.querySelector?.(
      '.group-search-item.is-keyboard-active'
    );
    highlightedItem?.scrollIntoView?.({ block: 'nearest' });
  });
}

function moveHighlightedGroup(step) {
  const candidates = keyboardNavigableGroups.value;
  if (!candidates.length) return;

  const currentIndex = candidates.findIndex(
    (group) => group.id === highlightedGroupId.value
  );
  const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex =
    (fallbackIndex + step + candidates.length) % candidates.length;
  highlightedGroupId.value = candidates[nextIndex].id;
  scrollHighlightedGroupIntoView();
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderGroupNameHighlight(groupName) {
  const sourceText = String(groupName || '');
  const keyword = groupSearchKeyword.value.trim();
  if (!keyword) return escapeHtml(sourceText);

  const lowerSourceText = sourceText.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  let startIndex = 0;
  let matchedIndex = lowerSourceText.indexOf(lowerKeyword);
  let html = '';

  while (matchedIndex !== -1) {
    html += escapeHtml(sourceText.slice(startIndex, matchedIndex));
    html += `<mark class="group-search-highlight">${escapeHtml(
      sourceText.slice(matchedIndex, matchedIndex + keyword.length)
    )}</mark>`;
    startIndex = matchedIndex + keyword.length;
    matchedIndex = lowerSourceText.indexOf(lowerKeyword, startIndex);
  }

  html += escapeHtml(sourceText.slice(startIndex));
  return html;
}

async function handleQuickGroupSelect(groupId) {
  groupSearchVisible.value = false;
  if (props.activeGroupId === groupId) {
    pushRecentGroup(groupId);
    return;
  }

  emit('select', groupId);
}

async function handleQuickGroupSearchEnter() {
  const targetGroup = keyboardNavigableGroups.value.find(
    (group) => group.id === highlightedGroupId.value
  );
  if (!targetGroup) return;
  await handleQuickGroupSelect(targetGroup.id);
}

async function handleGroupSearchKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveHighlightedGroup(1);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveHighlightedGroup(-1);
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    await handleQuickGroupSearchEnter();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    groupSearchVisible.value = false;
  }
}
</script>

<style scoped lang="less">
.group-action-btn {
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
  align-self: center;

  &:hover {
    background: #ecf5ff;
    color: #409eff;
  }
}

.group-search-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-search-tips {
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
}

.group-search-list {
  max-height: 320px;
  overflow-y: auto;
}

.group-search-section-title {
  padding: 4px 2px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
}

.group-search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: #f5f7fa;
  }

  &.is-keyboard-active {
    background: #f5f7fa;
    box-shadow: inset 0 0 0 1px #d9ecff;
  }

  &.is-active {
    background: #ecf5ff;
    color: #409eff;
  }
}

.group-search-item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-search-item-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.group-search-item-badge {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.2;
  color: #606266;
  background: #f4f4f5;
}

.group-search-item-tag {
  flex-shrink: 0;
  font-size: 12px;
  color: #409eff;
}

.group-search-item-name :deep(.group-search-highlight) {
  padding: 0;
  color: #e6a23c;
  background: transparent;
}

.group-search-empty {
  padding: 20px 0 12px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>
