<template>
  <div class="stock-search-settings-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="hero-kicker">Search Source</span>
        <h2>股票模糊搜索设置</h2>
        <p>
          仅负责模糊搜索数据源管理，对应原 /system/stock-search-settings 页面能力。
        </p>
      </div>
      <div class="hero-side">
        <div class="active-chip">浏览器搜索源：{{ currentOption?.label || '--' }}</div>
        <p>{{ currentOption?.description || '请选择一个搜索源。' }}</p>
      </div>
    </section>

    <StockSearchSourceManager v-model="searchSource" @source-changed="handleSourceChanged" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import {
  getStockSearchSource,
  STOCK_SEARCH_SOURCE_OPTIONS,
} from '@/utils/stockSearchSource';
import StockSearchSourceManager from './components/StockSearchSourceManager.vue';

const searchSource = ref(getStockSearchSource());

const currentOption = computed(() => {
  return STOCK_SEARCH_SOURCE_OPTIONS.find((item) => item.value === searchSource.value) || null;
});

function handleSourceChanged(value) {
  searchSource.value = value;
}
</script>

<style scoped>
.stock-search-settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background:
    radial-gradient(circle at top right, rgba(255, 236, 214, 0.75), transparent 35%),
    linear-gradient(180deg, #f8fbff 0%, #edf3f8 100%);
}

.hero-panel,
.stock-search-source-panel {
  border: 1px solid rgba(36, 74, 140, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 32px rgba(18, 46, 92, 0.08);
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 20px;
  padding: 26px;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(201, 90, 43, 0.1);
  color: #9f3e13;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h2 {
  margin: 12px 0 10px;
  color: #1f3556;
  font-size: 30px;
}

.hero-copy p,
.hero-side p {
  margin: 0;
  color: #52627d;
  line-height: 1.65;
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: 18px;
  background: linear-gradient(160deg, #1f3556 0%, #2f5f93 100%);
}

.hero-side .active-chip,
.hero-side p {
  color: #fff;
}

.active-chip {
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 13px;
}

@media (max-width: 960px) {
  .hero-panel {
    grid-template-columns: 1fr;
  }
}
</style>
