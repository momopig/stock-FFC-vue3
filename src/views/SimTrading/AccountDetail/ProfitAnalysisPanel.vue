<template>
  <div class="profit-analysis-panel">
    <el-tabs v-model="activePanelTab">
      <el-tab-pane label="盈亏概览" name="overview" lazy>
        <div class="profit-toolbar">
          <el-tabs
            v-model="overviewRangeType"
            class="profit-range-tabs"
            @tab-change="handleOverviewRangeChange"
          >
            <el-tab-pane
              v-for="item in OVERVIEW_RANGE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :name="item.value"
              lazy
            />
          </el-tabs>
          <div class="profit-toolbar__actions">
            <el-date-picker
              v-if="overviewRangeType === 'custom'"
              v-model="overviewCustomDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="handleCustomRangeChange"
            />
            <el-button :loading="overviewLoading" @click="refreshOverview"
              >刷新概览</el-button
            >
          </div>
        </div>

        <div v-loading="overviewLoading" class="profit-content-shell">
          <div class="profit-summary-grid">
            <div class="profit-summary-card emphasize-card">
              <span>{{ overviewRangeLabel }}收益额</span>
              <strong :class="profitClass(overviewSummary.profit_amount)">{{
                formatMoney(overviewSummary.profit_amount)
              }}</strong>
              <small>{{ rangeDescriptionText }}</small>
            </div>
            <div class="profit-summary-card">
              <span>{{ overviewRangeLabel }}收益率</span>
              <strong :class="profitClass(overviewSummary.profit_amount)">{{
                formatPercent(overviewSummary.profit_rate)
              }}</strong>
              <small>按期间基准资产或净入金估算</small>
            </div>
            <div class="profit-summary-card">
              <span>期末总资产</span>
              <strong>{{
                formatMoney(overviewSummary.current_total_asset)
              }}</strong>
              <small>现金 + 持仓市值</small>
            </div>
            <div class="profit-summary-card">
              <span>期间净入金</span>
              <strong>{{
                formatMoney(overviewSummary.net_capital_input)
              }}</strong>
              <small>入金 - 出金</small>
            </div>
            <div class="profit-summary-card">
              <span>期末持仓市值</span>
              <strong>{{ formatMoney(overviewSummary.market_value) }}</strong>
              <small>按有效结束日估值</small>
            </div>
            <div class="profit-summary-card">
              <span>胜负天数</span>
              <strong>{{
                `${overviewSummary.positive_days || 0} / ${overviewSummary.negative_days || 0}`
              }}</strong>
              <small>盈利天 / 亏损天</small>
            </div>
          </div>

          <div class="profit-module-grid">
            <section class="profit-card curve-card">
              <div class="profit-card__header">
                <div>
                  <h3>资产轨迹</h3>
                  <p>展示 {{ overviewRangeLabel }}内账号总资产的变化轨迹。</p>
                </div>
                <div class="curve-header-metrics">
                  <span>有效区间：{{ effectiveDateRangeText }}</span>
                </div>
              </div>

              <div v-if="curveCoordinates.length" class="curve-shell">
                <div class="curve-y-axis">
                  <span
                    v-for="item in curveAxisLabels"
                    :key="`axis-${item.label}`"
                    >{{ item.label }}</span
                  >
                </div>
                <div class="curve-canvas-shell curve-panel">
                  <svg
                    viewBox="0 0 720 220"
                    preserveAspectRatio="none"
                    class="curve-svg"
                  >
                    <defs>
                      <linearGradient
                        id="profitCurveFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stop-color="#0f766e"
                          stop-opacity="0.28"
                        />
                        <stop
                          offset="100%"
                          stop-color="#0f766e"
                          stop-opacity="0.04"
                        />
                      </linearGradient>
                    </defs>
                    <path :d="curveAreaPath" fill="url(#profitCurveFill)" />
                    <path :d="curveLinePath" class="curve-line" />
                  </svg>
                  <div class="curve-interaction-layer">
                    <el-tooltip
                      v-for="item in curveCoordinates"
                      :key="`tooltip-${item.date}`"
                      placement="top"
                      effect="light"
                    >
                      <template #content>
                        <div class="curve-tooltip">
                          <div class="curve-tooltip__title">
                            {{ item.date }}
                          </div>
                          <div>
                            {{
                              `当日盈亏：${formatMoney(item.day_profit_amount)}`
                            }}
                          </div>
                          <div>
                            {{
                              `当日收益率：${formatPercent(item.day_profit_rate)}`
                            }}
                          </div>
                          <div>{{ getCurveReasonText(item) }}</div>
                          <div v-if="getTradeEventText(item.date)">
                            {{ `关联交易：${getTradeEventText(item.date)}` }}
                          </div>
                          <div v-if="getCashFlowEventText(item.date)">
                            {{ `资金变动：${getCashFlowEventText(item.date)}` }}
                          </div>
                        </div>
                      </template>
                      <button
                        type="button"
                        class="curve-marker"
                        :style="getCurveMarkerStyle(item)"
                        :aria-label="`${item.date} 资产轨迹节点`"
                      />
                    </el-tooltip>
                  </div>
                  <div class="curve-x-axis">
                    <span>{{ curveStartLabel }}</span>
                    <span>{{ curveEndLabel }}</span>
                  </div>
                </div>
              </div>
              <el-empty
                v-else
                description="当前区间暂无可展示的资产轨迹"
                :image-size="90"
              />
            </section>

            <section class="profit-card ranking-card">
              <div class="profit-card__header">
                <div>
                  <h3>股票收益排行榜</h3>
                  <p>按当前时间级别统计股票盈亏贡献，便于快速复盘。</p>
                </div>
              </div>

              <el-table
                class="stock-ranking-table"
                :data="overviewData.stock_rankings || []"
                border
                empty-text="当前区间暂无股票收益数据"
              >
                <el-table-column
                  prop="stock_name"
                  label="股票名称"
                  min-width="140"
                >
                  <template #default="scope">
                    <button
                      type="button"
                      class="ranking-link-button"
                      @click="handleRankingStockClick(scope.row)"
                    >
                      {{ formatRankingStockName(scope.row) }}
                    </button>
                  </template>
                </el-table-column>
                <el-table-column prop="stock_code" label="代码" width="120" />
                <el-table-column
                  prop="profit_amount"
                  label="股票盈亏"
                  width="140"
                  sortable
                >
                  <template #default="scope">
                    <span :class="profitClass(scope.row.profit_amount)">{{
                      formatMoney(scope.row.profit_amount)
                    }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="profit_rate"
                  label="收益率"
                  width="120"
                  sortable
                >
                  <template #default="scope">
                    <span :class="profitClass(scope.row.profit_amount)">{{
                      formatPercent(scope.row.profit_rate)
                    }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="持仓日期区间" min-width="210">
                  <template #default="scope">{{
                    formatHoldingDateRange(scope.row)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="holding_days"
                  label="持仓天数"
                  width="120"
                  sortable
                >
                  <template #default="scope">{{
                    formatHoldingDays(scope.row.holding_days)
                  }}</template>
                </el-table-column>
              </el-table>
            </section>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="盈亏日历" name="calendar" lazy>
        <div class="profit-toolbar calendar-toolbar">
          <el-tabs
            v-model="calendarType"
            class="profit-range-tabs"
            @tab-change="handleCalendarTypeChange"
          >
            <el-tab-pane label="月" name="month" lazy />
            <el-tab-pane label="年" name="year" lazy />
          </el-tabs>
          <div class="profit-toolbar__actions">
            <el-button @click="navigateCalendar('prev')"
              >上一{{ calendarType === 'month' ? '月' : '年' }}</el-button
            >
            <div class="calendar-title">{{ calendarData.title || '--' }}</div>
            <el-button @click="navigateCalendar('next')"
              >下一{{ calendarType === 'month' ? '月' : '年' }}</el-button
            >
          </div>
        </div>

        <div v-loading="calendarLoading" class="profit-content-shell">
          <div class="calendar-summary-bar">
            <span>{{ calendarTotalLabel }}</span>
            <strong :class="profitClass(calendarTotalProfit)"
              >{{ formatMoney(calendarTotalProfit) }}元</strong
            >
          </div>
          <div v-if="calendarType === 'month'" class="calendar-month-shell">
            <div class="calendar-week-header">
              <span v-for="item in WEEKDAY_HEADERS" :key="item">{{
                item
              }}</span>
            </div>
            <div class="calendar-grid month-grid">
              <el-tooltip
                v-for="(item, index) in monthCalendarCells"
                :key="item.blank ? `blank-${index}` : item.date"
                placement="top"
                effect="light"
                :disabled="item.blank"
              >
                <template #content>
                  <div class="calendar-tooltip">
                    <div class="curve-tooltip__title">
                      {{ item.date || '--' }}
                    </div>
                    <div class="calendar-tooltip__section-title">
                      股票盈亏构成
                    </div>
                    <div
                      v-if="getCalendarStockRankings(item).length"
                      class="calendar-breakdown-table-wrap"
                    >
                      <table
                        class="calendar-breakdown-table calendar-breakdown-table--five-columns"
                      >
                        <thead>
                          <tr>
                            <th>股票名称</th>
                            <th>盈亏金额</th>
                            <th>盈亏率</th>
                            <th>持仓天数</th>
                            <th>持仓日期区间</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="ranking in getCalendarStockRankings(item)"
                            :key="`${item.date}-${ranking.stock_code}`"
                          >
                            <td>
                              <div class="calendar-breakdown-name">
                                {{ formatRankingStockName(ranking) }}
                              </div>
                              <div class="calendar-breakdown-code">
                                {{ ranking.stock_code }}
                              </div>
                            </td>
                            <td>
                              <span
                                :class="profitClass(ranking.profit_amount)"
                                >{{ formatMoney(ranking.profit_amount) }}</span
                              >
                            </td>
                            <td>
                              <span
                                :class="profitClass(ranking.profit_amount)"
                                >{{ formatPercent(ranking.profit_rate) }}</span
                              >
                            </td>
                            <td>
                              {{ formatHoldingDays(ranking.holding_days) }}
                            </td>
                            <td class="calendar-breakdown-range">
                              {{ formatHoldingDateRange(ranking) }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div v-else class="calendar-breakdown-empty">
                      暂无股票盈亏构成明细
                    </div>
                  </div>
                </template>
                <div class="calendar-cell" :class="getCalendarCellClass(item)">
                  <template v-if="!item.blank">
                    <div class="calendar-cell__date">
                      {{ formatDayNumber(item.date) }}
                    </div>
                    <div class="calendar-cell__profit">
                      {{ formatNullableMoney(item.profit_amount) }}
                    </div>
                    <div class="calendar-cell__rate">
                      {{ formatNullablePercent(item.profit_rate) }}
                    </div>
                  </template>
                </div>
              </el-tooltip>
            </div>
          </div>

          <div v-else class="calendar-grid year-grid">
            <el-tooltip
              v-for="item in calendarYearItems"
              :key="item.month"
              placement="top"
              effect="light"
            >
              <template #content>
                <div class="calendar-tooltip">
                  <div class="curve-tooltip__title">
                    {{ `${Number(item.month)}月` }}
                  </div>
                  <div class="calendar-tooltip__section-title">
                    股票盈亏构成
                  </div>
                  <div
                    v-if="getCalendarStockRankings(item).length"
                    class="calendar-breakdown-table-wrap"
                  >
                    <table
                      class="calendar-breakdown-table calendar-breakdown-table--five-columns"
                    >
                      <thead>
                        <tr>
                          <th>股票名称</th>
                          <th>盈亏金额</th>
                          <th>盈亏率</th>
                          <th>持仓天数</th>
                          <th>持仓日期区间</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="ranking in getCalendarStockRankings(item)"
                          :key="`${item.month}-${ranking.stock_code}`"
                        >
                          <td>
                            <div class="calendar-breakdown-name">
                              {{ formatRankingStockName(ranking) }}
                            </div>
                            <div class="calendar-breakdown-code">
                              {{ ranking.stock_code }}
                            </div>
                          </td>
                          <td>
                            <span :class="profitClass(ranking.profit_amount)">{{
                              formatMoney(ranking.profit_amount)
                            }}</span>
                          </td>
                          <td>
                            <span :class="profitClass(ranking.profit_amount)">{{
                              formatPercent(ranking.profit_rate)
                            }}</span>
                          </td>
                          <td>{{ formatHoldingDays(ranking.holding_days) }}</td>
                          <td class="calendar-breakdown-range">
                            {{ formatHoldingDateRange(ranking) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else class="calendar-breakdown-empty">
                    暂无股票盈亏构成明细
                  </div>
                </div>
              </template>
              <div
                class="calendar-year-card"
                :class="profitClass(item.profit_amount)"
              >
                <div class="calendar-year-card__month">
                  {{ `${Number(item.month)}月` }}
                </div>
                <strong>{{ formatMoney(item.profit_amount) }}</strong>
                <span>{{ formatPercent(item.profit_rate) }}</span>
                <small>{{
                  `盈利天 ${item.positive_days || 0} / 亏损天 ${item.negative_days || 0}`
                }}</small>
              </div>
            </el-tooltip>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import {
  getSimTradingProfitAnalysisCalendar,
  getSimTradingProfitAnalysisOverview,
} from '@/api/modules/simTrading';

const emit = defineEmits(['view-history-trades']);

const props = defineProps({
  accountId: {
    type: [Number, String],
    required: true,
  },
  trades: {
    type: Array,
    default: () => [],
  },
  cashFlows: {
    type: Array,
    default: () => [],
  },
});

const OVERVIEW_RANGE_OPTIONS = [
  { label: '本月', value: 'month' },
  { label: '本年', value: 'year' },
  { label: '开户至今', value: 'all' },
  { label: '自定义日期', value: 'custom' },
];
const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];

const activePanelTab = ref('overview');
const overviewRangeType = ref('month');
const overviewCustomDateRange = ref([]);
const overviewLoading = ref(false);
const calendarType = ref('month');
const calendarLoading = ref(false);
const overviewCache = new Map();
const calendarCache = new Map();

const overviewData = reactive({
  range: null,
  summary: {},
  asset_curve: [],
  stock_rankings: [],
});

const calendarData = reactive({
  title: '',
  anchor_date: '',
  prev_anchor_date: '',
  next_anchor_date: '',
  items: [],
});

const overviewSummary = computed(() => overviewData.summary || {});
const overviewRangeLabel = computed(
  () => overviewData.range?.display_label || '当前区间'
);
const rangeDescriptionText = computed(() => {
  const range = overviewData.range || {};
  if (!range.start_date || !range.effective_end_date) {
    return '暂无有效数据';
  }
  return `${range.start_date} 至 ${range.effective_end_date}`;
});
const effectiveDateRangeText = computed(() => {
  const range = overviewData.range || {};
  if (!range.start_date || !range.effective_end_date) {
    return '--';
  }
  return `${range.start_date} ~ ${range.effective_end_date}`;
});

const curveCoordinates = computed(() => {
  const points = Array.isArray(overviewData.asset_curve)
    ? overviewData.asset_curve
    : [];
  if (!points.length) {
    return [];
  }
  const values = points.map((item) => Number(item.total_asset || 0));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || Math.max(maxValue, 1);
  return points.map((item, index) => {
    const x =
      points.length === 1 ? 360 : 24 + (672 * index) / (points.length - 1);
    const y = 184 - ((Number(item.total_asset || 0) - minValue) / span) * 148;
    return {
      x,
      y,
      date: item.date,
      totalAsset: Number(item.total_asset || 0),
    };
  });
});
const curveLinePath = computed(() => {
  if (!curveCoordinates.value.length) {
    return '';
  }
  return curveCoordinates.value
    .map((item, index) => `${index === 0 ? 'M' : 'L'} ${item.x} ${item.y}`)
    .join(' ');
});
const curveAreaPath = computed(() => {
  if (!curveCoordinates.value.length) {
    return '';
  }
  const first = curveCoordinates.value[0];
  const last = curveCoordinates.value[curveCoordinates.value.length - 1];
  return `${curveLinePath.value} L ${last.x} 196 L ${first.x} 196 Z`;
});
const curveAxisLabels = computed(() => {
  const points = curveCoordinates.value;
  if (!points.length) {
    return [];
  }
  const values = points.map((item) => item.totalAsset);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const middleValue = (minValue + maxValue) / 2;
  return [
    { label: formatMoney(maxValue) },
    { label: formatMoney(middleValue) },
    { label: formatMoney(minValue) },
  ];
});
const curveStartLabel = computed(
  () => overviewData.asset_curve?.[0]?.date || '--'
);
const curveEndLabel = computed(
  () =>
    overviewData.asset_curve?.[overviewData.asset_curve.length - 1]?.date ||
    '--'
);

const monthCalendarCells = computed(() => {
  if (calendarType.value !== 'month') {
    return [];
  }
  const items = Array.isArray(calendarData.items) ? calendarData.items : [];
  if (!items.length) {
    return [];
  }
  const firstDay = new Date(`${items[0].date}T00:00:00`);
  const leadingBlankCount = (firstDay.getDay() + 6) % 7;
  const blanks = Array.from({ length: leadingBlankCount }, () => ({
    blank: true,
  }));
  return [...blanks, ...items.map((item) => ({ ...item, blank: false }))];
});
const calendarYearItems = computed(() =>
  Array.isArray(calendarData.items) ? calendarData.items : []
);
const calendarTotalProfit = computed(() => {
  const items = Array.isArray(calendarData.items) ? calendarData.items : [];
  return items.reduce((sum, item) => sum + Number(item?.profit_amount || 0), 0);
});
const calendarTotalLabel = computed(
  () => `${calendarData.title || '--'}总收益：`
);
const tradeEventsByDate = computed(() => {
  const map = new Map();
  for (const item of props.trades || []) {
    const dateText = toDateKey(item?.traded_time);
    if (!dateText) {
      continue;
    }
    const bucket = map.get(dateText) || [];
    bucket.push(
      `${getDirectionLabel(item?.direction)} ${formatTradeStockName(item?.stock_name, item?.stock_code)}`
    );
    map.set(dateText, bucket);
  }
  return map;
});
const cashFlowEventsByDate = computed(() => {
  const map = new Map();
  for (const item of props.cashFlows || []) {
    const dateText = toDateKey(item?.occurred_time);
    if (!dateText) {
      continue;
    }
    if (
      !['DEPOSIT', 'WITHDRAW', 'BUY_SETTLE', 'SELL_SETTLE', 'FEE'].includes(
        String(item?.flow_type || '')
      )
    ) {
      continue;
    }
    const bucket = map.get(dateText) || [];
    const amountText = `${getFlowTypeLabel(item?.flow_type)} ${formatMoney(item?.amount)}元`;
    bucket.push(amountText);
    map.set(dateText, bucket);
  }
  return map;
});

watch(
  () => props.accountId,
  async (value) => {
    if (!value) {
      return;
    }
    overviewCache.clear();
    calendarCache.clear();
    overviewRangeType.value = 'month';
    overviewCustomDateRange.value = [];
    calendarType.value = 'month';
    await Promise.all([loadOverview(), loadCalendar()]);
  },
  { immediate: true }
);

watch(
  () =>
    JSON.stringify({
      trades: (props.trades || []).map((item) => [
        item?.id,
        item?.traded_time,
        item?.fill_quantity,
        item?.net_amount,
      ]),
      cashFlows: (props.cashFlows || []).map((item) => [
        item?.id,
        item?.occurred_time,
        item?.amount,
        item?.flow_type,
      ]),
    }),
  async () => {
    if (!props.accountId) {
      return;
    }
    overviewCache.clear();
    calendarCache.clear();
    await Promise.all([
      loadOverview({ force: true }),
      loadCalendar({ force: true }),
    ]);
  }
);

async function loadOverview(options = {}) {
  if (!props.accountId) {
    return;
  }
  const { force = false } = options;
  const params = { range_type: overviewRangeType.value };
  if (
    overviewRangeType.value === 'custom' &&
    Array.isArray(overviewCustomDateRange.value) &&
    overviewCustomDateRange.value.length === 2
  ) {
    params.start_date = overviewCustomDateRange.value[0];
    params.end_date = overviewCustomDateRange.value[1];
  }
  const cacheKey = JSON.stringify({
    accountId: Number(props.accountId),
    ...params,
  });
  if (!force && overviewCache.has(cacheKey)) {
    Object.assign(overviewData, clonePayload(overviewCache.get(cacheKey)));
    return;
  }
  overviewLoading.value = true;
  try {
    const res = await getSimTradingProfitAnalysisOverview(
      Number(props.accountId),
      params
    );
    const payload = res?.payload || {
      range: null,
      summary: {},
      asset_curve: [],
      stock_rankings: [],
    };
    overviewCache.set(cacheKey, clonePayload(payload));
    Object.assign(overviewData, payload);
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '获取盈亏分析概览失败');
  } finally {
    overviewLoading.value = false;
  }
}

async function loadCalendar(options = {}) {
  if (!props.accountId) {
    return;
  }
  const { force = false } = options;
  calendarLoading.value = true;
  try {
    const anchorDate = calendarData.anchor_date || formatDateInput(new Date());
    const params = {
      calendar_type: calendarType.value,
      anchor_date: anchorDate,
    };
    const cacheKey = JSON.stringify({
      accountId: Number(props.accountId),
      ...params,
    });
    if (!force && calendarCache.has(cacheKey)) {
      Object.assign(calendarData, clonePayload(calendarCache.get(cacheKey)));
      return;
    }
    const res = await getSimTradingProfitAnalysisCalendar(
      Number(props.accountId),
      params
    );
    const payload = res?.payload || {
      title: '',
      anchor_date: '',
      prev_anchor_date: '',
      next_anchor_date: '',
      items: [],
    };
    calendarCache.set(cacheKey, clonePayload(payload));
    Object.assign(calendarData, payload);
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '获取盈亏分析日历失败');
  } finally {
    calendarLoading.value = false;
  }
}

function handleOverviewRangeChange(nextValue) {
  if (nextValue !== 'custom') {
    loadOverview();
  }
}

function handleCustomRangeChange() {
  if (
    overviewRangeType.value === 'custom' &&
    Array.isArray(overviewCustomDateRange.value) &&
    overviewCustomDateRange.value.length === 2
  ) {
    loadOverview();
  }
}

function handleCalendarTypeChange() {
  calendarData.anchor_date = formatDateInput(new Date());
  loadCalendar();
}

function navigateCalendar(direction) {
  calendarData.anchor_date =
    direction === 'prev'
      ? calendarData.prev_anchor_date
      : calendarData.next_anchor_date;
  loadCalendar();
}

function refreshOverview() {
  loadOverview({ force: true });
}

function formatMoney(value) {
  const numberValue = Number(value || 0);
  return numberValue.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value) {
  const numberValue = Number(value || 0);
  return `${(numberValue * 100).toFixed(2)}%`;
}

function formatNullableMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  return formatMoney(value);
}

function formatNullablePercent(value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  return formatPercent(value);
}

function profitClass(value) {
  const numberValue = Number(value || 0);
  if (numberValue > 0) return 'profit-up';
  if (numberValue < 0) return 'profit-down';
  return '';
}

function clonePayload(payload) {
  if (typeof structuredClone === 'function') {
    return structuredClone(payload);
  }
  return JSON.parse(JSON.stringify(payload));
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(String(value).trim().replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(value) {
  const date = normalizeDate(value);
  if (!date) {
    return '';
  }
  return formatDateInput(date);
}

function formatTradeStockName(stockName, stockCode) {
  const text = String(stockName || '').trim();
  if (text && !looksLikeStockCode(text)) {
    return text;
  }
  return String(stockCode || '').trim() || '--';
}

function formatRankingStockName(row) {
  return formatTradeStockName(row?.stock_name, row?.stock_code);
}

function handleRankingStockClick(row) {
  emit('view-history-trades', {
    stock_code: row?.stock_code || '',
    stock_name: row?.stock_name || '',
  });
}

function looksLikeStockCode(value) {
  return /^[A-Z]{0,4}\.?\d{4,6}(\.[A-Z]{2,4})?$|^\d{4,6}(\.[A-Z]{2,4})?$/i.test(
    String(value || '').trim()
  );
}

function getDirectionLabel(direction) {
  return direction === 'BUY' ? '买入' : direction === 'SELL' ? '卖出' : '--';
}

function getFlowTypeLabel(flowType) {
  const map = {
    DEPOSIT: '入金',
    WITHDRAW: '出金',
    BUY_SETTLE: '买入结算',
    SELL_SETTLE: '卖出结算',
    FEE: '交易费用',
  };
  return map[flowType] || flowType || '--';
}

function getTradeEventText(dateText) {
  const items = tradeEventsByDate.value.get(String(dateText || '')) || [];
  return items.slice(0, 3).join('；');
}

function getCashFlowEventText(dateText) {
  const items = cashFlowEventsByDate.value.get(String(dateText || '')) || [];
  return items.slice(0, 3).join('；');
}

function getCurveReasonText(point) {
  const dayProfit = Number(point?.day_profit_amount || 0);
  if (getTradeEventText(point?.date) || getCashFlowEventText(point?.date)) {
    return dayProfit >= 0
      ? '当日波动主要受交易与资金变动共同影响'
      : '当日回撤主要受交易与资金变动共同影响';
  }
  if (dayProfit > 0) {
    return '当日上涨主要来自持仓浮盈扩张';
  }
  if (dayProfit < 0) {
    return '当日下跌主要来自持仓回撤';
  }
  return '当日资产基本持平';
}

function getCurveMarkerStyle(point) {
  return {
    left: `${(point.x / 720) * 100}%`,
    top: `${(point.y / 220) * 100}%`,
  };
}

function getCalendarStockRankings(item) {
  if (!Array.isArray(item?.stock_rankings)) {
    return [];
  }
  return item.stock_rankings;
}

function formatHoldingDays(value) {
  const numberValue = Number(value || 0);
  return `${Math.max(0, Math.trunc(numberValue))} 天`;
}

function formatHoldingDateRange(row) {
  const startDate = row?.first_open_date || '--';
  const endDate = row?.close_date || '--';
  return `${startDate} ~ ${endDate}`;
}

function formatDateInput(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarCellClass(item) {
  if (item.blank) {
    return 'is-blank';
  }
  return [
    item.is_trading_day ? 'is-trading' : 'is-rest',
    profitClass(item.profit_amount),
  ];
}

function formatDayNumber(value) {
  return Number(String(value).split('-').pop() || 0);
}
</script>

<style scoped>
.profit-analysis-panel {
  display: flex;
  flex-direction: column;
}

.profit-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.profit-range-tabs {
  flex: 1;
  min-width: 320px;
}

.profit-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.profit-content-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profit-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.profit-summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #dde7f0;
  background: #ffffff;
}

.profit-summary-card span {
  font-size: 13px;
  color: #60748a;
}

.profit-summary-card strong {
  font-size: 24px;
  color: #17324d;
}

.profit-summary-card small {
  color: #8a9aaa;
}

.emphasize-card {
  background: linear-gradient(135deg, #f6fbf9 0%, #eaf7f2 100%);
  border-color: #cae7da;
}

.profit-module-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 16px;
}

.profit-card {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid #dde7f0;
  background: #ffffff;
}

.profit-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.profit-card__header h3 {
  margin: 0;
  font-size: 18px;
  color: #17324d;
}

.profit-card__header p {
  margin: 6px 0 0;
  color: #6f8194;
  line-height: 1.6;
}

.curve-header-metrics {
  font-size: 12px;
  color: #6f8194;
}

.curve-shell {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.curve-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 12px;
  color: #7b8794;
  padding: 12px 0;
}

.curve-canvas-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.curve-panel {
  position: relative;
}

.curve-svg {
  width: 100%;
  height: 220px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #fefefe 100%);
  border: 1px solid #ecf2f8;
}

.curve-line {
  fill: none;
  stroke: #0f766e;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.curve-dot {
  fill: #0f766e;
  stroke: #ffffff;
  stroke-width: 2;
}

.curve-interaction-layer {
  position: absolute;
  inset: 0 0 22px 0;
}

.curve-marker {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: #0f766e;
  transform: translate(-50%, -50%);
  box-shadow: 0 4px 14px rgba(15, 118, 110, 0.24);
  cursor: pointer;
}

.curve-tooltip,
.calendar-tooltip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  line-height: 1.6;
}

.curve-tooltip {
  max-width: 320px;
}

.calendar-tooltip {
  max-width: 760px;
}

.calendar-tooltip__section-title {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #60748a;
}

.calendar-breakdown-table-wrap {
  max-height: 420px;
  overflow-y: auto;
  overflow-x: hidden;
}

.calendar-breakdown-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
}

.calendar-breakdown-table th,
.calendar-breakdown-table td {
  padding: 8px 10px;
  border: 1px solid #dbe5ef;
  vertical-align: top;
  text-align: left;
}

.calendar-breakdown-table thead th {
  background: #f4f8fb;
  color: #4f647a;
  font-weight: 700;
}

.calendar-breakdown-table--five-columns th:nth-child(1),
.calendar-breakdown-table--five-columns td:nth-child(1) {
  width: 24%;
}

.calendar-breakdown-table--five-columns th:nth-child(2),
.calendar-breakdown-table--five-columns td:nth-child(2),
.calendar-breakdown-table--five-columns th:nth-child(3),
.calendar-breakdown-table--five-columns td:nth-child(3),
.calendar-breakdown-table--five-columns th:nth-child(4),
.calendar-breakdown-table--five-columns td:nth-child(4) {
  width: 14%;
}

.calendar-breakdown-table--five-columns th:nth-child(5),
.calendar-breakdown-table--five-columns td:nth-child(5) {
  width: 34%;
}

.calendar-breakdown-name {
  font-weight: 700;
  color: #17324d;
}

.calendar-breakdown-code {
  font-size: 11px;
  color: #7b8794;
}

.calendar-breakdown-range {
  word-break: break-word;
  line-height: 1.5;
}

.calendar-breakdown-empty {
  font-size: 12px;
  color: #7b8794;
}

.curve-tooltip__title {
  font-weight: 700;
  color: #17324d;
}

.curve-x-axis {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #7b8794;
}

.calendar-toolbar {
  align-items: center;
}

.calendar-title {
  min-width: 112px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #17324d;
}

.calendar-month-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calendar-summary-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid #e5ecf3;
  background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
}

.calendar-summary-bar span {
  font-size: 16px;
  color: #60748a;
}

.calendar-summary-bar strong {
  font-size: 24px;
}

.calendar-week-header,
.calendar-grid.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.calendar-week-header span {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #6f8194;
}

.calendar-cell {
  min-height: 130px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calendar-cell.is-blank {
  visibility: hidden;
}

.calendar-cell.is-rest {
  background: #f8fafc;
}

.calendar-cell__date {
  font-size: 18px;
  font-weight: 600;
  color: #17324d;
}

.calendar-cell__profit {
  font-size: 15px;
  font-weight: 700;
}

.calendar-cell__rate {
  font-size: 11px;
  color: #6f8194;
}

.calendar-grid.year-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.calendar-year-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #dde7f0;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calendar-year-card__month {
  font-size: 18px;
  font-weight: 700;
  color: #60748a;
}

.calendar-year-card strong {
  font-size: 18px;
  color: #17324d;
}

.calendar-year-card span,
.calendar-year-card small {
  font-size: 12px;
  color: #6f8194;
}

.stock-ranking-table :deep(.el-table__header-wrapper th .cell) {
  white-space: nowrap;
}

.ranking-link-button {
  padding: 0;
  border: none;
  background: transparent;
  color: #0f6b8f;
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.ranking-link-button:hover {
  color: #0a4f69;
  text-decoration: underline;
}

.profit-up {
  color: #cf3f3f !important;
}

.profit-down {
  color: #1f8a5b !important;
}

@media (max-width: 1080px) {
  .profit-module-grid {
    grid-template-columns: 1fr;
  }

  .curve-shell {
    grid-template-columns: 1fr;
  }

  .curve-y-axis {
    flex-direction: row;
    justify-content: space-between;
    padding: 0;
  }
}

@media (max-width: 768px) {
  .calendar-week-header,
  .calendar-grid.month-grid {
    gap: 8px;
  }

  .calendar-cell {
    min-height: 110px;
    padding: 10px;
  }

  .calendar-cell__date {
    font-size: 16px;
  }

  .calendar-cell__profit {
    font-size: 14px;
  }
}
</style>
