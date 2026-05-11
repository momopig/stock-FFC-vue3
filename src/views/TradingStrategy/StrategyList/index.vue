<template>
  <div class="strategy-list-page">
    <div class="page-header">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>{{ pageDescription }}</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">{{ createButtonText }}</el-button>
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
        <el-table-column label="股票分组" min-width="220">
          <template #default="scope">
            <div v-if="getStrategyGroupNames(scope.row).length" class="strategy-group-tags-cell">
              <el-tag
                v-for="groupName in getStrategyGroupNames(scope.row)"
                :key="`${scope.row.id}-${groupName}`"
                size="small"
              >
                {{ groupName }}
              </el-tag>
            </div>
            <span v-else>-</span>
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
      <el-form ref="strategyFormRef" :model="form" :rules="formRules" label-width="140px" class="strategy-form">
        <el-form-item label="策略编码" prop="strategy_code">
          <el-input v-model="form.strategy_code" :disabled="dialog.mode === 'edit'" placeholder="例如 EXEC_CUSTOM_OPEN_001" />
        </el-form-item>
        <el-form-item label="策略名称" prop="strategy_name">
          <el-input v-model="form.strategy_name" maxlength="128" :disabled="dialog.isBuiltin" />
        </el-form-item>
        <el-form-item label="策略分类" prop="strategy_category">
          <el-select v-model="form.strategy_category" :disabled="dialog.mode === 'edit'" class="full-width">
            <el-option v-for="item in CATEGORY_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="上游信号来源">
          <el-select v-model="form.signal_source" clearable filterable allow-create default-first-option class="full-width" placeholder="选择常见来源，或手动输入扩展来源" :disabled="dialog.isBuiltin">
            <el-option v-for="item in SIGNAL_SOURCE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <div class="field-help-text">
            用于说明这条策略主要消费哪类输入。当前阶段它主要是“策略说明字段”，帮助使用者理解策略依赖的上游信号，不直接决定执行结果。
          </div>
        </el-form-item>
        <el-form-item label="设计原理">
          <el-input v-model="form.design_principle" type="textarea" :rows="4" placeholder="说明该策略的核心思想、输入来源、决策逻辑和风险边界" :disabled="dialog.isBuiltin" />
        </el-form-item>
        <el-form-item label="默认启用">
          <el-switch v-model="form.enabled" inline-prompt active-text="启用" inactive-text="停用" :disabled="dialog.mode === 'edit'" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" :disabled="dialog.isBuiltin" />
        </el-form-item>
        <el-form-item v-if="currentSignalStrategyBindingPath" label="绑定信号策略" required>
          <div class="full-width signal-binding-panel">
            <el-select
              :model-value="getBoundSignalStrategyIds()"
              multiple
              filterable
              clearable
              collapse-tags
              collapse-tags-tooltip
              class="full-width"
              :loading="signalStrategyLoading"
              :placeholder="currentSignalStrategyUsageScope === 'buy' ? '选择买入信号策略实例' : '选择卖出信号策略实例'"
              @change="handleBoundSignalStrategiesChange"
            >
              <el-option
                v-for="item in currentSignalStrategyOptions"
                :key="item.id"
                :label="`${item.instance_name} (${item.template_name})`"
                :value="item.id"
              />
            </el-select>
            <div class="field-help-text signal-binding-help">
              {{ currentSignalStrategyUsageScope === 'buy' ? '建仓策略' : '清仓策略' }}将直接引用这里选中的信号策略实例。
              保存时后端会校验实例是否存在、是否启用，以及用途是否匹配。
            </div>
            <div v-if="isTailBreakCloseStrategy" class="field-help-text signal-binding-help emphasis-help">
              尾盘跌破N日均线清仓不再重复配置 N / 尾盘开始时间 / 最小持仓天数，统一复用这里绑定的“尾盘跌破N日均线未修复”卖点策略实例参数。
            </div>
          </div>
        </el-form-item>
        <el-form-item v-if="showStructuredOpenPositionConfig || (dialog.isBuiltin && currentBuiltinFields.length)" label="参数配置">
          <div class="builtin-config-panel full-width">
            <div class="field-help-text builtin-config-help">
              内置策略的代码逻辑保持内置，但参数支持在线调整。当前已按后端提供的字段描述渲染 GUI 表单；如果后续新增字段，只需在后端注册表补充表单描述即可自动透出。
            </div>
            <div v-if="isConfigurableOpenPositionStrategy" class="field-help-text builtin-config-help">
              配置化建仓策略也支持这里的结构化配置，保存时会自动写回规则 JSON。
            </div>
            <div v-if="isConfigurableOpenPositionStrategy" class="field-help-text builtin-config-help">
              单次建仓仓位表示本策略期望使用的现金比例；实际下单金额还会再受账号风控策略的单份预算上限约束，系统最终按两者中更严格的一边执行。
            </div>
            <div v-if="isAccountRiskSlotStrategy" class="field-help-text builtin-config-help emphasis-help">
              持仓个股最大可接受浮亏比例默认按百分比输入，例如 2 表示 2%，历史配置中的 0.02 会在前端自动换算显示为 2。
            </div>
            <div v-if="isAccountRiskSlotStrategy" class="field-help-text builtin-config-help">
              股票最大持仓个数会自动保持“熊市 ≤ 震荡市 ≤ 牛市”的关系，避免提交时被后端校验拒绝。
            </div>
            <div v-if="showStructuredOpenPositionConfig" class="builtin-config-sections">
              <section v-for="section in openPositionBuiltinSections" :key="section.key" class="builtin-config-section">
                <div class="builtin-config-section__header">
                  <div>
                    <h4>{{ section.title }}</h4>
                    <p>{{ section.description }}</p>
                  </div>
                </div>
                <div class="builtin-config-grid">
                  <div v-for="field in section.fields" :key="field.path" class="builtin-config-item">
                    <label class="builtin-config-label">{{ field.label }}</label>
                    <el-input-number
                      v-if="field.component === 'number' || field.component === 'integer'"
                      :model-value="getBuiltinFieldValue(field)"
                      class="full-width"
                      controls-position="right"
                      :min="field.min"
                      :max="field.max"
                      :step="field.step || 1"
                      :precision="field.component === 'number' ? field.precision : 0"
                      @update:model-value="setBuiltinFieldValue(field, $event)"
                    />
                    <el-switch
                      v-else-if="field.component === 'boolean'"
                      :model-value="Boolean(getBuiltinFieldValue(field))"
                      inline-prompt
                      active-text="是"
                      inactive-text="否"
                      @update:model-value="setBuiltinFieldValue(field, $event)"
                    />
                    <el-select
                      v-else-if="field.component === 'select'"
                      :model-value="getBuiltinFieldValue(field)"
                      class="full-width"
                      @update:model-value="setBuiltinFieldValue(field, $event)"
                    >
                      <el-option v-for="option in getBuiltinFieldOptions(field)" :key="option.value" :label="option.label" :value="option.value" />
                    </el-select>
                    <el-select
                      v-else-if="field.component === 'multi-select'"
                      :model-value="normalizeBuiltinMultiSelectValue(field)"
                      class="full-width"
                      multiple
                      filterable
                      clearable
                      collapse-tags
                      collapse-tags-tooltip
                      :loading="groupOptionsLoading"
                      @update:model-value="setBuiltinFieldValue(field, $event)"
                    >
                      <el-option v-for="option in getBuiltinFieldOptions(field)" :key="option.value" :label="option.label" :value="option.value" />
                    </el-select>
                    <el-date-picker
                      v-else-if="field.component === 'date'"
                      :model-value="getBuiltinFieldValue(field) || ''"
                      class="full-width"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="请选择日期"
                      @update:model-value="setBuiltinFieldValue(field, $event || null)"
                    />
                    <el-input
                      v-else
                      :model-value="formatBuiltinFieldValue(field)"
                      class="full-width"
                      :type="field.component === 'textarea' || field.component === 'string-array' ? 'textarea' : 'text'"
                      :rows="field.component === 'textarea' || field.component === 'string-array' ? 3 : undefined"
                      :placeholder="field.placeholder || ''"
                      @input="setBuiltinFieldValue(field, $event)"
                    />
                  </div>
                </div>
              </section>
            </div>
            <div v-else class="builtin-config-grid">
              <div v-for="field in currentBuiltinFields" :key="field.path" class="builtin-config-item">
                <label class="builtin-config-label">{{ field.label }}</label>
                <el-input-number
                  v-if="field.component === 'number' || field.component === 'integer'"
                  :model-value="getBuiltinFieldValue(field)"
                  class="full-width"
                  controls-position="right"
                  :min="field.min"
                  :max="field.max"
                  :step="field.step || 1"
                  :precision="field.component === 'number' ? field.precision : 0"
                  @update:model-value="setBuiltinFieldValue(field, $event)"
                />
                <el-switch
                  v-else-if="field.component === 'boolean'"
                  :model-value="Boolean(getBuiltinFieldValue(field))"
                  inline-prompt
                  active-text="是"
                  inactive-text="否"
                  @update:model-value="setBuiltinFieldValue(field, $event)"
                />
                <el-select
                  v-else-if="field.component === 'select'"
                  :model-value="getBuiltinFieldValue(field)"
                  class="full-width"
                  @update:model-value="setBuiltinFieldValue(field, $event)"
                >
                  <el-option v-for="option in getBuiltinFieldOptions(field)" :key="option.value" :label="option.label" :value="option.value" />
                </el-select>
                <el-select
                  v-else-if="field.component === 'multi-select'"
                  :model-value="normalizeBuiltinMultiSelectValue(field)"
                  class="full-width"
                  multiple
                  filterable
                  clearable
                  collapse-tags
                  collapse-tags-tooltip
                  :loading="groupOptionsLoading"
                  @update:model-value="setBuiltinFieldValue(field, $event)"
                >
                  <el-option v-for="option in getBuiltinFieldOptions(field)" :key="option.value" :label="option.label" :value="option.value" />
                </el-select>
                <el-date-picker
                  v-else-if="field.component === 'date'"
                  :model-value="getBuiltinFieldValue(field) || ''"
                  class="full-width"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="请选择日期"
                  @update:model-value="setBuiltinFieldValue(field, $event || null)"
                />
                <el-input
                  v-else
                  :model-value="formatBuiltinFieldValue(field)"
                  class="full-width"
                  :type="field.component === 'textarea' || field.component === 'string-array' ? 'textarea' : 'text'"
                  :rows="field.component === 'textarea' || field.component === 'string-array' ? 3 : undefined"
                  :placeholder="field.placeholder || ''"
                  @input="setBuiltinFieldValue(field, $event)"
                />
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item v-if="dialog.isBuiltin && isAccountRiskSlotStrategy" label="风控预览">
          <div class="builtin-preview-panel full-width">
            <div class="builtin-preview-card">
              <span>当前市场环境</span>
              <strong>{{ riskPreview.marketRegimeLabel }}</strong>
            </div>
            <div class="builtin-preview-card">
              <span>当前最大可持股数</span>
              <strong>{{ riskPreview.maxHoldings }}</strong>
            </div>
            <div class="builtin-preview-card">
              <span>当前总分块数</span>
              <small class="builtin-preview-subtitle">M + N</small>
              <strong>{{ riskPreview.totalSlots }}</strong>
            </div>
            <div class="builtin-preview-card">
              <span>浮亏阈值</span>
              <strong>{{ riskPreview.maxFloatingLossPercentText }}</strong>
            </div>
          </div>
        </el-form-item>
        <el-form-item v-if="!hideRuleConfigEditor" :label="dialog.isBuiltin ? '参数 JSON（高级）' : '规则 JSON'" prop="rule_config_json_text">
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
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';

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
import { getSignalStrategyOptions } from '@/api/modules/signalStrategy';
import { getUserGroups } from '@/api/modules/stockGroup';
import { useTabsStore } from '@/composables/useTabsStore';


const route = useRoute();
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

const CONFIGURABLE_OPEN_POSITION_FIELDS = [
  { path: 'universe.group_ids', label: '允许分组', component: 'multi-select', options: [] },
  { path: 'universe.stock_codes', label: '指定股票池', component: 'string-array', placeholder: '如 000001.SZ,600000.SH' },
  { path: 'order.position_ratio', label: '单次建仓仓位', component: 'number', min: 0.01, max: 1, step: 0.01, precision: 2 },
  { path: 'order.max_symbol_count', label: '股票最大持仓个数', component: 'integer', min: 1, max: 50, step: 1 },
  { path: 'order.order_type', label: '委托类型', component: 'select', options: [{ label: '限价单', value: 'LIMIT' }, { label: '市价单', value: 'MARKET' }] },
  { path: 'schedule.min_interval_seconds', label: '最小执行间隔(秒)', component: 'integer', min: 0, max: 86400, step: 1 },
  { path: 'schedule.time_windows', label: '允许交易时段', component: 'string-array', placeholder: '如 09:30-10:30,13:00-14:30' },
  { path: 'schedule.start_date', label: '允许开始日期', component: 'date' },
  { path: 'schedule.end_date', label: '允许结束日期', component: 'date' },
];

const loading = ref(false);
const submitting = ref(false);
const signalStrategyLoading = ref(false);
const groupOptionsLoading = ref(false);
const strategies = reactive({ total: 0, items: [] });
const filters = reactive({ strategy_category: '', enabled: undefined, keyword: '' });
const pagination = reactive({ page: 1, pageSize: 10 });
const signalStrategyOptions = reactive({ buy: [], sell: [] });
const builtinGroupOptions = ref([]);

const dialog = reactive({ visible: false, mode: 'create', strategyId: null, isBuiltin: false });
const form = reactive(createInitialForm());
const strategyFormRef = ref(null);
const routeStrategyCategoryPreset = computed(() => String(route.meta?.strategyCategoryPreset || ''));
const pageTitle = computed(() => String(route.meta?.executionMenuTitle || '执行策略管理'));
const pageDescription = computed(() => {
  if (routeStrategyCategoryPreset.value === 'ACCOUNT_RISK') {
    return '集中查看账号层面的仓位与风险控制策略，并管理其启停与配置。';
  }
  if (routeStrategyCategoryPreset.value === 'OPEN_POSITION') {
    return '集中查看建仓策略，并按分组、信号和时间约束管理建仓执行规则。';
  }
  if (routeStrategyCategoryPreset.value === 'CLOSE_POSITION') {
    return '集中查看清仓策略，并管理卖出执行条件、信号引用和触发方式。';
  }
  if (routeStrategyCategoryPreset.value === 'INTRADAY_T') {
    return '集中查看做T策略，并维护盘中高抛低吸相关的执行规则。';
  }
  return '从策略模板视角统一管理执行策略，并查看当前账号使用情况。';
});
const createButtonText = computed(() => {
  if (routeStrategyCategoryPreset.value === 'ACCOUNT_RISK') {
    return '新建仓位风控策略';
  }
  if (routeStrategyCategoryPreset.value === 'OPEN_POSITION') {
    return '新建建仓策略';
  }
  if (routeStrategyCategoryPreset.value === 'CLOSE_POSITION') {
    return '新建清仓策略';
  }
  if (routeStrategyCategoryPreset.value === 'INTRADAY_T') {
    return '新建做T策略';
  }
  return '新建执行策略';
});

const currentBuiltinFields = computed(() => form.config_form_schema?.fields || []);
const isAccountRiskSlotStrategy = computed(() => dialog.isBuiltin && form.strategy_code === 'EXEC_ACCOUNT_RISK_BASE');
const isOpenPositionBuiltinStrategy = computed(() => dialog.isBuiltin && form.strategy_code === 'EXEC_OPEN_POSITION_BASE');
const isTailBreakCloseStrategy = computed(() => dialog.isBuiltin && form.strategy_code === 'TAIL_BREAK_MA_SELL');
const currentEditableStrategyCategory = computed(() => {
  return form.strategy_category || '';
});
const isConfigurableOpenPositionStrategy = computed(() => !dialog.isBuiltin && currentEditableStrategyCategory.value === 'OPEN_POSITION');
const currentSignalStrategyBindingPath = computed(() => {
  if (currentEditableStrategyCategory.value === 'OPEN_POSITION') {
    return 'signal.entry_signal_strategy_ids';
  }
  if (currentEditableStrategyCategory.value === 'CLOSE_POSITION') {
    return 'signal.exit_signal_strategy_ids';
  }
  return '';
});
const currentSignalStrategyUsageScope = computed(() => {
  if (currentEditableStrategyCategory.value === 'OPEN_POSITION') {
    return 'buy';
  }
  if (currentEditableStrategyCategory.value === 'CLOSE_POSITION') {
    return 'sell';
  }
  return '';
});
const currentSignalStrategyOptions = computed(() => signalStrategyOptions[currentSignalStrategyUsageScope.value] || []);
const hideRuleConfigEditor = computed(() => isTailBreakCloseStrategy.value);
const openPositionConfigFields = computed(() => {
  if (isOpenPositionBuiltinStrategy.value) {
    return currentBuiltinFields.value || [];
  }
  if (isConfigurableOpenPositionStrategy.value) {
    return CONFIGURABLE_OPEN_POSITION_FIELDS;
  }
  return [];
});
const showStructuredOpenPositionConfig = computed(() => openPositionConfigFields.value.length > 0);
const openPositionBuiltinSections = computed(() => {
  if (!showStructuredOpenPositionConfig.value) {
    return [];
  }
  const fields = openPositionConfigFields.value || [];
  const sectionDefs = [
    {
      key: 'universe',
      title: '分组范围',
      description: '决定这条建仓策略从哪些分组和候选股票里挑选标的。',
      paths: ['universe.group_ids', 'universe.stock_codes'],
    },
    {
      key: 'order',
      title: '仓位执行',
      description: '控制单次建仓资金占比、最大持仓数量和委托类型。',
      paths: ['order.position_ratio', 'order.max_symbol_count', 'order.order_type'],
    },
    {
      key: 'schedule',
      title: '时间约束',
      description: '限制建仓允许执行的日期区间、时段和最小执行间隔。',
      paths: ['schedule.min_interval_seconds', 'schedule.time_windows', 'schedule.start_date', 'schedule.end_date'],
    },
  ];
  const usedPaths = new Set(sectionDefs.flatMap((item) => item.paths));
  const sections = sectionDefs
    .map((section) => ({
      ...section,
      fields: fields.filter((field) => section.paths.includes(field.path)),
    }))
    .filter((section) => section.fields.length > 0);
  const remainingFields = fields.filter((field) => !usedPaths.has(field.path));
  if (remainingFields.length > 0) {
    sections.push({
      key: 'others',
      title: '其他参数',
      description: '当前建仓策略扩展字段会统一放在这里，避免被隐藏。',
      fields: remainingFields,
    });
  }
  return sections;
});
const formRules = computed(() => ({
  strategy_code: [
    {
      validator: (_rule, value, callback) => {
        if (dialog.mode === 'edit') {
          callback();
          return;
        }
        if (!String(value || '').trim()) {
          callback(new Error('请输入策略编码'));
          return;
        }
        callback();
      },
      trigger: 'blur',
    },
  ],
  strategy_name: [
    {
      validator: (_rule, value, callback) => {
        if (dialog.isBuiltin) {
          callback();
          return;
        }
        if (!String(value || '').trim()) {
          callback(new Error('请输入策略名称'));
          return;
        }
        callback();
      },
      trigger: 'blur',
    },
  ],
  strategy_category: [{ required: true, message: '请选择策略分类', trigger: 'change' }],
  rule_config_json_text: [
    {
      validator: (_rule, value, callback) => {
        try {
          validateRuleConfigText(value);
          callback();
        } catch (error) {
          callback(error instanceof Error ? error : new Error('规则 JSON 校验失败'));
        }
      },
      trigger: 'blur',
    },
  ],
}));
const riskPreview = computed(() => {
  if (!isAccountRiskSlotStrategy.value) {
    return {
      marketRegimeLabel: '-',
      maxHoldings: '-',
      totalSlots: '-',
      maxFloatingLossPercentText: '-',
    };
  }
  const config = parseCurrentRuleConfig();
  const risk = config.risk || {};
  const marketRegime = normalizeMarketRegime(risk.current_market_regime);
  const maxHoldingsByMarket = risk.max_holdings_by_market || {};
  const maxHoldings = Number(maxHoldingsByMarket[marketRegime.key] ?? 0);
  const bullMaxHoldings = Number(maxHoldingsByMarket.bull ?? 0);
  const reservedTSlotCount = Number(risk.reserved_t_slot_count ?? 0);
  const totalSlots = Math.max(bullMaxHoldings + reservedTSlotCount, 0);
  return {
    marketRegimeLabel: marketRegime.label,
    maxHoldings,
    totalSlots,
    maxFloatingLossPercentText: `${formatRiskPercent(risk.max_floating_loss_ratio)}%`,
  };
});

onMounted(() => {
  applyRoutePreset();
  loadSignalStrategyOptions();
  loadGroupOptions();
});

watch(
  () => route.fullPath,
  () => {
    applyRoutePreset();
  }
);

function createInitialForm(strategyCategory = 'OPEN_POSITION') {
  return {
    strategy_code: '',
    strategy_name: '',
    strategy_category: strategyCategory,
    strategy_mode: 'CONFIGURABLE',
    signal_source: '',
    design_principle: '',
    remark: '',
    enabled: true,
    config_form_schema: null,
    rule_config_json_text: '{\n  "universe": {\n    "group_ids": [],\n    "stock_codes": []\n  },\n  "signal": {},\n  "order": {\n    "position_ratio": 0.2,\n    "max_symbol_count": 5,\n    "order_type": "LIMIT"\n  },\n  "schedule": {\n    "min_interval_seconds": 0,\n    "time_windows": [],\n    "start_date": null,\n    "end_date": null\n  }\n}',
  };
}

function resetForm() {
  Object.assign(form, createInitialForm(routeStrategyCategoryPreset.value || 'OPEN_POSITION'));
}

function applyRoutePreset() {
  filters.strategy_category = routeStrategyCategoryPreset.value || '';
  filters.enabled = undefined;
  filters.keyword = '';
  pagination.page = 1;
  loadStrategies();
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
  if (dialog.isBuiltin && form.strategy_code === 'EXEC_ACCOUNT_RISK_BASE') {
    ruleConfigJson = normalizeAccountRiskConfig(ruleConfigJson || {});
    validateAccountRiskConfig(ruleConfigJson);
    writeCurrentRuleConfig(ruleConfigJson);
  }
  if (dialog.isBuiltin) {
    return {
      rule_config_json: ruleConfigJson,
    };
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

function validateRequiredSignalStrategyBinding() {
  const bindingPath = currentSignalStrategyBindingPath.value;
  if (!bindingPath) {
    return;
  }
  const boundIds = getBoundSignalStrategyIds();
  if (!Array.isArray(boundIds) || !boundIds.length) {
    throw new Error(currentSignalStrategyUsageScope.value === 'buy' ? '请至少绑定一个买入信号策略实例' : '请至少绑定一个卖出信号策略实例');
  }
}

async function loadSignalStrategyOptions() {
  signalStrategyLoading.value = true;
  try {
    const [buyRes, sellRes] = await Promise.all([
      getSignalStrategyOptions({ usage_scope: 'buy', only_enabled: true }),
      getSignalStrategyOptions({ usage_scope: 'sell', only_enabled: true }),
    ]);
    signalStrategyOptions.buy = buyRes?.payload?.items || [];
    signalStrategyOptions.sell = sellRes?.payload?.items || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('获取信号策略实例选项失败');
  } finally {
    signalStrategyLoading.value = false;
  }
}

async function loadGroupOptions() {
  groupOptionsLoading.value = true;
  try {
    const res = await getUserGroups();
    builtinGroupOptions.value = (res?.payload?.items || []).map((item) => ({
      label: item.name,
      value: item.id,
    }));
  } catch (error) {
    console.error(error);
    ElMessage.error('获取股票分组选项失败');
  } finally {
    groupOptionsLoading.value = false;
  }
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
  filters.strategy_category = routeStrategyCategoryPreset.value || '';
  filters.enabled = undefined;
  filters.keyword = '';
  pagination.page = 1;
  loadStrategies();
}

function openCreateDialog() {
  dialog.visible = true;
  dialog.mode = 'create';
  dialog.strategyId = null;
  dialog.isBuiltin = false;
  resetForm();
  nextTick(() => strategyFormRef.value?.clearValidate());
}

function openEditDialog(row) {
  if (!row.editable) {
    ElMessage.warning('当前策略不支持编辑');
    return;
  }
  dialog.visible = true;
  dialog.mode = 'edit';
  dialog.strategyId = row.id;
  dialog.isBuiltin = row.strategy_mode === 'BUILTIN';
  Object.assign(form, {
    strategy_code: row.strategy_code,
    strategy_name: row.strategy_name,
    strategy_category: row.strategy_category,
    strategy_mode: row.strategy_mode,
    signal_source: row.signal_source || '',
    design_principle: row.design_principle || '',
    remark: row.remark || '',
    enabled: row.enabled,
    config_form_schema: row.config_form_schema || null,
    rule_config_json_text: JSON.stringify(normalizeRuleConfigForDisplay(row), null, 2),
  });
  nextTick(() => strategyFormRef.value?.clearValidate());
}

function normalizeRuleConfigForDisplay(row) {
  const base = row?.rule_config_json ? JSON.parse(JSON.stringify(row.rule_config_json)) : {};
  if (row?.strategy_code !== 'EXEC_ACCOUNT_RISK_BASE') {
    return base;
  }
  const risk = base.risk || {};
  const nextValue = normalizeRiskPercentValue(risk.max_floating_loss_ratio);
  base.risk = {
    ...risk,
    max_floating_loss_ratio: nextValue,
  };
  return base;
}

function parseCurrentRuleConfig() {
  const trimmed = String(form.rule_config_json_text || '').trim();
  if (!trimmed) {
    return {};
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return {};
  }
}

function writeCurrentRuleConfig(nextConfig) {
  form.rule_config_json_text = JSON.stringify(nextConfig || {}, null, 2);
}

function getBoundSignalStrategyIds() {
  const bindingPath = currentSignalStrategyBindingPath.value;
  if (!bindingPath) {
    return [];
  }
  const value = getValueByPath(parseCurrentRuleConfig(), bindingPath);
  return Array.isArray(value) ? value : [];
}

function handleBoundSignalStrategiesChange(value) {
  const bindingPath = currentSignalStrategyBindingPath.value;
  if (!bindingPath) {
    return;
  }
  const nextConfig = parseCurrentRuleConfig();
  setValueByPath(nextConfig, bindingPath, Array.isArray(value) ? value.map((item) => Number(item)) : []);
  writeCurrentRuleConfig(nextConfig);
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

function formatRiskPercent(value) {
  const normalized = normalizeRiskPercentValue(value);
  return normalized ? normalized.toFixed(2).replace(/\.00$/, '') : '0';
}

function getValueByPath(source, path) {
  return String(path || '').split('.').filter(Boolean).reduce((current, key) => (current == null ? undefined : current[key]), source);
}

function setValueByPath(target, path, value) {
  const keys = String(path || '').split('.').filter(Boolean);
  if (!keys.length) {
    return;
  }
  let cursor = target;
  keys.slice(0, -1).forEach((key) => {
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
}

function getBuiltinFieldValue(field) {
  return getValueByPath(parseCurrentRuleConfig(), field.path);
}

function normalizeBuiltinMultiSelectValue(field) {
  const value = getBuiltinFieldValue(field);
  return Array.isArray(value) ? value : [];
}

function getBuiltinFieldOptions(field) {
  if (field.path === 'universe.group_ids') {
    return builtinGroupOptions.value;
  }
  return field.options || [];
}

function getStrategyGroupNames(row) {
  if (row?.strategy_category !== 'OPEN_POSITION') {
    return [];
  }
  const groupIds = Array.isArray(row?.rule_config_json?.universe?.group_ids)
    ? row.rule_config_json.universe.group_ids
    : [];
  return groupIds
    .map((groupId) => {
      const normalizedId = Number(groupId);
      if (!normalizedId) {
        return null;
      }
      const matchedOption = builtinGroupOptions.value.find((item) => Number(item.value) === normalizedId);
      return matchedOption?.label || `分组#${normalizedId}`;
    })
    .filter(Boolean);
}

function formatBuiltinFieldValue(field) {
  const value = getBuiltinFieldValue(field);
  if (field.component === 'string-array') {
    return Array.isArray(value) ? value.join(',') : '';
  }
  return value ?? '';
}

function setBuiltinFieldValue(field, rawValue) {
  const nextConfig = parseCurrentRuleConfig();
  let value = rawValue;
  if (field.component === 'string-array') {
    value = String(rawValue || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  setValueByPath(nextConfig, field.path, value);
  if (form.strategy_code === 'EXEC_ACCOUNT_RISK_BASE') {
    normalizeAccountRiskConfig(nextConfig, field.path);
  }
  writeCurrentRuleConfig(nextConfig);
}

function normalizePositiveInt(value, fallback = 1) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.max(1, Math.trunc(num));
}

function normalizeAccountRiskConfig(config, changedPath = '') {
  const nextConfig = config || {};
  const risk = nextConfig.risk || {};
  const holdings = { ...(risk.max_holdings_by_market || {}) };
  let bear = normalizePositiveInt(holdings.bear, 1);
  let range = normalizePositiveInt(holdings.range, 2);
  let bull = normalizePositiveInt(holdings.bull, 3);

  if (changedPath === 'risk.max_holdings_by_market.bear') {
    range = Math.max(range, bear);
    bull = Math.max(bull, range);
  } else if (changedPath === 'risk.max_holdings_by_market.range') {
    bear = Math.min(bear, range);
    bull = Math.max(bull, range);
  } else if (changedPath === 'risk.max_holdings_by_market.bull') {
    range = Math.min(range, bull);
    bear = Math.min(bear, range);
  } else {
    range = Math.max(range, bear);
    bull = Math.max(bull, range);
  }

  nextConfig.risk = {
    ...risk,
    max_holdings_by_market: {
      ...holdings,
      bear,
      range,
      bull,
    },
  };
  return nextConfig;
}

function validateAccountRiskConfig(config) {
  const holdings = config?.risk?.max_holdings_by_market || {};
  const bear = normalizePositiveInt(holdings.bear, 1);
  const range = normalizePositiveInt(holdings.range, 2);
  const bull = normalizePositiveInt(holdings.bull, 3);
  if (!(bear <= range && range <= bull)) {
    throw new Error('股票最大持仓个数必须满足 熊市 ≤ 震荡市 ≤ 牛市');
  }
}

async function submitStrategy() {
  submitting.value = true;
  try {
    await strategyFormRef.value?.validate();
    validateRequiredSignalStrategyBinding();
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

function validateRuleConfigText(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('规则 JSON 格式不正确');
  }
  if (dialog.isBuiltin && form.strategy_code === 'EXEC_ACCOUNT_RISK_BASE') {
    validateAccountRiskConfig(parsed);
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

.strategy-group-tags-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.full-width {
  width: 100%;
}

.signal-binding-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signal-binding-help {
  line-height: 1.6;
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

.builtin-config-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.builtin-config-sections {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.builtin-config-section {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfd 100%);
  padding: 14px;
}

.builtin-config-section__header {
  margin-bottom: 12px;
}

.builtin-config-section__header h4 {
  margin: 0;
  font-size: 15px;
  color: #1f2937;
}

.builtin-config-section__header p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
}

.builtin-config-help {
  margin-top: 0;
}

.emphasis-help {
  color: #8a5a00;
}

.builtin-config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.builtin-config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.builtin-config-label {
  color: #606266;
  font-size: 13px;
}

.builtin-preview-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.builtin-preview-card {
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.builtin-preview-card span {
  color: #606266;
  font-size: 12px;
}

.builtin-preview-subtitle {
  color: #909399;
  font-size: 11px;
  line-height: 1.2;
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

  .builtin-config-grid {
    grid-template-columns: 1fr;
  }

  .builtin-preview-panel {
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
