<template>
  <div class="subscription-page">
    <div class="page-header">
      <div>
        <h2>富途openD订阅管理</h2>
        <p>统一查看富途实时订阅额度、来源优先级、手动置顶与重平衡结果。</p>
      </div>
      <el-space>
        <el-button @click="openLogDrawer">查看日志</el-button>
        <el-button :loading="actionLoading" @click="refreshAll"
          >刷新数据</el-button
        >
        <el-button type="primary" :loading="actionLoading" @click="rebalanceNow"
          >执行重平衡</el-button
        >
      </el-space>
    </div>

    <div class="overview-grid" v-loading="overviewLoading">
      <div class="overview-card">
        <span>实时额度占用</span>
        <strong>{{ overviewText(overview.realtime_quota) }}</strong>
        <small :class="warningClass(overview.realtime_quota?.warning_level)">{{
          quotaHintText(overview.realtime_quota)
        }}</small>
      </div>
      <div class="overview-card">
        <span>历史K线额度</span>
        <strong>{{ overviewText(overview.history_kline_quota) }}</strong>
        <small
          :class="warningClass(overview.history_kline_quota?.warning_level)"
          >{{ quotaHintText(overview.history_kline_quota) }}</small
        >
      </div>
      <div class="overview-card">
        <span>已订阅股票数</span>
        <strong>{{ overview.total_subscriptions || 0 }}</strong>
        <small>按唯一股票统计，不等于实时额度占用</small>
      </div>
      <div class="overview-card">
        <span>最近一次调度</span>
        <strong>{{ formatDateTime(overview.last_rebalance_time) }}</strong>
        <small>{{ overview.warning_message || '当前无额外告警' }}</small>
      </div>
      <div class="overview-card">
        <span>缓存命中率</span>
        <strong>{{
          percentText(overview.reliability_metrics?.cache_hit_rate)
        }}</strong>
        <small
          >实时命中
          {{ overview.reliability_metrics?.realtime_hit_count || 0 }}，快照缓存
          {{
            overview.reliability_metrics?.snapshot_cache_hit_count || 0
          }}，陈旧回退
          {{ overview.reliability_metrics?.stale_cache_hit_count || 0 }}</small
        >
      </div>
      <div class="overview-card">
        <span>快照失败率</span>
        <strong
          :class="
            failureRateClass(
              overview.reliability_metrics?.snapshot_failure_rate
            )
          "
          >{{
            percentText(overview.reliability_metrics?.snapshot_failure_rate)
          }}</strong
        >
        <small>{{ snapshotFailureHint(overview.reliability_metrics) }}</small>
      </div>
      <div class="overview-card">
        <span>行情缓存规模</span>
        <strong
          >{{ overview.reliability_metrics?.realtime_cache_size || 0 }} /
          {{ overview.reliability_metrics?.snapshot_cache_size || 0 }}</strong
        >
        <small
          >实时订阅
          {{
            overview.reliability_metrics?.realtime_subscription_count || 0
          }}，实时缓存 / 快照缓存</small
        >
      </div>
    </div>

    <div class="metrics-grid" v-loading="overviewLoading">
      <div class="metrics-card">
        <div class="metrics-card-header">
          <span>行情请求命中拆分</span>
          <strong>{{
            overview.reliability_metrics?.requested_codes || 0
          }}</strong>
        </div>
        <el-progress
          :percentage="toProgress(overview.reliability_metrics?.cache_hit_rate)"
          :stroke-width="10"
          :show-text="false"
        />
        <div class="metrics-row">
          <span>实时</span>
          <span>{{
            overview.reliability_metrics?.realtime_hit_count || 0
          }}</span>
        </div>
        <div class="metrics-row">
          <span>快照刷新</span>
          <span>{{
            overview.reliability_metrics?.snapshot_refresh_hit_count || 0
          }}</span>
        </div>
        <div class="metrics-row">
          <span>未解析</span>
          <span>{{ overview.reliability_metrics?.unresolved_count || 0 }}</span>
        </div>
      </div>
      <div class="metrics-card">
        <div class="metrics-card-header">
          <span>快照调用质量</span>
          <strong>{{
            overview.reliability_metrics?.snapshot_request_count || 0
          }}</strong>
        </div>
        <el-progress
          :percentage="
            toProgress(
              1 -
                Number(overview.reliability_metrics?.snapshot_failure_rate || 0)
            )
          "
          status="success"
          :stroke-width="10"
          :show-text="false"
        />
        <div class="metrics-row">
          <span>快照请求股票数</span>
          <span>{{
            overview.reliability_metrics?.snapshot_requested_codes || 0
          }}</span>
        </div>
        <div class="metrics-row">
          <span>成功返回</span>
          <span>{{
            overview.reliability_metrics?.snapshot_success_count || 0
          }}</span>
        </div>
        <div class="metrics-row">
          <span>失败返回</span>
          <span>{{
            overview.reliability_metrics?.snapshot_failed_count || 0
          }}</span>
        </div>
      </div>
      <div class="metrics-card metrics-card-wide">
        <div class="metrics-card-header">
          <span>最近一次快照失败</span>
          <strong>{{
            formatDateTime(
              overview.reliability_metrics?.last_snapshot_failure_time
            )
          }}</strong>
        </div>
        <div class="metrics-message">
          {{
            overview.reliability_metrics?.last_snapshot_failure_message ||
            '暂无失败记录'
          }}
        </div>
      </div>
    </div>

    <div class="toolbar-card">
      <div class="toolbar-left">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索股票名称/代码"
          clearable
          class="toolbar-input"
          @keyup.enter="loadList"
        />
        <el-select
          v-model="filters.source_type"
          placeholder="来源筛选"
          clearable
          class="toolbar-select"
          @change="loadList"
        >
          <el-option
            v-for="item in SOURCE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="filters.current_status"
          placeholder="状态筛选"
          clearable
          class="toolbar-select"
          @change="loadList"
        >
          <el-option
            v-for="item in STATUS_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-button @click="loadList">搜索</el-button>
      </div>
      <div class="toolbar-right">
        <span class="toolbar-summary"
          >当前列表 {{ items.length }} 只，已订阅
          {{ subscribedCount }} 只，待调度 {{ plannedCount }} 只</span
        >
        <el-button
          type="danger"
          :disabled="!selectedRows.length"
          :loading="actionLoading"
          @click="unsubscribeSelected"
          >批量取消订阅</el-button
        >
      </div>
    </div>

    <el-table
      v-loading="listLoading"
      :data="items"
      border
      class="subscription-table"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="index" label="序号" width="72" />
      <el-table-column
        type="selection"
        width="48"
        :selectable="isRowSelectableForUnsubscribe"
      />
      <el-table-column
        prop="stock_code"
        label="股票代码"
        min-width="140"
        sortable
      />
      <el-table-column prop="stock_name" label="股票名称" min-width="160" />
      <el-table-column label="市场" width="110">
        <template #default="scope">{{
          formatMarket(scope.row.exchange_code)
        }}</template>
      </el-table-column>
      <el-table-column label="订阅类型" min-width="140">
        <template #default="scope">
          <el-tag
            v-for="item in scope.row.subscription_types"
            :key="item"
            size="small"
            class="tag-gap"
            >{{ item }}</el-tag
          >
          <span v-if="!scope.row.subscription_types?.length">--</span>
        </template>
      </el-table-column>
      <el-table-column label="来源" min-width="260">
        <template #default="scope">
          <div class="source-tags">
            <el-tag
              v-for="item in scope.row.source_refs"
              :key="`${item.source_type}_${item.source_id || item.source_label}`"
              size="small"
              effect="plain"
              class="tag-gap"
            >
              {{ item.source_label }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="priority_tier"
        label="优先级"
        width="100"
        sortable
      />
      <el-table-column label="人工置顶" width="110">
        <template #default="scope">
          <el-tag
            :type="scope.row.manual_pin ? 'danger' : 'info'"
            effect="light"
            >{{ scope.row.manual_pin ? '已置顶' : '否' }}</el-tag
          >
        </template>
      </el-table-column>
      <el-table-column label="置顶到期" min-width="170">
        <template #default="scope">{{
          formatDateTime(scope.row.pin_expire_time)
        }}</template>
      </el-table-column>
      <el-table-column prop="current_status" label="状态" width="110" />
      <el-table-column label="操作" fixed="right" width="220">
        <template #default="scope">
          <el-space>
            <el-button link type="primary" @click="togglePin(scope.row)">{{
              scope.row.manual_pin ? '取消置顶' : '人工置顶'
            }}</el-button>
            <el-button
              v-if="scope.row.current_status === 'subscribed'"
              link
              type="danger"
              @click="unsubscribeOne(scope.row)"
              >取消订阅</el-button
            >
            <el-button
              v-else
              link
              type="success"
              @click="subscribeOne(scope.row)"
              >订阅</el-button
            >
          </el-space>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="logDrawerVisible" title="订阅调度日志" size="45%">
      <el-table :data="logs" v-loading="logLoading" border>
        <el-table-column label="时间" min-width="170">
          <template #default="scope">{{
            formatDateTime(scope.row.created_time)
          }}</template>
        </el-table-column>
        <el-table-column prop="action_type" label="动作" width="120" />
        <el-table-column prop="trigger_type" label="触发来源" width="140" />
        <el-table-column prop="stock_code" label="股票" min-width="140" />
        <el-table-column prop="result_status" label="结果" width="110" />
        <el-table-column prop="message" label="说明" min-width="240" />
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup>
import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  reactive,
  ref,
} from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';

import {
  ensureFutuSubscriptionTargets,
  getFutuSubscriptionList,
  getFutuSubscriptionLogs,
  getFutuSubscriptionOverview,
  pinFutuSubscription,
  rebalanceFutuSubscriptions,
  refreshFutuSubscriptionQuota,
  unpinFutuSubscription,
  unsubscribeFutuSubscriptions,
} from '@/api/modules/futuSubscription';

const SOURCE_OPTIONS = [
  { label: '持仓', value: 'POSITION' },
  { label: '买入信号监控', value: 'BUY_SIGNAL_MONITOR' },
  { label: '模拟监控分组', value: 'SIM_MONITOR_GROUP' },
  { label: '人工置顶', value: 'MANUAL_PIN' },
  { label: '股票池', value: 'WATCHLIST' },
];
const STATUS_OPTIONS = [
  { label: '已订阅', value: 'subscribed' },
  { label: '待调度', value: 'planned' },
];
const MARKET_LABELS = {
  SH: 'SSE',
  SZ: 'SZSE',
  HK: 'HKEX',
  US: 'US',
  BJ: 'BSE',
};

const overviewLoading = ref(false);
const listLoading = ref(false);
const logLoading = ref(false);
const actionLoading = ref(false);
const logDrawerVisible = ref(false);
let overviewRefreshTimer = null;
const route = useRoute();
const pageRoutePath = String(route.path || '');
const overview = reactive({
  realtime_quota: {},
  history_kline_quota: {},
  total_subscriptions: 0,
  source_counts: {},
  last_rebalance_time: null,
  warning_message: '',
  reliability_metrics: {},
});
const filters = reactive({ keyword: '', source_type: '', current_status: '' });
const items = ref([]);
const logs = ref([]);
const selectedRows = ref([]);
const subscribedCount = computed(
  () =>
    items.value.filter((item) => item.current_status === 'subscribed').length
);
const plannedCount = computed(
  () => items.value.filter((item) => item.current_status === 'planned').length
);

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(
    typeof value === 'string' && !/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)
      ? `${value}Z`
      : value
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = normalizeDate(value);
  if (!date) return '--';
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function overviewText(quota = {}) {
  const total = Number(quota?.total || 0);
  const used = Number(quota?.used || 0);
  const remaining = Number(quota?.remaining || 0);
  return `${used} / ${total}，剩余 ${remaining}`;
}

function formatMarket(value) {
  const normalizedValue = String(value || '')
    .trim()
    .toUpperCase();
  return MARKET_LABELS[normalizedValue] || normalizedValue || '--';
}

function percentText(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function toProgress(value) {
  return Math.max(0, Math.min(100, Number(value || 0) * 100));
}

function warningClass(level) {
  if (level === 'critical') return 'profit-down';
  if (level === 'warning') return 'warning-text';
  return '';
}

function failureRateClass(value) {
  return Number(value || 0) >= 0.2
    ? 'profit-down'
    : Number(value || 0) >= 0.05
      ? 'warning-text'
      : '';
}

function snapshotFailureHint(metrics = {}) {
  const failed = Number(metrics?.snapshot_failed_count || 0);
  if (!failed) {
    return '当前没有快照失败记录';
  }
  return `${failed} 次失败，最近原因：${metrics?.last_snapshot_failure_message || '未知'}`;
}

function quotaHintText(quota = {}) {
  const usageRateText = `使用率 ${(Number(quota?.usage_rate || 0) * 100).toFixed(2)}%`;
  if (!quota?.warning_level || quota.warning_level === 'normal') {
    return `OpenD返回的实时占用信息，${usageRateText}`;
  }
  return quota.warning_level === 'critical'
    ? `OpenD返回的实时占用信息，额度已耗尽或接近耗尽`
    : `OpenD返回的实时占用信息，额度接近阈值`;
}

async function loadOverview() {
  overviewLoading.value = true;
  try {
    const res = await getFutuSubscriptionOverview();
    Object.assign(overview, res?.payload || {});
  } catch (error) {
    ElMessage.error(error?.message || '获取订阅概览失败');
  } finally {
    overviewLoading.value = false;
  }
}

async function loadList() {
  listLoading.value = true;
  try {
    const res = await getFutuSubscriptionList({
      keyword: filters.keyword || undefined,
      source_type: filters.source_type || undefined,
      current_status: filters.current_status || undefined,
    });
    items.value = res?.payload?.items || [];
  } catch (error) {
    ElMessage.error(error?.message || '获取订阅列表失败');
  } finally {
    listLoading.value = false;
  }
}

async function loadLogs() {
  logLoading.value = true;
  try {
    const res = await getFutuSubscriptionLogs({ limit: 100 });
    logs.value = res?.payload?.items || [];
  } catch (error) {
    ElMessage.error(error?.message || '获取订阅日志失败');
  } finally {
    logLoading.value = false;
  }
}

async function refreshAll() {
  actionLoading.value = true;
  try {
    await refreshFutuSubscriptionQuota();
    await Promise.all([loadOverview(), loadList()]);
    ElMessage.success('刷新成功');
  } catch (error) {
    ElMessage.error(error?.message || '刷新失败');
  } finally {
    actionLoading.value = false;
  }
}

async function rebalanceNow() {
  actionLoading.value = true;
  try {
    const res = await rebalanceFutuSubscriptions();
    ElMessage.success(res?.payload?.message || '重平衡完成');
    await Promise.all([loadOverview(), loadList(), loadLogs()]);
  } catch (error) {
    ElMessage.error(error?.message || '执行重平衡失败');
  } finally {
    actionLoading.value = false;
  }
}

function handleSelectionChange(rows) {
  selectedRows.value = rows;
}

function isRowSelectableForUnsubscribe(row) {
  return row.current_status === 'subscribed';
}

async function unsubscribeSelected() {
  if (!selectedRows.value.length) return;
  await ElMessageBox.confirm(
    `确认取消当前选中的 ${selectedRows.value.length} 只股票订阅吗？`,
    '批量取消订阅',
    { type: 'warning' }
  );
  actionLoading.value = true;
  try {
    await unsubscribeFutuSubscriptions({
      items: selectedRows.value.map((item) => ({
        stock_code: item.stock_code,
        exchange_code: item.exchange_code,
        subscription_types: item.subscription_types || [],
      })),
    });
    ElMessage.success('批量取消订阅成功');
    selectedRows.value = [];
    await Promise.all([loadOverview(), loadList(), loadLogs()]);
  } catch (error) {
    ElMessage.error(error?.message || '批量取消订阅失败');
  } finally {
    actionLoading.value = false;
  }
}

async function unsubscribeOne(row) {
  await ElMessageBox.confirm(
    `确认取消 ${row.stock_name || row.stock_code} 的订阅吗？`,
    '取消订阅',
    { type: 'warning' }
  );
  actionLoading.value = true;
  try {
    await unsubscribeFutuSubscriptions({
      items: [
        {
          stock_code: row.stock_code,
          exchange_code: row.exchange_code,
          subscription_types: row.subscription_types || [],
        },
      ],
    });
    ElMessage.success('取消订阅成功');
    await Promise.all([loadOverview(), loadList(), loadLogs()]);
  } catch (error) {
    ElMessage.error(error?.message || '取消订阅失败');
  } finally {
    actionLoading.value = false;
  }
}

async function subscribeOne(row) {
  actionLoading.value = true;
  try {
    const res = await ensureFutuSubscriptionTargets({
      stock_codes: [row.stock_code],
      exchange_codes: [row.exchange_code],
      reason: 'manual_subscribe',
    });
    ElMessage.success(res?.payload?.message || '订阅成功');
    await Promise.all([loadOverview(), loadList(), loadLogs()]);
  } catch (error) {
    ElMessage.error(error?.message || '订阅失败');
  } finally {
    actionLoading.value = false;
  }
}

async function togglePin(row) {
  actionLoading.value = true;
  try {
    if (row.manual_pin) {
      await unpinFutuSubscription(row.stock_code, row.exchange_code);
      ElMessage.success('已取消置顶');
    } else {
      const { value } = await ElMessageBox.prompt(
        '请输入置顶原因（可选）',
        '人工置顶',
        {
          inputPlaceholder: '例如：盘中重点观察',
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          inputValue: '',
        }
      );
      await pinFutuSubscription({
        stock_code: row.stock_code,
        exchange_code: row.exchange_code,
        expire_minutes: 240,
        reason: value || '人工置顶',
      });
      ElMessage.success('置顶成功');
    }
    await Promise.all([loadList(), loadLogs()]);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '操作失败');
    }
  } finally {
    actionLoading.value = false;
  }
}

async function openLogDrawer() {
  logDrawerVisible.value = true;
  await loadLogs();
}

function startOverviewRefresh() {
  if (overviewRefreshTimer) {
    window.clearInterval(overviewRefreshTimer);
  }
  overviewRefreshTimer = window.setInterval(() => {
    if (
      route.path !== pageRoutePath ||
      document.visibilityState !== 'visible' ||
      overviewLoading.value ||
      actionLoading.value
    ) {
      return;
    }
    loadOverview();
  }, 10000);
}

function stopOverviewRefresh() {
  if (overviewRefreshTimer) {
    window.clearInterval(overviewRefreshTimer);
    overviewRefreshTimer = null;
  }
}

onMounted(async () => {
  await Promise.all([loadOverview(), loadList()]);
  startOverviewRefresh();
});

onActivated(() => {
  if (route.path !== pageRoutePath) {
    return;
  }
  startOverviewRefresh();
});

onDeactivated(() => {
  stopOverviewRefresh();
});

onBeforeUnmount(() => {
  stopOverviewRefresh();
});
</script>

<style scoped>
.subscription-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-header h2 {
  margin: 0 0 6px;
}

.page-header p {
  margin: 0;
  color: #666;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.overview-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%);
}

.overview-card span,
.overview-card small {
  color: #666;
}

.overview-card strong {
  font-size: 20px;
  line-height: 1.3;
}

.metrics-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
}

.metrics-card-wide {
  min-height: 140px;
}

.metrics-card-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.metrics-card-header span {
  color: #666;
}

.metrics-card-header strong {
  font-size: 18px;
}

.metrics-row {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 13px;
}

.metrics-message {
  min-height: 48px;
  color: #666;
  line-height: 1.6;
  word-break: break-word;
}

.toolbar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  background: #fff;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.toolbar-summary {
  color: #666;
  font-size: 13px;
  white-space: nowrap;
}

.toolbar-input {
  width: 280px;
}

.toolbar-select {
  width: 220px;
}

.subscription-table :deep(th .cell) {
  white-space: nowrap;
}

.source-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-gap {
  margin-right: 0;
}

.warning-text {
  color: #d48806;
}

.profit-down {
  color: #159947;
}

@media (max-width: 960px) {
  .page-header,
  .toolbar-card {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-input,
  .toolbar-select {
    width: 100%;
  }
}
</style>
