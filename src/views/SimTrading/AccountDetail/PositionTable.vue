<template>
  <el-table
    class="position-table"
    :data="items"
    border
    :max-height="maxHeight"
    :empty-text="emptyText"
  >
    <el-table-column :label="nameLabel" min-width="140">
      <template #default="scope">
        <el-button
          link
          type="primary"
          class="stock-name-link"
          @click="openStockDetail(scope.row)"
        >
          {{ scope.row.stock_name || '--' }}
        </el-button>
      </template>
    </el-table-column>
    <el-table-column prop="stock_code" label="代码" width="120" />
    <el-table-column
      v-if="showTotalQuantity"
      prop="total_quantity"
      :label="totalQuantityLabel"
      width="110"
      sortable
    />
    <el-table-column
      v-if="showSellableQuantity"
      prop="sellable_quantity"
      :label="sellableQuantityLabel"
      width="120"
      sortable
    />
    <el-table-column
      v-if="showFrozenQuantity"
      prop="frozen_quantity"
      label="冻结数量"
      width="120"
      sortable
    />
    <el-table-column prop="avg_cost_price" label="成本价" width="110" sortable>
      <template #default="scope">{{
        formatMoney(scope.row.avg_cost_price)
      }}</template>
    </el-table-column>
    <el-table-column prop="current_price" label="现价" width="110" sortable>
      <template #default="scope">{{
        formatMoney(scope.row.current_price)
      }}</template>
    </el-table-column>
    <el-table-column prop="market_value" label="市值" width="130" sortable>
      <template #default="scope">{{
        formatMoney(scope.row.market_value)
      }}</template>
    </el-table-column>
    <el-table-column prop="unrealized_pnl" label="浮盈亏" width="130" sortable>
      <template #default="scope">
        <span :class="profitClass(scope.row.unrealized_pnl)">{{
          formatMoney(scope.row.unrealized_pnl)
        }}</span>
      </template>
    </el-table-column>
    <el-table-column prop="pnl_rate" label="盈亏涨跌幅" width="120" sortable>
      <template #default="scope">
        <span :class="profitClass(scope.row.unrealized_pnl)">{{
          formatPercent(scope.row.pnl_rate)
        }}</span>
      </template>
    </el-table-column>
    <el-table-column
      v-if="showPositionRatio"
      prop="position_ratio"
      label="持仓占比"
      width="110"
      sortable
    >
      <template #default="scope">{{
        formatPercent(scope.row.position_ratio)
      }}</template>
    </el-table-column>
    <el-table-column
      v-if="showHoldingDays"
      label="持仓天数"
      width="120"
      sortable
      :sort-method="sortByHoldingDays"
    >
      <template #default="scope">{{ formatHoldingDays(scope.row) }}</template>
    </el-table-column>
    <el-table-column
      v-if="showHoldingDateRange"
      label="持仓日期区间"
      min-width="260"
    >
      <template #default="scope">{{
        formatHoldingDateRange(scope.row)
      }}</template>
    </el-table-column>
    <el-table-column
      v-if="showFirstBuildTime"
      label="首次建仓日期"
      min-width="180"
    >
      <template #default="scope">{{
        formatFirstBuildTime(scope.row)
      }}</template>
    </el-table-column>
    <el-table-column
      v-if="showActions"
      label="操作"
      :width="actionColumnWidth"
      fixed="right"
    >
      <template #default="scope">
        <el-space v-if="actionMode === 'main'">
          <el-button
            v-if="showEditAction"
            link
            @click="$emit('edit', scope.row)"
            >编辑</el-button
          >
          <el-button
            v-if="showSellAction"
            link
            type="primary"
            @click="$emit('sell', scope.row)"
            >卖出</el-button
          >
          <el-button
            v-if="showTradeAction"
            link
            @click="$emit('trade', scope.row)"
            >成交</el-button
          >
        </el-space>
        <el-button
          v-else-if="actionMode === 'buy'"
          link
          type="primary"
          @click="$emit('buy-select', scope.row)"
        >
          选中买入
        </el-button>
        <el-button
          v-else-if="actionMode === 'sell'"
          link
          type="primary"
          :disabled="Number(scope.row.sellable_quantity || 0) <= 0"
          @click="$emit('sell-select', scope.row)"
        >
          选中卖出
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  emptyText: {
    type: String,
    default: '暂无持仓',
  },
  maxHeight: {
    type: [Number, String],
    default: undefined,
  },
  nameLabel: {
    type: String,
    default: '股票名称',
  },
  totalQuantityLabel: {
    type: String,
    default: '总持仓',
  },
  sellableQuantityLabel: {
    type: String,
    default: '可卖数量',
  },
  showTotalQuantity: {
    type: Boolean,
    default: true,
  },
  showSellableQuantity: {
    type: Boolean,
    default: true,
  },
  showFrozenQuantity: {
    type: Boolean,
    default: false,
  },
  showPositionRatio: {
    type: Boolean,
    default: false,
  },
  showHoldingDays: {
    type: Boolean,
    default: false,
  },
  showHoldingDateRange: {
    type: Boolean,
    default: false,
  },
  showFirstBuildTime: {
    type: Boolean,
    default: false,
  },
  disableCreatedTimeHoldingFallback: {
    type: Boolean,
    default: false,
  },
  showActions: {
    type: Boolean,
    default: false,
  },
  showEditAction: {
    type: Boolean,
    default: false,
  },
  showSellAction: {
    type: Boolean,
    default: false,
  },
  showTradeAction: {
    type: Boolean,
    default: false,
  },
  actionMode: {
    type: String,
    default: 'main',
  },
  actionColumnWidth: {
    type: [Number, String],
    default: 200,
  },
});

defineEmits(['edit', 'sell', 'trade', 'buy-select', 'sell-select']);

function formatMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function profitClass(value) {
  const num = Number(value || 0);
  if (num > 0) return 'profit-up';
  if (num < 0) return 'profit-down';
  return '';
}

function normalizeDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const timestamp = value > 1e12 ? value : value * 1000;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  let normalized =
    typeof value === 'string' ? value.trim().replace(' ', 'T') : value;
  if (typeof normalized === 'string') {
    const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized);
    if (!hasTimezone && normalized.includes('T')) {
      normalized = `${normalized}Z`;
    }
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function padTimeNumber(value) {
  return String(value).padStart(2, '0');
}

function formatDateTime(value) {
  const date = normalizeDate(value);
  if (!date) return '--';
  const year = date.getFullYear();
  const month = padTimeNumber(date.getMonth() + 1);
  const day = padTimeNumber(date.getDate());
  const hours = padTimeNumber(date.getHours());
  const minutes = padTimeNumber(date.getMinutes());
  const seconds = padTimeNumber(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getFirstBuildDateValue(row) {
  return (
    row?.first_open_time ||
    row?.first_open_date ||
    row?.first_build_time ||
    row?.first_entry_time ||
    row?.opened_time ||
    row?.open_time ||
    (props.disableCreatedTimeHoldingFallback ? null : row?.created_time) ||
    null
  );
}

function formatHoldingDays(row) {
  const explicitValue =
    row?.holding_days ?? row?.position_days ?? row?.hold_days;
  if (
    explicitValue !== undefined &&
    explicitValue !== null &&
    explicitValue !== ''
  ) {
    const normalized = Number(explicitValue);
    return Number.isFinite(normalized)
      ? `${Math.max(0, Math.trunc(normalized))} 天`
      : '--';
  }
  const firstBuildDate = normalizeDate(getFirstBuildDateValue(row));
  if (!firstBuildDate) {
    return '--';
  }
  const diffMs = Date.now() - firstBuildDate.getTime();
  if (diffMs < 0) {
    return '0 天';
  }
  return `${Math.floor(diffMs / 86400000)} 天`;
}

function getHoldingDaysNumber(row) {
  const explicitValue =
    row?.holding_days ?? row?.position_days ?? row?.hold_days;
  if (
    explicitValue !== undefined &&
    explicitValue !== null &&
    explicitValue !== ''
  ) {
    const normalized = Number(explicitValue);
    return Number.isFinite(normalized)
      ? Math.max(0, Math.trunc(normalized))
      : 0;
  }
  const firstBuildDate = normalizeDate(getFirstBuildDateValue(row));
  if (!firstBuildDate) {
    return 0;
  }
  const diffMs = Date.now() - firstBuildDate.getTime();
  if (diffMs < 0) {
    return 0;
  }
  return Math.floor(diffMs / 86400000);
}

function sortByHoldingDays(left, right) {
  return getHoldingDaysNumber(left) - getHoldingDaysNumber(right);
}

function formatFirstBuildTime(row) {
  return formatDateTime(getFirstBuildDateValue(row));
}

function formatHoldingDateRange(row) {
  const startDate = getFirstBuildDateValue(row);
  if (!startDate) {
    return '--';
  }
  const endDate =
    row?.close_time ||
    row?.closed_time ||
    row?.close_date ||
    row?.closed_date ||
    new Date();
  return `${formatDateTime(startDate)} ~ ${formatDateTime(endDate)}`;
}

function openStockDetail(row) {
  const stockCode = String(row?.stock_code || '').trim();
  const numberCode = stockCode.replace(/[^0-9]/g, '');
  if (!numberCode) {
    return;
  }
  window.open(`https://finance.baidu.com/stock/ab-${numberCode}`, '_blank');
}
</script>

<style scoped>
.stock-name-link {
  padding: 0;
  font-weight: 600;
}

.position-table :deep(th .cell) {
  white-space: nowrap;
}

.profit-up {
  color: #cf3f3f;
}

.profit-down {
  color: #1f8a5b;
}
</style>
