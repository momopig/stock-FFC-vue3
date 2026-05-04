<template>
  <div class="strategy-list-page">
    <div class="page-header">
      <div>
        <h2>执行策略管理</h2>
        <p>从策略模板视角统一管理执行策略，并查看当前账号使用情况。</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新建执行策略</el-button>
    </div>

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-select v-model="filters.strategy_category" clearable placeholder="策略分类" class="filter-item">
          <el-option v-for="item in CATEGORY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.enabled" clearable placeholder="启用状态" class="filter-item">
          <el-option label="已启用" :value="true" />
          <el-option label="已停用" :value="false" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="策略名称/编码" class="filter-item filter-keyword" />
        <el-button type="primary" @click="loadStrategies">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table :data="strategies.items" v-loading="loading" border>
        <el-table-column prop="strategy_name" label="策略名称" min-width="180" />
        <el-table-column prop="strategy_code" label="编码" min-width="170" />
        <el-table-column label="分类" width="120">
          <template #default="scope">{{ getCategoryLabel(scope.row.strategy_category) }}</template>
        </el-table-column>
        <el-table-column label="模式" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.strategy_mode === 'BUILTIN' ? 'success' : 'info'" size="small">
              {{ scope.row.strategy_mode === 'BUILTIN' ? '内置' : '配置化' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.enabled ? 'success' : 'info'" size="small">
              {{ scope.row.enabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="config_version" label="版本" width="80" />
        <el-table-column label="更新时间" min-width="180">
          <template #default="scope">{{ formatDateTime(scope.row.updated_time) }}</template>
        </el-table-column>
        <el-table-column label="设计原理" min-width="260" show-overflow-tooltip>
          <template #default="scope">{{ scope.row.design_principle || '-' }}</template>
        </el-table-column>
        <el-table-column label="备注" min-width="200">
          <template #default="scope">{{ scope.row.remark || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" min-width="360" fixed="right">
          <template #default="scope">
            <el-space wrap>
              <el-button link type="primary" @click="openUsagePage(scope.row)">使用情况</el-button>
              <el-button link @click="validateConfig(scope.row)">校验配置</el-button>
              <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
              <el-button link :type="scope.row.enabled ? 'warning' : 'success'" @click="toggleStrategy(scope.row)">
                {{ scope.row.enabled ? '停用' : '启用' }}
              </el-button>
              <el-button link type="danger" :disabled="scope.row.strategy_mode === 'BUILTIN'" @click="removeStrategy(scope.row)">删除</el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50, 100]"
          :total="strategies.total"
          @current-change="loadStrategies"
          @size-change="loadStrategies"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新建执行策略' : '编辑执行策略'" width="720px">
      <el-form label-width="140px" class="strategy-form">
        <el-form-item label="策略编码">
          <el-input v-model="form.strategy_code" :disabled="dialog.mode === 'edit'" placeholder="例如 EXEC_CUSTOM_OPEN_001" />
        </el-form-item>
        <el-form-item label="策略名称">
          <el-input v-model="form.strategy_name" maxlength="128" />
        </el-form-item>
        <el-form-item label="策略分类">
          <el-select v-model="form.strategy_category" :disabled="dialog.mode === 'edit'" class="full-width">
            <el-option v-for="item in CATEGORY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="上游信号来源">
          <el-select v-model="form.signal_source" clearable filterable allow-create default-first-option class="full-width" placeholder="选择常见来源，或手动输入扩展来源">
            <el-option v-for="item in SIGNAL_SOURCE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <div class="field-help-text">
            用于说明这条策略主要消费哪类输入。当前阶段它主要是“策略说明字段”，帮助使用者理解策略依赖的上游信号，不直接决定执行结果。
          </div>
        </el-form-item>
        <el-form-item label="设计原理">
          <el-input v-model="form.design_principle" type="textarea" :rows="4" placeholder="说明该策略的核心思想、输入来源、决策逻辑和风险边界" />
        </el-form-item>
        <el-form-item label="默认启用">
          <el-switch v-model="form.enabled" inline-prompt active-text="启用" inactive-text="停用" :disabled="dialog.mode === 'edit'" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="规则 JSON">
          <el-input v-model="form.rule_config_json_text" type="textarea" :rows="12" placeholder="请输入合法 JSON" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitStrategy">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';

import {
  createTradingStrategy,
  deleteTradingStrategy,
  disableTradingStrategy,
  enableTradingStrategy,
  getTradingStrategies,
  getTradingStrategyUsageSummary,
  updateTradingStrategy,
  validateTradingStrategy,
} from '@/api/modules/tradingStrategy';
import { useTabsStore } from '@/composables/useTabsStore';


const router = useRouter();
const { addTab } = useTabsStore();

const CATEGORY_OPTIONS = [
  { value: 'ACCOUNT_RISK', label: '账号风控' },
  { value: 'OPEN_POSITION', label: '建仓' },
  { value: 'CLOSE_POSITION', label: '清仓' },
  { value: 'INTRADAY_T', label: '做T' },
];

const SIGNAL_SOURCE_OPTIONS = [
  { value: 'ACCOUNT', label: 'ACCOUNT · 账号状态/资产/风控输入' },
  { value: 'GROUP_MONITOR', label: 'GROUP_MONITOR · 分组监控/买入信号输入' },
  { value: 'POSITION', label: 'POSITION · 持仓状态/盈亏/仓位输入' },
  { value: 'MARKET', label: 'MARKET · 市场扫描/行情输入' },
  { value: 'MANUAL_REVIEW', label: 'MANUAL_REVIEW · 人工确认结果输入' },
];

const loading = ref(false);
const submitting = ref(false);
const strategies = reactive({ total: 0, items: [] });
const filters = reactive({ strategy_category: '', enabled: undefined, keyword: '' });
const pagination = reactive({ page: 1, pageSize: 10 });

const dialog = reactive({ visible: false, mode: 'create', strategyId: null });
const form = reactive(createInitialForm());

onMounted(() => {
  loadStrategies();
});

function createInitialForm() {
  return {
    strategy_code: '',
    strategy_name: '',
    strategy_category: 'OPEN_POSITION',
    signal_source: '',
    design_principle: '',
    remark: '',
    enabled: true,
    rule_config_json_text: '{\n  "schedule": {},\n  "signal": {},\n  "order": {}\n}',
  };
}

function resetForm() {
  Object.assign(form, createInitialForm());
}

function getCategoryLabel(value) {
  return CATEGORY_OPTIONS.find((item) => item.value === value)?.label || value;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', { hour12: false });
}

function buildStrategyPayload() {
  let ruleConfigJson = null;
  const trimmed = String(form.rule_config_json_text || '').trim();
  if (trimmed) {
    try {
      ruleConfigJson = JSON.parse(trimmed);
    } catch {
      throw new Error('规则 JSON 格式不正确');
    }
  }
  return {
    strategy_name: form.strategy_name,
    strategy_domain: 'EXECUTION',
    strategy_category: form.strategy_category,
    strategy_mode: 'CONFIGURABLE',
    signal_source: form.signal_source || null,
    design_principle: form.design_principle || null,
    rule_config_json: ruleConfigJson,
    remark: form.remark || null,
    ...(dialog.mode === 'create' ? { strategy_code: form.strategy_code, enabled: form.enabled } : {}),
  };
}

async function loadStrategies() {
  loading.value = true;
  try {
    const res = await getTradingStrategies({
      strategy_category: filters.strategy_category || null,
      enabled: filters.enabled,
      keyword: filters.keyword || null,
      page: pagination.page,
      page_size: pagination.pageSize,
    });
    strategies.total = res.payload?.total || 0;
    strategies.items = res.payload?.items || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('获取执行策略列表失败');
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.strategy_category = '';
  filters.enabled = undefined;
  filters.keyword = '';
  pagination.page = 1;
  loadStrategies();
}

function openCreateDialog() {
  dialog.visible = true;
  dialog.mode = 'create';
  dialog.strategyId = null;
  resetForm();
}

function openEditDialog(row) {
  if (row.strategy_mode === 'BUILTIN' || !row.editable) {
    ElMessage.warning('内置策略仅支持查看使用情况与启停');
    return;
  }
  dialog.visible = true;
  dialog.mode = 'edit';
  dialog.strategyId = row.id;
  Object.assign(form, {
    strategy_code: row.strategy_code,
    strategy_name: row.strategy_name,
    strategy_category: row.strategy_category,
    signal_source: row.signal_source || '',
    design_principle: row.design_principle || '',
    remark: row.remark || '',
    enabled: row.enabled,
    rule_config_json_text: row.rule_config_json ? JSON.stringify(row.rule_config_json, null, 2) : '{}',
  });
}

async function submitStrategy() {
  submitting.value = true;
  try {
    const payload = buildStrategyPayload();
    if (dialog.mode === 'create') {
      await createTradingStrategy(payload);
      ElMessage.success('执行策略创建成功');
    } else {
      await updateTradingStrategy(dialog.strategyId, payload);
      ElMessage.success('执行策略更新成功');
    }
    dialog.visible = false;
    await loadStrategies();
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '保存执行策略失败');
  } finally {
    submitting.value = false;
  }
}

async function toggleStrategy(row) {
  try {
    if (row.enabled) {
      await disableTradingStrategy(row.id);
      ElMessage.success('策略已停用');
    } else {
      await enableTradingStrategy(row.id);
      ElMessage.success('策略已启用');
    }
    await loadStrategies();
  } catch (error) {
    console.error(error);
    ElMessage.error('切换策略状态失败');
  }
}

async function validateConfig(row) {
  try {
    const res = await validateTradingStrategy(row.id, row.rule_config_json);
    const payload = res.payload || {};
    ElMessage[payload.valid ? 'success' : 'warning'](payload.message || (payload.valid ? '配置校验通过' : '配置校验失败'));
  } catch (error) {
    console.error(error);
    ElMessage.error('策略配置校验失败');
  }
}

async function removeStrategy(row) {
  try {
    const summaryRes = await getTradingStrategyUsageSummary(row.id);
    const summary = summaryRes.payload || {};
    if (summary.binding_account_count > 0) {
      await ElMessageBox.alert(summary.usage_warning || '该策略仍被账号使用，暂不允许直接删除。', '无法删除', { type: 'warning' });
      return;
    }
    await ElMessageBox.confirm(`确认删除策略“${row.strategy_name}”吗？`, '删除确认', { type: 'warning' });
    await deleteTradingStrategy(row.id);
    ElMessage.success('策略已删除');
    await loadStrategies();
  } catch (error) {
    if (error === 'cancel') {
      return;
    }
    console.error(error);
    ElMessage.error('删除策略失败');
  }
}

function openUsagePage(row) {
  const path = `/trading-strategy/execution/usage?strategyId=${row.id}`;
  addTab(path, `${row.strategy_name}使用情况`);
  router.push(path);
}

function goToAccountStrategy(accountId) {
  addTab('/sim-trading/account-detail', '模拟交易详情');
  router.push(`/sim-trading/account-detail?accountId=${accountId}&tab=strategy`);
}
</script>

<style scoped>
.strategy-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
}

.page-header p {
  margin: 8px 0 0;
  color: #606266;
}

.filter-card {
  border-radius: 16px;
}

.filter-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-item {
  width: 180px;
}

.filter-keyword {
  width: 260px;
}

.table-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.full-width {
  width: 100%;
}

.strategy-form :deep(.el-form-item__label) {
  white-space: nowrap;
}

.field-help-text {
  margin-top: 8px;
  line-height: 1.6;
  color: #909399;
  font-size: 12px;
}

.usage-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.usage-header {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.usage-card {
  padding: 16px;
  border-radius: 14px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.usage-card span,
.usage-card small {
  color: #606266;
}

.usage-alert {
  margin-bottom: 4px;
}

.principle-card {
  grid-column: span 2;
}

@media (max-width: 768px) {
  .strategy-list-page {
    padding: 12px;
  }

  .usage-header {
    grid-template-columns: 1fr;
  }

  .principle-card {
    grid-column: span 1;
  }

  .filter-item,
  .filter-keyword {
    width: 100%;
  }
}
</style>
