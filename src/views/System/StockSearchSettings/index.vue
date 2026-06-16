<template>
  <div class="stock-search-settings-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="hero-kicker">System Search Control</span>
        <h2>股票模糊搜索设置</h2>
        <p>
          统一管理当前浏览器的股票模糊搜索数据源。分组加股、批量匹配、模拟交易选股等入口都会复用这里的配置。
        </p>
        <div class="hero-meta">
          <span>作用范围：当前浏览器</span>
          <span>默认策略：自动切换</span>
          <span>即时生效：无需刷新后端</span>
        </div>
      </div>
      <div class="hero-side">
        <div class="active-chip">
          当前源：{{ currentOption?.label || '--' }}
        </div>
        <p>{{ currentOption?.description || '请选择一个搜索源。' }}</p>
      </div>
    </section>

    <section class="selection-grid">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="source-card"
        :class="{ active: form.source === option.value }"
        @click="handleSelect(option.value)"
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
    </section>

    <section class="settings-panel">
      <div class="panel-heading">
        <div>
          <h3>配置说明</h3>
          <p>
            选择后会立即持久化到当前浏览器，新的股票搜索请求会自动附带所选数据源参数。
          </p>
        </div>
        <el-button type="primary" @click="saveSettings">保存配置</el-button>
      </div>

      <el-alert
        type="info"
        :closable="false"
        title="如果需要服务端默认源，可通过后端环境变量 STOCK_SEARCH_SOURCE 配置。前端设置优先影响当前浏览器请求。"
      />

      <div class="compare-grid">
        <article class="compare-card">
          <span>自动切换</span>
          <strong>百度 -> AKShare</strong>
          <small>优先兼顾搜索体验和可用性。</small>
        </article>
        <article class="compare-card">
          <span>百度搜索</span>
          <strong>实时模糊匹配</strong>
          <small>更适合名称、拼音和热门股票快速检索。</small>
        </article>
        <article class="compare-card">
          <span>AKShare</span>
          <strong>本地索引检索</strong>
          <small>更适合上游波动时保持稳定返回。</small>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getStockSearchSource,
  setStockSearchSource,
  STOCK_SEARCH_SOURCE_OPTIONS,
} from '@/utils/stockSearchSource';

// 当前页面只负责管理浏览器侧股票搜索源配置。
const options = STOCK_SEARCH_SOURCE_OPTIONS;
const form = reactive({
  source: getStockSearchSource(),
});

const currentOption = computed(() => {
  return options.find((item) => item.value === form.source) || null;
});

function handleSelect(value) {
  const effectiveSource = setStockSearchSource(value);
  form.source = effectiveSource;
  ElMessage.success(
    `股票搜索数据源已切换为：${currentOption.value?.label || effectiveSource}`
  );
}

function saveSettings() {
  const effectiveSource = setStockSearchSource(form.source);
  form.source = effectiveSource;
  ElMessage.success(
    `股票搜索数据源已切换为：${currentOption.value?.label || effectiveSource}`
  );
}
</script>

<style scoped>
.stock-search-settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background:
    radial-gradient(
      circle at top right,
      rgba(215, 232, 255, 0.9),
      transparent 35%
    ),
    linear-gradient(180deg, #f5f8ff 0%, #eef3f7 100%);
}

.hero-panel,
.settings-panel {
  border: 1px solid rgba(36, 74, 140, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 40px rgba(25, 53, 110, 0.08);
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 20px;
  padding: 28px;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(31, 78, 168, 0.08);
  color: #1f4ea8;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h2 {
  margin: 14px 0 10px;
  color: #17315c;
  font-size: 32px;
}

.hero-copy p,
.hero-side p,
.panel-heading p,
.source-description,
.compare-card small {
  margin: 0;
  color: #52627d;
  line-height: 1.7;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.hero-meta span,
.active-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(22, 46, 94, 0.08);
  color: #284067;
  font-size: 13px;
}

.hero-side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding: 22px;
  border-radius: 20px;
  background: linear-gradient(160deg, #17315c 0%, #295491 100%);
}

.hero-side .active-chip,
.hero-side p {
  color: #fff;
}

.hero-side .active-chip {
  width: fit-content;
  background: rgba(255, 255, 255, 0.16);
}

.selection-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.source-card {
  padding: 20px;
  border: 1px solid rgba(31, 78, 168, 0.1);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 32px rgba(21, 46, 94, 0.06);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.source-card:hover,
.source-card.active {
  transform: translateY(-2px);
  border-color: rgba(31, 78, 168, 0.45);
  box-shadow: 0 18px 36px rgba(21, 46, 94, 0.12);
}

.source-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.source-card-header strong,
.compare-card strong,
.panel-heading h3 {
  color: #17315c;
}

.source-card-header p {
  margin: 6px 0 0;
  color: #70809b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
}

.source-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eef4ff;
  color: #1f4ea8;
  font-size: 12px;
}

.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.compare-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.compare-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #eff4fb 100%);
}

.compare-card span {
  color: #6d7c95;
  font-size: 13px;
}

@media (max-width: 960px) {
  .hero-panel,
  .selection-grid,
  .compare-grid {
    grid-template-columns: 1fr;
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
