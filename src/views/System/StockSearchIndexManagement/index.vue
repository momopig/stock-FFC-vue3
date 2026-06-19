<template>
  <div class="stock-search-index-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="hero-kicker">Local Index Console</span>
        <h2>股票本地查找表管理</h2>
        <p>
          独立页面管理本地查找表的同步、预览和历史追踪。针对 A 股提供分段执行能力，可按上交所、深交所、北交所逐段同步。
        </p>
      </div>
    </section>

    <StockLocalIndexManager />
  </div>
</template>

<script setup>
import StockLocalIndexManager from '@/views/System/StockSearchSettings/components/StockLocalIndexManager.vue';
</script>

<style scoped>
.stock-search-index-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background:
    radial-gradient(circle at top right, rgba(255, 236, 214, 0.75), transparent 35%),
    linear-gradient(180deg, #f8fbff 0%, #edf3f8 100%);
}

.hero-panel {
  border: 1px solid rgba(36, 74, 140, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 32px rgba(18, 46, 92, 0.08);
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

.hero-copy p {
  margin: 0;
  color: #52627d;
  line-height: 1.65;
}
</style>
