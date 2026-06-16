<template>
  <div class="sim-page">
    <div class="sim-toolbar">
      <div>
        <h2>交易账户管理</h2>
        <p>统一管理模拟账户与 QMT 实盘账户，并复用同一套 FFC 交易工作台。</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新建账户</el-button>
    </div>

    <el-table :data="accounts" v-loading="loading" border class="sim-table">
      <el-table-column prop="account_name" label="账户名称" min-width="160" />
      <el-table-column prop="account_type" label="账户类型" width="120" />
      <el-table-column label="券商类型" width="140">
        <template #default="scope">{{ getBrokerLabel(scope.row) }}</template>
      </el-table-column>
      <el-table-column label="创建日期" min-width="180">
        <template #default="scope">{{
          formatDateTime(scope.row.created_time)
        }}</template>
      </el-table-column>
      <el-table-column label="币种" width="130">
        <template #default="scope">{{
          getCurrencyLabel(scope.row.base_currency)
        }}</template>
      </el-table-column>
      <el-table-column label="可用资金" width="140">
        <template #default="scope">{{
          formatMoney(scope.row.available_cash)
        }}</template>
      </el-table-column>
      <el-table-column label="冻结资金" width="140">
        <template #default="scope">{{
          formatMoney(scope.row.frozen_cash)
        }}</template>
      </el-table-column>
      <el-table-column label="当前总资产" width="150">
        <template #default="scope">{{
          formatMoney(scope.row.summary?.current_total_asset)
        }}</template>
      </el-table-column>
      <el-table-column label="持仓市值" width="150">
        <template #default="scope">{{
          formatMoney(scope.row.summary?.position_market_value)
        }}</template>
      </el-table-column>
      <el-table-column label="持仓盈亏" width="150">
        <template #default="scope">
          <div class="profit-cell">
            <span :class="profitClass(scope.row.summary?.position_pnl_amount)">
              {{ formatMoney(scope.row.summary?.position_pnl_amount) }}
            </span>
            <span
              :class="profitClass(getPositionProfitRatio(scope.row.summary))"
            >
              {{ formatPercent(getPositionProfitRatio(scope.row.summary)) }}
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="scope">
          <el-tag :type="statusTagType(scope.row.status)" effect="light">{{
            getStatusLabel(scope.row.status)
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="380">
        <template #default="scope">
          <el-space>
            <el-button link type="primary" @click="openDetail(scope.row)"
              >查看详情</el-button
            >
            <el-button link type="primary" @click="openStrategyConfig(scope.row)"
              >自动化策略配置</el-button
            >
            <el-button link @click="openEditDialog(scope.row)">编辑</el-button>
            <el-button link @click="quickAction(scope.row, 'deposit')"
              >转入</el-button
            >
            <el-button link @click="quickAction(scope.row, 'withdraw')"
              >转出</el-button
            >
            <el-button
              v-if="scope.row.account_type === 'SIMULATED'"
              link
              type="danger"
              @click="resetAccount(scope.row)"
              >重置</el-button
            >
            <el-button link type="danger" @click="deleteAccount(scope.row)"
              >删除</el-button
            >
          </el-space>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="isEditMode ? '编辑账户' : '新建账户'"
      width="680px"
    >
      <el-form :model="formData" label-width="110px">
        <el-form-item label="账户名称">
          <el-input v-model="formData.account_name" maxlength="128" />
        </el-form-item>
        <el-form-item label="账户类型">
          <el-select v-model="formData.account_type" :disabled="isEditMode">
            <el-option label="模拟账户" value="SIMULATED" />
            <el-option label="QMT 实盘账户" value="QMT" />
          </el-select>
        </el-form-item>
        <el-form-item label="券商类型">
          <el-input v-model="formData.broker_name" disabled />
        </el-form-item>
        <el-form-item label="基础币种">
          <el-select v-model="formData.base_currency" :disabled="isEditMode">
            <el-option label="人民币（CNY）" value="CNY" />
            <el-option label="港币（HKD）" value="HKD" />
            <el-option label="美元（USD）" value="USD" />
          </el-select>
        </el-form-item>
        <template v-if="formData.account_type === 'QMT'">
          <el-divider content-position="left">QMT 连接配置</el-divider>
          <el-form-item label="接入方式">
            <el-input :model-value="'REMOTE_AGENT（固定）'" disabled />
          </el-form-item>
          <el-form-item label="Agent 地址">
            <el-input
              v-model="formData.connection_config_json.agent_base_url"
              placeholder="例如：http://127.0.0.1:9101"
            />
            <div class="form-help-text">
              QMT 账户统一通过 qmt-agent 转发。开发环境和生产环境可配置不同的 Agent 地址，编辑账户时也可修改。
            </div>
          </el-form-item>
          <el-form-item label="资金账号">
            <el-input
              v-model="formData.connection_config_json.account_id"
              placeholder="填写国金 QMT 资金账号"
            />
          </el-form-item>
          <el-form-item label="账号类型">
            <el-select v-model="formData.connection_config_json.account_type">
              <el-option label="普通证券账户(STOCK)" value="STOCK" />
              <el-option label="信用账户(CREDIT)" value="CREDIT" />
            </el-select>
          </el-form-item>
          <el-form-item label="QMT 会话ID">
            <el-input-number
              v-model="formData.connection_config_json.session_id"
              :min="1"
              :step="1"
              class="full-width"
            />
          </el-form-item>
          <el-form-item label="委托备注前缀">
            <el-input
              v-model="formData.connection_config_json.order_remark_prefix"
              maxlength="32"
            />
          </el-form-item>
          <el-form-item label="策略名前缀">
            <el-input
              v-model="formData.connection_config_json.strategy_name_prefix"
              maxlength="32"
            />
          </el-form-item>
          <el-form-item label="Agent Auth Token">
            <el-input
              v-model="formData.connection_config_json.agent_auth_token"
              placeholder="请输入 QMT Agent Token，与 Agent 启动时一致"
              maxlength="128"
              show-password
            />
            <div class="form-help-text">
              必须与 QMT Agent 启动时 QMT_AGENT_AUTH_TOKEN
              保持一致，否则无法连接。
            </div>
          </el-form-item>
        </template>
        <el-form-item
          v-if="!isEditMode && formData.account_type === 'SIMULATED'"
          label="初始资金"
        >
          <el-input-number
            v-model="formData.initial_total_asset"
            :precision="2"
            :min="0"
            :step="1000"
            class="full-width"
          />
        </el-form-item>
        <el-form-item
          v-else-if="!isEditMode && formData.account_type === 'QMT'"
          label="初始资产占位"
        >
          <el-input-number
            v-model="formData.initial_total_asset"
            :precision="2"
            :min="0"
            :step="1000"
            class="full-width"
          />
          <div class="form-help-text">
            QMT 创建后会自动尝试读取券商实时资产并覆盖该占位值。
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="formData.status">
            <el-option label="激活" value="ACTIVE" />
            <el-option label="暂停" value="PAUSED" />
            <el-option label="禁用" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm"
          >保存</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';

import {
  createSimTradingAccount,
  deleteSimTradingAccount,
  getSimTradingAccounts,
  resetSimTradingAccount,
  updateSimTradingAccount,
} from '@/api/modules/simTrading';
import { useTabsStore } from '@/composables/useTabsStore';

const router = useRouter();
const { addTab } = useTabsStore();

const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEditMode = ref(false);
const editingAccountId = ref(null);
const accounts = ref([]);

const QMT_BROKER_NAME = 'GJZQ_QMT';
const SIM_BROKER_NAME = 'LOCAL_SIM';
const QMT_DEFAULT_AGENT_BASE_URL = 'http://127.0.0.1:9101';

const initFormData = () => ({
  account_name: '',
  account_type: 'SIMULATED',
  broker_name: SIM_BROKER_NAME,
  base_currency: 'CNY',
  initial_total_asset: 100000,
  status: 'ACTIVE',
  connection_config_json: {
    gateway_mode: 'REMOTE_AGENT',
    agent_base_url: QMT_DEFAULT_AGENT_BASE_URL,
    account_id: '',
    account_type: 'STOCK',
    session_id: 900001,
    order_remark_prefix: 'FFC',
    strategy_name_prefix: 'FFC',
  },
  remark: '',
});

const formData = reactive(initFormData());

function formatMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value) {
  const num = Number(value || 0);
  return `${num.toFixed(2)}%`;
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
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

function formatDateTime(value) {
  const date = normalizeDate(value);
  if (!date) return '--';
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function profitClass(value) {
  const num = Number(value || 0);
  if (num > 0) return 'profit-up';
  if (num < 0) return 'profit-down';
  return '';
}

// 根据持仓市值和持仓盈亏反推持仓成本，再计算当前持仓收益率。
function getPositionProfitRatio(summary = {}) {
  const positionMarketValue = Number(summary?.position_market_value || 0);
  const positionPnlAmount = Number(summary?.position_pnl_amount || 0);
  const costAmount = positionMarketValue - positionPnlAmount;

  if (!Number.isFinite(costAmount) || Math.abs(costAmount) < 0.000001) {
    return 0;
  }

  return (positionPnlAmount / costAmount) * 100;
}

function getCurrencyLabel(currency) {
  const map = {
    CNY: '人民币（CNY）',
    HKD: '港币（HKD）',
    USD: '美元（USD）',
  };
  return map[currency] || currency || '--';
}

function normalizeBrokerName(accountType, brokerName) {
  if (accountType === 'QMT') {
    return QMT_BROKER_NAME;
  }
  const normalized = String(brokerName || '').trim();
  return normalized || SIM_BROKER_NAME;
}

function getBrokerLabel(row) {
  const normalized = normalizeBrokerName(row?.account_type, row?.broker_name);
  const map = {
    LOCAL_SIM: '本地模拟',
    GJZQ_QMT: '国金 QMT',
  };
  return map[normalized] || normalized || '--';
}

function getStatusLabel(status) {
  const map = {
    ACTIVE: '激活',
    PAUSED: '暂停',
    DISABLED: '禁用',
  };
  return map[status] || status || '--';
}

function normalizeConnectionConfig(config = {}) {
  return {
    gateway_mode: 'REMOTE_AGENT',
    agent_base_url: config?.agent_base_url || QMT_DEFAULT_AGENT_BASE_URL,
    account_id: config?.account_id || config?.fund_account || '',
    account_type: config?.account_type || 'STOCK',
    session_id: Number(config?.session_id || 900001),
    order_remark_prefix: config?.order_remark_prefix || 'FFC',
    strategy_name_prefix: config?.strategy_name_prefix || 'FFC',
    agent_auth_token: config?.agent_auth_token || '', // 新增，保证回显
  };
}

function statusTagType(status) {
  const map = {
    ACTIVE: 'success',
    PAUSED: 'warning',
    DISABLED: 'danger',
  };
  return map[status] || 'info';
}

function resetForm() {
  Object.assign(formData, initFormData());
  editingAccountId.value = null;
}

watch(
  () => formData.account_type,
  (accountType) => {
    formData.broker_name = normalizeBrokerName(
      accountType,
      formData.broker_name
    );
  },
  { immediate: true }
);

function openCreateDialog() {
  isEditMode.value = false;
  resetForm();
  dialogVisible.value = true;
}

function openEditDialog(row) {
  isEditMode.value = true;
  editingAccountId.value = row.id;
  Object.assign(formData, {
    account_name: row.account_name,
    account_type: row.account_type,
    broker_name: normalizeBrokerName(row.account_type, row.broker_name),
    base_currency: row.base_currency,
    initial_total_asset: Number(row.initial_total_asset || 0),
    status: row.status,
    connection_config_json: normalizeConnectionConfig(
      row.connection_config_json || {}
    ),
    remark: row.remark || '',
  });
  dialogVisible.value = true;
}

function openDetail(row) {
  openAccountWorkspace(row);
}

function openStrategyConfig(row) {
  openAccountWorkspace(row, { tab: 'strategy' });
}

function quickAction(row, action) {
  openAccountWorkspace(row, { tab: 'transfer', action });
}

function openAccountWorkspace(row, options = {}) {
  const query = new URLSearchParams({ accountId: String(row.id) });
  if (options.tab) {
    query.set('tab', options.tab);
  }
  if (options.action) {
    query.set('action', options.action);
  }
  const path = `/sim-trading/account-detail?${query.toString()}`;
  const workspaceTitle =
    row.account_type === 'QMT' ? 'QMT 实盘交易工作台' : '交易账户工作台';
  addTab('/sim-trading/account-detail', workspaceTitle);
  router.push(path);
}

async function loadAccounts() {
  loading.value = true;
  try {
    const res = await getSimTradingAccounts();
    if (res?.success) {
      accounts.value = res.payload?.items || [];
    } else {
      ElMessage.error(res?.message || '获取账户列表失败');
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('获取账户列表失败');
  } finally {
    loading.value = false;
  }
}

async function resetAccount(row) {
  const confirmText = `RESET ${row.account_name}`;
  try {
    await ElMessageBox.prompt(
      `重置后将清空“${row.account_name}”的持仓、委托、成交和资金流水，并恢复到初始资金。\n请输入 ${confirmText} 以确认重置：`,
      '确认重置模拟账户',
      {
        type: 'warning',
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        inputPlaceholder: confirmText,
        inputValidator: (value) => {
          if (String(value || '').trim() !== confirmText) {
            return `请输入 ${confirmText} 后再执行重置`;
          }
          return true;
        },
      }
    );
  } catch {
    return;
  }

  loading.value = true;
  try {
    const res = await resetSimTradingAccount(row.id);
    if (res?.success) {
      ElMessage.success('模拟账户已重置');
      await loadAccounts();
    } else {
      ElMessage.error(res?.message || '重置失败');
    }
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '重置失败');
  } finally {
    loading.value = false;
  }
}

async function deleteAccount(row) {
  const confirmText = String(row.account_name || '').trim();
  if (!confirmText) {
    ElMessage.warning('账户名称为空，无法执行删除');
    return;
  }

  try {
    await ElMessageBox.prompt(
      `删除后将移除“${row.account_name}”及关联的持仓、委托、成交、资金流水和策略配置，且不可恢复。\n请输入账户名称 ${confirmText} 以确认删除：`,
      '确认删除交易账户',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        inputPlaceholder: confirmText,
        inputValidator: (value) => {
          if (String(value || '').trim() !== confirmText) {
            return `请输入账户名称 ${confirmText} 后再执行删除`;
          }
          return true;
        },
      }
    );
  } catch {
    return;
  }

  loading.value = true;
  try {
    const res = await deleteSimTradingAccount(row.id, {
      confirm_account_name: confirmText,
    });
    if (res?.success) {
      ElMessage.success('账户已删除');
      await loadAccounts();
    } else {
      ElMessage.error(res?.message || '删除失败');
    }
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '删除失败');
  } finally {
    loading.value = false;
  }
}

async function submitForm() {
  if (submitting.value) {
    return;
  }

  if (!formData.account_name) {
    ElMessage.warning('请输入账户名称');
    return;
  }
  submitting.value = true;
  try {
    const qmtConnectionConfig =
      formData.account_type === 'QMT'
        ? (() => {
            const { client_path, mini_qmt_path, ...restConfig } =
              formData.connection_config_json || {};
            return {
              ...restConfig,
              gateway_mode: 'REMOTE_AGENT',
              agent_base_url:
                formData.connection_config_json.agent_base_url ||
                QMT_DEFAULT_AGENT_BASE_URL,
            };
          })()
        : null;

    const payload = isEditMode.value
      ? {
          account_name: formData.account_name,
          account_type: formData.account_type,
          broker_name: normalizeBrokerName(
            formData.account_type,
            formData.broker_name
          ),
          base_currency: formData.base_currency,
          status: formData.status,
          connection_config_json: qmtConnectionConfig,
          remark: formData.remark,
        }
      : {
          ...formData,
          connection_config_json: qmtConnectionConfig,
          broker_name: normalizeBrokerName(
            formData.account_type,
            formData.broker_name
          ),
          initial_total_asset:
            formData.account_type === 'QMT'
              ? Number(formData.initial_total_asset || 0)
              : Number(formData.initial_total_asset || 0),
        };

    if (formData.account_type === 'QMT') {
      if (!formData.connection_config_json.account_id) {
        ElMessage.warning('请填写 QMT 资金账号');
        submitting.value = false;
        return;
      }
    }

    const res = isEditMode.value
      ? await updateSimTradingAccount(editingAccountId.value, payload)
      : await createSimTradingAccount(payload);

    if (res?.success) {
      ElMessage.success(isEditMode.value ? '账户已更新' : '账户已创建');
      dialogVisible.value = false;
      await loadAccounts();
    } else {
      ElMessage.error(res?.message || '保存失败');
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('保存失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadAccounts();
});
</script>

<style scoped>
.sim-page {
  padding: 24px;
  text-align: left;
  background: #f5f7fb;
  min-height: 100%;
}

.sim-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.sim-toolbar h2 {
  margin: 0;
  font-size: 24px;
  color: #17324d;
}

.sim-toolbar p {
  margin: 6px 0 0;
  color: #5e7186;
}

.sim-table {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}

.full-width {
  width: 100%;
}

.hidden-picker {
  display: none;
}

.form-help-text {
  margin-top: 6px;
  color: #7a8da2;
  font-size: 12px;
  line-height: 1.6;
}

.profit-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  line-height: 1.4;
  text-align: center;
}

.profit-up {
  color: #cf3f3f;
}

.profit-down {
  color: #1f8a5b;
}
</style>
