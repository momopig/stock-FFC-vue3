<template>
  <div class="market-stock-query-page" :class="{ 'has-results': hasSearched }">
    <section class="query-hero" :class="{ compact: hasSearched }">
      <div class="hero-badge-art" aria-hidden="true">
        <div class="badge-ring"></div>
        <div class="badge-core">行情分析</div>
      </div>
      <h2>股票查询</h2>
      <p>请输入股票名称，多个用空格或逗号隔开</p>
      <div class="hero-query-input">
        <el-input
          v-model="heroKeyword"
          size="large"
          clearable
          placeholder="请输入股票名称，多个用空格或逗号隔开"
          @keyup.enter="submitHeroSearch"
        >
          <template #append>
            <el-button
              type="primary"
              :loading="tableLoading"
              @click="submitHeroSearch"
              >搜索</el-button
            >
          </template>
        </el-input>
      </div>
    </section>

    <section v-if="hasSearched" class="query-result-shell">
      <div class="result-overview-cards">
        <article class="overview-card overview-card--triangle">
          <div class="overview-label">📊 当日行情</div>
          <div class="triangle-layout">
            <div class="triangle-top">
              <span>AVG</span>
              <el-tooltip
                placement="top"
                :content="marketOverview.avgStockName || '暂无对应股票名称'"
              >
                <strong :style="{ color: getQuoteColor(marketOverview.avg) }">
                  {{ formatChangePercent(marketOverview.avg) }}
                </strong>
              </el-tooltip>
            </div>
            <div class="triangle-bottom">
              <div>
                <span>High</span>
                <el-tooltip
                  placement="top"
                  :content="marketOverview.highStockName || '暂无对应股票名称'"
                >
                  <strong
                    :style="{ color: getQuoteColor(marketOverview.high) }"
                  >
                    {{ formatChangePercent(marketOverview.high) }}
                  </strong>
                </el-tooltip>
              </div>
              <div>
                <span>Low</span>
                <el-tooltip
                  placement="top"
                  :content="marketOverview.lowStockName || '暂无对应股票名称'"
                >
                  <strong :style="{ color: getQuoteColor(marketOverview.low) }">
                    {{ formatChangePercent(marketOverview.low) }}
                  </strong>
                </el-tooltip>
              </div>
            </div>
          </div>
          <div class="overview-subtext">以上为当前查询结果的当日涨跌统计</div>
        </article>
        <article class="overview-card overview-card--basic">
          <div class="overview-label">股票池数量</div>
          <div class="overview-value">
            {{ `${Number(page.total || 0)} 只` }}
          </div>
          <div class="overview-subtext">满足当前查询条件的股票总数</div>
        </article>
      </div>

      <StockList
        :stockList="stockList"
        :loading="tableLoading"
        :search-query="searchParams"
        :visible-column-keys="visibleColumnKeys"
        :total="page.total"
        :currentPage="page.pageNo"
        :pageSize="page.pageSize"
        :showAddButton="false"
        :isSelfSelected="true"
        :showAddToSelfButton="true"
        :show-star-action="false"
        :showActionColumn="false"
        :enableBatchActions="true"
        :showBulkAddToGroupButton="true"
        :showForceSubscribeGroupButton="isFutuActive && Boolean(allGroupId)"
        :forceSubscribeLoading="forceSubscribeLoading"
        @page-change="handlePageChange"
        @size-change="handlePageSizeChange"
        @search="handleSearchEvent"
        @filter-change="handleFilterChange"
        @selection-change="handleSelectionChange"
        @add-to-self="handleAddToSelfForQuery"
        @bulk-add-to-group="handleBulkAddToGroup"
        @force-subscribe-page-stocks="handleForceSubscribeCurrentPageStocks"
        @force-subscribe-group-stocks="handleForceSubscribeAllGroupStocks"
      />
    </section>

    <AddToGroupDialog
      v-model:visible="addToGroupDialogVisible"
      :stock-data="selectedStockData"
      :batch-stock-list="bulkAddRows"
      :strategy-info="selectedStrategyInfo"
      @submit="handleAddToGroupSubmitWrapped"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import StockList from '@/components/StockList/index.vue';
import { getKlineSourceSettings } from '@/api/modules/klineSource';
import {
  enrichStockSearchQuotes,
  forceSubscribeTargetStocks,
  getStock,
} from '@/api/modules/stockPool';
import {
  addStockToGroups,
  forceSubscribeGroupStocks,
  getUserGroups,
} from '@/api/modules/stockGroup';
import AddToGroupDialog from '@/views/StockPool/components/AddToGroupDialog.vue';
import { mapQuoteToFlatRowFields } from '@/views/StockPool/utils/stockQuoteFields';
import { useStockListPagingHandlers } from '@/views/StockPool/composables/useStockListPagingHandlers';
import { useAddToGroupDialogFlow } from '@/views/StockPool/composables/useAddToGroupDialogFlow';

const heroKeyword = ref('');
const hasSearched = ref(false);
const tableLoading = ref(false);
const forceSubscribeLoading = ref(false);
const allGroupId = ref('');
const isFutuActive = ref(false);
const stockList = ref([]);
const allMatchedRows = ref([]);
const filteredRows = ref([]);
const selectedRows = ref([]);
const bulkAddRows = ref([]);

const page = reactive({
  pageNo: 1,
  pageSize: 50,
  total: 0,
});

function createDefaultSearchParams() {
  return {
    stock_code: '',
    stock_name: '',
    exchange_code: '',
    strategy_name: '',
    snapshot_date: '',
  };
}

const searchParams = reactive(createDefaultSearchParams());

const visibleColumnKeys = Object.freeze([
  'stock_name',
  'last_price',
  'change_rate',
  'turnover_rate',
  'volume_ratio',
  'pe_ttm_ratio',
  'circular_market_val_yi',
  'stability_analysis',
  'ma_trend',
  'risk_signs',
  'yesterday_change_rate',
  'three_day_change_rate',
  'twenty_day_change_rate',
  'price_location_indicator_value',
]);

const { handlePageChange, handlePageSizeChange, handleSearchEvent } =
  useStockListPagingHandlers({
    page,
    searchParams,
    reload: () => loadStockList(),
  });

const {
  addToGroupDialogVisible,
  selectedStockData,
  selectedStrategyInfo,
  handleAddToSelf,
  handleAddToGroupSubmit,
} = useAddToGroupDialogFlow({
  onSuccess: () => loadStockList({ force: true }),
});

const marketOverview = computed(() => {
  const rows =
    Array.isArray(filteredRows.value) && filteredRows.value.length
      ? filteredRows.value
      : Array.isArray(stockList.value)
        ? stockList.value
        : [];
  const values = [];
  const validRows = [];
  for (const row of rows) {
    const changeRate = Number(row?.change_rate || 0);
    if (!Number.isNaN(changeRate)) {
      values.push(changeRate);
      validRows.push({
        stockName:
          String(row?.stock_name || '').trim() ||
          String(row?.stock_code || '').trim(),
        changeRate,
      });
    }
  }
  if (!values.length) {
    return {
      avg: null,
      high: null,
      low: null,
      avgStockName: '',
      highStockName: '',
      lowStockName: '',
    };
  }
  const sum = values.reduce((acc, current) => acc + current, 0);
  const avg = sum / values.length;
  const high = Math.max(...values);
  const low = Math.min(...values);

  const nearestAvgRow = validRows.reduce((best, row) => {
    if (!best) {
      return row;
    }
    const currentDiff = Math.abs(row.changeRate - avg);
    const bestDiff = Math.abs(best.changeRate - avg);
    return currentDiff < bestDiff ? row : best;
  }, null);

  const highRow = validRows.find((row) => row.changeRate === high) || null;
  const lowRow = validRows.find((row) => row.changeRate === low) || null;

  return {
    avg,
    high,
    low,
    avgStockName: nearestAvgRow?.stockName || '',
    highStockName: highRow?.stockName || '',
    lowStockName: lowRow?.stockName || '',
  };
});

function getQuoteColor(changeRate) {
  const amount = Number(changeRate);
  if (changeRate == null || Number.isNaN(amount)) {
    return '#606266';
  }
  return amount >= 0 ? '#f56c6c' : '#67c23a';
}

function formatChangePercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--';
  }
  const amount = Number(value);
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${amount.toFixed(2)}%`;
}

function splitBatchKeywords(rawValue) {
  return String(rawValue || '')
    .split(/[\s,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getBuiltinCreateType(group) {
  const type = String(group?.builtinType || group?.create_type || '')
    .trim()
    .toLowerCase();
  if (type === 'all') {
    return 'all';
  }
  return type || 'custom';
}

function applySearchParams(nextSearchParams = {}) {
  Object.assign(searchParams, createDefaultSearchParams(), nextSearchParams);
}

function mapSearchItemToStockRow(item = {}) {
  const stockCode = String(item?.code || '').trim();
  const exchangeCode = String(item?.exchange_code || item?.exchange || '')
    .trim()
    .toUpperCase();
  const fullCode = String(item?.full_code || '').trim();
  const lastPrice = Number(item?.price || 0);
  return {
    id: fullCode || `${exchangeCode}_${stockCode}`,
    stock_code: stockCode,
    stock_name: String(item?.name || '').trim() || stockCode,
    exchange_code: exchangeCode,
    last_price: lastPrice > 0 ? lastPrice : null,
    change_rate: null,
    turnover_rate: null,
    volume_ratio: null,
    pe_ttm_ratio: null,
    circular_market_val_yi: null,
    risk_signs: [],
    is_starred: false,
    add_reason: '',
    notes: '',
    full_code: fullCode,
  };
}

function mergeQuoteFieldsToRows(baseRows = [], quoteItems = []) {
  const quoteMap = new Map();
  for (const item of quoteItems) {
    const key = `${String(item?.exchange_code || '').toUpperCase()}_${String(item?.code || '').toUpperCase()}`;
    if (!key.trim() || key === '_') {
      continue;
    }
    quoteMap.set(key, item?.quote || {});
  }
  return baseRows.map((row) => {
    const key = `${String(row?.exchange_code || '').toUpperCase()}_${String(row?.stock_code || '').toUpperCase()}`;
    const quote = quoteMap.get(key) || {};
    return {
      ...row,
      ...mapQuoteToFlatRowFields(quote, null),
    };
  });
}

async function searchStocksByKeywords(keywordTokens = []) {
  if (!keywordTokens.length) {
    return [];
  }
  const responses = await Promise.all(
    keywordTokens.map((keyword) => getStock(keyword, false))
  );
  const mergedMap = new Map();
  for (const response of responses) {
    if (response?.success === false) {
      continue;
    }
    const items = Array.isArray(response?.payload?.items)
      ? response.payload.items
      : [];
    for (const item of items) {
      const mapped = mapSearchItemToStockRow(item);
      const key = mapped.id;
      if (!mapped.stock_code || !mapped.exchange_code || !key) {
        continue;
      }
      if (!mergedMap.has(key)) {
        mergedMap.set(key, mapped);
        continue;
      }
      const existing = mergedMap.get(key);
      if (!(existing?.last_price > 0) && mapped.last_price > 0) {
        mergedMap.set(key, {
          ...existing,
          ...mapped,
        });
      }
    }
  }
  const baseRows = Array.from(mergedMap.values());
  if (!baseRows.length) {
    return [];
  }
  const quoteResponse = await enrichStockSearchQuotes(
    baseRows.map((row) => ({
      code: row.stock_code,
      exchange_code: row.exchange_code,
      name: row.stock_name,
      full_code: row.full_code,
    }))
  );
  const quoteItems = Array.isArray(quoteResponse?.payload?.items)
    ? quoteResponse.payload.items
    : [];
  return mergeQuoteFieldsToRows(baseRows, quoteItems);
}

function applyLocalFiltersAndPagination() {
  const exchangeCode = String(searchParams.exchange_code || '')
    .trim()
    .toUpperCase();
  const filtered = allMatchedRows.value.filter((row) => {
    if (
      exchangeCode &&
      String(row.exchange_code || '').toUpperCase() !== exchangeCode
    ) {
      return false;
    }
    return true;
  });
  page.total = filtered.length;
  const startIndex = Math.max(
    (Number(page.pageNo || 1) - 1) * Number(page.pageSize || 50),
    0
  );
  const endIndex = startIndex + Number(page.pageSize || 50);
  stockList.value = filtered.slice(startIndex, endIndex);
  filteredRows.value = stockList.value;
}

async function loadKlineSourceSettings() {
  try {
    const response = await getKlineSourceSettings();
    isFutuActive.value =
      String(response?.payload?.active_source || '').toLowerCase() === 'futu';
  } catch (error) {
    console.warn('获取K线数据源配置失败，已隐藏强制订阅按钮:', error);
    isFutuActive.value = false;
  }
}

async function loadAllGroupId() {
  try {
    const response = await getUserGroups();
    const groups = Array.isArray(response?.payload?.items)
      ? response.payload.items
      : [];
    const allGroup = groups.find(
      (group) => getBuiltinCreateType(group) === 'all'
    );
    allGroupId.value = String(allGroup?.id || '');
  } catch (error) {
    console.error('加载分组信息失败:', error);
    allGroupId.value = '';
  }
}

async function loadStockList(options = {}) {
  const { force = false } = options;
  if (!hasSearched.value) {
    return;
  }
  const keywordTokens = splitBatchKeywords(
    [searchParams.stock_name, searchParams.stock_code].filter(Boolean).join(' ')
  );
  if (!keywordTokens.length) {
    allMatchedRows.value = [];
    stockList.value = [];
    filteredRows.value = [];
    page.total = 0;
    return;
  }
  tableLoading.value = true;
  try {
    // force 参数保留：当前为直连查询，不做本地缓存。
    if (force) {
      // no-op
    }
    allMatchedRows.value = await searchStocksByKeywords(keywordTokens);
    applyLocalFiltersAndPagination();
  } catch (error) {
    console.error('查询股票失败:', error);
    ElMessage.error(error?.message || '查询股票失败，请稍后重试');
  } finally {
    tableLoading.value = false;
  }
}

async function submitHeroSearch() {
  const nameTokens = splitBatchKeywords(heroKeyword.value);
  hasSearched.value = true;
  page.pageNo = 1;
  if (!nameTokens.length) {
    applySearchParams();
    allMatchedRows.value = [];
    stockList.value = [];
    filteredRows.value = [];
    page.total = 0;
    return;
  }
  applySearchParams({ stock_name: nameTokens.join(',') });
  await loadStockList({ force: true });
}

function handleFilterChange(rows) {
  filteredRows.value = Array.isArray(rows) ? rows : [];
}

function handleAddToSelfForQuery(row) {
  handleAddToSelf(row);
  selectedStrategyInfo.value = null;
}

function handleSelectionChange(rows) {
  selectedRows.value = Array.isArray(rows) ? rows : [];
}

const handleBulkAddToGroup = (rows) => {
  const targets = Array.isArray(rows) ? rows : selectedRows.value;
  if (!targets.length) {
    ElMessage.warning('请先选择要加入分组的股票');
    return;
  }
  // 批量添加直接进入批量弹窗，避免复用单条股票状态导致只显示第一只。
  bulkAddRows.value = [...targets];
  selectedStockData.value = null;
  selectedStrategyInfo.value = null;
  addToGroupDialogVisible.value = true;
};

const parseNumericPrice = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const resolveBatchInitialPrice = (row) => {
  // 批量加入时按每只股票当前最新价入组，避免所有股票共用一个初始价。
  return (
    parseNumericPrice(row?.last_price) ??
    parseNumericPrice(row?.lastPrice) ??
    parseNumericPrice(row?.current_price) ??
    parseNumericPrice(row?.price) ??
    parseNumericPrice(row?.initial_price) ??
    0
  );
};

const handleAddToGroupSubmitWrapped = async (submitData) => {
  if (!bulkAddRows.value.length) {
    await handleAddToGroupSubmit(submitData);
    return;
  }

  let successCount = 0;
  let failCount = 0;
  for (const row of bulkAddRows.value) {
    try {
      const result = await addStockToGroups({
        group_ids: submitData.group_ids,
        exchange_code: row.exchange_code,
        stock_code: row.stock_code,
        stock_name: row.stock_name,
        add_time: submitData.add_time || null,
        initial_price: resolveBatchInitialPrice(row),
        add_reason: submitData.add_reason || row.add_reason || '',
        remark: submitData.remark || row.notes || '',
      });
      if (result?.success !== false) {
        successCount += 1;
      } else {
        failCount += 1;
      }
    } catch {
      failCount += 1;
    }
  }

  ElMessage.success(
    `批量加入新分组完成：成功 ${successCount} 只${failCount ? `，失败 ${failCount} 只` : ''}`
  );
  bulkAddRows.value = [];
  addToGroupDialogVisible.value = false;
  selectedRows.value = [];
  await loadStockList({ force: true });
};

async function handleForceSubscribeAllGroupStocks() {
  if (!allGroupId.value) {
    ElMessage.warning('未找到“全部”分组，暂时无法执行强制订阅');
    return;
  }
  forceSubscribeLoading.value = true;
  try {
    const response = await forceSubscribeGroupStocks(Number(allGroupId.value));
    if (response?.success === false) {
      ElMessage.error(response?.message || '强制订阅本组股票失败');
      return;
    }
    const payload = response?.payload || {};
    ElMessage.success(
      `订阅处理完成：共 ${payload.processed_count || 0} 只，新增成功 ${payload.success_count || 0} 只，失败 ${payload.failed_count || 0} 只`
    );
  } catch (error) {
    console.error('强制订阅本组股票失败:', error);
    ElMessage.error(error?.message || '强制订阅本组股票失败，请稍后重试');
  } finally {
    forceSubscribeLoading.value = false;
  }
}

// 关闭弹窗时清空批量上下文，避免后续单条添加误走批量提交流程。
watch(addToGroupDialogVisible, (visible) => {
  if (!visible) {
    bulkAddRows.value = [];
  }
});

async function handleForceSubscribeCurrentPageStocks(rows) {
  const targets = (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      stock_code: String(row?.stock_code || '').trim(),
      exchange_code: String(row?.exchange_code || '').trim(),
      stock_name: String(row?.stock_name || '').trim(),
    }))
    .filter((row) => row.stock_code && row.exchange_code);
  if (!targets.length) {
    ElMessage.warning('当前页暂无可订阅的股票');
    return;
  }
  forceSubscribeLoading.value = true;
  try {
    const response = await forceSubscribeTargetStocks(
      targets,
      'market_analysis_current_page'
    );
    if (response?.success === false) {
      ElMessage.error(response?.message || '强制订阅本页股票失败');
      return;
    }
    const payload = response?.payload || {};
    ElMessage.success(
      `订阅处理完成：共 ${payload.success_count || 0} 只，失败 ${payload.failed_count || 0} 只`
    );
  } catch (error) {
    console.error('强制订阅本页股票失败:', error);
    ElMessage.error(error?.message || '强制订阅本页股票失败，请稍后重试');
  } finally {
    forceSubscribeLoading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadKlineSourceSettings(), loadAllGroupId()]);
});
</script>

<style scoped lang="less">
.market-stock-query-page {
  padding: 20px;
  min-height: calc(100vh - 140px);
  background:
    radial-gradient(
      circle at 14% 18%,
      rgba(16, 185, 129, 0.14),
      transparent 40%
    ),
    radial-gradient(
      circle at 84% 10%,
      rgba(249, 115, 22, 0.13),
      transparent 38%
    ),
    linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%);
}

.query-hero {
  max-width: 1080px;
  margin: 10vh auto 0;
  text-align: center;
  transition: all 0.35s ease;

  .hero-badge-art {
    margin: 0 auto 18px;
    width: 122px;
    height: 122px;
    position: relative;

    .badge-ring {
      position: absolute;
      inset: 0;
      border-radius: 999px;
      border: 2px dashed rgba(15, 118, 110, 0.42);
      animation: spinRing 14s linear infinite;
    }

    .badge-core {
      position: absolute;
      inset: 16px;
      border-radius: 999px;
      background: linear-gradient(135deg, #0f766e 0%, #1d4ed8 100%);
      color: #fff;
      font-weight: 700;
      letter-spacing: 1px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 14px 30px rgba(29, 78, 216, 0.22);
    }
  }

  h2 {
    margin: 0;
    font-size: 30px;
    font-weight: 700;
    color: #0f172a;
  }

  p {
    margin: 10px 0 0;
    color: #475569;
    font-size: 14px;
  }

  .hero-query-input {
    margin: 24px auto 0;
    max-width: 980px;

    :deep(.el-input__wrapper) {
      min-height: 64px;
      border-radius: 18px 0 0 18px;
      box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12);
    }

    :deep(.el-input-group__append .el-button) {
      min-height: 64px;
      border-radius: 0 18px 18px 0;
      padding: 0 30px;
      font-weight: 600;
    }
  }

  &.compact {
    margin-top: 10px;

    .hero-badge-art {
      display: none;
    }

    h2 {
      font-size: 22px;
    }

    .hero-query-input {
      max-width: 860px;

      :deep(.el-input__wrapper),
      :deep(.el-input-group__append .el-button) {
        min-height: 54px;
      }
    }
  }
}

.query-result-shell {
  margin-top: 20px;
}

.result-overview-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(240px, 1fr));
  gap: 14px;
  margin-bottom: 14px;

  .overview-card {
    background: linear-gradient(140deg, #ffffff 0%, #f0fdf4 110%);
    border: 1px solid rgba(22, 163, 74, 0.12);
    border-radius: 16px;
    padding: 16px 18px;

    .overview-label {
      color: #64748b;
      font-size: 13px;
    }

    .overview-value {
      margin-top: 6px;
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }

    .overview-subtext {
      margin-top: 6px;
      color: #64748b;
      font-size: 12px;
    }

    &.overview-card--triangle {
      .triangle-layout {
        margin-top: 8px;

        .triangle-top {
          display: flex;
          flex-direction: column;
          align-items: center;

          span {
            color: #64748b;
            font-size: 13px;
          }

          strong {
            font-size: 28px;
            line-height: 1.15;
          }
        }

        .triangle-bottom {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          padding: 0 16px;

          div {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          span {
            color: #64748b;
            font-size: 12px;
          }

          strong {
            font-size: 22px;
            line-height: 1.2;
          }
        }
      }
    }

    &.overview-card--basic {
      .overview-value {
        font-size: 32px;
      }
    }
  }
}

@keyframes spinRing {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .market-stock-query-page {
    padding: 14px;
  }

  .query-hero {
    margin-top: 5vh;

    h2 {
      font-size: 24px;
    }

    .hero-query-input {
      max-width: 100%;
    }
  }

  .result-overview-cards {
    grid-template-columns: 1fr;
  }
}
</style>
