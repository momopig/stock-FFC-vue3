<template>
  <div class="sim-page">
    <div class="sim-toolbar">
      <div>
        <h2>模拟交易账号管理</h2>
        <p>用于创建、维护和进入单个模拟账户工作台。</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新建账户</el-button>
    </div>

    <el-table :data="accounts" v-loading="loading" border class="sim-table">
      <el-table-column prop="account_name" label="账户名称" min-width="160" />
      <el-table-column prop="account_type" label="账户类型" width="120" />
      <el-table-column prop="broker_name" label="券商类型" width="120" />
      <el-table-column label="创建日期" min-width="180">
        <template #default="scope">{{ formatDateTime(scope.row.created_time) }}</template>
      </el-table-column>
      <el-table-column label="币种" width="130">
        <template #default="scope">{{ getCurrencyLabel(scope.row.base_currency) }}</template>
      </el-table-column>
      <el-table-column label="可用资金" width="140">
        <template #default="scope">{{ formatMoney(scope.row.available_cash) }}</template>
      </el-table-column>
      <el-table-column label="冻结资金" width="140">
        <template #default="scope">{{ formatMoney(scope.row.frozen_cash) }}</template>
      </el-table-column>
      <el-table-column label="当前总资产" width="150">
        <template #default="scope">{{ formatMoney(scope.row.summary?.current_total_asset) }}</template>
      </el-table-column>
      <el-table-column label="持仓市值" width="150">
        <template #default="scope">{{ formatMoney(scope.row.summary?.position_market_value) }}</template>
      </el-table-column>
      <el-table-column label="持仓盈亏" width="150">
        <template #default="scope">
          <span :class="profitClass(scope.row.summary?.position_pnl_amount)">
            {{ formatMoney(scope.row.summary?.position_pnl_amount) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="scope">
          <el-tag :type="statusTagType(scope.row.status)" effect="light">{{ getStatusLabel(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="300">
        <template #default="scope">
          <el-space>
            <el-button link type="primary" @click="openDetail(scope.row)">查看详情</el-button>
            <el-button link @click="openEditDialog(scope.row)">编辑</el-button>
            <el-button link @click="quickAction(scope.row, 'deposit')">入金</el-button>
            <el-button link @click="quickAction(scope.row, 'withdraw')">出金</el-button>
            <el-button link type="danger" @click="resetAccount(scope.row)">重置</el-button>
          </el-space>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="isEditMode ? '编辑账户' : '新建账户'" width="520px">
      <el-form :model="formData" label-width="110px">
        <el-form-item label="账户名称">
          <el-input v-model="formData.account_name" maxlength="128" />
        </el-form-item>
        <el-form-item label="账户类型">
          <el-select v-model="formData.account_type" :disabled="isEditMode">
            <el-option label="模拟账户" value="SIMULATED" />
          </el-select>
        </el-form-item>
        <el-form-item label="券商类型">
          <el-input v-model="formData.broker_name" :disabled="isEditMode" />
        </el-form-item>
        <el-form-item label="基础币种">
          <el-select v-model="formData.base_currency" :disabled="isEditMode">
            <el-option label="人民币（CNY）" value="CNY" />
            <el-option label="港币（HKD）" value="HKD" />
            <el-option label="美元（USD）" value="USD" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!isEditMode" label="初始资金">
          <el-input-number v-model="formData.initial_total_asset" :precision="2" :min="0" :step="1000" class="full-width" />
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
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';

import {
  createSimTradingAccount,
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

const initFormData = () => ({
  account_name: '',
  account_type: 'SIMULATED',
  broker_name: 'LOCAL_SIM',
  base_currency: 'CNY',
  initial_total_asset: 100000,
  status: 'ACTIVE',
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

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  let normalized = typeof value === 'string' ? value.trim().replace(' ', 'T') : value;
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

function getCurrencyLabel(currency) {
  const map = {
    CNY: '人民币（CNY）',
    HKD: '港币（HKD）',
    USD: '美元（USD）',
  };
  return map[currency] || currency || '--';
}

function getStatusLabel(status) {
  const map = {
    ACTIVE: '激活',
    PAUSED: '暂停',
    DISABLED: '禁用',
  };
  return map[status] || status || '--';
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
    broker_name: row.broker_name,
    base_currency: row.base_currency,
    initial_total_asset: Number(row.initial_total_asset || 0),
    status: row.status,
    remark: row.remark || '',
  });
  dialogVisible.value = true;
}

function openDetail(row) {
  const path = `/sim-trading/account-detail?accountId=${row.id}`;
  addTab('/sim-trading/account-detail', '模拟交易详情');
  router.push(path);
}

function quickAction(row, action) {
  const path = `/sim-trading/account-detail?accountId=${row.id}&tab=transfer&action=${action}`;
  addTab('/sim-trading/account-detail', '模拟交易详情');
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

async function submitForm() {
  if (!formData.account_name) {
    ElMessage.warning('请输入账户名称');
    return;
  }
  submitting.value = true;
  try {
    const payload = isEditMode.value
      ? {
          account_name: formData.account_name,
          account_type: formData.account_type,
          status: formData.status,
          remark: formData.remark,
        }
      : { ...formData };

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

.profit-up {
  color: #cf3f3f;
}

.profit-down {
  color: #1f8a5b;
}
</style>
