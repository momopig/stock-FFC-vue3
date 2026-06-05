<template>
  <div class="t-monitor-panel">
    <div class="t-monitor-overview-grid">
      <div class="t-monitor-overview-card">
        <span>监控总数</span>
        <strong>{{ overview.total_count || 0 }}</strong>
      </div>
      <div class="t-monitor-overview-card">
        <span>运行中</span>
        <strong>{{ overview.running_count || 0 }}</strong>
      </div>
      <div class="t-monitor-overview-card">
        <span>已暂停</span>
        <strong>{{ overview.paused_count || 0 }}</strong>
      </div>
      <div class="t-monitor-overview-card">
        <span>锁定数量</span>
        <strong>{{ overview.locked_volume || 0 }}</strong>
      </div>
      <div class="t-monitor-overview-card">
        <span>浮动盈亏</span>
        <strong :class="profitClass(overview.unrealized_pnl_amount)">
          {{ formatMoney(overview.unrealized_pnl_amount) }}
        </strong>
      </div>
    </div>

    <el-alert
      title="普通卖出会自动扣除已被 T仓监控锁定的数量，避免误卖底仓。"
      type="info"
      :closable="false"
      show-icon
      class="t-monitor-alert"
    />

    <div class="t-monitor-toolbar">
      <div class="t-monitor-toolbar__filters">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索股票/委托号"
          clearable
          class="t-monitor-filter"
          @keyup.enter="loadMonitors"
        />
        <el-select v-model="filters.show_status" clearable placeholder="状态">
          <el-option label="运行中" value="RUNNING" />
          <el-option label="已暂停" value="PAUSED" />
          <el-option label="已卖出" value="SOLD" />
        </el-select>
        <el-select v-model="filters.t_type" clearable placeholder="T仓类型">
          <el-option label="日内T" value="INTRADAY_T" />
          <el-option label="隔日T" value="OVERNIGHT_T" />
          <el-option label="波段T" value="SWING_T" />
        </el-select>
        <el-button :loading="loading" @click="loadMonitors">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
      <div class="t-monitor-toolbar__actions">
        <el-button :loading="syncLoading" @click="handleSync"
          >同步状态</el-button
        >
        <el-button :loading="scanLoading" @click="handleScan"
          >执行巡检</el-button
        >
        <el-button type="primary" @click="openCreateDialog">新建监控</el-button>
      </div>
    </div>

    <el-table
      :data="rows"
      border
      stripe
      v-loading="loading"
      class="t-monitor-table"
    >
      <el-table-column label="股票" min-width="150">
        <template #default="scope">
          <div class="stock-cell">
            <strong>{{ scope.row.stock_name }}</strong>
            <span
              >{{ scope.row.stock_code }}.{{ scope.row.exchange_code }}</span
            >
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="buy_signal_strategy_name"
        label="买点策略"
        min-width="140"
        show-overflow-tooltip
      />
      <el-table-column
        prop="sell_signal_strategy_name"
        label="卖点策略"
        min-width="140"
        show-overflow-tooltip
      />
      <el-table-column
        prop="original_volume"
        label="原始数量"
        width="100"
        sortable
      />
      <el-table-column
        prop="available_sell_volume"
        label="可用数量"
        width="100"
        sortable
      />
      <el-table-column
        prop="freezing_volume"
        label="冻结数量"
        width="100"
        sortable
      />
      <el-table-column prop="buy_price" label="买入价" width="100" sortable>
        <template #default="scope">{{
          formatMoney(scope.row.buy_price)
        }}</template>
      </el-table-column>
      <el-table-column prop="current_price" label="当前价" width="100" sortable>
        <template #default="scope">{{
          formatMoney(scope.row.current_price)
        }}</template>
      </el-table-column>
      <el-table-column
        prop="profit_amount"
        label="盈亏金额"
        width="120"
        sortable
      >
        <template #default="scope">
          <span :class="profitClass(scope.row.profit_amount)">{{
            formatMoney(scope.row.profit_amount)
          }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="profit_ratio"
        label="盈亏比例"
        width="120"
        sortable
      >
        <template #default="scope">
          <span :class="profitClass(scope.row.profit_ratio)">{{
            formatDisplayPercent(scope.row.profit_ratio)
          }}</span>
        </template>
      </el-table-column>
      <el-table-column
        prop="take_profit_price"
        label="止盈价"
        width="100"
        sortable
      >
        <template #default="scope">{{
          formatMoney(scope.row.take_profit_price)
        }}</template>
      </el-table-column>
      <el-table-column
        prop="stop_loss_price"
        label="止损价"
        width="100"
        sortable
      >
        <template #default="scope">{{
          formatMoney(scope.row.stop_loss_price)
        }}</template>
      </el-table-column>
      <el-table-column
        prop="buy_deal_time"
        label="买入成交时间"
        min-width="168"
      >
        <template #default="scope">{{
          formatDateTime(scope.row.buy_deal_time)
        }}</template>
      </el-table-column>
      <el-table-column
        prop="monitor_expire_time"
        label="监控截止"
        min-width="168"
      >
        <template #default="scope">{{
          formatDateTime(scope.row.monitor_expire_time)
        }}</template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="scope">
          <el-tag :type="monitorStatusTagType(scope.row.show_status)">{{
            monitorStatusLabel(scope.row.show_status)
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="活动委托" width="120">
        <template #default="scope">
          <el-tag
            v-if="scope.row.active_close_order_status"
            :type="orderStatusTagType(scope.row.active_close_order_status)"
          >
            {{ scope.row.active_close_order_status }}
          </el-tag>
          <span v-else>--</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" min-width="290">
        <template #default="scope">
          <el-space wrap>
            <el-button link type="primary" @click="openDetail(scope.row)"
              >详情</el-button
            >
            <el-button link type="primary" @click="openEditDialog(scope.row)"
              >编辑</el-button
            >
            <el-button
              v-if="scope.row.show_status === 'RUNNING'"
              link
              type="warning"
              @click="handlePause(scope.row)"
              >暂停</el-button
            >
            <el-button
              v-if="scope.row.show_status === 'PAUSED'"
              link
              type="success"
              @click="handleResume(scope.row)"
              >恢复</el-button
            >
            <el-button
              v-if="scope.row.can_manual_close"
              link
              type="danger"
              @click="openManualCloseDialog(scope.row)"
              >手动平仓</el-button
            >
          </el-space>
        </template>
      </el-table-column>
    </el-table>

    <div class="t-monitor-pagination">
      <el-pagination
        background
        layout="total, prev, pager, next, sizes"
        :total="pagination.total"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="handleCurrentChange"
        @size-change="handleSizeChange"
      />
    </div>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.mode === 'create' ? '新建 T仓监控' : '编辑 T仓监控'"
      width="760px"
    >
      <el-form :model="form" label-width="120px">
        <el-form-item label="选择持仓" v-if="dialog.mode === 'create'">
          <el-select
            v-model="selectedPositionKey"
            filterable
            placeholder="请选择持仓"
            class="full-width"
            @change="applyPositionSelection"
          >
            <el-option
              v-for="item in positionOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="股票代码">
              <el-input v-model="form.stock_code" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="股票名称">
              <el-input v-model="form.stock_name" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="交易所">
              <el-input v-model="form.exchange_code" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="T仓类型">
              <el-select v-model="form.t_type" class="full-width">
                <el-option label="日内T" value="INTRADAY_T" />
                <el-option label="隔日T" value="OVERNIGHT_T" />
                <el-option label="波段T" value="SWING_T" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="原始数量">
              <el-input-number
                v-model="form.original_volume"
                :min="1"
                class="full-width"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="可用监控数量">
              <el-input-number
                v-model="form.available_sell_volume"
                :min="1"
                class="full-width"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="监控天数">
              <el-input-number
                v-model="form.monitored_days"
                :min="0"
                class="full-width"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="买入价">
              <el-input-number
                v-model="form.buy_price"
                :min="0"
                :precision="3"
                class="full-width"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="止盈价">
              <el-input-number
                v-model="form.take_profit_price"
                :min="0"
                :precision="3"
                class="full-width"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="止损价">
              <el-input-number
                v-model="form.stop_loss_price"
                :min="0"
                :precision="3"
                class="full-width"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="止损比例(%)">
              <el-input-number
                v-model="form.stop_loss_ratio_percent"
                :precision="2"
                :step="0.1"
                class="full-width"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="巡检周期(ms)">
              <el-input-number
                v-model="form.sell_cycle_ms"
                :min="1000"
                :step="1000"
                class="full-width"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="自动交易">
              <el-switch v-model="form.auto_trade_enabled" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="买入成交时间" v-if="dialog.mode === 'create'">
              <el-date-picker
                v-model="form.buy_deal_time"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                class="full-width"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="监控截止时间">
              <el-date-picker
                v-model="form.monitor_expire_time"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                class="full-width"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="买点策略">
              <el-select
                v-model="form.buy_signal_strategy_id"
                clearable
                filterable
                class="full-width"
                :disabled="dialog.mode !== 'create'"
              >
                <el-option
                  v-for="item in buyStrategyOptions"
                  :key="item.id"
                  :label="`${item.instance_name} (${item.template_name})`"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="卖点策略">
              <el-select
                v-model="form.sell_signal_strategy_id"
                clearable
                filterable
                class="full-width"
              >
                <el-option
                  v-for="item in sellStrategyOptions"
                  :key="item.id"
                  :label="`${item.instance_name} (${item.template_name})`"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="停用原因" v-if="!form.auto_trade_enabled">
          <el-input
            v-model="form.auto_trade_disable_reason"
            placeholder="请填写停用原因"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="dialog.submitting"
          @click="submitDialog"
          >保存</el-button
        >
      </template>
    </el-dialog>

    <el-dialog
      v-model="manualCloseDialog.visible"
      title="手动平仓"
      width="420px"
    >
      <el-form :model="manualCloseDialog.form" label-width="100px">
        <el-form-item label="平仓数量">
          <el-input-number
            v-model="manualCloseDialog.form.close_volume"
            :min="1"
            :max="manualCloseDialog.maxVolume"
            class="full-width"
          />
        </el-form-item>
        <el-form-item label="委托类型">
          <el-radio-group v-model="manualCloseDialog.form.order_type">
            <el-radio-button label="MARKET">市价</el-radio-button>
            <el-radio-button label="LIMIT">限价</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          label="委托价格"
          v-if="manualCloseDialog.form.order_type === 'LIMIT'"
        >
          <el-input-number
            v-model="manualCloseDialog.form.order_price"
            :min="0"
            :precision="3"
            class="full-width"
          />
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="manualCloseDialog.form.reason"
            maxlength="255"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualCloseDialog.visible = false">取消</el-button>
        <el-button
          type="danger"
          :loading="manualCloseDialog.submitting"
          @click="submitManualClose"
          >确认平仓</el-button
        >
      </template>
    </el-dialog>

    <el-drawer
      v-model="detailDrawer.visible"
      :title="detailDrawer.title"
      size="55%"
    >
      <template v-if="detailDrawer.row">
        <el-descriptions :column="2" border class="t-monitor-detail-block">
          <el-descriptions-item label="股票代码">
            {{ detailDrawer.row.stock_code }}.{{
              detailDrawer.row.exchange_code
            }}
          </el-descriptions-item>
          <el-descriptions-item label="股票名称">
            {{ detailDrawer.row.stock_name || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ monitorStatusLabel(detailDrawer.row.show_status) }}
          </el-descriptions-item>
          <el-descriptions-item label="T仓类型">
            {{ detailDrawer.row.t_type || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="卖点策略">
            {{ detailDrawer.row.sell_signal_strategy_name || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="扫描周期">
            {{ detailDrawer.row.sell_cycle_ms || '--' }} ms
          </el-descriptions-item>
          <el-descriptions-item label="浮盈比例">
            <span :class="profitClass(detailDrawer.row.profit_ratio)">
              {{ formatDisplayPercent(detailDrawer.row.profit_ratio) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="浮盈金额">
            <span :class="profitClass(detailDrawer.row.profit_amount)">
              {{ formatMoney(detailDrawer.row.profit_amount) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="最后扫描">
            {{ formatDateTime(detailDrawer.row.last_scan_time) }}
          </el-descriptions-item>
          <el-descriptions-item label="暂停原因">
            {{ detailDrawer.row.pause_reason || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="平仓原因">
            {{ detailDrawer.row.active_close_reason || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="活动委托号">
            {{ detailDrawer.row.active_close_order_no || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="活动委托状态">
            {{ detailDrawer.row.active_close_order_status || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="自动交易">
            {{ detailDrawer.row.auto_trade_enabled ? '开启' : '关闭' }}
          </el-descriptions-item>
          <el-descriptions-item label="禁用原因">
            {{ detailDrawer.row.auto_trade_disable_reason || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ detailDrawer.row.remark || '--' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="t-monitor-json-grid">
          <div class="t-monitor-json-card">
            <div class="t-monitor-json-card__title">运行态</div>
            <pre>{{ formatJson(detailDrawer.row.runtime_state_json) }}</pre>
          </div>
          <div class="t-monitor-json-card">
            <div class="t-monitor-json-card__title">最后一次信号详情</div>
            <pre>{{
              formatJson(detailDrawer.row.last_signal_detail_json)
            }}</pre>
          </div>
        </div>

        <div class="t-monitor-log-section">
          <div class="t-monitor-log-section__header">
            <span>监控日志</span>
            <el-button text @click="loadDetailLogsWithPage(1)"
              >刷新日志</el-button
            >
          </div>
        </div>
      </template>
      <el-table
        :data="detailDrawer.logs"
        border
        stripe
        v-loading="detailDrawer.loading"
      >
        <el-table-column prop="created_time" label="时间" min-width="168">
          <template #default="scope">{{
            formatDateTime(scope.row.created_time)
          }}</template>
        </el-table-column>
        <el-table-column prop="oper_type" label="操作类型" min-width="120" />
        <el-table-column
          prop="change_volume"
          label="变动数量"
          width="100"
          sortable
        />
        <el-table-column prop="order_no" label="委托号" min-width="140" />
        <el-table-column
          prop="msg"
          label="说明"
          min-width="280"
          show-overflow-tooltip
        />
      </el-table>
      <div class="t-monitor-pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="detailDrawer.total"
          :current-page="detailDrawer.page"
          :page-size="detailDrawer.pageSize"
          :page-sizes="[10, 20, 50]"
          @current-change="handleDetailLogPageChange"
          @size-change="handleDetailLogPageSizeChange"
        />
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createSimTradingTPositionMonitor,
  getSimTradingTPositionMonitorLogs,
  getSimTradingTPositionMonitors,
  manualCloseSimTradingTPositionMonitor,
  pauseSimTradingTPositionMonitor,
  resumeSimTradingTPositionMonitor,
  scanSimTradingTPositionMonitors,
  syncSimTradingTPositionMonitors,
  updateSimTradingTPositionMonitor,
} from '@/api/modules/simTrading';
import { getSignalStrategyOptions } from '@/api/modules/signalStrategy';

const props = defineProps({
  accountId: {
    type: Number,
    required: true,
  },
  positions: {
    type: Array,
    default: () => [],
  },
});

const loading = ref(false);
const scanLoading = ref(false);
const syncLoading = ref(false);
const rows = ref([]);
const overview = ref({});
const buyStrategyOptions = ref([]);
const sellStrategyOptions = ref([]);
const selectedPositionKey = ref('');

const filters = reactive({
  keyword: '',
  show_status: '',
  t_type: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const dialog = reactive({
  visible: false,
  mode: 'create',
  submitting: false,
  row: null,
});

const form = reactive({
  stock_code: '',
  stock_name: '',
  exchange_code: '',
  t_type: 'INTRADAY_T',
  original_volume: 100,
  available_sell_volume: 100,
  monitored_days: 0,
  buy_price: 0,
  take_profit_price: null,
  stop_loss_price: null,
  stop_loss_ratio_percent: null,
  sell_cycle_ms: 3000,
  auto_trade_enabled: true,
  auto_trade_disable_reason: '',
  buy_deal_time: '',
  monitor_expire_time: '',
  buy_signal_strategy_id: null,
  sell_signal_strategy_id: null,
  remark: '',
});

const manualCloseDialog = reactive({
  visible: false,
  submitting: false,
  row: null,
  maxVolume: 1,
  form: {
    close_volume: 1,
    order_type: 'MARKET',
    order_price: null,
    reason: '',
  },
});

const detailDrawer = reactive({
  visible: false,
  loading: false,
  title: 'T仓监控详情',
  row: null,
  monitorId: null,
  logs: [],
  page: 1,
  pageSize: 10,
  total: 0,
});

const positionOptions = computed(() =>
  (props.positions || []).map((item) => ({
    value: `${item.stock_code}.${item.exchange_code}`,
    label: `${item.stock_name} ${item.stock_code}.${item.exchange_code} 可卖 ${item.sellable_quantity || 0} 股`,
    row: item,
  }))
);

watch(
  () => props.accountId,
  async (value) => {
    if (!value) {
      rows.value = [];
      overview.value = {};
      return;
    }
    pagination.page = 1;
    await Promise.all([loadMonitors(), loadSignalStrategyOptions()]);
  },
  { immediate: true }
);

function resetForm() {
  selectedPositionKey.value = '';
  Object.assign(form, {
    stock_code: '',
    stock_name: '',
    exchange_code: '',
    t_type: 'INTRADAY_T',
    original_volume: 100,
    available_sell_volume: 100,
    monitored_days: 0,
    buy_price: 0,
    take_profit_price: null,
    stop_loss_price: null,
    stop_loss_ratio_percent: null,
    sell_cycle_ms: 3000,
    auto_trade_enabled: true,
    auto_trade_disable_reason: '',
    buy_deal_time: formatDateTimeValue(new Date()),
    monitor_expire_time: '',
    buy_signal_strategy_id: null,
    sell_signal_strategy_id: null,
    remark: '',
  });
}

function profitClass(value) {
  const number = Number(value || 0);
  if (number > 0) {
    return 'is-profit';
  }
  if (number < 0) {
    return 'is-loss';
  }
  return '';
}

function formatMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDisplayPercent(value) {
  const number = Number(value || 0);
  return `${number.toFixed(2)}%`;
}

function formatDateTimeValue(date) {
  const current = new Date(date);
  const year = current.getFullYear();
  const month = `${current.getMonth() + 1}`.padStart(2, '0');
  const day = `${current.getDate()}`.padStart(2, '0');
  const hours = `${current.getHours()}`.padStart(2, '0');
  const minutes = `${current.getMinutes()}`.padStart(2, '0');
  const seconds = `${current.getSeconds()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDateTime(value) {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return formatDateTimeValue(date);
}

function monitorStatusLabel(status) {
  const map = {
    RUNNING: '运行中',
    PAUSED: '已暂停',
    SOLD: '已卖出',
  };
  return map[status] || status || '--';
}

function monitorStatusTagType(status) {
  const map = {
    RUNNING: 'danger',
    PAUSED: 'warning',
    SOLD: 'info',
  };
  return map[status] || 'info';
}

function orderStatusTagType(status) {
  const map = {
    FILLED: 'success',
    PENDING_MATCH: 'warning',
    PART_FILLED: 'warning',
    FAILED: 'danger',
    REJECTED: 'danger',
  };
  return map[status] || 'info';
}

function formatJson(value) {
  if (!value) {
    return '--';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

async function loadSignalStrategyOptions() {
  try {
    const [buyRes, sellRes] = await Promise.all([
      getSignalStrategyOptions({ usage_scope: 'buy', only_enabled: true }),
      getSignalStrategyOptions({ usage_scope: 'sell', only_enabled: true }),
    ]);
    buyStrategyOptions.value = buyRes?.payload?.items || [];
    sellStrategyOptions.value = sellRes?.payload?.items || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('加载信号策略选项失败');
  }
}

async function loadMonitors() {
  if (!props.accountId) {
    return;
  }
  loading.value = true;
  try {
    const res = await getSimTradingTPositionMonitors(props.accountId, {
      page: pagination.page,
      page_size: pagination.pageSize,
      keyword: filters.keyword || null,
      show_status: filters.show_status || null,
      t_type: filters.t_type || null,
    });
    overview.value = res?.payload?.overview || {};
    rows.value = res?.payload?.page?.items || [];
    pagination.total = res?.payload?.page?.total || 0;
    syncDetailRow();
  } catch (error) {
    console.error(error);
    ElMessage.error('加载 T仓监控列表失败');
  } finally {
    loading.value = false;
  }
}

function syncDetailRow() {
  if (!detailDrawer.row?.id) {
    return;
  }
  const current = rows.value.find((item) => item.id === detailDrawer.row.id);
  if (current) {
    detailDrawer.row = current;
  }
}

function resetFilters() {
  filters.keyword = '';
  filters.show_status = '';
  filters.t_type = '';
  pagination.page = 1;
  loadMonitors();
}

function handleCurrentChange(page) {
  pagination.page = page;
  loadMonitors();
}

function handleSizeChange(size) {
  pagination.pageSize = size;
  pagination.page = 1;
  loadMonitors();
}

function applyPositionSelection(value) {
  const matched = positionOptions.value.find((item) => item.value === value);
  if (!matched) {
    return;
  }
  const row = matched.row || {};
  form.stock_code = row.stock_code || '';
  form.stock_name = row.stock_name || '';
  form.exchange_code = row.exchange_code || '';
  form.original_volume = Number(
    row.sellable_quantity || row.total_quantity || 100
  );
  form.available_sell_volume = Number(
    row.sellable_quantity || row.total_quantity || 100
  );
  form.buy_price = Number(row.avg_cost_price || 0);
}

function openCreateDialog() {
  dialog.mode = 'create';
  dialog.row = null;
  resetForm();
  dialog.visible = true;
}

function openEditDialog(row) {
  dialog.mode = 'edit';
  dialog.row = row;
  resetForm();
  Object.assign(form, {
    stock_code: row.stock_code || '',
    stock_name: row.stock_name || '',
    exchange_code: row.exchange_code || '',
    t_type: row.t_type || 'INTRADAY_T',
    original_volume: Number(row.original_volume || 0),
    available_sell_volume: Number(row.available_sell_volume || 0),
    monitored_days: Number(row.monitored_days || 0),
    buy_price: Number(row.buy_price || 0),
    take_profit_price:
      row.take_profit_price == null ? null : Number(row.take_profit_price),
    stop_loss_price:
      row.stop_loss_price == null ? null : Number(row.stop_loss_price),
    stop_loss_ratio_percent:
      row.stop_loss_ratio == null ? null : Number(row.stop_loss_ratio) * 100,
    sell_cycle_ms: Number(row.sell_cycle_ms || 3000),
    auto_trade_enabled: row.auto_trade_enabled !== false,
    auto_trade_disable_reason: row.auto_trade_disable_reason || '',
    buy_deal_time: row.buy_deal_time || '',
    monitor_expire_time: row.monitor_expire_time || '',
    buy_signal_strategy_id: row.buy_signal_strategy_id || null,
    sell_signal_strategy_id: row.sell_signal_strategy_id || null,
    remark: row.remark || '',
  });
  dialog.visible = true;
}

function buildCreatePayload() {
  return {
    stock_code: form.stock_code,
    stock_name: form.stock_name,
    exchange_code: form.exchange_code,
    currency: 'CNY',
    buy_signal_strategy_id: form.buy_signal_strategy_id || null,
    sell_signal_strategy_id: form.sell_signal_strategy_id || null,
    sell_cycle_ms: Number(form.sell_cycle_ms || 3000),
    buy_deal_time: form.buy_deal_time,
    monitor_expire_time: form.monitor_expire_time || null,
    t_type: form.t_type,
    original_volume: Number(form.original_volume || 0),
    available_sell_volume: Number(form.available_sell_volume || 0),
    monitored_days: Number(form.monitored_days || 0),
    buy_price: Number(form.buy_price || 0),
    take_profit_price:
      form.take_profit_price == null ? null : Number(form.take_profit_price),
    stop_loss_price:
      form.stop_loss_price == null ? null : Number(form.stop_loss_price),
    stop_loss_ratio:
      form.stop_loss_ratio_percent == null
        ? null
        : Number(form.stop_loss_ratio_percent) / 100,
    auto_trade_enabled: form.auto_trade_enabled,
    auto_trade_disable_reason: form.auto_trade_enabled
      ? null
      : form.auto_trade_disable_reason || null,
    remark: form.remark || null,
  };
}

function buildUpdatePayload() {
  return {
    sell_signal_strategy_id: form.sell_signal_strategy_id || null,
    sell_cycle_ms: Number(form.sell_cycle_ms || 3000),
    monitor_expire_time: form.monitor_expire_time || null,
    take_profit_price:
      form.take_profit_price == null ? null : Number(form.take_profit_price),
    stop_loss_price:
      form.stop_loss_price == null ? null : Number(form.stop_loss_price),
    stop_loss_ratio:
      form.stop_loss_ratio_percent == null
        ? null
        : Number(form.stop_loss_ratio_percent) / 100,
    auto_trade_enabled: form.auto_trade_enabled,
    auto_trade_disable_reason: form.auto_trade_enabled
      ? null
      : form.auto_trade_disable_reason || null,
    remark: form.remark || null,
  };
}

async function submitDialog() {
  if (!form.stock_code || !form.exchange_code) {
    ElMessage.warning('请先选择持仓');
    return;
  }
  dialog.submitting = true;
  try {
    if (dialog.mode === 'create') {
      await createSimTradingTPositionMonitor(
        props.accountId,
        buildCreatePayload()
      );
      ElMessage.success('T仓监控已创建');
    } else {
      await updateSimTradingTPositionMonitor(
        props.accountId,
        dialog.row.id,
        buildUpdatePayload()
      );
      ElMessage.success('T仓监控已更新');
    }
    dialog.visible = false;
    await loadMonitors();
  } catch (error) {
    console.error(error);
    ElMessage.error(
      dialog.mode === 'create' ? '创建 T仓监控失败' : '更新 T仓监控失败'
    );
  } finally {
    dialog.submitting = false;
  }
}

async function handlePause(row) {
  try {
    const reason = await ElMessageBox.prompt('请输入暂停原因', '暂停监控', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：临时人工接管',
    });
    await pauseSimTradingTPositionMonitor(props.accountId, row.id, {
      reason: reason.value,
    });
    ElMessage.success('监控已暂停');
    await loadMonitors();
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    console.error(error);
    ElMessage.error('暂停监控失败');
  }
}

async function handleResume(row) {
  try {
    await resumeSimTradingTPositionMonitor(props.accountId, row.id, {
      reason: '手动恢复监控',
    });
    ElMessage.success('监控已恢复');
    await loadMonitors();
  } catch (error) {
    console.error(error);
    ElMessage.error('恢复监控失败');
  }
}

function openManualCloseDialog(row) {
  manualCloseDialog.row = row;
  manualCloseDialog.maxVolume = Number(row.available_sell_volume || 1);
  manualCloseDialog.form.close_volume = Number(row.available_sell_volume || 1);
  manualCloseDialog.form.order_type = 'MARKET';
  manualCloseDialog.form.order_price = null;
  manualCloseDialog.form.reason = 'T仓监控页手动平仓';
  manualCloseDialog.visible = true;
}

async function submitManualClose() {
  if (!manualCloseDialog.row) {
    return;
  }
  manualCloseDialog.submitting = true;
  try {
    await manualCloseSimTradingTPositionMonitor(
      props.accountId,
      manualCloseDialog.row.id,
      {
        close_volume: Number(manualCloseDialog.form.close_volume || 0),
        order_type: manualCloseDialog.form.order_type,
        order_price:
          manualCloseDialog.form.order_type === 'LIMIT'
            ? Number(manualCloseDialog.form.order_price || 0)
            : null,
        reason: manualCloseDialog.form.reason || null,
      }
    );
    ElMessage.success('平仓委托已提交');
    manualCloseDialog.visible = false;
    await loadMonitors();
    if (
      detailDrawer.visible &&
      detailDrawer.row?.id === manualCloseDialog.row.id
    ) {
      await loadDetailLogs();
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('提交平仓委托失败');
  } finally {
    manualCloseDialog.submitting = false;
  }
}

async function handleScan() {
  scanLoading.value = true;
  try {
    const res = await scanSimTradingTPositionMonitors(props.accountId);
    const payload = res?.payload || {};
    ElMessage.success(
      `巡检完成，扫描 ${payload.scanned_count || 0} 条，触发 ${payload.triggered_count || 0} 条`
    );
    await loadMonitors();
  } catch (error) {
    console.error(error);
    ElMessage.error('执行巡检失败');
  } finally {
    scanLoading.value = false;
  }
}

async function handleSync() {
  syncLoading.value = true;
  try {
    await syncSimTradingTPositionMonitors(props.accountId);
    ElMessage.success('监控状态已同步');
    await loadMonitors();
  } catch (error) {
    console.error(error);
    ElMessage.error('同步监控状态失败');
  } finally {
    syncLoading.value = false;
  }
}

async function openLogs(row) {
  await openDetail(row);
}

async function openDetail(row) {
  detailDrawer.visible = true;
  detailDrawer.row = row;
  detailDrawer.monitorId = row.id;
  detailDrawer.title = `${row.stock_name} ${row.stock_code} 监控详情`;
  detailDrawer.page = 1;
  detailDrawer.pageSize = 10;
  detailDrawer.total = 0;
  detailDrawer.logs = [];
  await loadDetailLogs();
}

async function loadDetailLogs() {
  if (!detailDrawer.monitorId) {
    return;
  }
  detailDrawer.loading = true;
  try {
    const res = await getSimTradingTPositionMonitorLogs(props.accountId, {
      monitor_id: detailDrawer.monitorId,
      page: detailDrawer.page,
      page_size: detailDrawer.pageSize,
    });
    detailDrawer.logs = res?.payload?.page?.items || [];
    detailDrawer.total = res?.payload?.page?.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载监控日志失败');
  } finally {
    detailDrawer.loading = false;
  }
}

async function loadDetailLogsWithPage(page) {
  detailDrawer.page = page;
  await loadDetailLogs();
}

function handleDetailLogPageChange(page) {
  detailDrawer.page = page;
  loadDetailLogs();
}

function handleDetailLogPageSizeChange(size) {
  detailDrawer.pageSize = size;
  detailDrawer.page = 1;
  loadDetailLogs();
}
</script>

<style scoped>
.t-monitor-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.t-monitor-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.t-monitor-overview-card {
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fff8ef 0%, #fff 100%);
  border: 1px solid #f4d8bb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.t-monitor-overview-card span {
  font-size: 12px;
  color: #8a5a2b;
}

.t-monitor-overview-card strong {
  font-size: 22px;
  color: #2d241d;
}

.t-monitor-alert {
  margin-bottom: 4px;
}

.t-monitor-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.t-monitor-toolbar__filters,
.t-monitor-toolbar__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.t-monitor-filter,
.full-width {
  width: 100%;
}

.t-monitor-filter {
  width: 220px;
}

.t-monitor-table :deep(.el-table__cell) {
  vertical-align: top;
}

.stock-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stock-cell span {
  color: #6b7280;
  font-size: 12px;
}

.t-monitor-pagination {
  display: flex;
  justify-content: flex-end;
}

.t-monitor-detail-block {
  margin-bottom: 16px;
}

.t-monitor-json-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.t-monitor-json-card {
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 12px;
  background: #fafafa;
}

.t-monitor-json-card__title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.t-monitor-json-card pre {
  margin: 0;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
}

.t-monitor-log-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.is-profit {
  color: #d4380d;
}

.is-loss {
  color: #389e0d;
}

@media (max-width: 960px) {
  .t-monitor-toolbar {
    flex-direction: column;
  }

  .t-monitor-json-grid {
    grid-template-columns: 1fr;
  }

  .t-monitor-pagination {
    justify-content: flex-start;
  }
}
</style>
