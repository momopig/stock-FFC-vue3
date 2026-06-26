<template>
  <div class="trade-executor-panel" v-loading="loading">
    <div class="panel-toolbar">
      <div>
        <h3>交易执行器管理</h3>
        <p>
          为真实账号维护执行器参数、复制模板、查看变更日志，并通过固定行情场景回放验证参数效果。
        </p>
      </div>
      <el-space wrap>
        <el-button @click="loadAll">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
        <el-button type="warning" plain :loading="replaying" @click="runReplay">参数回放</el-button>
        <el-button type="info" plain @click="openCopyDialog">复制到其他账号</el-button>
        <el-button type="danger" plain :loading="resetting" @click="resetConfig">重置默认</el-button>
      </el-space>
    </div>

    <template v-if="bundle">
      <el-alert
        :title="bundle.is_default_only ? '当前账号直接继承系统默认模板。' : '当前账号已保存独立覆盖参数。'"
        type="info"
        :closable="false"
        show-icon
        class="top-alert"
      />

      <div class="template-grid">
        <el-card
          v-for="template in bundle.templates"
          :key="template.key"
          shadow="never"
          class="template-card"
          :class="selectedTemplateKey === template.key ? 'is-active' : ''"
        >
          <div class="template-card__header">
            <div>
              <h4>{{ template.label }}</h4>
              <p>{{ template.description }}</p>
            </div>
            <el-tag size="small" :type="selectedTemplateKey === template.key ? 'danger' : 'info'">
              {{ selectedTemplateKey === template.key ? '当前选择' : '可应用' }}
            </el-tag>
          </div>
          <div class="template-card__metrics">
            <span>波动阈值 {{ percentText(template.config.max_price_offset) }}</span>
            <span>价差阈值 {{ percentText(template.config.max_spread_ratio) }}</span>
            <span>拆单阈值 {{ template.config.split_volume_threshold }} 股</span>
          </div>
          <el-button type="primary" plain @click="applyTemplate(template)">应用模板</el-button>
        </el-card>
      </div>

      <el-card shadow="never" class="detail-card">
        <template #header>
          <div class="section-header">
            <div>
              <h4>参数配置</h4>
              <p>保存时后端会自动折算与默认模板的差异项，避免冗余存储。</p>
            </div>
            <el-tag type="warning">账号 {{ currentAccount?.account_name || accountId }}</el-tag>
          </div>
        </template>
        <el-form :model="configForm" label-width="180px" class="config-grid">
          <el-form-item label="行情波动阈值">
            <el-input-number v-model="configForm.max_price_offset" :min="0.001" :max="0.008" :step="0.001" :precision="3" />
          </el-form-item>
          <el-form-item label="买卖价差阈值">
            <el-input-number v-model="configForm.max_spread_ratio" :min="0.001" :max="0.005" :step="0.001" :precision="3" />
          </el-form-item>
          <el-form-item label="低流动性阈值">
            <el-input-number v-model="configForm.low_liquid_vol" :min="10000" :max="200000" :step="10000" />
          </el-form-item>
          <el-form-item label="自动拆单阈值">
            <el-input-number v-model="configForm.split_volume_threshold" :min="1000" :max="20000" :step="1000" />
          </el-form-item>
          <el-form-item label="重试间隔(ms)">
            <el-input-number v-model="configForm.retry_interval_ms" :min="200" :max="1000" :step="100" />
          </el-form-item>
          <el-form-item label="A股价格保护上限">
            <el-input-number v-model="configForm.price_limit_ratio_cn" :min="0.01" :max="0.08" :step="0.005" :precision="3" />
          </el-form-item>
          <el-form-item label="港美股价格保护上限">
            <el-input-number v-model="configForm.price_limit_ratio_us_hk" :min="0.03" :max="0.1" :step="0.005" :precision="3" />
          </el-form-item>
          <el-form-item label="日内亏损熔断比例">
            <el-input-number v-model="configForm.daily_loss_fuse_ratio" :min="0.005" :max="0.05" :step="0.005" :precision="3" />
          </el-form-item>
          <el-form-item label="订单超时(ms)">
            <el-input-number v-model="configForm.order_timeout_ms" :min="1000" :max="10000" :step="500" />
          </el-form-item>
          <el-form-item label="最大重试次数">
            <el-input-number v-model="configForm.max_retry_times" :min="1" :max="5" :step="1" />
          </el-form-item>
          <el-form-item label="冷却时长(秒)">
            <el-input-number v-model="configForm.error_cool_seconds" :min="30" :max="120" :step="5" />
          </el-form-item>
          <el-form-item label="挂起队列上限">
            <el-input-number v-model="configForm.cool_queue_max" :min="5" :max="50" :step="1" />
          </el-form-item>
          <el-form-item label="增量对账周期(秒)">
            <el-input-number v-model="configForm.order_sync_check_interval_s" :min="10" :max="60" :step="5" />
          </el-form-item>
          <el-form-item label="每秒最大委托数">
            <el-input-number v-model="configForm.single_account_max_order_per_second" :min="1" :max="5" :step="1" />
          </el-form-item>
          <el-form-item label="XT繁忙暂停(秒)">
            <el-input-number v-model="configForm.xt_busy_pause_second" :min="5" :max="30" :step="1" />
          </el-form-item>
          <el-form-item label="A股滑点告警阈值">
            <el-input-number v-model="configForm.five_slippage_warn_ratio_cn" :min="0.003" :max="0.01" :step="0.001" :precision="3" />
          </el-form-item>
          <el-form-item label="港美股滑点告警阈值">
            <el-input-number v-model="configForm.five_slippage_warn_ratio_us_hk" :min="0.008" :max="0.02" :step="0.001" :precision="3" />
          </el-form-item>
          <el-form-item label="队列积压告警阈值">
            <el-input-number v-model="configForm.queue_depth_warn" :min="10" :max="10000" :step="10" :disabled="!bundle.permissions?.can_edit_queue_depth_warn" />
          </el-form-item>
          <el-form-item label="启用账户熔断">
            <el-switch v-model="configForm.enable_loss_fuse" />
          </el-form-item>
          <el-form-item label="启用ST过滤">
            <el-switch v-model="configForm.enable_st_filter" />
          </el-form-item>
          <el-form-item label="启用涨跌停校验">
            <el-switch v-model="configForm.enable_up_down_limit_check" />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="detail-card">
        <template #header>
          <div class="section-header">
            <div>
              <h4>参数回放</h4>
              <p>固定场景验证当前参数会走哪种委托模式、是否拆单以及是否被前置风控拦截。</p>
            </div>
          </div>
        </template>
        <el-empty v-if="!replayPayload" description="尚未执行回放，请点击“参数回放”。" />
        <el-table v-else :data="replayPayload.scenarios" border>
          <el-table-column prop="scenario_label" label="场景" min-width="150" />
          <el-table-column prop="market_type" label="市场" width="90" />
          <el-table-column prop="side" label="方向" width="90" />
          <el-table-column prop="volume" label="委托量" width="110" sortable />
          <el-table-column prop="selected_order_mode" label="委托模式" min-width="160" />
          <el-table-column prop="limit_price" label="预计限价" width="120" sortable />
          <el-table-column prop="split_order_count" label="拆单笔数" width="110" sortable />
          <el-table-column prop="child_order_volume" label="单笔数量" width="110" sortable />
          <el-table-column label="风控/说明" min-width="360">
            <template #default="scope">
              <div class="message-stack">
                <el-tag v-for="flag in scope.row.risk_flags" :key="flag" size="small" type="danger">{{ flag }}</el-tag>
                <span v-for="note in scope.row.notes" :key="note" class="note-line">{{ note }}</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never" class="detail-card">
        <template #header>
          <div class="section-header">
            <div>
              <h4>执行批次</h4>
              <p>查看真实账号订单经过执行器后的拆单批次、提交结果和异常信息。</p>
            </div>
            <el-space wrap>
              <el-button type="warning" plain :loading="syncingActiveBatches" @click="syncActiveBatches">同步活跃批次</el-button>
              <el-button plain @click="resetBatchFilters">重置筛选</el-button>
            </el-space>
          </div>
        </template>
        <div class="batch-filter-bar">
          <el-input v-model="batchFilters.stock_code" placeholder="标的代码" clearable class="filter-item" @keyup.enter="applyBatchFilters" />
          <el-select v-model="batchFilters.direction" placeholder="方向" clearable class="filter-item">
            <el-option label="买入" value="BUY" />
            <el-option label="卖出" value="SELL" />
          </el-select>
          <el-select v-model="batchFilters.source_type" placeholder="来源" clearable class="filter-item">
            <el-option label="手工" value="MANUAL" />
            <el-option label="策略" value="STRATEGY" />
          </el-select>
          <el-select v-model="batchFilters.status" placeholder="执行状态" clearable class="filter-item">
            <el-option label="待提交" value="PENDING" />
            <el-option label="全部成功" value="SUCCESS" />
            <el-option label="部分成功" value="PARTIAL_SUCCESS" />
            <el-option label="执行失败" value="FAILED" />
          </el-select>
          <el-select v-model="batchFilters.lifecycle_status" placeholder="生命周期" clearable class="filter-item">
            <el-option label="处理中" value="ACTIVE" />
            <el-option label="全部成交" value="FILLED" />
            <el-option label="部分成交" value="PARTIAL_FILLED" />
            <el-option label="已撤销" value="CANCELED" />
            <el-option label="失败" value="FAILED" />
            <el-option label="已终态" value="TERMINAL" />
          </el-select>
          <el-date-picker
            v-model="batchFilters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DDTHH:mm:ss"
            class="filter-item filter-item--wide"
          />
          <el-button type="primary" @click="applyBatchFilters">查询</el-button>
        </div>
        <el-table :data="batchPage.items" border v-loading="batchesLoading">
          <el-table-column prop="created_time" label="提交时间" min-width="180">
            <template #default="scope">{{ formatDateTime(scope.row.created_time) }}</template>
          </el-table-column>
          <el-table-column prop="stock_name" label="标的" min-width="160">
            <template #default="scope">
              <div class="message-stack compact">
                <span>{{ scope.row.stock_name }}</span>
                <span class="subtle-line">{{ scope.row.stock_code }}.{{ scope.row.exchange_code }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="direction" label="方向" width="90" />
          <el-table-column prop="requested_order_type" label="委托类型" width="110" />
          <el-table-column prop="requested_quantity" label="原始数量" width="110" sortable />
          <el-table-column label="拆单进度" min-width="150">
            <template #default="scope">{{ scope.row.submitted_child_count }}/{{ scope.row.child_order_count }}</template>
          </el-table-column>
          <el-table-column prop="primary_order_id" label="主返回单号" min-width="140" />
          <el-table-column label="状态" width="130">
            <template #default="scope">
              <el-tag :type="batchStatusTagType(scope.row.status)">{{ formatBatchStatus(scope.row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="生命周期" min-width="140">
            <template #default="scope">
              <div class="message-stack compact">
                <el-tag :type="lifecycleStatusTagType(scope.row.lifecycle_status)">{{ formatLifecycleStatus(scope.row.lifecycle_status) }}</el-tag>
                <span class="subtle-line">{{ scope.row.lifecycle_synced_time ? formatDateTime(scope.row.lifecycle_synced_time) : '未同步' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="last_error_message" label="异常信息" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button type="warning" link @click="syncBatchStatus(scope.row)">同步状态</el-button>
              <el-button type="primary" link @click="openChildDialog(scope.row)">查看子单</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="table-pagination">
          <el-pagination
            v-model:current-page="batchPage.page"
            v-model:page-size="batchPage.page_size"
            background
            layout="total, sizes, prev, pager, next"
            :page-sizes="[10, 20, 50]"
            :total="batchPage.total"
            @current-change="loadBatches"
            @size-change="loadBatches"
          />
        </div>
      </el-card>

      <el-card shadow="never" class="detail-card">
        <template #header>
          <div class="section-header">
            <div>
              <h4>变更日志</h4>
              <p>记录保存、模板切换、复制、重置等操作的变化轨迹。</p>
            </div>
          </div>
        </template>
        <el-table :data="logPage.items" border v-loading="logsLoading">
          <el-table-column prop="operation_type" label="操作类型" min-width="140" />
          <el-table-column prop="operator_username" label="操作人" width="120" />
          <el-table-column prop="created_time" label="时间" min-width="180">
            <template #default="scope">{{ formatDateTime(scope.row.created_time) }}</template>
          </el-table-column>
          <el-table-column label="变更字段" min-width="260">
            <template #default="scope">
              <div class="message-stack">
                <span v-for="item in scope.row.changed_fields_json" :key="`${scope.row.id}-${item.field}`" class="note-line">
                  {{ item.field }}: {{ formatValue(item.before_value) }} -> {{ formatValue(item.after_value) }}
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="220" />
        </el-table>
        <div class="table-pagination">
          <el-pagination
            v-model:current-page="logPage.page"
            v-model:page-size="logPage.page_size"
            background
            layout="total, sizes, prev, pager, next"
            :page-sizes="[10, 20, 50]"
            :total="logPage.total"
            @current-change="loadLogs"
            @size-change="loadLogs"
          />
        </div>
      </el-card>
    </template>

    <el-dialog v-model="copyDialog.visible" title="复制执行器配置到其他账号" width="520px">
      <el-checkbox-group v-model="copyDialog.targetIds" class="copy-target-list">
        <el-checkbox v-for="item in availableCopyTargets" :key="item.id" :label="item.id">
          {{ item.account_name }}
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-space>
          <el-button @click="copyDialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="copying" @click="submitCopy">确认复制</el-button>
        </el-space>
      </template>
    </el-dialog>

    <el-dialog v-model="childDialog.visible" :title="childDialog.title" width="980px">
      <el-table :data="childDialog.page.items" border v-loading="childDialog.loading">
        <el-table-column prop="child_seq" label="子单序号" width="100">
          <template #default="scope">{{ scope.row.child_seq }}/{{ scope.row.child_order_count }}</template>
        </el-table-column>
        <el-table-column prop="broker_order_id" label="券商单号" min-width="140" />
        <el-table-column prop="order_quantity" label="数量" width="100" sortable />
        <el-table-column prop="order_type" label="委托类型" width="110" />
        <el-table-column prop="order_price" label="委托价" width="120" sortable />
        <el-table-column label="提交状态" width="120">
          <template #default="scope">
            <el-tag :type="childStatusTagType(scope.row.submit_status)">{{ formatChildStatus(scope.row.submit_status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最新订单状态" width="130">
          <template #default="scope">
            <el-tag :type="lifecycleStatusTagType(scope.row.current_order_status)">{{ formatLifecycleStatus(scope.row.current_order_status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="current_filled_quantity" label="已成交" width="100" sortable />
        <el-table-column prop="current_remain_quantity" label="剩余" width="100" sortable />
        <el-table-column prop="current_avg_fill_price" label="成交均价" width="120" sortable />
        <el-table-column prop="trade_reason" label="委托备注" min-width="260" show-overflow-tooltip />
        <el-table-column prop="error_message" label="错误信息" min-width="220" show-overflow-tooltip />
        <el-table-column prop="created_time" label="提交时间" min-width="180">
          <template #default="scope">{{ formatDateTime(scope.row.created_time) }}</template>
        </el-table-column>
      </el-table>
      <div class="table-pagination">
        <el-pagination
          v-model:current-page="childDialog.page.page"
          v-model:page-size="childDialog.page.page_size"
          background
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50]"
          :total="childDialog.page.total"
          @current-change="loadChildOrders"
          @size-change="loadChildOrders"
        />
      </div>
      <template #footer>
        <el-space>
          <el-button @click="childDialog.visible = false">关闭</el-button>
          <el-button type="warning" :loading="childDialog.syncing" @click="syncBatchStatus({ id: childDialog.batchId }, true)">同步状态</el-button>
        </el-space>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  getSimTradingTradeExecutorBatchChildren,
  getSimTradingTradeExecutorBatches,
  copySimTradingTradeExecutorConfig,
  getSimTradingTradeExecutorConfig,
  getSimTradingTradeExecutorLogs,
  replaySimTradingTradeExecutorConfig,
  resetSimTradingTradeExecutorConfig,
  saveSimTradingTradeExecutorConfig,
  syncSimTradingTradeExecutorActiveBatches,
  syncSimTradingTradeExecutorBatchStatus,
} from '@/api/modules/simTrading';

const props = defineProps({
  accountId: {
    type: [String, Number],
    required: true,
  },
  accounts: {
    type: Array,
    default: () => [],
  },
  currentAccount: {
    type: Object,
    default: null,
  },
});

const loading = ref(false);
const saving = ref(false);
const resetting = ref(false);
const replaying = ref(false);
const copying = ref(false);
const logsLoading = ref(false);
const batchesLoading = ref(false);
const syncingActiveBatches = ref(false);

const bundle = ref(null);
const replayPayload = ref(null);
const selectedTemplateKey = ref('');
const logPage = reactive({ total: 0, page: 1, page_size: 10, items: [] });
const batchPage = reactive({ total: 0, page: 1, page_size: 10, items: [] });
const batchFilters = reactive({
  stock_code: '',
  status: '',
  lifecycle_status: '',
  direction: '',
  source_type: '',
  dateRange: [],
});
const copyDialog = reactive({ visible: false, targetIds: [] });
const childDialog = reactive({
  visible: false,
  batchId: null,
  title: '子单明细',
  loading: false,
  syncing: false,
  page: { total: 0, page: 1, page_size: 10, items: [] },
});
const configForm = reactive(createDefaultConfigForm());

const availableCopyTargets = computed(() => {
  return (props.accounts || []).filter((item) => {
    return (
      String(item.id) !== String(props.accountId) &&
      String(item.account_type || '').toUpperCase() !== 'SIMULATED'
    );
  });
});

function createDefaultConfigForm() {
  return {
    max_price_offset: 0.003,
    max_spread_ratio: 0.002,
    low_liquid_vol: 50000,
    split_volume_threshold: 5000,
    retry_interval_ms: 200,
    price_limit_ratio_cn: 0.03,
    price_limit_ratio_us_hk: 0.05,
    daily_loss_fuse_ratio: 0.02,
    enable_loss_fuse: true,
    enable_st_filter: true,
    enable_up_down_limit_check: true,
    order_timeout_ms: 3000,
    max_retry_times: 3,
    error_cool_seconds: 60,
    cool_queue_max: 20,
    order_sync_check_interval_s: 30,
    single_account_max_order_per_second: 3,
    xt_busy_pause_second: 10,
    five_slippage_warn_ratio_cn: 0.005,
    five_slippage_warn_ratio_us_hk: 0.01,
    queue_depth_warn: 100,
  };
}

function syncFormFromBundle(payload) {
  const effective = payload?.effective_config || {};
  Object.assign(configForm, createDefaultConfigForm(), effective);
  selectedTemplateKey.value =
    payload?.template_key || payload?.templates?.[1]?.key || payload?.templates?.[0]?.key || '';
}

function percentText(value) {
  return `${Number(value || 0) * 100}%`;
}

function formatDateTime(value) {
  if (!value) {
    return '--';
  }
  return String(value).replace('T', ' ');
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  return String(value);
}

function formatBatchStatus(value) {
  const mapping = {
    PENDING: '待提交',
    SUCCESS: '全部成功',
    PARTIAL_SUCCESS: '部分成功',
    FAILED: '执行失败',
  };
  return mapping[String(value || '').toUpperCase()] || value || '--';
}

function batchStatusTagType(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'SUCCESS') {
    return 'success';
  }
  if (normalized === 'PARTIAL_SUCCESS') {
    return 'warning';
  }
  if (normalized === 'FAILED') {
    return 'danger';
  }
  return 'info';
}

function formatChildStatus(value) {
  const mapping = {
    SUBMITTED: '已提交',
    FAILED: '提交失败',
    PENDING: '待提交',
  };
  return mapping[String(value || '').toUpperCase()] || value || '--';
}

function childStatusTagType(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'SUBMITTED') {
    return 'success';
  }
  if (normalized === 'FAILED') {
    return 'danger';
  }
  return 'info';
}

function formatLifecycleStatus(value) {
  const mapping = {
    ACTIVE: '处理中',
    FILLED: '全部成交',
    PARTIAL_FILLED: '部分成交',
    CANCELED: '已撤销',
    FAILED: '失败',
    TERMINAL: '已终态',
    PENDING_MATCH: '待成交',
    PART_FILLED: '部分成交',
    REJECTED: '已拒绝',
  };
  return mapping[String(value || '').toUpperCase()] || value || '--';
}

function lifecycleStatusTagType(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'FILLED') {
    return 'success';
  }
  if (normalized === 'PARTIAL_FILLED' || normalized === 'PART_FILLED' || normalized === 'ACTIVE' || normalized === 'PENDING_MATCH') {
    return 'warning';
  }
  if (normalized === 'FAILED' || normalized === 'REJECTED') {
    return 'danger';
  }
  if (normalized === 'CANCELED' || normalized === 'TERMINAL') {
    return 'info';
  }
  return 'info';
}

async function loadBundle() {
  if (!props.accountId) {
    return;
  }
  const res = await getSimTradingTradeExecutorConfig(Number(props.accountId));
  bundle.value = res?.payload || null;
  syncFormFromBundle(bundle.value);
}

async function loadLogs() {
  if (!props.accountId) {
    return;
  }
  logsLoading.value = true;
  try {
    const res = await getSimTradingTradeExecutorLogs(Number(props.accountId), {
      page: logPage.page,
      page_size: logPage.page_size,
    });
    const payload = res?.payload || {};
    logPage.total = Number(payload.total || 0);
    logPage.page = Number(payload.page || 1);
    logPage.page_size = Number(payload.page_size || 10);
    logPage.items = Array.isArray(payload.items) ? payload.items : [];
  } finally {
    logsLoading.value = false;
  }
}

async function loadBatches() {
  if (!props.accountId) {
    return;
  }
  batchesLoading.value = true;
  try {
    const res = await getSimTradingTradeExecutorBatches(Number(props.accountId), {
      page: batchPage.page,
      page_size: batchPage.page_size,
      stock_code: batchFilters.stock_code || null,
      status: batchFilters.status || null,
      lifecycle_status: batchFilters.lifecycle_status || null,
      direction: batchFilters.direction || null,
      source_type: batchFilters.source_type || null,
      start_time: batchFilters.dateRange?.[0] || null,
      end_time: batchFilters.dateRange?.[1] || null,
    });
    const payload = res?.payload || {};
    batchPage.total = Number(payload.total || 0);
    batchPage.page = Number(payload.page || 1);
    batchPage.page_size = Number(payload.page_size || 10);
    batchPage.items = Array.isArray(payload.items) ? payload.items : [];
  } finally {
    batchesLoading.value = false;
  }
}

function applyBatchFilters() {
  batchPage.page = 1;
  loadBatches().catch((error) => {
    console.error(error);
    ElMessage.error(error?.message || '加载执行批次失败');
  });
}

function resetBatchFilters() {
  batchFilters.stock_code = '';
  batchFilters.status = '';
  batchFilters.lifecycle_status = '';
  batchFilters.direction = '';
  batchFilters.source_type = '';
  batchFilters.dateRange = [];
  applyBatchFilters();
}

async function loadChildOrders() {
  if (!props.accountId || !childDialog.batchId) {
    return;
  }
  childDialog.loading = true;
  try {
    const res = await getSimTradingTradeExecutorBatchChildren(Number(props.accountId), Number(childDialog.batchId), {
      page: childDialog.page.page,
      page_size: childDialog.page.page_size,
    });
    const payload = res?.payload || {};
    childDialog.page.total = Number(payload.total || 0);
    childDialog.page.page = Number(payload.page || 1);
    childDialog.page.page_size = Number(payload.page_size || 10);
    childDialog.page.items = Array.isArray(payload.items) ? payload.items : [];
  } finally {
    childDialog.loading = false;
  }
}

async function loadAll() {
  if (!props.accountId) {
    return;
  }
  loading.value = true;
  try {
    await Promise.all([loadBundle(), loadLogs(), loadBatches()]);
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '加载交易执行器配置失败');
  } finally {
    loading.value = false;
  }
}

function openChildDialog(row) {
  childDialog.batchId = row?.id || null;
  childDialog.title = `子单明细 - ${row?.stock_name || '--'} (${row?.batch_no || '--'})`;
  childDialog.page.page = 1;
  childDialog.page.page_size = 10;
  childDialog.page.total = 0;
  childDialog.page.items = [];
  childDialog.visible = true;
  loadChildOrders().catch((error) => {
    console.error(error);
    ElMessage.error(error?.message || '加载子单明细失败');
  });
}

async function syncBatchStatus(row, reloadChildrenOnly = false) {
  const batchId = Number(row?.id || childDialog.batchId || 0);
  if (!props.accountId || !batchId) {
    return;
  }
  if (reloadChildrenOnly) {
    childDialog.syncing = true;
  } else {
    batchesLoading.value = true;
  }
  try {
    await syncSimTradingTradeExecutorBatchStatus(Number(props.accountId), batchId);
    await Promise.all([
      loadBatches(),
      childDialog.visible && Number(childDialog.batchId) === batchId ? loadChildOrders() : Promise.resolve(),
    ]);
    ElMessage.success('批次子单状态已同步');
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '同步子单状态失败');
  } finally {
    if (reloadChildrenOnly) {
      childDialog.syncing = false;
    } else {
      batchesLoading.value = false;
    }
  }
}

async function syncActiveBatches() {
  if (!props.accountId) {
    return;
  }
  syncingActiveBatches.value = true;
  try {
    const res = await syncSimTradingTradeExecutorActiveBatches(Number(props.accountId), { limit: 20 });
    const payload = res?.payload || {};
    await Promise.all([
      loadBatches(),
      childDialog.visible ? loadChildOrders() : Promise.resolve(),
    ]);
    ElMessage.success(`活跃批次同步完成：批次 ${payload.synced_batch_count || 0}，子单 ${payload.synced_child_count || 0}`);
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '同步活跃批次失败');
  } finally {
    syncingActiveBatches.value = false;
  }
}

function applyTemplate(template) {
  selectedTemplateKey.value = template.key;
  Object.assign(configForm, createDefaultConfigForm(), template.config || {});
}

async function saveConfig() {
  if (!props.accountId) {
    return;
  }
  saving.value = true;
  try {
    const res = await saveSimTradingTradeExecutorConfig(Number(props.accountId), {
      template_key: selectedTemplateKey.value || null,
      config: { ...configForm },
    });
    bundle.value = res?.payload || null;
    syncFormFromBundle(bundle.value);
    await loadLogs();
    ElMessage.success('交易执行器配置已保存');
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '保存交易执行器配置失败');
  } finally {
    saving.value = false;
  }
}

async function resetConfig() {
  if (!props.accountId) {
    return;
  }
  try {
    await ElMessageBox.confirm('重置后将删除当前账号的覆盖参数，并回退到系统默认模板。', '确认重置', {
      type: 'warning',
    });
  } catch {
    return;
  }
  resetting.value = true;
  try {
    await resetSimTradingTradeExecutorConfig(Number(props.accountId));
    replayPayload.value = null;
    await loadAll();
    ElMessage.success('已重置为系统默认模板');
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '重置交易执行器配置失败');
  } finally {
    resetting.value = false;
  }
}

async function runReplay() {
  if (!props.accountId) {
    return;
  }
  replaying.value = true;
  try {
    const res = await replaySimTradingTradeExecutorConfig(Number(props.accountId));
    replayPayload.value = res?.payload || null;
    ElMessage.success('参数回放完成');
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '参数回放失败');
  } finally {
    replaying.value = false;
  }
}

function openCopyDialog() {
  copyDialog.targetIds = [];
  copyDialog.visible = true;
}

async function submitCopy() {
  if (!copyDialog.targetIds.length) {
    ElMessage.warning('请至少选择一个目标账号');
    return;
  }
  copying.value = true;
  try {
    const res = await copySimTradingTradeExecutorConfig(Number(props.accountId), {
      target_account_ids: copyDialog.targetIds,
    });
    const payload = res?.payload || {};
    copyDialog.visible = false;
    await loadLogs();
    ElMessage.success(`已复制到 ${payload.copied_count || 0} 个账号`);
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '复制交易执行器配置失败');
  } finally {
    copying.value = false;
  }
}

watch(
  () => props.accountId,
  () => {
    replayPayload.value = null;
    childDialog.visible = false;
    childDialog.batchId = null;
    loadAll();
  }
);

onMounted(() => {
  loadAll();
});
</script>

<style scoped>
.batch-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-item {
  width: 140px;
}

.filter-item--wide {
  width: 320px;
}
</style>

<style scoped>
.trade-executor-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-toolbar,
.section-header,
.template-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.panel-toolbar h3,
.section-header h4,
.template-card h4 {
  margin: 0;
}

.panel-toolbar p,
.section-header p,
.template-card p {
  margin: 6px 0 0;
  color: #5f6b7a;
  line-height: 1.6;
}

.top-alert,
.detail-card {
  width: 100%;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.template-card {
  border: 1px solid #d8dee9;
}

.template-card.is-active {
  border-color: #c62828;
  box-shadow: 0 0 0 1px rgba(198, 40, 40, 0.15);
}

.template-card__metrics {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 14px 0;
  color: #3b4552;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 0 24px;
}

.message-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message-stack.compact {
  gap: 2px;
}

.note-line {
  color: #445164;
  line-height: 1.5;
}

.subtle-line {
  color: #7a8699;
  line-height: 1.4;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.copy-target-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .panel-toolbar,
  .section-header,
  .template-card__header {
    flex-direction: column;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
