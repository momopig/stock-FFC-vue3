<template>
  <div class="chip-price-manager-page">
    <div class="page-header">
      <div>
        <h2>筹码集中价管理</h2>
        <p>
          独立维护
          stock_chip_concentrated_price，支持历史日期筛选、批量重算和单条记录维护。
        </p>
      </div>
      <el-space wrap>
        <el-button
          type="warning"
          :loading="recomputeLoading"
          @click="recomputeChipPrices"
        >
          手动重算
        </el-button>
        <el-button type="primary" @click="openCreateDialog">新增记录</el-button>
      </el-space>
    </div>

    <el-alert
      title="该页面直接服务于日内最低价模型的 P1/P2/P0 支撑缓存运维；手动重算会按选定日期和时间级别回填缓存表。"
      type="info"
      :closable="false"
      show-icon
      class="page-alert"
    />

    <el-card shadow="never" class="filter-card">
      <div class="filter-row filter-row-wrap">
        <el-select
          v-model="selectedQueryStockOption"
          value-key="key"
          filterable
          remote
          reserve-keyword
          clearable
          placeholder="股票搜索（名称/代码/拼音）"
          class="filter-item filter-keyword"
          :remote-method="searchStocks"
          :loading="stockSearchLoading"
          @change="handleQueryStockChange"
          @clear="clearQueryStock"
        >
          <el-option
            v-for="stock in stockSearchOptions"
            :key="stock.key"
            :label="stock.label"
            :value="stock"
          />
        </el-select>
        <el-date-picker
          v-model="queryForm.trade_date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="交易日期"
          class="filter-item"
        />
        <el-select
          v-model="queryForm.time_levels"
          multiple
          collapse-tags
          collapse-tags-tooltip
          placeholder="时间级别"
          class="filter-item chip-time-level-select"
        >
          <el-option
            v-for="item in chipTimeLevelOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="queryForm.include_invalid"
          placeholder="记录范围"
          class="filter-item"
        >
          <el-option :value="false" label="仅有效记录" />
          <el-option :value="true" label="包含失效记录" />
        </el-select>
        <el-button type="primary" :loading="loading" @click="loadChipPrices">
          查询
        </el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <div class="table-toolbar">
        <div class="toolbar-summary">
          <span>当前记录数</span>
          <strong>{{ chipPrices.length }}</strong>
        </div>
        <div class="toolbar-summary">
          <span>查询日期</span>
          <strong>{{ queryForm.trade_date || '-' }}</strong>
        </div>
      </div>

      <el-table :data="chipPrices" border v-loading="loading">
        <el-table-column prop="id" label="ID" width="90" sortable />
        <el-table-column prop="stock_code" label="股票代码" min-width="140" />
        <el-table-column label="股票名称" min-width="140" show-overflow-tooltip>
          <template #default="scope">
            {{ getStockDisplayName(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="trade_date" label="交易日期" min-width="120" />
        <el-table-column prop="time_level" label="时间级别" width="100" />
        <el-table-column
          prop="concentrated_price"
          label="最强筹码集中价"
          min-width="120"
          sortable
        >
          <template #default="scope">
            <span class="chip-price-strong">{{
              formatNumber(scope.row.concentrated_price)
            }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="chip_ratio"
          label="筹码占比(%)"
          min-width="130"
          sortable
        >
          <template #default="scope">
            {{ formatNumber(scope.row.chip_ratio) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="data_source"
          label="数据来源"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column label="有效状态" width="100">
          <template #default="scope">
            <el-tag
              size="small"
              :type="scope.row.is_valid ? 'success' : 'info'"
            >
              {{ scope.row.is_valid ? '有效' : '失效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="calc_time" label="计算时间" min-width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.calc_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-space wrap>
              <el-button link type="primary" @click="openEditDialog(scope.row)">
                编辑
              </el-button>
              <el-button
                link
                type="danger"
                :disabled="!scope.row.is_valid"
                @click="handleDelete(scope.row)"
              >
                失效
              </el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="editorDialog.visible"
      :title="
        editorDialog.mode === 'create' ? '新增筹码集中价' : '编辑筹码集中价'
      "
      width="640px"
    >
      <el-form label-width="120px">
        <el-form-item label="股票搜索" required>
          <el-select
            v-model="selectedEditorStockOption"
            value-key="key"
            filterable
            remote
            reserve-keyword
            clearable
            placeholder="查询（名称/代码/拼音）"
            class="dialog-full-width"
            :remote-method="searchStocks"
            :loading="stockSearchLoading"
            @change="handleEditorStockChange"
            @clear="clearEditorStock"
          >
            <el-option
              v-for="stock in stockSearchOptions"
              :key="stock.key"
              :label="stock.label"
              :value="stock"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="股票代码" required>
          <el-input
            v-model="editorForm.stock_code"
            disabled
            placeholder="自动填充"
          />
        </el-form-item>
        <el-form-item label="交易日期" required>
          <el-date-picker
            v-model="editorForm.trade_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="交易日期"
            class="dialog-full-width"
          />
        </el-form-item>
        <el-form-item label="时间级别" required>
          <el-select v-model="editorForm.time_level" class="dialog-full-width">
            <el-option
              v-for="item in chipTimeLevelOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="最强筹码集中价" required>
          <el-input-number
            v-model="editorForm.concentrated_price"
            :min="0"
            :precision="2"
            :step="0.01"
            class="dialog-full-width"
          />
        </el-form-item>
        <el-form-item label="筹码占比(%)">
          <el-input-number
            v-model="editorForm.chip_ratio"
            :min="0"
            :precision="2"
            :step="0.1"
            class="dialog-full-width"
          />
        </el-form-item>
        <el-form-item label="数据来源">
          <el-input
            v-model="editorForm.data_source"
            placeholder="manual / futu-history-kline"
            :disabled="editorDialog.mode === 'edit'"
          />
        </el-form-item>
        <el-form-item label="有效状态">
          <el-switch
            v-model="editorForm.is_valid"
            inline-prompt
            active-text="有效"
            inactive-text="失效"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-space>
          <el-button @click="editorDialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submitChipPrice">
            保存
          </el-button>
        </el-space>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';

import { getStock } from '@/api/modules/stockPool';
import {
  createSignalStrategyChipPrice,
  deleteSignalStrategyChipPrice,
  getSignalStrategyChipPrices,
  recomputeSignalStrategyChipPrices,
  updateSignalStrategyChipPrice,
} from '@/api/modules/signalStrategy';

const route = useRoute();

const loading = ref(false);
const recomputeLoading = ref(false);
const saving = ref(false);
const stockSearchLoading = ref(false);
const chipPrices = ref([]);
const stockSearchOptions = ref([]);
const stockNameMap = ref({});
const selectedQueryStockOption = ref(null);
const selectedEditorStockOption = ref(null);

const EXCHANGE_MAP = {
  SH: 'SH',
  SZ: 'SZ',
  HK: 'HK',
  US: 'US',
  SSE: 'SH',
  SZSE: 'SZ',
  hk: 'HK',
  us: 'US',
};

const chipTimeLevelOptions = [
  { value: '1min', label: '1min' },
  { value: '5min', label: '5min' },
  { value: '30min', label: '30min' },
  { value: '1h', label: '1h' },
];

const queryForm = reactive(createInitialQueryForm());
const editorDialog = reactive({
  visible: false,
  mode: 'create',
  recordId: null,
});
const editorForm = reactive(createInitialEditorForm());

onMounted(async () => {
  hydrateQueryFromRoute();
  await loadChipPrices();
});

function hydrateQueryFromRoute() {
  if (route.query.stock_code) {
    queryForm.stock_code = String(route.query.stock_code);
    selectedQueryStockOption.value = buildStockOptionFromCode(
      queryForm.stock_code,
      String(route.query.stock_name || '')
    );
  }
  if (route.query.trade_date) {
    queryForm.trade_date = String(route.query.trade_date);
  }
  if (route.query.time_levels) {
    const rawLevels = Array.isArray(route.query.time_levels)
      ? route.query.time_levels
      : String(route.query.time_levels).split(',');
    queryForm.time_levels = rawLevels.filter(Boolean);
  }
}

function normalizeStockFromApi(stock) {
  const exchangeCode =
    EXCHANGE_MAP[stock?.exchange_code] ||
    EXCHANGE_MAP[stock?.exchange] ||
    stock?.exchange_code ||
    stock?.exchange ||
    '';
  return {
    ...stock,
    exchange_code: exchangeCode,
    code: stock?.code || stock?.stock_code || '',
    name: stock?.name || stock?.stock_name || '',
    initialPrice: Number(stock?.price) || 0,
  };
}

function buildStockOption(stock) {
  const normalized = normalizeStockFromApi(stock);
  return {
    ...normalized,
    label: `${normalized.name || '--'}：${normalized.exchange_code}${normalized.code}`,
    key: `${normalized.exchange_code}_${normalized.code}`,
  };
}

function buildStockOptionFromCode(stockCode, stockName = '') {
  const [codePart = '', exchangePart = ''] = String(stockCode || '').split('.');
  const exchangeCode = EXCHANGE_MAP[exchangePart] || exchangePart;
  if (!codePart || !exchangeCode) {
    return null;
  }
  return {
    code: codePart,
    name: stockName || codePart,
    exchange_code: exchangeCode,
    label: `${stockName || codePart}：${exchangeCode}${codePart}`,
    key: `${exchangeCode}_${codePart}`,
  };
}

function getStockSearchErrorMessage(result) {
  if (result?.code === 429) {
    return result?.message || '股票搜索触发限制，请稍后重试';
  }
  return result?.message || '股票搜索失败，请稍后重试';
}

async function searchStocks(query) {
  if (!query) {
    stockSearchOptions.value = [];
    return;
  }
  stockSearchLoading.value = true;
  try {
    const result = await getStock(query, false);
    if (result?.success === false) {
      stockSearchOptions.value = [];
      ElMessage.error(getStockSearchErrorMessage(result));
      return;
    }
    stockSearchOptions.value = (result?.payload?.items || []).map((stock) =>
      buildStockOption(stock)
    );
  } catch (error) {
    stockSearchOptions.value = [];
    ElMessage.error(error?.message || '股票搜索失败，请稍后重试');
  } finally {
    stockSearchLoading.value = false;
  }
}

function handleQueryStockChange(stock) {
  queryForm.stock_code = stock ? `${stock.code}.${stock.exchange_code}` : '';
}

function clearQueryStock() {
  selectedQueryStockOption.value = null;
  queryForm.stock_code = '';
}

function handleEditorStockChange(stock) {
  editorForm.stock_code = stock ? `${stock.code}.${stock.exchange_code}` : '';
}

function clearEditorStock() {
  selectedEditorStockOption.value = null;
  editorForm.stock_code = '';
}

async function loadChipPrices() {
  loading.value = true;
  try {
    const res = await getSignalStrategyChipPrices(
      compactParams({
        stock_code: queryForm.stock_code.trim(),
        trade_date: queryForm.trade_date,
        time_levels: queryForm.time_levels,
        include_invalid: queryForm.include_invalid,
      })
    );
    chipPrices.value = res?.payload?.items || [];
    await hydrateStockNames(chipPrices.value);
  } catch (error) {
    ElMessage.error(error.message || '加载筹码集中价失败');
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  Object.assign(queryForm, createInitialQueryForm());
  stockSearchOptions.value = [];
  selectedQueryStockOption.value = null;
  hydrateQueryFromRoute();
  loadChipPrices();
}

async function recomputeChipPrices() {
  if (!queryForm.stock_code || !queryForm.trade_date) {
    ElMessage.warning('请先选择股票并填写交易日期');
    return;
  }
  recomputeLoading.value = true;
  try {
    const res = await recomputeSignalStrategyChipPrices({
      stock_code: queryForm.stock_code.trim(),
      trade_date: queryForm.trade_date,
      time_levels: queryForm.time_levels,
      force_refresh: true,
    });
    chipPrices.value = res?.payload?.items || [];
    await hydrateStockNames(chipPrices.value);
    ElMessage.success('历史筹码集中价重算完成');
  } catch (error) {
    ElMessage.error(error.message || '手动重算失败');
  } finally {
    recomputeLoading.value = false;
  }
}

function openCreateDialog() {
  editorDialog.visible = true;
  editorDialog.mode = 'create';
  editorDialog.recordId = null;
  Object.assign(editorForm, createInitialEditorForm(), {
    stock_code: queryForm.stock_code || '',
    trade_date: queryForm.trade_date || formatDateInput(new Date()),
  });
  selectedEditorStockOption.value = selectedQueryStockOption.value
    ? { ...selectedQueryStockOption.value }
    : buildStockOptionFromCode(editorForm.stock_code);
}

function openEditDialog(row) {
  editorDialog.visible = true;
  editorDialog.mode = 'edit';
  editorDialog.recordId = row.id;
  Object.assign(editorForm, createInitialEditorForm(), {
    stock_code: row.stock_code,
    trade_date: row.trade_date,
    time_level: row.time_level,
    concentrated_price: row.concentrated_price,
    chip_ratio: row.chip_ratio,
    data_source: row.data_source,
    is_valid: row.is_valid,
  });
  selectedEditorStockOption.value = buildStockOptionFromCode(row.stock_code);
}

function getStockCodeParts(stockCode) {
  const [codePart = '', exchangePart = ''] = String(stockCode || '').split('.');
  return {
    codePart,
    exchangePart: EXCHANGE_MAP[exchangePart] || exchangePart,
  };
}

function getStockDisplayName(row) {
  return row?.stock_name || stockNameMap.value[row?.stock_code] || '--';
}

async function hydrateStockNames(rows) {
  const missingCodes = Array.from(
    new Set(
      (rows || [])
        .map((row) => String(row?.stock_code || '').trim())
        .filter(
          (stockCode) =>
            stockCode &&
            !stockNameMap.value[stockCode] &&
            !(rows || []).find(
              (row) => row?.stock_code === stockCode && row?.stock_name
            )
        )
    )
  );
  if (!missingCodes.length) {
    return;
  }
  await Promise.all(
    missingCodes.map(async (stockCode) => {
      const { codePart, exchangePart } = getStockCodeParts(stockCode);
      if (!codePart || !exchangePart) {
        return;
      }
      try {
        const result = await getStock(codePart, false);
        const matched = (result?.payload?.items || [])
          .map((stock) => normalizeStockFromApi(stock))
          .find(
            (stock) =>
              String(stock.code || '').trim() === codePart &&
              String(stock.exchange_code || '').trim() === exchangePart
          );
        if (matched?.name) {
          stockNameMap.value = {
            ...stockNameMap.value,
            [stockCode]: matched.name,
          };
        }
      } catch {
        // 忽略股票名称补全失败，不影响主列表展示。
      }
    })
  );
}

async function submitChipPrice() {
  if (
    !editorForm.stock_code ||
    !editorForm.trade_date ||
    editorForm.concentrated_price === null
  ) {
    ElMessage.warning('请先填写完整记录');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      stock_code: editorForm.stock_code.trim(),
      trade_date: editorForm.trade_date,
      time_level: editorForm.time_level,
      concentrated_price: Number(editorForm.concentrated_price),
      chip_ratio:
        editorForm.chip_ratio === null ? null : Number(editorForm.chip_ratio),
      data_source: editorForm.data_source || 'manual',
      is_valid: Boolean(editorForm.is_valid),
    };
    if (editorDialog.mode === 'create') {
      await createSignalStrategyChipPrice(payload);
      ElMessage.success('筹码记录已新增');
    } else {
      await updateSignalStrategyChipPrice(editorDialog.recordId, payload);
      ElMessage.success('筹码记录已更新');
    }
    editorDialog.visible = false;
    await loadChipPrices();
  } catch (error) {
    ElMessage.error(error.message || '保存筹码记录失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认将 ${row.stock_code} ${row.trade_date} ${row.time_level} 标记为失效吗？`,
      '失效确认',
      { type: 'warning' }
    );
  } catch {
    return;
  }
  try {
    await deleteSignalStrategyChipPrice(row.id);
    ElMessage.success('筹码记录已失效');
    await loadChipPrices();
  } catch (error) {
    ElMessage.error(error.message || '失效操作失败');
  }
}

function createInitialQueryForm() {
  return {
    stock_code: '',
    trade_date: '',
    time_levels: [],
    include_invalid: true,
  };
}

function createInitialEditorForm() {
  return {
    stock_code: '',
    trade_date: formatDateInput(new Date()),
    time_level: '30min',
    concentrated_price: null,
    chip_ratio: null,
    data_source: 'manual',
    is_valid: true,
  };
}

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== '' && value !== undefined && value !== null;
    })
  );
}

function formatDateInput(date) {
  const current = new Date(date);
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, '0');
  const day = String(current.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  return String(value).replace('T', ' ');
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return Number(value).toFixed(2);
}
</script>

<style scoped>
.chip-price-manager-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
}

.page-header p {
  margin: 8px 0 0;
  color: #606266;
}

.page-alert {
  margin-bottom: 0;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-row-wrap {
  flex-wrap: wrap;
}

.filter-item {
  width: 180px;
}

.filter-keyword {
  width: 280px;
}

.chip-time-level-select {
  width: 260px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: #606266;
}

.toolbar-summary strong {
  color: #303133;
}

.dialog-full-width {
  width: 100%;
}

.chip-price-strong {
  display: inline-block;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-item,
  .filter-keyword,
  .chip-time-level-select {
    width: 100%;
  }

  .table-toolbar {
    flex-direction: column;
  }
}
</style>
