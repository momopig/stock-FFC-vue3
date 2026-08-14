<template>
  <div class="profit-stat-settings-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="hero-kicker">Profit Statistics</span>
        <h2>盈亏统计管理</h2>
        <p>
          配置 A 股、港股、美股每日盈亏统计的对账时间。该页面仅超级管理员可见。
        </p>
      </div>
      <div class="hero-side">
        <div class="active-chip">当前可配置市场：{{ rows.length }}</div>
        <p>保存后将用于每日盈亏快照统计时点判定，建议在收盘后预留缓冲时间。</p>
      </div>
    </section>

    <section class="panel-card" v-loading="loading">
      <div class="panel-header">
        <h3>市场对账时间设置</h3>
        <el-button type="primary" :loading="saving" @click="saveSettings">保存配置</el-button>
      </div>

      <el-table :data="rows" border stripe>
        <el-table-column label="市场" min-width="140">
          <template #default="{ row }">
            <div class="market-name-cell">
              <strong>{{ row.market_name }}</strong>
              <small>{{ row.market_code }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="对账时间" min-width="200">
          <template #default="{ row }">
            <el-time-picker
              v-model="row.settlement_time"
              format="HH:mm"
              value-format="HH:mm"
              placeholder="选择时间"
            />
          </template>
        </el-table-column>
        <el-table-column label="时区" min-width="180">
          <template #default="{ row }">
            <el-input v-model="row.timezone" placeholder="例如 Asia/Shanghai" />
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="260">
          <template #default="{ row }">
            <el-input v-model="row.remark" placeholder="可选备注" maxlength="120" show-word-limit />
          </template>
        </el-table-column>
        <el-table-column label="最近更新" min-width="220">
          <template #default="{ row }">
            <div class="update-cell">
              <span>{{ row.updated_by || '--' }}</span>
              <small>{{ row.updated_time || '--' }}</small>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getProfitStatisticsSettings,
  updateProfitStatisticsSettings,
} from '@/api/modules/profitStatistics';

// 页面请求状态，避免重复提交。
const loading = ref(false);
const saving = ref(false);

// 市场配置列表，直接绑定到表格编辑项。
const rows = ref([]);

// 加载当前后端保存的市场对账时间配置。
async function loadSettings() {
  loading.value = true;
  try {
    const response = await getProfitStatisticsSettings();
    rows.value = Array.isArray(response?.payload?.markets)
      ? response.payload.markets.map((item) => ({ ...item }))
      : [];
  } catch (error) {
    ElMessage.error(error?.message || '加载盈亏统计配置失败');
  } finally {
    loading.value = false;
  }
}

// 保存前端编辑后的配置到后端。
async function saveSettings() {
  if (!rows.value.length) {
    ElMessage.warning('暂无可保存的市场配置');
    return;
  }

  const normalized = rows.value.map((item) => ({
    market_code: item.market_code,
    settlement_time: item.settlement_time,
    timezone: item.timezone || 'Asia/Shanghai',
    remark: item.remark || '',
  }));

  saving.value = true;
  try {
    const response = await updateProfitStatisticsSettings(normalized);
    rows.value = Array.isArray(response?.payload?.markets)
      ? response.payload.markets.map((item) => ({ ...item }))
      : rows.value;
    ElMessage.success('盈亏统计配置已保存');
  } catch (error) {
    ElMessage.error(error?.message || '保存盈亏统计配置失败');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.profit-stat-settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background:
    radial-gradient(circle at top right, rgba(255, 233, 198, 0.8), transparent 36%),
    linear-gradient(180deg, #f7fbff 0%, #e8f0f8 100%);
}

.hero-panel,
.panel-card {
  border: 1px solid rgba(40, 72, 128, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 16px 36px rgba(17, 49, 95, 0.1);
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 18px;
  padding: 24px;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 12px;
  background: rgba(189, 89, 28, 0.1);
  color: #8f3d12;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h2 {
  margin: 12px 0 10px;
  font-size: 30px;
  color: #1f3250;
}

.hero-copy p,
.hero-side p {
  margin: 0;
  color: #4e6079;
  line-height: 1.7;
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 18px;
  padding: 18px;
  background: linear-gradient(145deg, #244973 0%, #35659a 100%);
}

.active-chip {
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 13px;
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

.hero-side p {
  color: #f3f8ff;
}

.panel-card {
  padding: 16px;
}

.panel-header {
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  color: #1f3250;
  font-size: 18px;
}

.market-name-cell,
.update-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.market-name-cell strong {
  color: #1f3250;
}

.market-name-cell small,
.update-cell small {
  color: #6b7f95;
}

@media (max-width: 960px) {
  .hero-panel {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
