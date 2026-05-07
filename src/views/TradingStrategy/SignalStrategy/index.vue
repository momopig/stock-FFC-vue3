<template>
  <div class="signal-strategy-page">
    <div class="page-header">
      <div>
        <h2>买卖信号策略管理</h2>
        <p>统一查看内置信号模板，并维护可供业务直接引用的信号策略实例。</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新建实例</el-button>
    </div>

    <el-tabs v-model="activeTab" class="content-tabs">
      <el-tab-pane label="模板管理" name="templates">
        <el-card shadow="never" class="filter-card">
          <div class="filter-row">
            <el-select v-model="templateFilters.usage_scope" clearable placeholder="用途范围" class="filter-item">
              <el-option v-for="item in usageScopeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select v-model="templateFilters.is_enabled" clearable placeholder="启用状态" class="filter-item">
              <el-option label="启用" :value="true" />
              <el-option label="停用" :value="false" />
            </el-select>
            <el-button type="primary" @click="loadTemplates">查询</el-button>
            <el-button @click="resetTemplateFilters">重置</el-button>
          </div>
        </el-card>

        <el-card shadow="never">
          <el-table :data="templates" v-loading="templateLoading" border>
            <el-table-column prop="display_name" label="模板名称" min-width="160" />
            <el-table-column prop="template_code" label="模板编码" min-width="180" />
            <el-table-column label="用途" width="120">
              <template #default="scope">
                <el-tag size="small" :type="getUsageScopeTagType(scope.row.usage_scope)">
                  {{ getUsageScopeLabel(scope.row.usage_scope) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag size="small" :type="scope.row.is_enabled ? 'success' : 'info'">
                  {{ scope.row.is_enabled ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="规则说明" min-width="260" show-overflow-tooltip />
            <el-table-column label="参数摘要" min-width="320">
              <template #default="scope">
                <div class="field-summary">
                  <el-tag v-for="field in scope.row.params_schema?.fields || []" :key="field.path" size="small" effect="plain">
                    {{ field.label }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="实例管理" name="instances">
        <el-card shadow="never" class="filter-card">
          <div class="filter-row filter-row-wrap">
            <el-input v-model="instanceFilters.instance_name" clearable placeholder="实例名称" class="filter-item filter-keyword" @keyup.enter="loadInstances" />
            <el-select v-model="instanceFilters.template_code" clearable filterable placeholder="模板编码" class="filter-item">
              <el-option v-for="item in templates" :key="item.template_code" :label="`${item.display_name} (${item.template_code})`" :value="item.template_code" />
            </el-select>
            <el-select v-model="instanceFilters.usage_scope" clearable placeholder="用途范围" class="filter-item">
              <el-option v-for="item in usageScopeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select v-model="instanceFilters.is_enabled" clearable placeholder="启用状态" class="filter-item">
              <el-option label="启用" :value="true" />
              <el-option label="停用" :value="false" />
            </el-select>
            <el-button type="primary" @click="handleInstanceSearch">查询</el-button>
            <el-button @click="resetInstanceFilters">重置</el-button>
          </div>
        </el-card>

        <el-card shadow="never">
          <el-table :data="instances.items" v-loading="instanceLoading" border>
            <el-table-column prop="instance_name" label="实例名称" min-width="180" />
            <el-table-column label="模板" min-width="220">
              <template #default="scope">
                <div>{{ scope.row.template_name }}</div>
                <div class="muted-text">{{ scope.row.template_code }}</div>
              </template>
            </el-table-column>
            <el-table-column label="用途" width="120">
              <template #default="scope">
                <el-tag size="small" :type="getUsageScopeTagType(scope.row.usage_scope)">
                  {{ getUsageScopeLabel(scope.row.usage_scope) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-switch
                  :model-value="scope.row.is_enabled"
                  inline-prompt
                  active-text="启用"
                  inactive-text="停用"
                  @change="handleToggleInstance(scope.row, $event)"
                />
              </template>
            </el-table-column>
            <el-table-column label="参数预览" min-width="280">
              <template #default="scope">
                <div class="param-preview-list">
                  <div v-for="(value, key) in scope.row.params_value" :key="key">{{ key }}: {{ formatParamValue(value) }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="更新时间" min-width="180">
              <template #default="scope">{{ formatDateTime(scope.row.updated_at) }}</template>
            </el-table-column>
            <el-table-column label="备注" min-width="220" show-overflow-tooltip>
              <template #default="scope">{{ scope.row.remark || '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" min-width="220" fixed="right">
              <template #default="scope">
                <el-space wrap>
                  <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
                  <el-button link @click="openDetailDialog(scope.row)">详情</el-button>
                  <el-button link type="danger" @click="handleDeleteInstance(scope.row)">删除</el-button>
                </el-space>
              </template>
            </el-table-column>
          </el-table>

          <div class="table-pagination">
            <el-pagination
              v-model:current-page="instancePagination.page"
              v-model:page-size="instancePagination.page_size"
              background
              layout="total, sizes, prev, pager, next"
              :page-sizes="[10, 20, 50, 100]"
              :total="instances.total"
              @current-change="loadInstances"
              @size-change="handlePageSizeChange"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="instanceDialog.visible" :title="instanceDialog.mode === 'create' ? '新建信号策略实例' : '编辑信号策略实例'" width="760px">
      <el-form ref="instanceFormRef" :model="instanceForm" :rules="instanceFormRules" label-width="120px">
        <el-form-item label="实例名称" prop="instance_name">
          <el-input v-model="instanceForm.instance_name" maxlength="100" />
        </el-form-item>
        <el-form-item label="模板" prop="template_code">
          <el-select v-model="instanceForm.template_code" filterable class="full-width" :disabled="instanceDialog.mode === 'edit'" @change="handleTemplateChange">
            <el-option v-for="item in enabledTemplates" :key="item.template_code" :label="`${item.display_name} (${item.template_code})`" :value="item.template_code" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="currentTemplate" label="用途">
          <el-tag :type="getUsageScopeTagType(currentTemplate.usage_scope)">{{ getUsageScopeLabel(currentTemplate.usage_scope) }}</el-tag>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="instanceForm.is_enabled" inline-prompt active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="参数配置" required>
          <div v-if="currentTemplate" class="template-config-panel full-width">
            <div class="template-description">{{ currentTemplate.description }}</div>
            <div class="dynamic-field-grid">
              <div v-for="field in currentTemplate.params_schema?.fields || []" :key="field.path" class="dynamic-field-item">
                <label class="dynamic-field-label">{{ field.label }}</label>
                <el-input-number
                  v-if="field.component === 'number' || field.component === 'integer'"
                  :model-value="instanceForm.params_value[field.path]"
                  class="full-width"
                  controls-position="right"
                  :step="field.step || 1"
                  :min="field.min"
                  :max="field.max"
                  :precision="field.component === 'number' ? field.precision : 0"
                  @update:model-value="setParamValue(field.path, $event)"
                />
                <el-switch
                  v-else-if="field.component === 'boolean'"
                  :model-value="Boolean(instanceForm.params_value[field.path])"
                  inline-prompt
                  active-text="是"
                  inactive-text="否"
                  @update:model-value="setParamValue(field.path, $event)"
                />
                <el-select
                  v-else-if="field.component === 'select'"
                  :model-value="instanceForm.params_value[field.path]"
                  class="full-width"
                  @update:model-value="setParamValue(field.path, $event)"
                >
                  <el-option v-for="option in field.options || []" :key="option.value" :label="option.label" :value="option.value" />
                </el-select>
                <el-input
                  v-else
                  :model-value="normalizeInputValue(instanceForm.params_value[field.path], field.component)"
                  class="full-width"
                  :type="field.component === 'textarea' || field.component === 'string-array' ? 'textarea' : 'text'"
                  :rows="field.component === 'textarea' || field.component === 'string-array' ? 3 : undefined"
                  :placeholder="field.placeholder || field.description || ''"
                  @input="setParamValue(field.path, $event, field.component)"
                />
                <div v-if="field.description" class="field-help-text">{{ field.description }}</div>
              </div>
            </div>
          </div>
          <el-empty v-else description="请先选择模板" :image-size="72" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="instanceForm.remark" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="instanceDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="instanceSubmitting" @click="submitInstance">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialog.visible" title="实例详情" width="680px">
      <template v-if="detailDialog.data">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="实例名称">{{ detailDialog.data.instance_name }}</el-descriptions-item>
          <el-descriptions-item label="模板名称">{{ detailDialog.data.template_name }}</el-descriptions-item>
          <el-descriptions-item label="模板编码">{{ detailDialog.data.template_code }}</el-descriptions-item>
          <el-descriptions-item label="用途">{{ getUsageScopeLabel(detailDialog.data.usage_scope) }}</el-descriptions-item>
          <el-descriptions-item label="启用状态">{{ detailDialog.data.is_enabled ? '启用' : '停用' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(detailDialog.data.updated_at) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailDialog.data.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-card shadow="never" class="detail-card">
          <template #header>参数详情</template>
          <div class="param-preview-list">
            <div v-for="(value, key) in detailDialog.data.params_value" :key="key">{{ key }}: {{ formatParamValue(value) }}</div>
          </div>
        </el-card>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createSignalStrategyInstance,
  deleteSignalStrategyInstance,
  getSignalStrategyInstances,
  getSignalStrategyTemplates,
  toggleSignalStrategyInstance,
  updateSignalStrategyInstance,
} from '@/api/modules/signalStrategy';

const activeTab = ref('templates');
const templateLoading = ref(false);
const instanceLoading = ref(false);
const instanceSubmitting = ref(false);
const instanceFormRef = ref(null);

const templates = ref([]);
const instances = reactive({ total: 0, items: [] });

const templateFilters = reactive({ usage_scope: '', is_enabled: undefined });
const instanceFilters = reactive({ instance_name: '', template_code: '', usage_scope: '', is_enabled: undefined });
const instancePagination = reactive({ page: 1, page_size: 10 });

const instanceDialog = reactive({ visible: false, mode: 'create', instanceId: null });
const detailDialog = reactive({ visible: false, data: null });
const instanceForm = reactive(createInitialInstanceForm());

const usageScopeOptions = [
  { value: 'buy', label: '买入' },
  { value: 'sell', label: '卖出' },
  { value: 'both', label: '买卖通用' },
];

const enabledTemplates = computed(() => templates.value.filter((item) => item.is_enabled));
const currentTemplate = computed(() => templates.value.find((item) => item.template_code === instanceForm.template_code) || null);

const instanceFormRules = {
  instance_name: [{ required: true, message: '请输入实例名称', trigger: 'blur' }],
  template_code: [{ required: true, message: '请选择模板', trigger: 'change' }],
};

onMounted(async () => {
  await loadTemplates();
  await loadInstances();
});

async function loadTemplates() {
  templateLoading.value = true;
  try {
    const res = await getSignalStrategyTemplates(compactParams(templateFilters));
    templates.value = res?.payload?.items || [];
  } catch (error) {
    ElMessage.error(error.message || '加载模板失败');
  } finally {
    templateLoading.value = false;
  }
}

async function loadInstances() {
  instanceLoading.value = true;
  try {
    const res = await getSignalStrategyInstances(
      compactParams({
        ...instanceFilters,
        page: instancePagination.page,
        page_size: instancePagination.page_size,
      })
    );
    const payload = res?.payload || {};
    instances.total = payload.total || 0;
    instances.items = payload.items || [];
  } catch (error) {
    ElMessage.error(error.message || '加载实例失败');
  } finally {
    instanceLoading.value = false;
  }
}

function resetTemplateFilters() {
  templateFilters.usage_scope = '';
  templateFilters.is_enabled = undefined;
  loadTemplates();
}

function resetInstanceFilters() {
  instanceFilters.instance_name = '';
  instanceFilters.template_code = '';
  instanceFilters.usage_scope = '';
  instanceFilters.is_enabled = undefined;
  instancePagination.page = 1;
  loadInstances();
}

function handleInstanceSearch() {
  instancePagination.page = 1;
  loadInstances();
}

function handlePageSizeChange() {
  instancePagination.page = 1;
  loadInstances();
}

function openCreateDialog() {
  instanceDialog.visible = true;
  instanceDialog.mode = 'create';
  instanceDialog.instanceId = null;
  Object.assign(instanceForm, createInitialInstanceForm());
  if (enabledTemplates.value.length) {
    instanceForm.template_code = enabledTemplates.value[0].template_code;
    applyTemplateDefaults();
  }
}

function openEditDialog(row) {
  instanceDialog.visible = true;
  instanceDialog.mode = 'edit';
  instanceDialog.instanceId = row.id;
  Object.assign(instanceForm, createInitialInstanceForm(), {
    instance_name: row.instance_name,
    template_code: row.template_code,
    is_enabled: row.is_enabled,
    remark: row.remark || '',
    params_value: { ...(row.params_value || {}) },
  });
  applyTemplateDefaults(false);
}

function openDetailDialog(row) {
  detailDialog.visible = true;
  detailDialog.data = row;
}

function handleTemplateChange() {
  applyTemplateDefaults();
}

function applyTemplateDefaults(overwriteExisting = true) {
  const template = currentTemplate.value;
  if (!template) {
    instanceForm.params_value = {};
    return;
  }
  const nextValue = overwriteExisting ? {} : { ...(instanceForm.params_value || {}) };
  (template.params_schema?.fields || []).forEach((field) => {
    if (overwriteExisting || nextValue[field.path] === undefined) {
      nextValue[field.path] = cloneFieldDefault(field.default, field.component);
    }
  });
  instanceForm.params_value = nextValue;
}

function setParamValue(path, value, component = 'string') {
  if (component === 'string-array') {
    instanceForm.params_value = {
      ...instanceForm.params_value,
      [path]: String(value || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    };
    return;
  }
  instanceForm.params_value = {
    ...instanceForm.params_value,
    [path]: value,
  };
}

async function submitInstance() {
  if (!instanceFormRef.value) {
    return;
  }
  try {
    await instanceFormRef.value.validate();
  } catch {
    return;
  }

  if (!currentTemplate.value) {
    ElMessage.warning('请选择模板');
    return;
  }

  instanceSubmitting.value = true;
  try {
    const payload = {
      instance_name: instanceForm.instance_name.trim(),
      template_code: instanceForm.template_code,
      params_value: normalizeParamsForSubmit(currentTemplate.value, instanceForm.params_value),
      remark: instanceForm.remark || null,
      is_enabled: instanceForm.is_enabled,
    };
    if (instanceDialog.mode === 'create') {
      await createSignalStrategyInstance(payload);
      ElMessage.success('实例创建成功');
    } else {
      await updateSignalStrategyInstance(instanceDialog.instanceId, payload);
      ElMessage.success('实例更新成功');
    }
    instanceDialog.visible = false;
    await loadInstances();
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    instanceSubmitting.value = false;
  }
}

async function handleToggleInstance(row, value) {
  try {
    await toggleSignalStrategyInstance(row.id, value);
    row.is_enabled = value;
    ElMessage.success(value ? '已启用' : '已停用');
  } catch (error) {
    row.is_enabled = !value;
    ElMessage.error(error.message || '状态切换失败');
    await loadInstances();
  }
}

async function handleDeleteInstance(row) {
  try {
    await ElMessageBox.confirm(`确认删除实例“${row.instance_name}”吗？`, '删除确认', {
      type: 'warning',
    });
  } catch {
    return;
  }
  try {
    await deleteSignalStrategyInstance(row.id);
    ElMessage.success('实例已删除');
    await loadInstances();
  } catch (error) {
    ElMessage.error(error.message || '删除失败');
  }
}

function getUsageScopeLabel(value) {
  return usageScopeOptions.find((item) => item.value === value)?.label || value || '-';
}

function getUsageScopeTagType(value) {
  if (value === 'buy') {
    return 'success';
  }
  if (value === 'sell') {
    return 'danger';
  }
  return 'warning';
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatParamValue(value) {
  if (Array.isArray(value)) {
    return value.join('、');
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  return value ?? '-';
}

function normalizeInputValue(value, component) {
  if (component === 'string-array') {
    return Array.isArray(value) ? value.join('\n') : '';
  }
  return value ?? '';
}

function normalizeParamsForSubmit(template, paramsValue) {
  const nextValue = {};
  (template.params_schema?.fields || []).forEach((field) => {
    const rawValue = paramsValue[field.path];
    if (field.component === 'integer') {
      nextValue[field.path] = Number.parseInt(rawValue, 10);
      return;
    }
    if (field.component === 'number') {
      nextValue[field.path] = Number(rawValue);
      return;
    }
    nextValue[field.path] = rawValue;
  });
  return nextValue;
}

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );
}

function cloneFieldDefault(value, component) {
  if (component === 'string-array') {
    return Array.isArray(value) ? [...value] : [];
  }
  if (Array.isArray(value)) {
    return [...value];
  }
  if (value && typeof value === 'object') {
    return { ...value };
  }
  return value;
}

function createInitialInstanceForm() {
  return {
    instance_name: '',
    template_code: '',
    params_value: {},
    remark: '',
    is_enabled: true,
  };
}
</script>

<style scoped>
.signal-strategy-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.content-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-row-wrap {
  flex-wrap: wrap;
}

.filter-item {
  width: 180px;
}

.filter-keyword {
  width: 240px;
}

.muted-text {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.field-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.param-preview-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #4b5563;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.template-config-panel {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  background: #fafafa;
}

.template-description {
  margin-bottom: 16px;
  color: #6b7280;
}

.dynamic-field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.dynamic-field-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dynamic-field-label {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.field-help-text {
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
}

.full-width {
  width: 100%;
}

.detail-card {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .signal-strategy-page {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-item,
  .filter-keyword {
    width: 100%;
  }

  .filter-row {
    flex-wrap: wrap;
  }
}
</style>
