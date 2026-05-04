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

    <el-tabs v-model="activeInnerTab">
      <el-tab-pane label="策略配置" name="config">
        <div class="strategy-groups">
          <el-card v-for="group in groupedBindings" :key="group.category" shadow="never" class="strategy-group-card">
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
              <el-table-column prop="strategy.strategy_name" label="策略名称" min-width="180" />
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
          <el-select v-model="logFilters.strategy_category" clearable placeholder="策略分类" class="toolbar-select">
            <el-option v-for="item in CATEGORY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-input v-model="logFilters.result_code" clearable placeholder="结果码" class="toolbar-input" />
          <el-input v-model="logFilters.keyword" clearable placeholder="策略名称/股票/原因" class="toolbar-input" />
          <el-button type="primary" @click="loadLogs">查询</el-button>
          <el-button @click="resetLogFilters">重置</el-button>
        </div>

        <el-table :data="logs.items" border>
          <el-table-column prop="strategy_name" label="策略名称" min-width="180" />
          <el-table-column label="分类" width="130">
            <template #default="scope">{{ getCategoryLabel(scope.row.strategy_category) }}</template>
          </el-table-column>
          <el-table-column prop="action_code" label="动作" width="160">
            <template #default="scope">{{ scope.row.action_code || '-' }}</template>
          </el-table-column>
          <el-table-column prop="result_code" label="结果" width="180" />
          <el-table-column prop="trigger_reason" label="原因" min-width="260">
            <template #default="scope">{{ scope.row.trigger_reason || scope.row.system_remark || '-' }}</template>
          </el-table-column>
          <el-table-column label="时间" min-width="180">
            <template #default="scope">{{ formatDateTime(scope.row.created_time) }}</template>
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
        <el-form-item label="覆盖配置 JSON">
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


const props = defineProps({
  accountId: {
    type: [Number, String],
    required: true,
  },
});

const CATEGORY_OPTIONS = [
  { value: 'ACCOUNT_RISK', label: '账号风控', description: '账号级风控门禁，优先于其他执行策略。' },
  { value: 'OPEN_POSITION', label: '建仓', description: '基于分组与买入监控信号执行建仓。' },
  { value: 'CLOSE_POSITION', label: '清仓', description: '围绕止盈、止损和趋势破坏执行清仓。' },
  { value: 'INTRADAY_T', label: '做T', description: '围绕底仓执行盘中高抛低吸。' },
];

const loading = ref(false);
const saving = ref(false);
const savingBindingId = ref(null);
const activeInnerTab = ref('config');
const availableStrategies = ref([]);
const bindings = ref([]);
const settings = reactive({
  automation_enabled: false,
  last_dispatch_status: '',
  last_dispatch_time: '',
});
const logs = reactive({ total: 0, items: [] });
const logFilters = reactive({ strategy_category: '', result_code: '', keyword: '' });
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
const selectableStrategies = computed(() => {
  const boundIds = new Set(bindings.value.map((item) => item.strategy_id));
  return availableStrategies.value.filter((item) => {
    if (bindingDialog.mode === 'edit' && bindingDialog.bindingId) {
      return item.strategy_category === bindingDialog.selectedCategory;
    }
    return item.strategy_category === bindingDialog.selectedCategory && !boundIds.has(item.id);
  });
});

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

watch(activeInnerTab, (value) => {
  if (value === 'logs') {
    loadLogs();
  }
});

async function loadAll() {
  if (!accountIdNumber.value) {
    return;
  }
  loading.value = true;
  try {
    const [settingsRes, bindingsRes, strategiesRes] = await Promise.all([
      getAccountStrategySettings(accountIdNumber.value),
      getAccountStrategyBindings(accountIdNumber.value),
      getExecutionStrategies({ page: 1, page_size: 200 }),
    ]);
    Object.assign(settings, settingsRes.payload || {});
    bindings.value = bindingsRes.payload?.items || [];
    availableStrategies.value = strategiesRes.payload?.items || [];
    if (activeInnerTab.value === 'logs') {
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
    if (activeInnerTab.value === 'logs') {
      await loadLogs();
    }
  } finally {
    saving.value = false;
  }
}

function resetLogFilters() {
  logFilters.strategy_category = '';
  logFilters.result_code = '';
  logFilters.keyword = '';
  logPagination.page = 1;
  loadLogs();
}

function getModeLabel(mode) {
  return mode === 'BUILTIN' ? '内置' : '配置化';
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
