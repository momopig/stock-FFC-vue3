<template>
  <el-table :data="items" border :max-height="maxHeight" :empty-text="emptyText">
    <el-table-column prop="stock_name" :label="nameLabel" min-width="140" />
    <el-table-column prop="stock_code" label="代码" width="120" />
    <el-table-column v-if="showTotalQuantity" prop="total_quantity" :label="totalQuantityLabel" width="100" />
    <el-table-column v-if="showSellableQuantity" prop="sellable_quantity" :label="sellableQuantityLabel" width="100" />
    <el-table-column v-if="showFrozenQuantity" prop="frozen_quantity" label="冻结数量" width="100" />
    <el-table-column label="成本价" width="110">
      <template #default="scope">{{ formatMoney(scope.row.avg_cost_price) }}</template>
    </el-table-column>
    <el-table-column label="现价" width="110">
      <template #default="scope">{{ formatMoney(scope.row.current_price) }}</template>
    </el-table-column>
    <el-table-column label="市值" width="130">
      <template #default="scope">{{ formatMoney(scope.row.market_value) }}</template>
    </el-table-column>
    <el-table-column label="浮盈亏" width="130">
      <template #default="scope">
        <span :class="profitClass(scope.row.unrealized_pnl)">{{ formatMoney(scope.row.unrealized_pnl) }}</span>
      </template>
    </el-table-column>
    <el-table-column label="盈亏涨跌幅" width="120">
      <template #default="scope">
        <span :class="profitClass(scope.row.unrealized_pnl)">{{ formatPercent(scope.row.pnl_rate) }}</span>
      </template>
    </el-table-column>
    <el-table-column v-if="showPositionRatio" label="持仓占比" width="110">
      <template #default="scope">{{ formatPercent(scope.row.position_ratio) }}</template>
    </el-table-column>
    <el-table-column v-if="showActions" label="操作" :width="actionColumnWidth" fixed="right">
      <template #default="scope">
        <el-space v-if="actionMode === 'main'">
          <el-button v-if="showEditAction" link @click="$emit('edit', scope.row)">编辑</el-button>
          <el-button v-if="showSellAction" link type="primary" @click="$emit('sell', scope.row)">卖出</el-button>
          <el-button v-if="showTradeAction" link @click="$emit('trade', scope.row)">成交</el-button>
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
</script>
