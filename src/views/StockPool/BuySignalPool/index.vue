<template>
  <div class="buy-signal-monitor-page">
    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-label">监控配置总数</div>
        <div class="summary-value">{{ overview.total_configs }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">启用中的配置</div>
        <div class="summary-value enabled">{{ overview.enabled_configs }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">今日命中信号</div>
        <div class="summary-value signal">{{ overview.today_signals }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">今日 webhook 次数</div>
        <div class="summary-value webhook">{{ overview.today_webhooks }}</div>
        <div class="summary-subtext">
          最近运行：{{
            overview.latest_run_at
              ? formatDateTime(overview.latest_run_at)
              : '--'
          }}
        </div>
      </div>
    </div>

    <div class="page-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="监控配置" name="configs">
          <div class="toolbar-row">
            <div class="toolbar-left">
              <el-input
                v-model="configSearchForm.keyword"
                class="toolbar-input"
                clearable
                placeholder="搜索配置名称"
                @keyup.enter="handleConfigSearch"
              />
              <el-select
                v-model="configSearchForm.is_enabled"
                clearable
                placeholder="启用状态"
                class="toolbar-select"
              >
                <el-option :value="true" label="仅启用" />
                <el-option :value="false" label="仅停用" />
              </el-select>
              <el-button type="primary" @click="handleConfigSearch"
                >查询</el-button
              >
              <el-button @click="handleConfigReset">重置</el-button>
            </div>
            <el-button type="primary" @click="handleCreate"
              >新建监控配置</el-button
            >
          </div>

          <el-table
            :data="configList"
            v-loading="tableLoading"
            height="calc(100vh - 360px)"
          >
            <el-table-column type="index" label="序号" width="70" />
            <el-table-column
              prop="name"
              label="配置名称"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column label="监控分组" min-width="220">
              <template #default="{ row }">
                <div class="group-tags">
                  <el-tag
                    v-for="groupName in row.group_names || []"
                    :key="groupName"
                    size="small"
                    effect="plain"
                  >
                    {{ groupName }}
                  </el-tag>
                  <span v-if="!row.group_names?.length" class="text-muted"
                    >未绑定分组</span
                  >
                </div>
              </template>
            </el-table-column>
            <el-table-column label="触发条件" min-width="240">
              <template #default="{ row }">
                <div>涨幅：{{ formatChangeRange(row) }}</div>
                <div>量比：{{ formatNumber(row.min_volume_ratio) }}</div>
              </template>
            </el-table-column>
            <el-table-column label="执行策略" min-width="240">
              <template #default="{ row }">
                <div>间隔：{{ row.monitor_interval_seconds }} 秒</div>
                <div>单股日上限：{{ row.max_alerts_per_stock_per_day }} 次</div>
                <div>时段：{{ formatTimeRanges(row.monitor_time_ranges) }}</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.is_enabled"
                  inline-prompt
                  active-text="启用"
                  inactive-text="停用"
                  @change="(value) => handleToggleStatus(row, value)"
                />
              </template>
            </el-table-column>
            <el-table-column label="最近运行" width="180">
              <template #default="{ row }">
                {{ row.last_run_at ? formatDateTime(row.last_run_at) : '--' }}
              </template>
            </el-table-column>
            <el-table-column label="最近成功" width="180">
              <template #default="{ row }">
                {{
                  row.last_success_at
                    ? formatDateTime(row.last_success_at)
                    : '--'
                }}
              </template>
            </el-table-column>
            <el-table-column
              label="最近错误"
              min-width="220"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.last_error_message || '--' }}
              </template>
            </el-table-column>
            <el-table-column fixed="right" label="操作" width="320">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleEdit(row)"
                  >编辑</el-button
                >
                <el-button link type="info" @click="handleViewConfigStocks(row)"
                  >查看股票</el-button
                >
                <el-button link type="success" @click="handleRun(row)"
                  >立即执行</el-button
                >
                <el-button link type="warning" @click="handleViewSignals(row)"
                  >查看信号</el-button
                >
                <el-popconfirm
                  title="确定删除该监控配置吗？历史信号将保留。"
                  confirm-button-text="确定"
                  cancel-button-text="取消"
                  @confirm="handleDelete(row)"
                >
                  <template #reference>
                    <el-button link type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="configPage.pageNo"
              v-model:page-size="configPage.pageSize"
              :total="configPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @current-change="fetchConfigs"
              @size-change="handleConfigSizeChange"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="监控信号" name="signals">
          <div class="toolbar-row">
            <div class="toolbar-left toolbar-wrap">
              <el-select
                v-model="signalSearchForm.config_id"
                clearable
                filterable
                placeholder="配置"
                class="toolbar-select-wide"
              >
                <el-option
                  v-for="item in configOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
              <el-select
                v-model="signalSearchForm.group_id"
                clearable
                filterable
                placeholder="分组"
                class="toolbar-select-wide"
              >
                <el-option
                  v-for="group in groups"
                  :key="group.id"
                  :label="group.name"
                  :value="group.id"
                />
              </el-select>
              <el-select
                v-model="signalSearchForm.signal_type"
                clearable
                placeholder="信号类型"
                class="toolbar-select"
              >
                <el-option label="提醒买入" value="buy_alert" />
                <el-option label="提醒上涨" value="rise_alert" />
                <el-option label="提醒卖出" value="sell_alert" />
              </el-select>
              <el-input
                v-model="signalSearchForm.stock_code"
                clearable
                placeholder="股票代码"
                class="toolbar-input"
                @keyup.enter="handleSignalSearch"
              />
              <el-input
                v-model="signalSearchForm.stock_name"
                clearable
                placeholder="股票名称"
                class="toolbar-input"
                @keyup.enter="handleSignalSearch"
              />
              <el-date-picker
                v-model="signalSearchForm.date_range"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                class="toolbar-date-range"
              />
              <el-button type="primary" @click="handleSignalSearch"
                >查询</el-button
              >
              <el-button @click="handleSignalReset">重置</el-button>
            </div>
          </div>

          <el-table
            :data="signalList"
            v-loading="signalLoading"
            height="calc(100vh - 360px)"
          >
            <el-table-column label="时间" width="180">
              <template #default="{ row }">{{
                formatDateTime(row.created_at)
              }}</template>
            </el-table-column>
            <el-table-column
              prop="config_name"
              label="配置名"
              min-width="160"
              show-overflow-tooltip
            />
            <el-table-column
              prop="group_name"
              label="分组名"
              min-width="120"
              show-overflow-tooltip
            />
            <el-table-column label="股票" min-width="160">
              <template #default="{ row }">
                <div>{{ row.stock_name }}</div>
                <div class="text-muted">{{ row.stock_code }}</div>
              </template>
            </el-table-column>
            <el-table-column label="信号类型" width="110">
              <template #default="{ row }">
                <el-tag
                  :type="getSignalTagType(row.signal_type)"
                  effect="light"
                  >{{ getSignalTypeLabel(row.signal_type) }}</el-tag
                >
              </template>
            </el-table-column>
            <el-table-column label="当前价" width="100">
              <template #default="{ row }">{{
                formatNumber(row.current_price)
              }}</template>
            </el-table-column>
            <el-table-column label="涨幅" width="100">
              <template #default="{ row }">{{
                formatPercent(row.change_pct)
              }}</template>
            </el-table-column>
            <el-table-column label="量比" width="100">
              <template #default="{ row }">{{
                formatNumber(row.volume_ratio)
              }}</template>
            </el-table-column>
            <el-table-column label="换手率" width="100">
              <template #default="{ row }">{{
                formatPercent(row.turnover_rate)
              }}</template>
            </el-table-column>
            <el-table-column
              prop="signal_detail"
              label="信号详情"
              min-width="260"
              show-overflow-tooltip
            />
            <el-table-column label="webhook" width="120">
              <template #default="{ row }">
                <el-tag
                  :type="row.webhook_sent ? 'success' : 'info'"
                  effect="plain"
                >
                  {{ row.webhook_sent ? '已发送' : '未发送' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column fixed="right" label="操作" width="140">
              <template #default="{ row }">
                <el-button
                  link
                  type="warning"
                  @click="handleEditByConfigId(row.config_id)"
                  >配置</el-button
                >
                <el-button
                  link
                  type="primary"
                  @click="handleViewSignalDetail(row)"
                  >详情</el-button
                >
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="signalPage.pageNo"
              v-model:page-size="signalPage.pageSize"
              :total="signalPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @current-change="fetchSignals"
              @size-change="handleSignalSizeChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <ConfigDialog
      v-model:visible="dialogVisible"
      :form-data="dialogForm"
      :groups="groups"
      :mode="dialogMode"
      :submitting="dialogSubmitting"
      @submit="handleSubmit"
    />

    <el-drawer
      v-model="configStocksVisible"
      :title="configStocksDrawerTitle"
      size="92%"
      destroy-on-close
    >
      <div class="config-stock-drawer">
        <div class="config-stock-summary">
          <div class="config-stock-summary-main">
            <span>已合并分组股票 {{ configStockPage.total }} 只</span>
            <span class="text-muted">
              分组数：{{ currentConfigGroupNames.length }}
            </span>
          </div>
          <div class="group-tags">
            <el-tag
              v-for="groupName in currentConfigGroupNames"
              :key="groupName"
              size="small"
              effect="plain"
            >
              {{ groupName }}
            </el-tag>
          </div>
        </div>

        <StockList
          :stockList="configStockDisplayList"
          :loading="configStockLoading"
          :total="configStockPage.total"
          :currentPage="configStockPage.pageNo"
          :pageSize="configStockPage.pageSize"
          :isSelfSelected="true"
          :showAddButton="false"
          :showAddToSelfButton="false"
          :showActionColumn="false"
          @page-change="handleConfigStockPageChange"
          @size-change="handleConfigStockPageSizeChange"
          @search="handleConfigStockSearch"
        />
      </div>
    </el-drawer>

    <el-drawer
      v-model="signalDetailVisible"
      title="监控信号详情"
      size="520px"
      destroy-on-close
    >
      <div
        v-loading="signalDetailLoading"
        class="signal-detail"
        v-if="signalDetail"
      >
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">配置名称</span
            ><span>{{ signalDetail.config_name || '--' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">分组名称</span
            ><span>{{ signalDetail.group_name || '--' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">股票</span
            ><span
              >{{ signalDetail.stock_name || '--' }}（{{
                signalDetail.stock_code || '--'
              }}）</span
            >
          </div>
          <div class="detail-item">
            <span class="detail-label">信号类型</span
            ><span>{{ getSignalTypeLabel(signalDetail.signal_type) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">当前价</span
            ><span>{{ formatNumber(signalDetail.current_price) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">涨幅</span
            ><span>{{ formatPercent(signalDetail.change_pct) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">量比</span
            ><span>{{ formatNumber(signalDetail.volume_ratio) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">换手率</span
            ><span>{{ formatPercent(signalDetail.turnover_rate) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">交易日</span
            ><span>{{ signalDetail.trading_date || '--' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">创建时间</span
            ><span>{{
              signalDetail.created_at
                ? formatDateTime(signalDetail.created_at)
                : '--'
            }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Webhook 状态</span
            ><span>{{ signalDetail.webhook_sent ? '已发送' : '未发送' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Webhook 结果</span
            ><span>{{ signalDetail.webhook_result || '--' }}</span>
          </div>
        </div>
        <div class="detail-block">
          <div class="detail-block-title">信号详情</div>
          <div class="detail-block-content">
            {{ signalDetail.signal_detail || '--' }}
          </div>
        </div>
        <div class="detail-block">
          <div class="detail-block-title">行情快照</div>
          <pre class="json-block">{{ formattedQuotePayload }}</pre>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createGroupMonitorConfig,
  deleteGroupMonitorConfig,
  getGroupMonitorConfigDetail,
  getGroupMonitorConfigs,
  getGroupMonitorOverview,
  getGroupMonitorSignalDetail,
  getGroupMonitorSignals,
  runGroupMonitorConfig,
  toggleGroupMonitorConfigStatus,
  updateGroupMonitorConfig,
} from '@/api/modules/groupMonitor';
import {
  getGroupStocksByGroups,
  getUserGroups,
} from '@/api/modules/stockGroup';
import StockList from '@/components/StockList/index.vue';
import ConfigDialog from './components/ConfigDialog.vue';
import { calculateDaysAdded, formatDateTime } from '@/utils/time';
import { mapQuoteToFlatRowFields } from '../utils/stockQuoteFields';

const activeTab = ref('configs');
const tableLoading = ref(false);
const signalLoading = ref(false);
const dialogVisible = ref(false);
const dialogSubmitting = ref(false);
const dialogMode = ref('create');
const groups = ref([]);
const configList = ref([]);
const configOptions = ref([]);
const signalList = ref([]);
const dialogForm = ref({});
const configStocksVisible = ref(false);
const configStockLoading = ref(false);
const configStockAllList = ref([]);
const currentConfigStockMeta = ref(null);
const signalDetailVisible = ref(false);
const signalDetailLoading = ref(false);
const signalDetail = ref(null);

const overview = reactive({
  total_configs: 0,
  enabled_configs: 0,
  today_signals: 0,
  today_webhooks: 0,
  latest_run_at: null,
});

const configSearchForm = reactive({
  keyword: '',
  is_enabled: undefined,
});

const signalSearchForm = reactive({
  config_id: undefined,
  group_id: undefined,
  signal_type: '',
  stock_code: '',
  stock_name: '',
  date_range: [],
});

const configPage = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0,
});

const signalPage = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0,
});

const configStockPage = reactive({
  pageNo: 1,
  pageSize: 50,
  total: 0,
});

const configStockSearchParams = reactive({
  stock_code: '',
  stock_name: '',
  exchange_code: '',
  snapshot_date: '',
});

const formattedQuotePayload = computed(() => {
  if (!signalDetail.value?.quote_payload) return '--';
  return JSON.stringify(signalDetail.value.quote_payload, null, 2);
});

const configStocksDrawerTitle = computed(() => {
  const name = currentConfigStockMeta.value?.name || '监控配置';
  return `${name} - 合并分组股票`;
});

const currentConfigGroupNames = computed(() => {
  return currentConfigStockMeta.value?.group_names || [];
});

const configStockDisplayList = computed(() => {
  const start = (configStockPage.pageNo - 1) * configStockPage.pageSize;
  const end = start + configStockPage.pageSize;
  return configStockAllList.value.slice(start, end);
});

const getPayload = (response) =>
  response?.payload || response?.data || response;

const createEmptyForm = () => ({
  id: null,
  name: '',
  group_ids: [],
  monitor_interval_seconds: 10,
  min_change_pct: null,
  max_change_pct: null,
  min_volume_ratio: null,
  max_alerts_per_stock_per_day: 10,
  monitor_time_ranges: ['09:30-11:30', '13:00-15:00'],
  start_date: '',
  end_date: '',
  webhook_url: '',
  reason: '',
  remark: '',
  is_enabled: true,
});

const resetConfigStockSearchParams = () => {
  configStockSearchParams.stock_code = '';
  configStockSearchParams.stock_name = '';
  configStockSearchParams.exchange_code = '';
  configStockSearchParams.snapshot_date = '';
};

const flattenMergedGroupStockData = (stock) => {
  const quote = stock?.quote || {};
  const initialPrice = stock.initial_price ? Number(stock.initial_price) : null;

  return {
    id: stock.id,
    stock_code: stock.stock_code || '',
    stock_name: stock.stock_name || '',
    exchange_code: stock.exchange_code || '',
    add_method: 'manual',
    add_time: stock.joined_at || '',
    initial_price: initialPrice,
    add_reason: stock.add_reason || '',
    strategy_name: '',
    is_self_selected: true,
    created_by: '',
    status: 'active',
    priority_level: null,
    notes: stock.remark || '',
    updated_time: stock.updated_at || '',
    statusLoading: false,
    merged_group_names: stock.group_name ? [stock.group_name] : [],
    ...mapQuoteToFlatRowFields(quote, initialPrice),
  };
};

const mergeConfigStocks = (items = []) => {
  const mergedMap = new Map();

  items.forEach((item) => {
    const key = `${item.exchange_code || ''}::${item.stock_code || ''}`;
    const groupName =
      groups.value.find((group) => group.id === item.group_id)?.name || '';

    if (!mergedMap.has(key)) {
      const row = flattenMergedGroupStockData({
        ...item,
        group_name: groupName,
      });
      mergedMap.set(key, row);
      return;
    }

    const existing = mergedMap.get(key);
    const mergedGroupNames = new Set(existing.merged_group_names || []);
    if (groupName) {
      mergedGroupNames.add(groupName);
    }
    existing.merged_group_names = Array.from(mergedGroupNames);

    if (!existing.initial_price && item.initial_price) {
      existing.initial_price = Number(item.initial_price);
    }
    if (!existing.add_reason && item.add_reason) {
      existing.add_reason = item.add_reason;
    }
    if (!existing.notes && item.remark) {
      existing.notes = item.remark;
    }
    if (!existing.add_time && item.joined_at) {
      existing.add_time = item.joined_at;
    }
    if (
      item.updated_at &&
      (!existing.updated_time || item.updated_at > existing.updated_time)
    ) {
      existing.updated_time = item.updated_at;
    }
  });

  const mergedRows = Array.from(mergedMap.values()).map((row) => {
    if (row.add_time) {
      row.days_added = calculateDaysAdded(
        row.add_time,
        configStockSearchParams.snapshot_date
      );
    }
    return row;
  });

  mergedRows.sort((a, b) => {
    if (!a.add_time && !b.add_time) return 0;
    if (!a.add_time) return 1;
    if (!b.add_time) return -1;
    return String(b.add_time).localeCompare(String(a.add_time));
  });

  return mergedRows;
};

const fetchGroups = async () => {
  const response = await getUserGroups();
  const payload = getPayload(response);
  groups.value = payload?.items || [];
};

const fetchConfigOptions = async () => {
  const response = await getGroupMonitorConfigs({ page: 1, page_size: 200 });
  const payload = getPayload(response);
  configOptions.value = payload?.items || [];
};

const fetchConfigStocks = async () => {
  const groupIds = currentConfigStockMeta.value?.group_ids || [];
  const normalizedIds = Array.isArray(groupIds)
    ? groupIds.filter(
        (item) => item !== null && item !== undefined && item !== ''
      )
    : [];

  if (!normalizedIds.length) {
    configStockAllList.value = [];
    configStockPage.total = 0;
    return;
  }

  try {
    configStockLoading.value = true;
    const pageSize = 200;
    let page = 1;
    let total = 0;
    const allItems = [];

    do {
      const response = await getGroupStocksByGroups(normalizedIds, {
        page,
        page_size: pageSize,
        exchange_code: configStockSearchParams.exchange_code || undefined,
        stock_code: configStockSearchParams.stock_code || undefined,
        stock_name: configStockSearchParams.stock_name || undefined,
        snapshot_date: configStockSearchParams.snapshot_date || undefined,
      });
      const payload = getPayload(response) || {};
      const items = payload?.items || [];
      total = payload?.total || 0;
      allItems.push(...items);
      if (!items.length || items.length < pageSize) {
        break;
      }
      page += 1;
    } while (allItems.length < total);

    configStockAllList.value = mergeConfigStocks(allItems);
    configStockPage.total = configStockAllList.value.length;
  } catch (error) {
    console.error('获取监控配置股票失败:', error);
    configStockAllList.value = [];
    configStockPage.total = 0;
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '获取监控配置股票失败'
    );
  } finally {
    configStockLoading.value = false;
  }
};

const fetchOverview = async () => {
  try {
    const response = await getGroupMonitorOverview();
    const payload = getPayload(response) || {};
    overview.total_configs = payload.total_configs || 0;
    overview.enabled_configs = payload.enabled_configs || 0;
    overview.today_signals = payload.today_signals || 0;
    overview.today_webhooks = payload.today_webhooks || 0;
    overview.latest_run_at = payload.latest_run_at || null;
  } catch (error) {
    console.error('获取监控概览失败:', error);
  }
};

const fetchConfigs = async () => {
  try {
    tableLoading.value = true;
    const response = await getGroupMonitorConfigs({
      page: configPage.pageNo,
      page_size: configPage.pageSize,
      keyword: configSearchForm.keyword || undefined,
      is_enabled:
        typeof configSearchForm.is_enabled === 'boolean'
          ? configSearchForm.is_enabled
          : undefined,
    });
    const payload = getPayload(response);
    configList.value = payload?.items || [];
    configPage.total = payload?.total || 0;
  } catch (error) {
    console.error('获取监控配置列表失败:', error);
    ElMessage.error(error?.response?.data?.message || '获取监控配置列表失败');
  } finally {
    tableLoading.value = false;
  }
};

const buildSignalQuery = () => ({
  page: signalPage.pageNo,
  page_size: signalPage.pageSize,
  config_id: signalSearchForm.config_id || undefined,
  group_id: signalSearchForm.group_id || undefined,
  signal_type: signalSearchForm.signal_type || undefined,
  stock_code: signalSearchForm.stock_code || undefined,
  stock_name: signalSearchForm.stock_name || undefined,
  start_date: Array.isArray(signalSearchForm.date_range)
    ? signalSearchForm.date_range[0] || undefined
    : undefined,
  end_date: Array.isArray(signalSearchForm.date_range)
    ? signalSearchForm.date_range[1] || undefined
    : undefined,
});

const fetchSignals = async () => {
  try {
    signalLoading.value = true;
    const response = await getGroupMonitorSignals(buildSignalQuery());
    const payload = getPayload(response);
    signalList.value = payload?.items || [];
    signalPage.total = payload?.total || 0;
  } catch (error) {
    console.error('获取监控信号列表失败:', error);
    ElMessage.error(error?.response?.data?.message || '获取监控信号列表失败');
  } finally {
    signalLoading.value = false;
  }
};

const handleTabChange = async (tab) => {
  if (tab === 'signals' && !signalList.value.length) {
    await fetchSignals();
  }
};

const handleConfigSearch = () => {
  configPage.pageNo = 1;
  fetchConfigs();
};

const handleConfigReset = () => {
  configSearchForm.keyword = '';
  configSearchForm.is_enabled = undefined;
  configPage.pageNo = 1;
  fetchConfigs();
};

const handleConfigSizeChange = () => {
  configPage.pageNo = 1;
  fetchConfigs();
};

const handleSignalSearch = () => {
  signalPage.pageNo = 1;
  fetchSignals();
};

const handleSignalReset = () => {
  signalSearchForm.config_id = undefined;
  signalSearchForm.group_id = undefined;
  signalSearchForm.signal_type = '';
  signalSearchForm.stock_code = '';
  signalSearchForm.stock_name = '';
  signalSearchForm.date_range = [];
  signalPage.pageNo = 1;
  fetchSignals();
};

const handleSignalSizeChange = () => {
  signalPage.pageNo = 1;
  fetchSignals();
};

const handleCreate = () => {
  dialogMode.value = 'create';
  dialogForm.value = createEmptyForm();
  dialogVisible.value = true;
};

const handleEdit = async (row) => {
  try {
    dialogMode.value = 'edit';
    dialogSubmitting.value = true;
    const response = await getGroupMonitorConfigDetail(row.id);
    dialogForm.value = { ...createEmptyForm(), ...getPayload(response) };
    dialogVisible.value = true;
  } catch (error) {
    console.error('获取监控配置详情失败:', error);
    ElMessage.error(error?.response?.data?.message || '获取监控配置详情失败');
  } finally {
    dialogSubmitting.value = false;
  }
};

const refreshConfigRelatedData = async () => {
  await Promise.all([fetchConfigs(), fetchOverview(), fetchConfigOptions()]);
};

const handleSubmit = async (payload) => {
  try {
    dialogSubmitting.value = true;
    if (dialogMode.value === 'edit' && dialogForm.value.id) {
      await updateGroupMonitorConfig(dialogForm.value.id, payload);
      ElMessage.success('更新监控配置成功');
    } else {
      await createGroupMonitorConfig(payload);
      ElMessage.success('创建监控配置成功');
    }
    dialogVisible.value = false;
    await refreshConfigRelatedData();
  } catch (error) {
    console.error('保存监控配置失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '保存监控配置失败'
    );
  } finally {
    dialogSubmitting.value = false;
  }
};

const handleDelete = async (row) => {
  try {
    await deleteGroupMonitorConfig(row.id);
    ElMessage.success('删除监控配置成功');
    if (configList.value.length === 1 && configPage.pageNo > 1) {
      configPage.pageNo -= 1;
    }
    await refreshConfigRelatedData();
    if (activeTab.value === 'signals') {
      await fetchSignals();
    }
  } catch (error) {
    console.error('删除监控配置失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '删除监控配置失败'
    );
  }
};

const handleToggleStatus = async (row, value) => {
  const previous = row.is_enabled;
  row.is_enabled = value;
  try {
    await toggleGroupMonitorConfigStatus(row.id, value);
    ElMessage.success(value ? '已启用监控配置' : '已停用监控配置');
    await refreshConfigRelatedData();
  } catch (error) {
    row.is_enabled = previous;
    console.error('切换监控配置状态失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '切换监控配置状态失败'
    );
  }
};

const handleRun = async (row) => {
  try {
    const response = await runGroupMonitorConfig(row.id);
    const payload = getPayload(response) || {};
    ElMessageBox.alert(
      `扫描分组：${payload.scanned_groups ?? 0} 个<br/>扫描股票：${payload.scanned_stocks ?? 0} 只<br/>命中信号：${payload.hit_signals ?? 0} 条<br/>发送 webhook：${payload.sent_webhooks ?? 0} 次<br/>限流跳过：${payload.skipped_by_limit ?? 0} 次<br/>耗时：${payload.cost_ms ?? 0} ms`,
      `${row.name} 执行完成`,
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '知道了',
      }
    );
    await Promise.all([refreshConfigRelatedData(), fetchSignals()]);
  } catch (error) {
    console.error('手动执行监控配置失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '手动执行监控配置失败'
    );
  }
};

const handleViewConfigStocks = async (row) => {
  try {
    configStockLoading.value = true;
    resetConfigStockSearchParams();
    configStockPage.pageNo = 1;
    configStockPage.pageSize = 50;
    const response = await getGroupMonitorConfigDetail(row.id);
    currentConfigStockMeta.value = {
      ...createEmptyForm(),
      ...getPayload(response),
    };
    configStocksVisible.value = true;
    await fetchConfigStocks();
  } catch (error) {
    console.error('获取监控配置股票失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '获取监控配置股票失败'
    );
  } finally {
    configStockLoading.value = false;
  }
};

const handleViewSignals = async (row) => {
  activeTab.value = 'signals';
  signalSearchForm.config_id = row.id;
  signalPage.pageNo = 1;
  await fetchSignals();
};

const handleEditByConfigId = async (configId) => {
  if (!configId) {
    ElMessage.warning('当前信号缺少关联配置');
    return;
  }

  activeTab.value = 'configs';
  await handleEdit({ id: configId });
};

const handleConfigStockSearch = async (searchParams = {}) => {
  configStockSearchParams.stock_code = searchParams.stock_code || '';
  configStockSearchParams.stock_name = searchParams.stock_name || '';
  configStockSearchParams.exchange_code = searchParams.exchange_code || '';
  configStockSearchParams.snapshot_date = searchParams.snapshot_date || '';
  configStockPage.pageNo = 1;
  await fetchConfigStocks();
};

const handleConfigStockPageChange = (pageNo) => {
  configStockPage.pageNo = pageNo;
};

const handleConfigStockPageSizeChange = (pageSize) => {
  configStockPage.pageSize = pageSize;
  configStockPage.pageNo = 1;
};

const handleViewSignalDetail = async (row) => {
  try {
    signalDetailLoading.value = true;
    signalDetailVisible.value = true;
    const response = await getGroupMonitorSignalDetail(row.id);
    signalDetail.value = getPayload(response);
  } catch (error) {
    console.error('获取监控信号详情失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '获取监控信号详情失败'
    );
    signalDetailVisible.value = false;
  } finally {
    signalDetailLoading.value = false;
  }
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  return Number(value).toFixed(2);
};

const formatPercent = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  return `${Number(value).toFixed(2)}%`;
};

const formatChangeRange = (row) => {
  const minText =
    row.min_change_pct !== null && row.min_change_pct !== undefined
      ? `${formatNumber(row.min_change_pct)}%`
      : '--';
  const maxText =
    row.max_change_pct !== null && row.max_change_pct !== undefined
      ? `${formatNumber(row.max_change_pct)}%`
      : '--';
  return `${minText} ~ ${maxText}`;
};

const formatTimeRanges = (ranges) => {
  if (!Array.isArray(ranges) || !ranges.length) return '--';
  return ranges.join(' / ');
};

const getSignalTypeLabel = (value) => {
  const map = {
    buy_alert: '提醒买入',
    rise_alert: '提醒上涨',
    sell_alert: '提醒卖出',
  };
  return map[value] || value || '--';
};

const getSignalTagType = (value) => {
  const map = {
    buy_alert: 'success',
    rise_alert: 'warning',
    sell_alert: 'danger',
  };
  return map[value] || 'info';
};

onMounted(async () => {
  await Promise.all([
    fetchGroups(),
    fetchOverview(),
    fetchConfigOptions(),
    fetchConfigs(),
  ]);
});
</script>

<style scoped lang="less">
.buy-signal-monitor-page {
  min-height: calc(100vh - 130px);
  padding: 20px;
  background: #f5f7fa;
}

.page-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.summary-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.summary-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.summary-value.enabled {
  color: #67c23a;
}
.summary-value.signal {
  color: #e6a23c;
}
.summary-value.webhook {
  color: #409eff;
}

.summary-subtext {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-wrap {
  flex-wrap: wrap;
}

.toolbar-input {
  width: 220px;
}
.toolbar-select {
  width: 140px;
}
.toolbar-select-wide {
  width: 180px;
}
.toolbar-date-range {
  width: 280px;
}

.group-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.text-muted {
  color: #909399;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.config-stock-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-stock-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.config-stock-summary-main {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #303133;
}

.signal-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label,
.detail-block-title {
  color: #909399;
  font-size: 13px;
}

.detail-block {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
}

.detail-block-content {
  margin-top: 8px;
  line-height: 1.7;
  color: #303133;
}

.json-block {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: #303133;
  font-size: 12px;
}

@media (max-width: 1400px) {
  .summary-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1200px) {
  .summary-row,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-row {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left {
    flex-wrap: wrap;
  }
}
</style>
