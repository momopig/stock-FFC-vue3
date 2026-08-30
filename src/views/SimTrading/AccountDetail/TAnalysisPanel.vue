<template>
  <div class="t-analysis-panel">
    <div class="t-analysis-header">
      <div class="t-analysis-title">做T提示</div>
      <div class="t-analysis-actions">
        <el-input
          v-model="queryForm.stock_name"
          clearable
          placeholder="股票名称"
          class="t-analysis-stock-name"
          @keyup.enter="handleQueryChange"
          @change="handleQueryChange"
          @clear="handleQueryChange"
        />
        <el-select
          v-model="queryForm.direction"
          clearable
          placeholder="成交类型"
          class="t-analysis-direction"
          @change="handleQueryChange"
          @clear="handleQueryChange"
        >
          <el-option label="买入" value="BUY" />
          <el-option label="卖出" value="SELL" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          unlink-panels
          clearable
          range-separator="至"
          class="t-analysis-date-picker"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          :shortcuts="DATE_SHORTCUTS"
          @change="handleDateRangeChange"
        />
        <el-button
          type="primary"
          class="refresh-button"
          :loading="loading"
          @click="loadData({ force: true })"
        >
          刷新成交记录
        </el-button>
      </div>
    </div>

    <div class="t-analysis-summary">
      <div class="summary-card">
        <span>做T总盈亏（对比今日）</span>
        <strong :class="profitClass(summary.total_profit_compare_today)">
          {{ formatMoney(summary.total_profit_compare_today) }}
        </strong>
      </div>
      <div class="summary-card">
        <span>做T总盈亏（对比当日）</span>
        <strong :class="profitClass(summary.total_profit_compare_trade_day)">
          {{ formatMoney(summary.total_profit_compare_trade_day) }}
        </strong>
      </div>
      <div class="summary-card">
        <span>总交易费</span>
        <strong>{{ formatMoney(summary.total_fee) }}</strong>
      </div>
      <div class="summary-card">
        <span>成交笔数</span>
        <strong>{{ Number(summary.trade_count || 0) }}</strong>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="rows"
      border
      stripe
      empty-text="当前区间暂无成交数据"
      class="t-analysis-table"
    >
      <el-table-column prop="traded_date" label="日期" width="120" sortable />
      <el-table-column label="股票名称" width="150">
        <template #default="scope">
          <div>{{ formatStockName(scope.row) }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="direction_label" label="成交类型" width="100" />
      <el-table-column prop="fill_price" label="成交价格" width="120" sortable>
        <template #default="scope">{{
          formatMoney(scope.row.fill_price)
        }}</template>
      </el-table-column>
      <el-table-column
        prop="fill_quantity"
        label="成交数量"
        width="120"
        sortable
      />
      <el-table-column prop="traded_time" label="成交时间" width="150" sortable>
        <template #default="scope">{{
          formatDateTime(scope.row.traded_time)
        }}</template>
      </el-table-column>
      <el-table-column
        prop="trade_day_price"
        label="当日价格"
        width="120"
        sortable
      >
        <template #default="scope">{{
          formatMoney(scope.row.trade_day_price)
        }}</template>
      </el-table-column>
      <el-table-column prop="today_price" label="今日价格" width="120" sortable>
        <template #default="scope">{{
          formatMoney(scope.row.today_price)
        }}</template>
      </el-table-column>
      <el-table-column
        prop="t_space_ratio_compare_trade_day"
        label="做T空间(对比当日)"
        width="170"
        sortable
      >
        <template #default="scope">
          <div :class="profitClass(scope.row.profit_compare_trade_day)">
            <div>{{ scope.row.suggestion_compare_trade_day }}</div>
            <div>
              {{ formatPercent(scope.row.t_space_ratio_compare_trade_day) }}
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="profit_compare_trade_day"
        label="盈亏(对比当日)"
        width="150"
        sortable
      >
        <template #default="scope">
          <span :class="profitClass(scope.row.profit_compare_trade_day)">
            {{ formatMoney(scope.row.profit_compare_trade_day) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="t_space_ratio_compare_today"
        label="做T空间(对比今日)"
        width="170"
        sortable
      >
        <template #default="scope">
          <div :class="profitClass(scope.row.profit_compare_today)">
            <div>{{ scope.row.suggestion_compare_today }}</div>
            <div>
              {{ formatPercent(scope.row.t_space_ratio_compare_today) }}
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="profit_compare_today"
        label="盈亏(对比今日)"
        width="150"
        sortable
      >
        <template #default="scope">
          <span :class="profitClass(scope.row.profit_compare_today)">
            {{ formatMoney(scope.row.profit_compare_today) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="fee_total" label="交易费" sortable>
        <template #default="scope">
          <el-popover
            v-if="shouldShowFeeBreakdown(scope.row)"
            placement="left"
            :width="260"
            trigger="hover"
          >
            <div class="fee-breakdown-item">
              <span>手续费</span>
              <strong>{{
                formatMoney(scope.row.fee_breakdown_json.commission_fee)
              }}</strong>
            </div>
            <div class="fee-breakdown-item">
              <span>印花税</span>
              <strong>{{
                formatMoney(scope.row.fee_breakdown_json.stamp_duty_fee)
              }}</strong>
            </div>
            <div class="fee-breakdown-item">
              <span>过户费</span>
              <strong>{{
                formatMoney(scope.row.fee_breakdown_json.transfer_fee)
              }}</strong>
            </div>
            <div class="fee-breakdown-item">
              <span>规费</span>
              <strong>{{
                formatMoney(scope.row.fee_breakdown_json.handling_fee)
              }}</strong>
            </div>
            <div class="fee-breakdown-item">
              <span>其他费</span>
              <strong>{{
                formatMoney(scope.row.fee_breakdown_json.other_fee)
              }}</strong>
            </div>
            <div
              v-if="scope.row.fee_breakdown_json?.source"
              class="fee-breakdown-note"
            >
              {{ `费用来源：${scope.row.fee_breakdown_json.source}` }}
            </div>
            <div
              v-if="scope.row.fee_breakdown_json?.inferred"
              class="fee-breakdown-note"
            >
              券商未返回完整费用拆分，当前为系统推导值，仅供参考。
            </div>
            <template #reference>
              <el-button link type="primary">{{
                formatMoney(scope.row.fee_total)
              }}</el-button>
            </template>
          </el-popover>
          <span v-else>{{ formatMoney(scope.row.fee_total) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="t-analysis-pagination">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        background
        layout="total, sizes, prev, pager, next"
        :page-sizes="[20, 50, 100, 200]"
        :total="pagination.total"
        @current-change="handlePageChange"
        @size-change="handlePageSizeChange"
      />
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import { getSimTradingTAnalysis } from '@/api/modules/simTrading';

const props = defineProps({
  accountId: {
    type: [Number, String],
    required: true,
  },
});

const dateRange = ref([]);
const loading = ref(false);
const rows = ref([]);
const queryForm = reactive({
  stock_name: '',
  direction: '',
});
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});
const summary = reactive({
  total_profit_compare_today: 0,
  total_profit_compare_trade_day: 0,
  total_fee: 0,
  trade_count: 0,
});

const cache = new Map();
const latestRequestId = ref(0);

function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatYmd(dateValue) {
  const year = dateValue.getFullYear();
  const month = `${dateValue.getMonth() + 1}`.padStart(2, '0');
  const day = `${dateValue.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function pickPresetDays(spanDays) {
  const end = todayDate();
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(spanDays - 1, 0));
  return [formatYmd(start), formatYmd(end)];
}

function pickToday() {
  const today = todayDate();
  const text = formatYmd(today);
  return [text, text];
}

function pickYesterday() {
  const today = todayDate();
  const day = new Date(today);
  day.setDate(today.getDate() - 1);
  const text = formatYmd(day);
  return [text, text];
}

function pickCurrentMonth() {
  const end = todayDate();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return [formatYmd(start), formatYmd(end)];
}

const DATE_SHORTCUTS = [
  { text: '今日', value: () => pickToday() },
  { text: '昨日', value: () => pickYesterday() },
  { text: '本月', value: () => pickCurrentMonth() },
  { text: '最近5天', value: () => pickPresetDays(5) },
  { text: '最近7天', value: () => pickPresetDays(7) },
  { text: '最近20天', value: () => pickPresetDays(20) },
  { text: '最近30天', value: () => pickPresetDays(30) },
  { text: '最近60天', value: () => pickPresetDays(60) },
];

watch(
  () => props.accountId,
  async (value) => {
    if (!value) {
      return;
    }
    cache.clear();
    dateRange.value = [];
    queryForm.stock_name = '';
    queryForm.direction = '';
    pagination.page = 1;
    pagination.pageSize = 20;
    await loadData({ force: true });
  },
  { immediate: true }
);

function buildParams() {
  const params = {
    page: pagination.page,
    page_size: pagination.pageSize,
  };
  if (Array.isArray(dateRange.value) && dateRange.value.length === 2) {
    params.range_type = 'custom';
    params.start_date = dateRange.value[0];
    params.end_date = dateRange.value[1];
  }
  if (queryForm.stock_name) {
    params.stock_name = String(queryForm.stock_name).trim();
  }
  if (queryForm.direction) {
    params.direction = String(queryForm.direction).trim().toUpperCase();
  }
  return params;
}

async function loadData(options = {}) {
  if (!props.accountId) {
    return;
  }
  const { force = false } = options;
  const params = buildParams();
  const requestId = latestRequestId.value + 1;
  latestRequestId.value = requestId;
  const cacheKey = JSON.stringify({
    accountId: Number(props.accountId),
    ...params,
  });
  if (!force && cache.has(cacheKey)) {
    if (requestId === latestRequestId.value) {
      applyPayload(cache.get(cacheKey));
    }
    return;
  }
  loading.value = true;
  try {
    const res = await getSimTradingTAnalysis(Number(props.accountId), params);
    if (!res?.success) {
      throw new Error(res?.message || '加载做T分析失败');
    }
    const payload = res.payload || {};
    cache.set(cacheKey, payload);
    if (requestId === latestRequestId.value) {
      applyPayload(payload);
    }
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '加载做T分析失败');
  } finally {
    if (requestId === latestRequestId.value) {
      loading.value = false;
    }
  }
}

function applyPayload(payload = {}) {
  rows.value = Array.isArray(payload.items) ? payload.items : [];
  pagination.total = Number(payload.total || rows.value.length || 0);
  pagination.page = Number(payload.page || pagination.page || 1);
  pagination.pageSize = Number(payload.page_size || pagination.pageSize || 20);
  const nextSummary = payload.summary || {};
  summary.total_profit_compare_today = Number(
    nextSummary.total_profit_compare_today || 0
  );
  summary.total_profit_compare_trade_day = Number(
    nextSummary.total_profit_compare_trade_day || 0
  );
  summary.total_fee = Number(nextSummary.total_fee || 0);
  summary.trade_count = Number(nextSummary.trade_count || 0);
}

async function handleDateRangeChange(value) {
  if (value && (!Array.isArray(value) || value.length !== 2)) {
    return;
  }
  pagination.page = 1;
  await loadData();
}

async function handleQueryChange() {
  pagination.page = 1;
  await loadData();
}

async function handlePageChange(nextPage) {
  pagination.page = Number(nextPage || 1);
  await loadData();
}

async function handlePageSizeChange(nextPageSize) {
  pagination.pageSize = Number(nextPageSize || 20);
  pagination.page = 1;
  await loadData();
}

const formatStockName = (row) => {
  const name = String(row?.stock_name || '').trim();
  const code = String(row?.stock_code || '').trim();
  return name ? `${name} (${code})` : code;
};

const formatMoney = (value) => {
  const num = Number(value || 0);
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercent = (value) => {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
};

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  let normalized =
    typeof value === 'string' ? value.trim().replace(' ', 'T') : value;
  if (typeof normalized === 'string') {
    const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized);
    // 与历史成交列表保持一致：无时区时间按 UTC 解析，再转换本地时间展示。
    if (!hasTimezone && normalized.includes('T')) {
      normalized = `${normalized}Z`;
    }
  }
  const dateValue = new Date(normalized);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
};

const formatDateTime = (value) => {
  const dateValue = normalizeDate(value);
  if (!dateValue) {
    return '--';
  }
  const year = dateValue.getFullYear();
  const month = `${dateValue.getMonth() + 1}`.padStart(2, '0');
  const day = `${dateValue.getDate()}`.padStart(2, '0');
  const hour = `${dateValue.getHours()}`.padStart(2, '0');
  const minute = `${dateValue.getMinutes()}`.padStart(2, '0');
  const second = `${dateValue.getSeconds()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const shouldShowFeeBreakdown = (row) => {
  const detail = row?.fee_breakdown_json;
  if (!detail || typeof detail !== 'object') {
    return false;
  }
  return true;
};

const profitClass = (value) => {
  const amount = Number(value || 0);
  if (amount > 0) {
    return 'profit-up';
  }
  if (amount < 0) {
    return 'profit-down';
  }
  return 'profit-flat';
};
</script>

<style scoped>
.t-analysis-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.t-analysis-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.t-analysis-title {
  font-size: 18px;
  font-weight: 600;
  color: #17324d;
}

.t-analysis-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.t-analysis-date-picker {
  width: 360px;
}

.t-analysis-stock-name {
  width: 180px;
}

.t-analysis-direction {
  width: 120px;
}

.refresh-button {
  padding-left: 18px;
  padding-right: 18px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(26, 95, 255, 0.22);
}

.refresh-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(26, 95, 255, 0.28);
}

.t-analysis-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 10px;
  border: 1px solid #e4ebf5;
  background: #ffffff;
  padding: 10px 12px;
}

.summary-card span {
  font-size: 13px;
  color: #5f7389;
}

.summary-card strong {
  font-size: 20px;
  font-weight: 700;
  color: #17324d;
}

.t-analysis-table :deep(.el-table__cell) {
  text-align: center;
}

.t-analysis-pagination {
  display: flex;
  justify-content: flex-end;
}

.fee-breakdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.fee-breakdown-item:last-child {
  margin-bottom: 0;
}

.fee-breakdown-note {
  margin-top: 6px;
  color: #5f7389;
  font-size: 12px;
}

.profit-up {
  color: #d92222;
}

.profit-down {
  color: #09884b;
}

.profit-flat {
  color: #586274;
}
</style>
