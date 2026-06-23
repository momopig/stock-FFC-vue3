<template>
  <div class="log-management-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="hero-kicker">System Governance</span>
        <h2>日志管理工作台</h2>
        <p>
          统一管理策略执行日志、富途订阅日志和后续扩展日志表，覆盖容量监控、配置治理、日志预览和清理追踪。
        </p>
        <div class="hero-meta">
          <span>最近扫描：{{ formatDateTime(overview.last_scan_time) }}</span>
          <span>自动刷新：30 秒</span>
          <span v-if="overview.management_note">{{
            overview.management_note
          }}</span>
        </div>
      </div>
      <div class="hero-actions">
        <el-button :loading="pageLoading" @click="refreshPage"
          >刷新工作台</el-button
        >
        <el-button
          type="warning"
          :loading="actionLoading"
          @click="triggerAutoCleanup"
          >立即巡检</el-button
        >
      </div>
    </section>

    <section class="metric-grid">
      <article class="metric-card accent-blue">
        <span>日志表总容量</span>
        <strong>{{ formatSize(overview.total_size_gb) }}</strong>
        <small>已纳入 {{ overview.table_count || 0 }} 张表</small>
      </article>
      <article class="metric-card accent-amber">
        <span>风险表数量</span>
        <strong
          >{{ overview.warning_count || 0 }} /
          {{ overview.critical_count || 0 }}</strong
        >
        <small>预警 / 超限</small>
      </article>
      <article class="metric-card accent-green">
        <span>磁盘剩余空间</span>
        <strong>{{ formatSize(overview.disk_usage?.free_gb) }}</strong>
        <small>{{ overview.disk_usage?.disk_path || '--' }}</small>
      </article>
      <article class="metric-card accent-slate">
        <span>磁盘使用率</span>
        <strong>{{ diskUsageRate }}%</strong>
        <small
          >{{ formatSize(overview.disk_usage?.used_gb) }} /
          {{ formatSize(overview.disk_usage?.total_gb) }}</small
        >
      </article>
    </section>

    <section class="workspace-grid">
      <aside class="table-navigator">
        <div class="panel-heading">
          <div>
            <h3>日志目录</h3>
            <p>按占用容量排序，优先处理高风险表</p>
          </div>
        </div>
        <div class="table-cards" v-loading="pageLoading">
          <button
            v-for="item in tableItems"
            :key="item.table_name"
            type="button"
            class="table-card"
            :class="[
              `state-${item.status}`,
              { active: item.table_name === selectedTableName },
            ]"
            @click="selectTable(item.table_name)"
          >
            <div class="table-card-header">
              <strong>{{ item.display_name }}</strong>
              <span class="state-pill">{{ statusLabel(item.status) }}</span>
            </div>
            <span class="table-name">{{ item.table_name }}</span>
            <div class="table-card-metrics">
              <span>{{ formatSize(item.current_size_gb) }}</span>
              <span>{{ item.row_count || 0 }} 条</span>
              <span>阈值 {{ item.warning_threshold_percent }}%</span>
            </div>
          </button>
        </div>
      </aside>

      <main class="workbench-panel">
        <div class="panel-heading wide">
          <div>
            <h3>{{ selectedSummary?.display_name || '请选择日志表' }}</h3>
            <p>
              {{ selectedSummary?.table_name || '选择左侧日志表后查看详情' }}
            </p>
          </div>
          <div class="summary-tags" v-if="selectedSummary">
            <el-tag size="small" effect="plain">{{
              categoryLabel(selectedSummary.table_category)
            }}</el-tag>
            <el-tag
              size="small"
              :type="selectedSummary.auto_cleanup_enabled ? 'success' : 'info'"
            >
              {{
                selectedSummary.auto_cleanup_enabled
                  ? '自动清理已开启'
                  : '自动清理已关闭'
              }}
            </el-tag>
          </div>
        </div>

        <div class="table-overview-grid" v-if="selectedSummary">
          <div class="overview-strip-card">
            <span>当前容量</span>
            <strong>{{ formatSize(selectedSummary.current_size_gb) }}</strong>
            <small>上限 {{ formatSize(selectedSummary.max_size_gb) }}</small>
          </div>
          <div class="overview-strip-card">
            <span>使用率</span>
            <strong
              >{{ Number(selectedSummary.usage_rate || 0).toFixed(2) }}%</strong
            >
            <small
              >预警阈值 {{ selectedSummary.warning_threshold_percent }}%</small
            >
          </div>
          <div class="overview-strip-card">
            <span>日志条数</span>
            <strong>{{ selectedSummary.row_count || 0 }}</strong>
            <small
              >最新时间
              {{ formatDateTime(selectedSummary.latest_log_time) }}</small
            >
          </div>
        </div>

        <el-tabs v-model="activeTab" class="workbench-tabs">
          <el-tab-pane label="日志概览" name="overview" lazy>
            <div class="toolbar-card">
              <div class="toolbar-left">
                <el-input
                  v-model="logFilters.keyword"
                  clearable
                  class="toolbar-input"
                  placeholder="搜索标题、消息、股票代码、关联ID"
                  @keyup.enter="loadLogs"
                />
                <el-input
                  v-model="logFilters.status"
                  clearable
                  class="toolbar-status"
                  placeholder="状态筛选，如 SUCCESS / failed"
                  @keyup.enter="loadLogs"
                />
                <el-select
                  v-model="logPager.page_size"
                  class="toolbar-page-size"
                  @change="handlePageSizeChange"
                >
                  <el-option
                    v-for="size in [5, 10, 20, 100]"
                    :key="size"
                    :label="`${size} 条/页`"
                    :value="size"
                  />
                </el-select>
                <el-button @click="loadLogs">搜索</el-button>
              </div>
              <div class="toolbar-right">
                <span>共 {{ logPager.total || 0 }} 条日志</span>
              </div>
            </div>

            <el-table
              v-loading="logLoading"
              :data="logItems"
              border
              class="log-table"
            >
              <el-table-column
                prop="id"
                label="日志ID"
                min-width="110"
                sortable
              />
              <el-table-column label="发生时间" min-width="180">
                <template #default="scope">{{
                  formatDateTime(scope.row.created_time)
                }}</template>
              </el-table-column>
              <el-table-column
                prop="related_id"
                label="关联ID"
                min-width="120"
              />
              <el-table-column prop="title" label="标题" min-width="180" />
              <el-table-column
                prop="message"
                label="日志内容"
                min-width="320"
                show-overflow-tooltip
              />
              <el-table-column
                prop="stock_code"
                label="股票代码"
                min-width="130"
              />
              <el-table-column
                prop="stock_name"
                label="股票名称"
                min-width="140"
              />
              <el-table-column prop="status" label="执行状态" min-width="120" />
            </el-table>

            <div class="pager-wrap">
              <el-pagination
                background
                layout="total, sizes, prev, pager, next"
                :current-page="logPager.page"
                :page-size="logPager.page_size"
                :page-sizes="[5, 10, 20, 100]"
                :total="logPager.total"
                @current-change="handlePageChange"
                @size-change="handlePageSizeChange"
              />
            </div>

            <div class="record-panel">
              <div class="panel-heading wide compact">
                <div>
                  <h3>清理记录</h3>
                  <p>
                    保留最近
                    {{ cleanupRecordTotal }}
                    条执行记录，用于回溯手动或自动治理动作
                  </p>
                </div>
              </div>
              <el-table v-loading="recordLoading" :data="cleanupRecords" border>
                <el-table-column
                  prop="display_name"
                  label="日志表"
                  min-width="160"
                />
                <el-table-column
                  prop="trigger_mode"
                  label="触发方式"
                  min-width="110"
                />
                <el-table-column
                  prop="cleanup_mode"
                  label="清理模式"
                  min-width="140"
                />
                <el-table-column
                  prop="deleted_rows"
                  label="删除条数"
                  min-width="110"
                  sortable
                />
                <el-table-column
                  prop="before_size_gb"
                  label="清理前(GB)"
                  min-width="120"
                  sortable
                />
                <el-table-column
                  prop="after_size_gb"
                  label="清理后(GB)"
                  min-width="120"
                  sortable
                />
                <el-table-column
                  prop="estimated_after_size_gb"
                  label="估算剩余(GB)"
                  min-width="130"
                  sortable
                />
                <el-table-column
                  prop="duration_ms"
                  label="耗时(ms)"
                  min-width="110"
                  sortable
                />
                <el-table-column prop="status" label="结果" min-width="100" />
                <el-table-column
                  prop="message"
                  label="说明"
                  min-width="260"
                  show-overflow-tooltip
                />
                <el-table-column label="执行时间" min-width="180">
                  <template #default="scope">{{
                    formatDateTime(scope.row.created_time)
                  }}</template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="日志治理" name="governance" lazy>
            <div class="governance-grid" v-if="selectedSummary">
              <section class="governance-card">
                <div class="panel-heading compact">
                  <div>
                    <h3>治理配置</h3>
                    <p>单表维护容量上限、预警线和自动清理策略</p>
                  </div>
                </div>
                <el-form label-position="top" class="governance-form">
                  <el-form-item label="展示名称">
                    <el-input
                      v-model="profileForm.display_name"
                      placeholder="例如：策略执行日志"
                    />
                  </el-form-item>
                  <div class="form-grid">
                    <el-form-item label="最大容量上限(GB)">
                      <el-input-number
                        v-model="profileForm.max_size_gb"
                        :min="1"
                        :step="0.5"
                        :precision="2"
                      />
                    </el-form-item>
                    <el-form-item label="预警阈值(%)">
                      <el-input-number
                        v-model="profileForm.warning_threshold_percent"
                        :min="10"
                        :max="99"
                      />
                    </el-form-item>
                    <el-form-item label="清理目标(%)">
                      <el-input-number
                        v-model="profileForm.cleanup_target_percent"
                        :min="10"
                        :max="95"
                      />
                    </el-form-item>
                  </div>
                  <el-form-item label="自动清理">
                    <el-switch
                      v-model="profileForm.auto_cleanup_enabled"
                      active-text="开启"
                      inactive-text="关闭"
                    />
                  </el-form-item>
                  <div class="card-actions">
                    <el-button
                      type="primary"
                      :loading="actionLoading"
                      @click="saveProfile"
                      >保存配置</el-button
                    >
                    <el-button @click="resetProfileForm">重置</el-button>
                  </div>
                </el-form>
              </section>

              <section class="governance-card">
                <div class="panel-heading compact">
                  <div>
                    <h3>手动清理</h3>
                    <p>支持按目标容量或保留天数删除最旧日志，并记录清理结果</p>
                  </div>
                </div>
                <el-form label-position="top" class="governance-form">
                  <el-form-item label="清理模式">
                    <el-radio-group v-model="cleanupForm.cleanup_mode">
                      <el-radio-button label="target_size_gb"
                        >清理到指定容量</el-radio-button
                      >
                      <el-radio-button label="retention_days"
                        >清理指定天数前日志</el-radio-button
                      >
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item
                    v-if="cleanupForm.cleanup_mode === 'target_size_gb'"
                    label="目标容量(GB)"
                  >
                    <el-input-number
                      v-model="cleanupForm.target_size_gb"
                      :min="0.1"
                      :step="0.5"
                      :precision="2"
                    />
                  </el-form-item>
                  <el-form-item v-else label="保留天数">
                    <el-input-number
                      v-model="cleanupForm.retention_days"
                      :min="1"
                      :max="3650"
                    />
                  </el-form-item>
                  <div class="cleanup-hint">
                    <span
                      >当前物理容量：{{
                        formatSize(selectedSummary.current_size_gb)
                      }}</span
                    >
                    <span
                      >PostgreSQL
                      删除后物理体积可能不会即时下降，页面会同时显示估算剩余容量。</span
                    >
                  </div>
                  <div class="card-actions">
                    <el-button
                      type="danger"
                      :loading="actionLoading"
                      @click="runCleanup"
                      >执行清理</el-button
                    >
                  </div>
                </el-form>
              </section>
            </div>
          </el-tab-pane>
        </el-tabs>
      </main>
    </section>
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
  watch,
} from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';

import {
  getLogCleanupRecords,
  getLogManagementOverview,
  getLogManagementTables,
  getLogTableLogs,
  runAutoLogCleanup,
  runManualLogCleanup,
  updateLogTableProfile,
} from '@/api/modules/logManagement';

const REFRESH_INTERVAL_MS = 30000;
const route = useRoute();
const pageRoutePath = String(route.path || '');

const pageLoading = ref(false);
const logLoading = ref(false);
const recordLoading = ref(false);
const actionLoading = ref(false);
const activeTab = ref('overview');
const selectedTableName = ref('');
const overview = reactive({
  total_size_gb: 0,
  table_count: 0,
  warning_count: 0,
  critical_count: 0,
  tables: [],
  disk_usage: {},
  last_scan_time: null,
  management_note: '',
});
const tableItems = ref([]);
const logItems = ref([]);
const cleanupRecords = ref([]);
const cleanupRecordTotal = ref(0);
const logFilters = reactive({ keyword: '', status: '' });
const logPager = reactive({ page: 1, page_size: 20, total: 0 });
const profileForm = reactive({
  display_name: '',
  max_size_gb: 10,
  warning_threshold_percent: 80,
  cleanup_target_percent: 70,
  auto_cleanup_enabled: true,
});
const cleanupForm = reactive({
  cleanup_mode: 'target_size_gb',
  target_size_gb: 1,
  retention_days: 7,
});

let refreshTimer = null;

const selectedSummary = computed(
  () =>
    tableItems.value.find(
      (item) => item.table_name === selectedTableName.value
    ) || null
);
const diskUsageRate = computed(() => {
  const total = Number(overview.disk_usage?.total_gb || 0);
  const used = Number(overview.disk_usage?.used_gb || 0);
  if (!total) return '0.00';
  return ((used / total) * 100).toFixed(2);
});

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

function formatSize(value) {
  return `${Number(value || 0).toFixed(2)} GB`;
}

function statusLabel(value) {
  if (value === 'critical') return '超限';
  if (value === 'warning') return '预警';
  return '正常';
}

function categoryLabel(value) {
  const mapping = {
    strategy: '策略日志',
    futu: '富途日志',
    custom: '扩展日志',
  };
  return mapping[value] || value || '--';
}

function syncProfileForm() {
  if (!selectedSummary.value) return;
  profileForm.display_name = selectedSummary.value.display_name || '';
  profileForm.max_size_gb = Number(selectedSummary.value.max_size_gb || 10);
  profileForm.warning_threshold_percent = Number(
    selectedSummary.value.warning_threshold_percent || 80
  );
  profileForm.cleanup_target_percent = Number(
    selectedSummary.value.cleanup_target_percent || 70
  );
  profileForm.auto_cleanup_enabled = Boolean(
    selectedSummary.value.auto_cleanup_enabled
  );
  cleanupForm.target_size_gb = Math.max(
    Number(selectedSummary.value.max_size_gb || 1) * 0.7,
    0.1
  );
}

function selectTable(tableName) {
  selectedTableName.value = tableName;
}

async function loadOverviewAndTables() {
  pageLoading.value = true;
  try {
    const [overviewRes, tablesRes] = await Promise.all([
      getLogManagementOverview(),
      getLogManagementTables(),
    ]);
    Object.assign(overview, overviewRes?.payload || {});
    tableItems.value =
      tablesRes?.payload?.items || overviewRes?.payload?.tables || [];
    if (!selectedTableName.value && tableItems.value.length) {
      selectedTableName.value = tableItems.value[0].table_name;
    }
    if (
      selectedTableName.value &&
      !tableItems.value.some(
        (item) => item.table_name === selectedTableName.value
      ) &&
      tableItems.value.length
    ) {
      selectedTableName.value = tableItems.value[0].table_name;
    }
    syncProfileForm();
  } catch (error) {
    ElMessage.error(error?.message || '获取日志工作台失败');
  } finally {
    pageLoading.value = false;
  }
}

async function loadLogs() {
  if (!selectedTableName.value) return;
  logLoading.value = true;
  try {
    const res = await getLogTableLogs(selectedTableName.value, {
      keyword: logFilters.keyword || undefined,
      status: logFilters.status || undefined,
      page: logPager.page,
      page_size: logPager.page_size,
    });
    logItems.value = res?.payload?.items || [];
    logPager.total = Number(res?.payload?.total || 0);
  } catch (error) {
    ElMessage.error(error?.message || '获取日志预览失败');
  } finally {
    logLoading.value = false;
  }
}

async function loadCleanupRecords() {
  recordLoading.value = true;
  try {
    const res = await getLogCleanupRecords({ limit: 50 });
    cleanupRecords.value = res?.payload?.items || [];
    cleanupRecordTotal.value = Number(
      res?.payload?.total || cleanupRecords.value.length || 0
    );
  } catch (error) {
    ElMessage.error(error?.message || '获取清理记录失败');
  } finally {
    recordLoading.value = false;
  }
}

async function refreshPage() {
  await Promise.all([loadOverviewAndTables(), loadCleanupRecords()]);
  if (selectedTableName.value) {
    await loadLogs();
  }
}

async function saveProfile() {
  if (!selectedTableName.value) return;
  actionLoading.value = true;
  try {
    await updateLogTableProfile(selectedTableName.value, {
      display_name: profileForm.display_name || undefined,
      max_size_gb: profileForm.max_size_gb,
      warning_threshold_percent: profileForm.warning_threshold_percent,
      cleanup_target_percent: profileForm.cleanup_target_percent,
      auto_cleanup_enabled: profileForm.auto_cleanup_enabled,
    });
    ElMessage.success('配置已更新');
    await refreshPage();
  } catch (error) {
    ElMessage.error(error?.message || '更新配置失败');
  } finally {
    actionLoading.value = false;
  }
}

function resetProfileForm() {
  syncProfileForm();
}

async function runCleanup() {
  if (!selectedTableName.value) return;
  const confirmText =
    cleanupForm.cleanup_mode === 'target_size_gb'
      ? `确认将 ${selectedSummary.value?.display_name} 清理到 ${Number(cleanupForm.target_size_gb || 0).toFixed(2)}GB 吗？`
      : `确认删除 ${Number(cleanupForm.retention_days || 0)} 天前的日志吗？`;
  await ElMessageBox.confirm(
    `${confirmText} 清理后日志不可恢复。`,
    '执行日志清理',
    { type: 'warning' }
  );
  actionLoading.value = true;
  try {
    const payload = {
      table_names: [selectedTableName.value],
      cleanup_mode: cleanupForm.cleanup_mode,
      target_size_gb:
        cleanupForm.cleanup_mode === 'target_size_gb'
          ? cleanupForm.target_size_gb
          : undefined,
      retention_days:
        cleanupForm.cleanup_mode === 'retention_days'
          ? cleanupForm.retention_days
          : undefined,
    };
    const res = await runManualLogCleanup(payload);
    const result = res?.payload?.items?.[0];
    ElMessage.success(result?.message || '清理执行完成');
    await refreshPage();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '日志清理失败');
    }
  } finally {
    actionLoading.value = false;
  }
}

async function triggerAutoCleanup() {
  actionLoading.value = true;
  try {
    const res = await runAutoLogCleanup();
    const count = Number(res?.payload?.items?.length || 0);
    ElMessage.success(
      count
        ? `自动巡检完成，处理 ${count} 张表`
        : '自动巡检完成，当前无超限日志表'
    );
    await refreshPage();
  } catch (error) {
    ElMessage.error(error?.message || '自动巡检失败');
  } finally {
    actionLoading.value = false;
  }
}

function handlePageChange(page) {
  logPager.page = page;
  loadLogs();
}

function handlePageSizeChange(size) {
  logPager.page_size = size;
  logPager.page = 1;
  loadLogs();
}

watch(selectedTableName, async () => {
  logPager.page = 1;
  syncProfileForm();
  await loadLogs();
});

function startRefreshTimer() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
  refreshTimer = window.setInterval(() => {
    if (route.path !== pageRoutePath) {
      return;
    }
    refreshPage();
  }, REFRESH_INTERVAL_MS);
}

function stopRefreshTimer() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

onMounted(async () => {
  await refreshPage();
  startRefreshTimer();
});

onActivated(() => {
  if (route.path !== pageRoutePath) {
    return;
  }
  startRefreshTimer();
});

onDeactivated(() => {
  stopRefreshTimer();
});

onBeforeUnmount(() => {
  stopRefreshTimer();
});
</script>

<style scoped>
.log-management-page {
  --paper: #f7f4ee;
  --panel: rgba(255, 255, 255, 0.88);
  --line: rgba(27, 44, 42, 0.12);
  --text-main: #182527;
  --text-subtle: #607172;
  --accent-blue: #1d5c7a;
  --accent-amber: #bb6b25;
  --accent-green: #18695f;
  --accent-slate: #31444e;
  min-height: 100%;
  padding: 18px;
  color: var(--text-main);
  background:
    radial-gradient(
      circle at top left,
      rgba(29, 92, 122, 0.16),
      transparent 32%
    ),
    radial-gradient(
      circle at right 20%,
      rgba(187, 107, 37, 0.16),
      transparent 28%
    ),
    linear-gradient(180deg, #f7f4ee 0%, #f2efe7 100%);
}

.hero-panel,
.table-navigator,
.workbench-panel,
.toolbar-card,
.record-panel,
.governance-card {
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--panel);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 40px rgba(33, 43, 43, 0.08);
}

.hero-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 28px;
}

.hero-kicker {
  display: inline-flex;
  margin-bottom: 10px;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-blue);
}

.hero-copy h2,
.panel-heading h3 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  letter-spacing: 0.02em;
}

.hero-copy p,
.panel-heading p,
.hero-meta,
.overview-strip-card small,
.metric-card small,
.table-name,
.cleanup-hint {
  color: var(--text-subtle);
}

.hero-copy p {
  max-width: 760px;
  margin: 10px 0 0;
  line-height: 1.75;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 16px;
  font-size: 13px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.metric-grid,
.table-overview-grid,
.governance-grid {
  display: grid;
  gap: 14px;
}

.metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 16px;
}

.metric-card,
.overview-strip-card {
  position: relative;
  overflow: hidden;
  padding: 18px 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(27, 44, 42, 0.08);
}

.metric-card::after,
.overview-strip-card::after {
  content: '';
  position: absolute;
  inset: auto -18px -18px auto;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  opacity: 0.14;
}

.accent-blue::after {
  background: var(--accent-blue);
}
.accent-amber::after {
  background: var(--accent-amber);
}
.accent-green::after {
  background: var(--accent-green);
}
.accent-slate::after {
  background: var(--accent-slate);
}

.metric-card span,
.overview-strip-card span {
  display: block;
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.metric-card strong,
.overview-strip-card strong {
  display: block;
  margin: 8px 0 6px;
  font-size: 28px;
  line-height: 1.15;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.table-navigator,
.workbench-panel {
  padding: 18px;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-heading p {
  margin: 6px 0 0;
  font-size: 13px;
}

.panel-heading.compact,
.panel-heading.wide.compact {
  margin-bottom: 14px;
}

.table-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.table-card {
  width: 100%;
  padding: 16px;
  text-align: left;
  border: 1px solid rgba(27, 44, 42, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.table-card:hover,
.table-card.active {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(33, 43, 43, 0.08);
}

.table-card.active {
  border-color: rgba(29, 92, 122, 0.42);
}

.table-card.state-critical {
  background: linear-gradient(
    180deg,
    rgba(255, 239, 237, 0.92),
    rgba(255, 255, 255, 0.8)
  );
}

.table-card.state-warning {
  background: linear-gradient(
    180deg,
    rgba(255, 245, 228, 0.92),
    rgba(255, 255, 255, 0.8)
  );
}

.table-card-header,
.table-card-metrics,
.summary-tags,
.toolbar-card,
.toolbar-left,
.toolbar-right,
.card-actions,
.cleanup-hint {
  display: flex;
  align-items: center;
}

.table-card-header,
.toolbar-card,
.cleanup-hint {
  justify-content: space-between;
}

.table-card-header {
  gap: 10px;
}

.state-pill {
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(24, 37, 39, 0.08);
  font-size: 12px;
}

.table-name {
  display: block;
  margin-top: 10px;
  font-size: 12px;
}

.table-card-metrics {
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
  font-size: 12px;
  color: var(--text-main);
}

.workbench-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.workbench-tabs :deep(.el-tabs__item) {
  height: 42px;
  padding: 0 18px;
  border-radius: 999px;
}

.workbench-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.workbench-tabs :deep(.is-active) {
  color: #fff;
  background: linear-gradient(90deg, #1d5c7a, #18695f);
}

.table-overview-grid,
.governance-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.table-overview-grid {
  margin-bottom: 16px;
}

.toolbar-card,
.record-panel,
.governance-card {
  padding: 16px;
}

.toolbar-card {
  gap: 12px;
  margin-bottom: 14px;
}

.toolbar-left,
.toolbar-right,
.card-actions,
.cleanup-hint {
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-input {
  width: 320px;
}

.toolbar-status,
.toolbar-page-size {
  width: 220px;
}

.log-table :deep(th .cell),
.record-panel :deep(th .cell) {
  white-space: nowrap;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.record-panel {
  margin-top: 18px;
}

.governance-grid {
  align-items: start;
}

.governance-form {
  margin-top: 6px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.cleanup-hint {
  align-items: flex-start;
  flex-direction: column;
  margin: 8px 0 14px;
  font-size: 13px;
  line-height: 1.65;
}

@media (max-width: 1380px) {
  .metric-grid,
  .table-overview-grid,
  .governance-grid,
  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1120px) {
  .workspace-grid,
  .metric-grid,
  .table-overview-grid,
  .governance-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel,
  .toolbar-card {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
