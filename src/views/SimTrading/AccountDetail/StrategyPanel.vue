<template>
  <div class="strategy-panel" v-loading="loading">
    <div class="strategy-toolbar">
      <div class="toolbar-left">
        <div class="toolbar-card">
          <span class="toolbar-label">账号自动化</span>
          <el-switch
            :model-value="settings.automation_enabled"
            :loading="saving"
            inline-prompt
            active-text="开启"
            inactive-text="关闭"
            @change="handleAutomationToggle"
          />
        </div>
        <div class="toolbar-card muted">
          <span class="toolbar-label">最近调度</span>
          <strong>{{ settings.last_dispatch_status || '未执行' }}</strong>
          <small>{{ formatDateTime(settings.last_dispatch_time) }}</small>
        </div>
      </div>
      <el-space>
        <el-button @click="loadAll">刷新</el-button>
        <el-button type="primary" plain :loading="saving" @click="runDebugDispatch">调试触发</el-button>
        <el-button type="primary" @click="openCreateDialog()">新增绑定</el-button>
      </el-space>
    </div>

    <el-tabs v-model="activeCategoryTab">
      <el-tab-pane v-for="group in groupedBindings" :key="group.category" :label="group.label" :name="group.category">
        <div class="category-header-card">
          <h3>{{ group.label }}</h3>
          <p>{{ group.description }}</p>
        </div>
        <el-tabs v-model="innerTabByCategory[group.category]">
          <el-tab-pane label="策略配置" name="config">
            <div class="strategy-groups">
              <el-card shadow="never" class="strategy-group-card">
                <template #header>
                  <div class="group-card-header">
                    <div>
                      <h3>{{ group.label }}</h3>
                      <p>{{ group.description }}</p>
                    </div>
                    <el-button type="primary" link @click="openCreateDialog(group.category)">添加策略</el-button>
                  </div>
                </template>

                <el-empty v-if="!group.items.length" description="当前未绑定策略" />

                <el-table v-else :data="group.items" border>
              <el-table-column label="策略名称" min-width="180">
                <template #default="scope">
                  <el-button
                    link
                    type="primary"
                    class="strategy-name-link"
                    @click="openStrategyUsagePage(scope.row.strategy)"
                  >
                    {{ scope.row.strategy?.strategy_name || '-' }}
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column prop="strategy.strategy_code" label="编码" min-width="180" />
              <el-table-column label="类型" width="120">
                <template #default="scope">
                  <el-tag size="small" :type="scope.row.strategy.strategy_mode === 'BUILTIN' ? 'success' : 'info'">
                    {{ getModeLabel(scope.row.strategy.strategy_mode) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="启用" width="90">
                <template #default="scope">
                  <el-switch
                    :model-value="scope.row.enabled"
                    :loading="savingBindingId === scope.row.id"
                    @change="(value) => toggleBinding(scope.row, value)"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="priority" label="优先级" width="90" />
              <el-table-column prop="bound_config_version" label="版本" width="80" />
              <el-table-column prop="last_execute_result" label="最近结果" min-width="140">
                <template #default="scope">{{ scope.row.last_execute_result || '-' }}</template>
              </el-table-column>
              <el-table-column label="风控参数" min-width="220">
                <template #default="scope">
                  <div v-if="scope.row.strategy.strategy_code === 'EXEC_ACCOUNT_RISK_BASE'" class="risk-preview-cell">
                    <span>市场环境：{{ getRiskPreview(scope.row).marketRegimeLabel }}</span>
                    <span>最大持股：{{ getRiskPreview(scope.row).maxHoldings }}</span>
                    <span>当前总分块数(M + N)：{{ getRiskPreview(scope.row).totalSlots }}</span>
                    <span>单份分块金额：{{ getRiskPreview(scope.row).slotAmountText }}</span>
                    <span>浮亏阈值：{{ getRiskPreview(scope.row).maxFloatingLossPercentText }}</span>
                  </div>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="股票分组" min-width="220">
                <template #default="scope">
                  <div v-if="getBoundGroups(scope.row).length" class="bound-group-cell">
                    <el-tag
                      v-for="groupItem in getBoundGroups(scope.row)"
                      :key="`bound-group-${scope.row.id}-${groupItem.id}`"
                      size="small"
                      class="bound-group-tag"
                      @click="openGroupStocksPage(groupItem)"
                    >
                      {{ groupItem.name }}
                    </el-tag>
                  </div>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="备注" min-width="180">
                <template #default="scope">{{ scope.row.strategy.remark || '-' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="220" fixed="right">
                <template #default="scope">
                  <el-space wrap>
                    <el-button link type="primary" :disabled="!canMoveUp(group.items, scope.$index)" @click="moveBinding(group.items, scope.$index, 'up')">上移</el-button>
                    <el-button link type="primary" :disabled="!canMoveDown(group.items, scope.$index)" @click="moveBinding(group.items, scope.$index, 'down')">下移</el-button>
                    <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
                    <el-button link type="danger" @click="removeBinding(scope.row)">解绑</el-button>
                  </el-space>
                </template>
              </el-table-column>
                </el-table>
              </el-card>
            </div>
          </el-tab-pane>

          <el-tab-pane label="策略日志" name="logs">
        <div class="log-toolbar">
          <el-input v-model="logFilters.result_code" clearable placeholder="结果码" class="toolbar-input" />
          <el-input v-model="logFilters.keyword" clearable placeholder="策略名称/股票/原因" class="toolbar-input" />
          <el-button type="primary" @click="loadLogs">查询</el-button>
          <el-button @click="resetLogFilters">重置</el-button>
        </div>

        <el-table :data="logs.items" border>
          <el-table-column prop="strategy_name" label="策略名称" min-width="180" />
          <el-table-column label="股票" min-width="180">
            <template #default="scope">
              <span>{{ scope.row.stock_name || scope.row.stock_code || '-' }}</span>
              <span v-if="scope.row.stock_code" class="muted-inline">{{ ` (${scope.row.stock_code})` }}</span>
            </template>
          </el-table-column>
          <el-table-column label="分类" width="130">
            <template #default="scope">{{ getCategoryLabel(scope.row.strategy_category) }}</template>
          </el-table-column>
          <el-table-column prop="action_code" label="动作" width="160">
            <template #default="scope">{{ scope.row.action_code || '-' }}</template>
          </el-table-column>
          <el-table-column prop="result_code" label="结果" width="180" />
          <el-table-column prop="trigger_reason" label="原因" min-width="260">
            <template #default="scope">
              <div class="reason-cell">{{ scope.row.trigger_reason || scope.row.system_remark || '-' }}</div>
            </template>
          </el-table-column>
          <el-table-column label="风控协同" min-width="320">
            <template #default="scope">
              <div v-if="getCoordinationSummary(scope.row)" class="coordination-cell">
                <div class="coordination-tags">
                  <el-tag size="small" :type="getCoordinationStateTagType(getCoordinationSummary(scope.row)?.risk_state)">
                    {{ getCoordinationStateLabel(getCoordinationSummary(scope.row)?.risk_state) }}
                  </el-tag>
                  <el-tag
                    size="small"
                    :type="getCoordinationSummary(scope.row)?.allow_open_position ? 'success' : 'warning'"
                  >
                    {{ getCoordinationSummary(scope.row)?.allow_open_position ? '允许开仓' : '禁止开仓' }}
                  </el-tag>
                  <el-tag
                    size="small"
                    :type="getCoordinationSummary(scope.row)?.allow_intraday_t ? 'success' : 'info'"
                  >
                    {{ getCoordinationSummary(scope.row)?.allow_intraday_t ? '允许做T' : '暂停做T' }}
                  </el-tag>
                </div>
                <div class="coordination-metrics">
                  <span>剩余开仓名额：{{ formatCoordinationValue(getCoordinationSummary(scope.row)?.remaining_open_slots) }}</span>
                  <span>开仓参考金额：{{ formatCoordinationBudget(getCoordinationSummary(scope.row)?.recommended_open_budget) }}</span>
                </div>
                <div v-if="getCoordinationWarnings(scope.row).length" class="coordination-warnings">
                  {{ getCoordinationWarnings(scope.row).join('；') }}
                </div>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="时间" min-width="180">
            <template #default="scope">{{ formatDateTime(scope.row.last_trigger_time || scope.row.created_time) }}</template>
          </el-table-column>
        </el-table>

        <div class="table-pagination">
          <el-pagination
            v-model:current-page="logPagination.page"
            v-model:page-size="logPagination.pageSize"
            background
            layout="total, sizes, prev, pager, next"
            :page-sizes="[10, 20, 50, 100]"
            :total="logs.total || 0"
            @current-change="loadLogs"
            @size-change="loadLogs"
          />
        </div>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="bindingDialog.visible" :title="bindingDialog.mode === 'create' ? '新增策略绑定' : '编辑策略绑定'" width="640px">
      <el-form label-width="110px">
        <el-form-item v-if="bindingDialog.mode === 'create'" label="选择策略">
          <el-select v-model="bindingForm.strategy_id" filterable placeholder="请选择执行策略" class="full-width">
            <el-option
              v-for="item in selectableStrategies"
              :key="item.id"
              :label="`${item.strategy_name}（${getCategoryLabel(item.strategy_category)}）`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="策略分类">
          <el-input :model-value="bindingDialog.selectedCategory ? getCategoryLabel(bindingDialog.selectedCategory) : '-'" disabled />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="bindingForm.enabled" inline-prompt active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <el-form-item v-if="showBindingOverrideJson" label="覆盖配置 JSON">
          <el-input v-model="bindingForm.account_override_json_text" type="textarea" :rows="8" placeholder="可选，填写账号级覆盖配置 JSON" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindingDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitBinding">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';

import {
  createAccountStrategyBinding,
  debugRunAccountStrategy,
  deleteAccountStrategyBinding,
  getAccountStrategyBindings,
  getAccountStrategyLogs,
  getAccountStrategySettings,
  getExecutionStrategies,
  reorderAccountStrategyBindings,
  toggleAccountStrategySettings,
  updateAccountStrategyBinding,
} from '@/api/modules/simTradingStrategy';
import { getUserGroups } from '@/api/modules/stockGroup';
import { useTabsStore } from '@/composables/useTabsStore';


const props = defineProps({
  accountId: {
    type: [Number, String],
    required: true,
  },
  accountTotalAsset: {
    type: [Number, String],
    default: 0,
  },
});

const router = useRouter();
const { addTab } = useTabsStore();

const CATEGORY_OPTIONS = [
  { value: 'ACCOUNT_RISK', label: '账号风控策略', description: '账号级风控门禁，优先于其他执行策略。' },
  { value: 'OPEN_POSITION', label: '建仓策略', description: '基于分组与买入监控信号执行建仓。' },
  { value: 'CLOSE_POSITION', label: '清仓策略', description: '围绕止盈、止损和趋势破坏执行清仓。' },
  { value: 'INTRADAY_T', label: '做T策略', description: '围绕底仓执行盘中高抛低吸。' },
];

const loading = ref(false);
const saving = ref(false);
const savingBindingId = ref(null);
const activeCategoryTab = ref('ACCOUNT_RISK');
const innerTabByCategory = reactive({
  ACCOUNT_RISK: 'config',
  OPEN_POSITION: 'config',
  CLOSE_POSITION: 'config',
  INTRADAY_T: 'config',
});
const availableStrategies = ref([]);
const bindings = ref([]);
const userGroups = ref([]);
const settings = reactive({
  automation_enabled: false,
  last_dispatch_status: '',
  last_dispatch_time: '',
});
const logs = reactive({ total: 0, items: [] });
const logFilters = reactive({ result_code: '', keyword: '' });
const logPagination = reactive({ page: 1, pageSize: 10 });

const bindingDialog = reactive({
  visible: false,
  mode: 'create',
  bindingId: null,
  selectedCategory: '',
});

const bindingForm = reactive({
  strategy_id: undefined,
  enabled: true,
  account_override_json_text: '',
});

const accountIdNumber = computed(() => Number(props.accountId || 0));
const groupedBindings = computed(() =>
  CATEGORY_OPTIONS.map((item) => ({
    ...item,
    category: item.value,
    items: bindings.value.filter((binding) => binding.strategy_category === item.value),
  }))
);
const userGroupNameMap = computed(() => {
  const result = new Map();
  userGroups.value.forEach((group) => {
    const groupId = Number(group?.id);
    if (groupId) {
      result.set(groupId, group?.name || `分组#${groupId}`);
    }
  });
  return result;
});
const selectableStrategies = computed(() => {
  const boundIds = new Set(bindings.value.map((item) => item.strategy_id));
  return availableStrategies.value.filter((item) => {
    if (bindingDialog.mode === 'edit' && bindingDialog.bindingId) {
      return item.strategy_category === bindingDialog.selectedCategory;
    }
    return item.strategy_category === bindingDialog.selectedCategory && !boundIds.has(item.id);
  });
});
const currentBindingStrategy = computed(() => {
  if (bindingDialog.mode === 'create') {
    return availableStrategies.value.find((item) => item.id === bindingForm.strategy_id) || null;
  }
  const currentBinding = bindings.value.find((item) => item.id === bindingDialog.bindingId) || null;
  return currentBinding?.strategy || null;
});
const showBindingOverrideJson = computed(() => currentBindingStrategy.value?.strategy_code !== 'TAIL_BREAK_MA_SELL');

watch(
  () => props.accountId,
  () => {
    if (!accountIdNumber.value) {
      return;
    }
    loadAll();
  },
  { immediate: true }
);

function getActiveInnerTab() {
  return innerTabByCategory[activeCategoryTab.value] || 'config';
}

watch(activeCategoryTab, () => {
  if (getActiveInnerTab() === 'logs') {
    loadLogs();
  }
});

watch(
  () => innerTabByCategory[activeCategoryTab.value],
  (value) => {
    if (value === 'logs') {
      loadLogs();
    }
  }
);

watch(() => props.accountId, () => {
  if (!accountIdNumber.value) {
    return;
  }
  if (getActiveInnerTab() === 'logs') {
    loadLogs();
  }
});

async function loadAll() {
  if (!accountIdNumber.value) {
    return;
  }
  loading.value = true;
  try {
    const [settingsRes, bindingsRes, strategiesRes, groupsRes] = await Promise.all([
      getAccountStrategySettings(accountIdNumber.value),
      getAccountStrategyBindings(accountIdNumber.value),
      getExecutionStrategies({ page: 1, page_size: 200 }),
      getUserGroups().catch(() => ({ payload: [] })),
    ]);
    Object.assign(settings, settingsRes.payload || {});
    bindings.value = bindingsRes.payload?.items || [];
    availableStrategies.value = strategiesRes.payload?.items || [];
    userGroups.value = Array.isArray(groupsRes?.payload?.items)
      ? groupsRes.payload.items
      : Array.isArray(groupsRes?.payload)
        ? groupsRes.payload
        : [];
    if (getActiveInnerTab() === 'logs') {
      await loadLogs();
    }
  } finally {
    loading.value = false;
  }
}

async function loadLogs() {
  if (!accountIdNumber.value) {
    return;
  }
  loading.value = true;
  try {
    const res = await getAccountStrategyLogs(accountIdNumber.value, {
      strategy_category: activeCategoryTab.value,
      ...logFilters,
      page: logPagination.page,
      page_size: logPagination.pageSize,
    });
    logs.total = res.payload?.total || 0;
    logs.items = res.payload?.items || [];
  } finally {
    loading.value = false;
  }
}

async function handleAutomationToggle(value) {
  saving.value = true;
  try {
    const res = await toggleAccountStrategySettings(accountIdNumber.value, { automation_enabled: value });
    Object.assign(settings, res.payload || {});
    ElMessage.success(value ? '账号自动化已开启' : '账号自动化已关闭');
  } finally {
    saving.value = false;
  }
}

function openCreateDialog(category = CATEGORY_OPTIONS[0].value) {
  bindingDialog.visible = true;
  bindingDialog.mode = 'create';
  bindingDialog.bindingId = null;
  bindingDialog.selectedCategory = category;
  bindingForm.strategy_id = undefined;
  bindingForm.enabled = true;
  bindingForm.account_override_json_text = '';
}

function openEditDialog(binding) {
  bindingDialog.visible = true;
  bindingDialog.mode = 'edit';
  bindingDialog.bindingId = binding.id;
  bindingDialog.selectedCategory = binding.strategy_category;
  bindingForm.strategy_id = binding.strategy_id;
  bindingForm.enabled = binding.enabled;
  bindingForm.account_override_json_text = binding.account_override_json ? JSON.stringify(binding.account_override_json, null, 2) : '';
}

function parseOverrideJson() {
  if (!showBindingOverrideJson.value) {
    return null;
  }
  const text = (bindingForm.account_override_json_text || '').trim();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('覆盖配置 JSON 格式不正确');
  }
}

async function submitBinding() {
  if (!accountIdNumber.value) {
    return;
  }
  saving.value = true;
  try {
    const account_override_json = parseOverrideJson();
    if (bindingDialog.mode === 'create') {
      if (!bindingForm.strategy_id) {
        throw new Error('请选择要绑定的执行策略');
      }
      await createAccountStrategyBinding(accountIdNumber.value, {
        strategy_id: bindingForm.strategy_id,
        enabled: bindingForm.enabled,
        account_override_json,
      });
      ElMessage.success('策略绑定成功');
    } else {
      await updateAccountStrategyBinding(accountIdNumber.value, bindingDialog.bindingId, {
        enabled: bindingForm.enabled,
        account_override_json,
      });
      ElMessage.success('策略绑定已更新');
    }
    bindingDialog.visible = false;
    await loadAll();
  } catch (error) {
    ElMessage.error(error?.message || '保存策略绑定失败');
  } finally {
    saving.value = false;
  }
}

async function toggleBinding(binding, enabled) {
  savingBindingId.value = binding.id;
  try {
    await updateAccountStrategyBinding(accountIdNumber.value, binding.id, { enabled });
    binding.enabled = enabled;
    ElMessage.success(enabled ? '策略已启用' : '策略已停用');
  } finally {
    savingBindingId.value = null;
  }
}

function canMoveUp(items, index) {
  return index > 0;
}

function canMoveDown(items, index) {
  return index < items.length - 1;
}

async function moveBinding(items, index, direction) {
  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return;
  }
  const reordered = [...items];
  const [current] = reordered.splice(index, 1);
  reordered.splice(nextIndex, 0, current);
  saving.value = true;
  try {
    await reorderAccountStrategyBindings(
      accountIdNumber.value,
      reordered.map((item) => ({ id: item.id }))
    );
    ElMessage.success('策略优先级已更新');
    await loadAll();
  } finally {
    saving.value = false;
  }
}

async function removeBinding(binding) {
  await ElMessageBox.confirm(`确认解绑策略“${binding.strategy.strategy_name}”吗？`, '解绑确认', {
    type: 'warning',
  });
  await deleteAccountStrategyBinding(accountIdNumber.value, binding.id);
  ElMessage.success('策略已解绑');
  await loadAll();
}

async function runDebugDispatch() {
  saving.value = true;
  try {
    const res = await debugRunAccountStrategy(accountIdNumber.value);
    ElMessage.success(res.payload?.message || '调试触发完成');
    await loadAll();
    if (getActiveInnerTab() === 'logs') {
      await loadLogs();
    }
  } finally {
    saving.value = false;
  }
}

function resetLogFilters() {
  logFilters.result_code = '';
  logFilters.keyword = '';
  logPagination.page = 1;
  loadLogs();
}

function getModeLabel(mode) {
  return mode === 'BUILTIN' ? '内置' : '配置化';
}

function openStrategyUsagePage(strategy) {
  const strategyId = Number(strategy?.id || 0);
  if (!strategyId) {
    ElMessage.warning('当前策略缺少有效 ID，无法打开查看页');
    return;
  }
  const strategyName = strategy?.strategy_name || '策略查看';
  const path = `/trading-strategy/execution/usage?strategyId=${strategyId}`;
  addTab(path, `${strategyName}查看`);
  router.push(path);
}

function getCategoryLabel(category) {
  return CATEGORY_OPTIONS.find((item) => item.value === category)?.label || category;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    hour12: false,
  });
}

function normalizeMarketRegime(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'BEAR' || raw === '熊市') {
    return { key: 'bear', label: '熊市' };
  }
  if (raw === 'BULL' || raw === '牛市') {
    return { key: 'bull', label: '牛市' };
  }
  return { key: 'range', label: '震荡市' };
}

function normalizeRiskPercentValue(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num <= 0) {
    return 0;
  }
  return num <= 1 ? Number((num * 100).toFixed(2)) : num;
}

function formatMoney(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) {
    return '-';
  }
  return num.toFixed(2);
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function mergeConfig(baseValue, overrideValue) {
  if (Array.isArray(overrideValue)) {
    return [...overrideValue];
  }
  if (!isPlainObject(overrideValue)) {
    return overrideValue === undefined ? baseValue : overrideValue;
  }
  const result = isPlainObject(baseValue) ? { ...baseValue } : {};
  Object.keys(overrideValue).forEach((key) => {
    result[key] = mergeConfig(result[key], overrideValue[key]);
  });
  return result;
}

function getBindingEffectiveConfig(binding) {
  const strategyConfig = isPlainObject(binding?.strategy?.rule_config_json) ? binding.strategy.rule_config_json : {};
  const overrideConfig = isPlainObject(binding?.account_override_json) ? binding.account_override_json : {};
  return mergeConfig(strategyConfig, overrideConfig);
}

function getBoundGroups(binding) {
  if (binding?.strategy_category !== 'OPEN_POSITION') {
    return [];
  }
  const config = getBindingEffectiveConfig(binding);
  const groupIds = Array.isArray(config?.universe?.group_ids) ? config.universe.group_ids : [];
  return groupIds
    .map((groupId) => {
      const normalizedId = Number(groupId);
      if (!normalizedId) {
        return null;
      }
      return {
        id: normalizedId,
        name: userGroupNameMap.value.get(normalizedId) || `分组#${normalizedId}`,
      };
    })
    .filter(Boolean);
}

function openGroupStocksPage(group) {
  const groupId = Number(group?.id || 0);
  if (!groupId) {
    ElMessage.warning('当前分组缺少有效 ID，无法打开股票列表');
    return;
  }
  const resolvedRoute = router.resolve({
    path: '/stock-pool/self-selected',
    query: {
      groupId: String(groupId),
    },
  });
  window.open(resolvedRoute.href, '_blank', 'noopener');
}

function getRiskPreview(binding) {
  const strategyRisk = binding?.strategy?.rule_config_json?.risk || {};
  const overrideRisk = binding?.account_override_json?.risk || {};
  const risk = {
    ...strategyRisk,
    ...overrideRisk,
    max_holdings_by_market: {
      ...(strategyRisk.max_holdings_by_market || {}),
      ...(overrideRisk.max_holdings_by_market || {}),
    },
  };
  const marketRegime = normalizeMarketRegime(risk.current_market_regime);
  const maxHoldingsByMarket = risk.max_holdings_by_market || {};
  const maxHoldings = Number(maxHoldingsByMarket[marketRegime.key] ?? 0);
  const bullMaxHoldings = Number(maxHoldingsByMarket.bull ?? 0);
  const reservedTSlotCount = Number(risk.reserved_t_slot_count ?? 0);
  const totalSlots = Math.max(bullMaxHoldings + reservedTSlotCount, 0);
  const totalAsset = Number(props.accountTotalAsset ?? 0);
  const slotAmount = totalSlots > 0 && Number.isFinite(totalAsset) ? totalAsset / totalSlots : 0;
  return {
    marketRegimeLabel: marketRegime.label,
    maxHoldings,
    totalSlots,
    slotAmountText: totalSlots > 0 ? formatMoney(slotAmount) : '-',
    maxFloatingLossPercentText: `${normalizeRiskPercentValue(risk.max_floating_loss_ratio)}%`,
  };
}

function getCoordinationSummary(logRow) {
  return logRow?.coordination_summary || logRow?.config_snapshot_json?.coordination_summary || null;
}

function getCoordinationWarnings(logRow) {
  const warnings = getCoordinationSummary(logRow)?.warnings;
  return Array.isArray(warnings) ? warnings.filter(Boolean) : [];
}

function getCoordinationStateLabel(riskState) {
  const mapping = {
    FORCE_CLOSE_TRIGGERED: '强制降风险',
    MAX_HOLDINGS_REACHED: '满仓边界',
    PASSED: '风控通过',
  };
  return mapping[String(riskState || '').trim().toUpperCase()] || '协同快照';
}

function getCoordinationStateTagType(riskState) {
  const normalized = String(riskState || '').trim().toUpperCase();
  if (normalized === 'FORCE_CLOSE_TRIGGERED') {
    return 'danger';
  }
  if (normalized === 'MAX_HOLDINGS_REACHED') {
    return 'warning';
  }
  if (normalized === 'PASSED') {
    return 'success';
  }
  return 'info';
}

function formatCoordinationValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return value;
}

function formatCoordinationBudget(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return '-';
  }
  return formatMoney(num);
}
</script>

<style scoped>
.strategy-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.strategy-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-card {
  min-width: 220px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f5f7fa;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-card.muted {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.toolbar-label {
  color: #606266;
  font-size: 13px;
}

.strategy-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.strategy-group-card {
  border-radius: 14px;
}

.group-card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.risk-preview-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #606266;
  font-size: 12px;
}

.bound-group-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bound-group-tag {
  cursor: pointer;
}

.coordination-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #606266;
  font-size: 12px;
}

.reason-cell {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

.coordination-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.coordination-metrics {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.coordination-warnings {
  color: #8c6c1c;
  line-height: 1.5;
}

.strategy-name-link {
  padding: 0;
  font-weight: 600;
}

.group-card-header h3 {
  margin: 0;
  font-size: 16px;
}

.group-card-header p {
  margin: 6px 0 0;
  color: #909399;
  font-size: 13px;
}

.log-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-input {
  width: 220px;
}

.toolbar-select {
  width: 180px;
}

.table-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.full-width {
  width: 100%;
}

@media (max-width: 768px) {
  .strategy-toolbar,
  .toolbar-left,
  .log-toolbar {
    flex-direction: column;
  }

  .toolbar-input,
  .toolbar-select,
  .toolbar-card {
    width: 100%;
  }
}
</style>
