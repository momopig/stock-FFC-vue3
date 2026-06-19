<template>
  <section class="settings-panel">
    <div class="panel-heading">
      <div>
        <h3>模糊搜索数据源管理</h3>
        <p>对应 /system/stock-search-settings 原有能力，并新增“本地查找表”作为第一数据源。</p>
      </div>
    </div>
    <div class="selection-grid">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="source-card"
        :class="{ active: selectedSource === option.value }"
        @click="handleSelectSource(option.value)"
      >
        <div class="source-card-header">
          <div>
            <strong>{{ option.label }}</strong>
            <p>{{ option.value }}</p>
          </div>
          <span class="source-badge">{{ option.badge }}</span>
        </div>
        <p class="source-description">{{ option.description }}</p>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  setStockSearchSource,
  STOCK_SEARCH_SOURCE_OPTIONS,
} from '@/utils/stockSearchSource';

// 数据源选项由共享工具统一维护，保证全局一致。
const options = STOCK_SEARCH_SOURCE_OPTIONS;

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue', 'source-changed']);

const selectedSource = computed(() => props.modelValue);

function handleSelectSource(value) {
  const effective = setStockSearchSource(value);
  emit('update:modelValue', effective);
  emit('source-changed', effective);
  const selected = options.find((item) => item.value === effective);
  ElMessage.success(`股票搜索数据源已切换为：${selected?.label || effective}`);
}
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgba(36, 74, 140, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 32px rgba(18, 46, 92, 0.08);
}

.panel-heading h3 {
  margin: 0;
  color: #1f3556;
}

.panel-heading p,
.source-description {
  margin: 0;
  color: #52627d;
  line-height: 1.65;
}

.selection-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.source-card {
  padding: 16px;
  border: 1px solid rgba(31, 78, 168, 0.12);
  border-radius: 16px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.source-card:hover,
.source-card.active {
  transform: translateY(-2px);
  border-color: rgba(31, 78, 168, 0.45);
  box-shadow: 0 12px 24px rgba(21, 46, 94, 0.12);
}

.source-card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.source-card-header strong {
  color: #1f3556;
}

.source-card-header p {
  margin: 6px 0 0;
  color: #7888a1;
  font-size: 12px;
  text-transform: uppercase;
}

.source-badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: #edf3ff;
  color: #1f4ea8;
  font-size: 12px;
}

@media (max-width: 960px) {
  .selection-grid {
    grid-template-columns: 1fr;
  }
}
</style>
