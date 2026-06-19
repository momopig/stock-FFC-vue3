<template>
  <section class="settings-panel">
    <el-tabs v-model="activeTab" class="inner-tabs">
      <el-tab-pane label="本地查找表管理" name="manage">
        <div class="panel-heading">
          <div>
            <h3>本地查找表管理</h3>
            <p>负责数据源同步与导出，支持 A 股按交易所分段执行。</p>
          </div>
        </div>

        <div class="form-grid">
          <el-form label-width="110px" class="sync-form">
            <el-form-item label="同步数据源">
              <el-select
                v-model="syncForm.dataSource"
                style="width: 100%"
                placeholder="请选择数据源"
                @change="handleSyncSourceChange"
              >
                <el-option
                  v-for="source in syncSources"
                  :key="source.source_key"
                  :label="source.source_name"
                  :value="source.source_key"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="同步市场">
              <el-checkbox-group v-model="syncForm.markets">
                <el-checkbox
                  v-for="market in visibleMarkets"
                  :key="market.value"
                  :label="market.value"
                >
                  {{ market.label }}
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item v-if="showAbSplitOptions" label="A股分段执行">
              <el-switch v-model="syncForm.splitAbExecution" />
            </el-form-item>
            <el-form-item
              v-if="showAbSplitOptions && syncForm.splitAbExecution"
              label="A股交易所"
            >
              <el-checkbox-group v-model="syncForm.abExchanges">
                <el-checkbox label="SH">上交所</el-checkbox>
                <el-checkbox label="SZ">深交所</el-checkbox>
                <el-checkbox label="BJ">北交所</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="快捷操作">
              <el-space wrap>
                <el-button @click="selectAllMarkets">全选</el-button>
                <el-button @click="selectOnlyAb">仅A股</el-button>
                <el-button @click="clearMarkets">清空</el-button>
              </el-space>
            </el-form-item>
            <el-form-item label="操作">
              <el-space wrap>
                <el-button type="primary" :loading="syncLoading" @click="startSyncTask">
                  启动后台同步
                </el-button>
                <el-button @click="handleExport">导出JSON</el-button>
              </el-space>
            </el-form-item>
          </el-form>

          <div class="sync-tip-card">
            <h4>当前数据源说明</h4>
            <p>{{ selectedSyncSource?.desc || '暂无描述' }}</p>
            <p>支持市场：{{ selectedSyncSource?.support_markets?.join(', ') || '--' }}</p>
            <p v-if="latestTask">最近任务：#{{ latestTask.task_id }}（{{ latestTask.status_label }}）</p>
            <p class="warning">提示：若当前 futu SDK 不支持 BJ，后端会返回明确失败信息并保留已完成分段结果。</p>
          </div>
        </div>

        <div v-if="processSteps.length" class="process-panel">
          <h4>执行过程</h4>
          <div class="progress-line">
            <el-progress :percentage="progressPercent" :status="progressStatus" :stroke-width="14" />
            <span class="progress-text">{{ progressText }}</span>
          </div>
          <p class="current-step">当前阶段：{{ currentStepText }}</p>
          <p class="elapsed-text">同步耗时：{{ formatElapsedSeconds(syncElapsedSeconds) }} s</p>
          <ul>
            <li v-for="(step, index) in processSteps" :key="`${index}-${step}`">{{ step }}</li>
          </ul>
        </div>
      </el-tab-pane>

      <el-tab-pane label="本地查找表预览" name="preview" lazy>
        <div class="panel-heading">
          <div>
            <h3>本地查找表预览</h3>
            <p>可按关键词和市场筛选并维护单条记录。</p>
          </div>
        </div>

        <el-space wrap class="toolbar">
          <el-input
            v-model="itemQuery.keyword"
            placeholder="名称/代码/拼音"
            clearable
            style="width: 260px"
            @keyup.enter="refreshItemList"
          />
          <el-select
            v-model="itemQuery.market"
            clearable
            placeholder="全部市场"
            style="width: 150px"
            @change="refreshItemList"
          >
            <el-option label="A股" value="ab" />
            <el-option label="港股" value="hk" />
            <el-option label="美股" value="us" />
          </el-select>
          <el-button type="primary" @click="refreshItemList">查询</el-button>
        </el-space>

        <el-table :data="itemList" border stripe v-loading="itemLoading">
          <el-table-column prop="full_code" label="完整代码" min-width="140" sortable />
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column prop="market" label="市场" width="90" sortable />
          <el-table-column prop="exchange" label="交易所" width="90" />
          <el-table-column prop="pinyin_short" label="拼音简写" min-width="120" />
          <el-table-column prop="source" label="来源" width="100" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="scope">
              <el-popconfirm title="确认删除该记录吗？" @confirm="removeItem(scope.row.full_code)">
                <template #reference>
                  <el-button type="danger" link>删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          class="pagination"
          background
          layout="total, prev, pager, next"
          :current-page="itemQuery.page"
          :page-size="itemQuery.page_size"
          :total="itemTotal"
          @current-change="handleItemPageChange"
        />
      </el-tab-pane>

      <el-tab-pane label="同步历史" name="history" lazy>
        <div class="panel-heading">
          <div>
            <h3>同步历史</h3>
            <p>支持分页和条件查询，用于追踪同步耗时、来源与失败原因。</p>
          </div>
        </div>

        <el-space wrap class="toolbar">
          <el-select
            v-model="logQuery.data_source"
            clearable
            placeholder="全部数据源"
            style="width: 150px"
          >
            <el-option label="富途" value="futu" />
            <el-option label="AKShare" value="akshare" />
          </el-select>
          <el-select
            v-model="logQuery.status"
            clearable
            placeholder="全部状态"
            style="width: 130px"
          >
            <el-option label="执行中" :value="0" />
            <el-option label="成功" :value="1" />
            <el-option label="失败" :value="2" />
          </el-select>
          <el-select
            v-model="logQuery.market"
            clearable
            placeholder="全部市场"
            style="width: 130px"
          >
            <el-option label="A股" value="ab" />
            <el-option label="港股" value="hk" />
            <el-option label="美股" value="us" />
          </el-select>
          <el-button type="primary" @click="refreshLogList">查询</el-button>
          <el-button @click="resetLogQuery">重置</el-button>
        </el-space>

        <el-table :data="logList" border stripe v-loading="logLoading">
          <el-table-column prop="id" label="任务ID" width="90" sortable />
          <el-table-column prop="data_source" label="数据源" width="110" />
          <el-table-column label="市场" min-width="120">
            <template #default="scope">{{ (scope.row.markets || []).join(', ') || '--' }}</template>
          </el-table-column>
          <el-table-column label="执行时间" width="170" sortable>
            <template #default="scope">{{ formatSyncLogTime(scope.row.sync_start_ts) }}</template>
          </el-table-column>
          <el-table-column label="结束时间" width="170" sortable>
            <template #default="scope">{{ formatSyncLogTime(scope.row.sync_end_ts) }}</template>
          </el-table-column>
          <el-table-column label="同步耗时(s)" width="140" sortable>
            <template #default="scope">{{ calcSyncDuration(scope.row.sync_start_ts, scope.row.sync_end_ts) }}</template>
          </el-table-column>
          <el-table-column prop="total_count" label="入库条数" width="110" sortable />
          <el-table-column prop="status_label" label="状态" width="100" />
          <el-table-column prop="error_msg" label="失败信息" min-width="220" show-overflow-tooltip />
        </el-table>

        <el-pagination
          class="pagination"
          background
          layout="total, prev, pager, next"
          :current-page="logQuery.page"
          :page-size="logQuery.page_size"
          :total="logTotal"
          @current-change="handleLogPageChange"
        />
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  deleteStockSearchIndexItem,
  exportStockSearchIndex,
  getStockSearchIndexLogs,
  getStockSearchIndexItems,
  getStockSearchIndexSources,
  syncStockSearchIndex,
} from '@/api/modules/stockSearchIndex';

// 同步任务相关状态。
const activeTab = ref('manage');
const syncSources = ref([]);
const syncLoading = ref(false);
const latestTask = ref(null);
const processSteps = ref([]);
const progressTotalSteps = ref(0);
const progressDoneSteps = ref(0);
const currentStepText = ref('--');
const simulatedProgress = ref(0);
const syncElapsedSeconds = ref(0);
let progressTimer = null;
let elapsedTimer = null;
const syncForm = reactive({
  dataSource: 'futu',
  markets: ['ab'],
  splitAbExecution: true,
  abExchanges: ['SH', 'SZ', 'BJ'],
});

const marketOptions = [
  { value: 'ab', label: 'A股' },
  { value: 'hk', label: '港股' },
  { value: 'us', label: '美股' },
];

const selectedSyncSource = computed(() =>
  syncSources.value.find((item) => item.source_key === syncForm.dataSource)
);

const visibleMarkets = computed(() => {
  const support = selectedSyncSource.value?.support_markets || [];
  return marketOptions.filter((item) => support.includes(item.value));
});

const showAbSplitOptions = computed(
  () => syncForm.dataSource === 'futu' && syncForm.markets.includes('ab')
);

// 查找表预览状态。
const itemLoading = ref(false);
const itemList = ref([]);
const itemTotal = ref(0);
const itemQuery = reactive({
  page: 1,
  page_size: 20,
  keyword: '',
  market: '',
});

// 同步日志状态。
const logLoading = ref(false);
const logList = ref([]);
const logTotal = ref(0);
const logQuery = reactive({
  page: 1,
  page_size: 20,
  data_source: '',
  status: undefined,
  market: '',
});

const progressPercent = computed(() => {
  if (progressTotalSteps.value <= 0) return 0;
  const basePct = Math.round((progressDoneSteps.value / progressTotalSteps.value) * 100);
  return Math.min(100, Math.max(basePct, simulatedProgress.value));
});

const progressStatus = computed(() => {
  if (!syncLoading.value && progressPercent.value >= 100) return 'success';
  return '';
});

const progressText = computed(() => {
  return `${progressDoneSteps.value}/${progressTotalSteps.value || 0}`;
});

// 同步日志返回秒级时间戳，这里统一转换成可读时间。
function formatSyncLogTime(ts) {
  const value = Number(ts || 0);
  if (!value) return '--';
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return '--';
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function clearProgressTimer() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function clearElapsedTimer() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

function startProgressTimer() {
  clearProgressTimer();
  simulatedProgress.value = 0;
  progressTimer = setInterval(() => {
    if (!syncLoading.value) {
      clearProgressTimer();
      return;
    }
    // 同步接口返回前，缓慢推进到 92%，让过程可见。
    if (simulatedProgress.value < 92) {
      const step = simulatedProgress.value < 40 ? 4 : simulatedProgress.value < 70 ? 2 : 1;
      simulatedProgress.value = Math.min(92, simulatedProgress.value + step);
    }
  }, 1000);
}

function startElapsedTimer(startMs) {
  clearElapsedTimer();
  syncElapsedSeconds.value = 0;
  elapsedTimer = setInterval(() => {
    syncElapsedSeconds.value = Math.max(0, (Date.now() - startMs) / 1000);
  }, 200);
}

function formatElapsedSeconds(value) {
  return Number(value || 0).toFixed(2);
}

function calcSyncDuration(startTs, endTs) {
  const start = Number(startTs || 0);
  const end = Number(endTs || 0);
  if (!start || !end || end < start) return '--';
  return (end - start).toFixed(2);
}

function getTaskDurationSeconds(task) {
  if (!task) return null;
  const start = Number(task.sync_start_ts || 0);
  const end = Number(task.sync_end_ts || 0);
  if (!start || !end || end < start) return null;
  return end - start;
}

function handleSyncSourceChange() {
  const support = selectedSyncSource.value?.support_markets || [];
  syncForm.markets = syncForm.markets.filter((item) => support.includes(item));
  if (!syncForm.markets.includes('ab')) {
    syncForm.splitAbExecution = false;
  }
}

function selectAllMarkets() {
  syncForm.markets = visibleMarkets.value.map((item) => item.value);
}

function selectOnlyAb() {
  syncForm.markets = visibleMarkets.value.some((item) => item.value === 'ab') ? ['ab'] : [];
}

function clearMarkets() {
  syncForm.markets = [];
}

async function loadSyncSources() {
  const result = await getStockSearchIndexSources();
  const items = result?.payload || [];
  syncSources.value = items;
  if (!items.length) return;

  const savedSource = localStorage.getItem('stock-search-sync-source') || '';
  const exists = items.some((item) => item.source_key === savedSource);
  syncForm.dataSource = exists
    ? savedSource
    : items.find((item) => item.is_default)?.source_key || items[0].source_key;
  localStorage.setItem('stock-search-sync-source', syncForm.dataSource);
  handleSyncSourceChange();
}

function initProgress(totalSteps) {
  clearProgressTimer();
  simulatedProgress.value = 0;
  syncElapsedSeconds.value = 0;
  progressTotalSteps.value = Math.max(Number(totalSteps || 0), 1);
  progressDoneSteps.value = 0;
  currentStepText.value = '准备开始';
}

async function runSyncSegment(payload, stepLabel) {
  currentStepText.value = stepLabel;
  processSteps.value.push(`开始：${stepLabel}`);
  simulatedProgress.value = Math.round((progressDoneSteps.value / Math.max(progressTotalSteps.value, 1)) * 100);
  const result = await syncStockSearchIndex(payload);
  const task = result?.payload || null;
  latestTask.value = task;
  const taskDuration = getTaskDurationSeconds(task);
  if (taskDuration !== null) {
    syncElapsedSeconds.value += taskDuration;
  }
  processSteps.value.push(`完成：${stepLabel}，入库 ${task?.total_count || 0} 条`);
  progressDoneSteps.value += 1;
  simulatedProgress.value = Math.round((progressDoneSteps.value / Math.max(progressTotalSteps.value, 1)) * 100);
  return task;
}

async function startSyncTask() {
  if (!syncForm.markets.length) {
    ElMessage.warning('请至少选择一个同步市场');
    return;
  }
  const taskStartMs = Date.now();
  syncLoading.value = true;
  processSteps.value = [];
  startElapsedTimer(taskStartMs);
  try {
    localStorage.setItem('stock-search-sync-source', syncForm.dataSource);
    progressDoneSteps.value = 0;
    const enableAbSplit =
      syncForm.dataSource === 'futu' &&
      syncForm.splitAbExecution &&
      syncForm.markets.includes('ab') &&
      syncForm.abExchanges.length > 0;
    const shouldSegmentRun =
      enableAbSplit;

    if (shouldSegmentRun) {
      const remainMarkets = syncForm.markets.filter((item) => item !== 'ab');
      const totalSteps = syncForm.abExchanges.length + (remainMarkets.length ? 1 : 0);
      initProgress(totalSteps);
      startProgressTimer();

      for (const exchange of syncForm.abExchanges) {
        await runSyncSegment(
          {
            data_source: syncForm.dataSource,
            markets: ['ab'],
            split_ab_execution: false,
            ab_exchanges: [exchange],
          },
          `A股-${exchange}`
        );
      }

      if (remainMarkets.length) {
        await runSyncSegment(
          {
            data_source: syncForm.dataSource,
            markets: remainMarkets,
            split_ab_execution: false,
            ab_exchanges: [],
          },
          `市场-${remainMarkets.join(',')}`
        );
      }
    } else {
      initProgress(1);
      const marketLabel = syncForm.markets.join(',').toUpperCase();
      currentStepText.value = `全量同步执行中（${marketLabel}）`;
      processSteps.value.push(`开始：市场-${marketLabel}`);
      startProgressTimer();
      const result = await syncStockSearchIndex({
        data_source: syncForm.dataSource,
        markets: syncForm.markets,
        split_ab_execution: enableAbSplit,
        ab_exchanges: enableAbSplit ? syncForm.abExchanges : [],
      });
      latestTask.value = result?.payload || null;
      const backendSteps = result?.payload?.process_steps || [];
      if (backendSteps.length) {
        processSteps.value = [...processSteps.value, ...backendSteps];
      }
      processSteps.value.push(`完成：市场-${marketLabel}，入库 ${latestTask.value?.total_count || 0} 条`);
      progressDoneSteps.value = 1;
      const taskDuration = getTaskDurationSeconds(latestTask.value);
      if (taskDuration !== null) {
        syncElapsedSeconds.value = taskDuration;
      }
      simulatedProgress.value = 100;
    }

    if (!processSteps.value.length) {
      processSteps.value = ['同步执行完成'];
    }
    if (syncElapsedSeconds.value <= 0) {
      syncElapsedSeconds.value = Math.max(0, (Date.now() - taskStartMs) / 1000);
    }
    processSteps.value.push(`总耗时：${formatElapsedSeconds(syncElapsedSeconds.value)} 秒`);
    currentStepText.value = '已完成';
    ElMessage.success('同步完成');
    await Promise.all([refreshItemList(), refreshLogList()]);
  } catch (error) {
    currentStepText.value = '执行失败';
    syncElapsedSeconds.value = Math.max(0, (Date.now() - taskStartMs) / 1000);
    processSteps.value.push(`失败前耗时：${formatElapsedSeconds(syncElapsedSeconds.value)} 秒`);
    processSteps.value.push(error?.message || '同步失败');
    ElMessage.error(error?.message || '同步失败');
  } finally {
    clearProgressTimer();
    clearElapsedTimer();
    syncLoading.value = false;
  }
}

async function refreshItemList() {
  itemLoading.value = true;
  try {
    const result = await getStockSearchIndexItems(itemQuery);
    const pageData = result?.payload || {};
    itemList.value = pageData.items || [];
    itemTotal.value = Number(pageData.total || 0);
  } catch (error) {
    itemList.value = [];
    itemTotal.value = 0;
    ElMessage.error(error?.message || '加载查找表失败');
  } finally {
    itemLoading.value = false;
  }
}

async function refreshLogList() {
  logLoading.value = true;
  try {
    const result = await getStockSearchIndexLogs(logQuery);
    const pagePayload = result?.payload?.page || {};
    logList.value = pagePayload.items || [];
    logTotal.value = Number(pagePayload.total || 0);
  } catch (error) {
    logList.value = [];
    logTotal.value = 0;
    ElMessage.error(error?.message || '加载同步日志失败');
  } finally {
    logLoading.value = false;
  }
}

function handleLogPageChange(page) {
  logQuery.page = page;
  refreshLogList();
}

function resetLogQuery() {
  logQuery.page = 1;
  logQuery.data_source = '';
  logQuery.status = undefined;
  logQuery.market = '';
  refreshLogList();
}

async function removeItem(fullCode) {
  try {
    await deleteStockSearchIndexItem(fullCode);
    ElMessage.success('删除成功');
    await refreshItemList();
  } catch (error) {
    ElMessage.error(error?.message || '删除失败');
  }
}

function handleItemPageChange(page) {
  itemQuery.page = page;
  refreshItemList();
}

async function handleExport() {
  try {
    const result = await exportStockSearchIndex(syncForm.markets);
    const items = result?.payload?.items || [];
    const content = JSON.stringify(items, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `stock-search-index-${Date.now()}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success(`导出成功，共 ${items.length} 条`);
  } catch (error) {
    ElMessage.error(error?.message || '导出失败');
  }
}

onMounted(async () => {
  await Promise.all([loadSyncSources(), refreshItemList(), refreshLogList()]);
});
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

.inner-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.inner-tabs :deep(.el-tabs__content) {
  padding-top: 12px;
}

.panel-heading h3 {
  margin: 0;
  color: #1f3556;
}

.panel-heading p {
  margin: 0;
  color: #52627d;
  line-height: 1.65;
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 16px;
}

.sync-form {
  padding: 14px;
  border-radius: 12px;
  background: #f8fbff;
}

.sync-tip-card {
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(180deg, #fef4e9 0%, #fffaf3 100%);
}

.sync-tip-card h4 {
  margin: 0 0 8px;
  color: #7f3a17;
}

.sync-tip-card p {
  margin: 0 0 6px;
  color: #684d40;
}

.sync-tip-card .warning {
  color: #b8540a;
  font-weight: 600;
}

.process-panel {
  margin-top: 10px;
  padding: 14px;
  border-radius: 12px;
  background: #f5f9ff;
  border: 1px solid rgba(31, 78, 168, 0.16);
}

.process-panel h4 {
  margin: 0 0 8px;
  color: #1f3556;
}

.progress-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.progress-line :deep(.el-progress) {
  flex: 1;
}

.progress-text {
  min-width: 60px;
  text-align: right;
  color: #32527e;
  font-weight: 600;
}

.current-step {
  margin: 0 0 8px;
  color: #27466f;
}

.elapsed-text {
  margin: 0 0 8px;
  color: #27466f;
  font-weight: 600;
}

.process-panel ul {
  margin: 0;
  padding-left: 18px;
  color: #32496b;
}

.toolbar {
  margin-bottom: 8px;
}

.pagination {
  margin-top: 14px;
  justify-content: flex-end;
}

@media (max-width: 960px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
