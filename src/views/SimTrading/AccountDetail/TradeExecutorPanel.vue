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
        <el-button plain @click="helpDialog.visible = true">全局说明</el-button>
        <el-button type="primary" :loading="saving" @click="saveConfig">保存配置</el-button>
        <el-button
          v-if="mainTab === 'mode-config' && configModeTab === 'ADVANCED_AUTO'"
          type="warning"
          plain
          :loading="replaying"
          @click="runReplay"
        >参数回放</el-button>
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

      <el-tabs v-model="mainTab" class="executor-main-tabs">
        <el-tab-pane label="模式选择" name="mode-select">
          <div class="mode-selector-grid">
            <el-card
              v-for="mode in EXECUTION_MODE_OPTIONS"
              :key="mode.value"
              shadow="never"
              class="mode-card"
              :class="currentExecutionMode === mode.value ? 'is-active' : ''"
              @click="selectExecutionMode(mode.value)"
            >
              <div class="mode-card__header">
                <div>
                  <h4>{{ mode.label }}</h4>
                  <p>{{ mode.subtitle }}</p>
                </div>
                <el-tag size="small" :type="currentExecutionMode === mode.value ? 'danger' : 'info'">
                  {{ currentExecutionMode === mode.value ? '当前模式' : '点击切换' }}
                </el-tag>
              </div>
              <p class="mode-card__desc">{{ mode.description }}</p>
              <div class="message-stack compact">
                <span class="note-line">{{ mode.benefit }}</span>
                <span class="subtle-line">{{ mode.risk }}</span>
                <span class="subtle-line">{{ mode.suggestion }}</span>
              </div>
            </el-card>
          </div>

          <el-card shadow="never" class="detail-card mode-summary-card">
            <div class="mode-summary-card__content">
              <div>
                <h4>{{ currentModeMeta.label }}</h4>
                <p>{{ currentModeMeta.description }}</p>
              </div>
              <div class="message-stack">
                <span class="note-line">{{ currentModeMeta.benefit }}</span>
                <span class="subtle-line">{{ currentModeMeta.risk }}</span>
                <span class="subtle-line">{{ currentModeMeta.suggestion }}</span>
              </div>
            </div>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="模式配置" name="mode-config">
          <el-card shadow="never" class="detail-card mode-config-main-card">
            <template #header>
              <div class="section-header">
                <div>
                  <h4>模式参数配置</h4>
                  <p>按模式独立维护参数，先在子 Tab 调参，再决定是否设为当前执行模式。</p>
                </div>
                <el-space wrap>
                  <el-tag :type="activeConfigModeMeta.tagType">当前编辑：{{ activeConfigModeMeta.shortLabel }}</el-tag>
                  <el-button type="primary" plain @click="setCurrentModeFromConfigTab">设为当前执行模式</el-button>
                  <el-tag type="warning">账号 {{ currentAccount?.account_name || accountId }}</el-tag>
                </el-space>
              </div>
            </template>

            <el-tabs v-model="configModeTab" class="mode-config-tabs">
              <el-tab-pane
                v-for="mode in EXECUTION_MODE_OPTIONS"
                :key="mode.value"
                :name="mode.value"
                :label="mode.label"
              >
                <div class="mode-pane-shell" :class="`mode-pane-shell--${String(mode.value).toLowerCase()}`">
                  <div class="mode-pane-hero">
                    <div>
                      <h4>{{ mode.label }}</h4>
                      <p>{{ mode.description }}</p>
                    </div>
                    <div class="message-stack compact">
                      <el-tag :type="mode.tagType">{{ mode.shortLabel }}</el-tag>
                      <span class="subtle-line">{{ mode.subtitle }}</span>
                    </div>
                  </div>

                  <div v-if="mode.value === 'ADVANCED_AUTO'" class="template-grid">
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

                  <div class="config-section-list">
                    <section
                      v-for="section in getParameterSectionsByMode(mode.value)"
                      :key="`${mode.value}-${section.key}`"
                      class="config-section-card"
                    >
                      <div class="config-section-card__header">
                        <h5>{{ section.title }}</h5>
                        <p>{{ section.description }}</p>
                      </div>
                      <el-form :model="configForm" label-width="260px" class="config-grid">
                        <el-form-item
                          v-for="field in section.fields"
                          :key="field.key"
                        >
                          <template #label>
                            <span class="config-label-with-help">
                              <span>{{ field.label }}</span>
                              <el-tooltip placement="top" :content="field.help">
                                <el-icon class="help-icon"><QuestionFilled /></el-icon>
                              </el-tooltip>
                            </span>
                          </template>
                          <el-switch
                            v-if="field.type === 'switch'"
                            v-model="configForm[field.key]"
                          />
                          <el-select
                            v-else-if="field.type === 'select'"
                            v-model="configForm[field.key]"
                            class="config-input-control"
                          >
                            <el-option
                              v-for="option in field.options || []"
                              :key="option.value"
                              :label="option.label"
                              :value="option.value"
                            />
                          </el-select>
                          <el-input-number
                            v-else
                            v-model="configForm[field.key]"
                            class="config-input-control"
                            controls-position="right"
                            :min="field.min"
                            :max="field.max"
                            :step="field.step"
                            :precision="field.precision"
                            :disabled="field.requireAdmin && !bundle?.permissions?.can_edit_queue_depth_warn"
                          />
                        </el-form-item>
                      </el-form>
                    </section>
                  </div>

                  <template v-if="mode.value === 'ADVANCED_AUTO'">
                    <el-card shadow="never" class="detail-card advanced-only-card">
                      <template #header>
                        <div class="section-header">
                          <div>
                            <h4>参数回放</h4>
                            <p>固定场景验证当前参数会走哪种委托模式、是否拆单以及是否被前置风控拦截。</p>
                          </div>
                        </div>
                      </template>
                      <el-empty v-if="!replayPayload" description="尚未执行回放，请点击顶部“参数回放”。" />
                      <el-table v-else :data="replayPayload.scenarios" border>
                        <el-table-column prop="scenario_label" label="场景" min-width="150" />
                        <el-table-column prop="market_type" label="市场" width="90" />
                        <el-table-column label="方向" width="140">
                          <template #default="scope">
                            <div class="message-stack compact">
                              <span>{{ sideLabel(scope.row.side).cn }}</span>
                              <span class="subtle-line">{{ sideLabel(scope.row.side).en }}</span>
                            </div>
                          </template>
                        </el-table-column>
                        <el-table-column prop="volume" label="委托量" width="110" sortable />
                        <el-table-column label="实际委托类型" width="140">
                          <template #default="scope">
                            <div class="message-stack compact">
                              <span>{{ runtimeOrderTypeLabel(scope.row.runtime_order_type).cn }}</span>
                              <span class="subtle-line">{{ runtimeOrderTypeLabel(scope.row.runtime_order_type).en }}</span>
                            </div>
                          </template>
                        </el-table-column>
                        <el-table-column label="委托模式" min-width="180">
                          <template #default="scope">
                            <div class="message-stack compact">
                              <span>{{ orderModeLabel(scope.row.selected_order_mode).cn }}</span>
                              <span class="subtle-line">{{ orderModeLabel(scope.row.selected_order_mode).en }}</span>
                            </div>
                          </template>
                        </el-table-column>
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

                    <el-card shadow="never" class="detail-card advanced-only-card">
                      <template #header>
                        <div class="section-header">
                          <div>
                            <h4>委托单拆单日志</h4>
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
                          value-format="YYYY-MM-DD"
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

                    <el-card shadow="never" class="detail-card advanced-only-card">
                      <template #header>
                        <div class="section-header">
                          <div>
                            <h4>变更日志</h4>
                            <p>记录保存、模板切换、复制、重置等操作的变化轨迹。</p>
                          </div>
                          <el-radio-group v-model="logFieldNameMode" size="small">
                            <el-radio-button label="CN">中文字段名</el-radio-button>
                            <el-radio-button label="EN">英文字段名</el-radio-button>
                          </el-radio-group>
                        </div>
                      </template>
                      <div class="batch-filter-bar">
                        <el-select v-model="logFilters.operation_type" placeholder="操作类型" clearable class="filter-item">
                          <el-option
                            v-for="item in LOG_OPERATION_OPTIONS"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                          />
                        </el-select>
                        <el-date-picker
                          v-model="logFilters.dateRange"
                          type="daterange"
                          range-separator="至"
                          start-placeholder="开始日期"
                          end-placeholder="结束日期"
                          value-format="YYYY-MM-DD"
                          class="filter-item filter-item--wide"
                        />
                        <el-button type="primary" @click="applyLogFilters">查询</el-button>
                        <el-button @click="resetLogFilters">重置</el-button>
                      </div>
                      <el-table :data="logPage.items" border v-loading="logsLoading">
                        <el-table-column prop="id" label="日志id" width="110" sortable />
                        <el-table-column label="操作类型" min-width="180">
                          <template #default="scope">
                            <el-tooltip placement="top" :content="operationTypeLabel(scope.row.operation_type).desc">
                              <el-tag size="small" type="info">{{ operationTypeLabel(scope.row.operation_type).label }}</el-tag>
                            </el-tooltip>
                          </template>
                        </el-table-column>
                        <el-table-column prop="operator_username" label="操作人" width="120" />
                        <el-table-column prop="created_time" label="时间" min-width="180">
                          <template #default="scope">{{ formatDateTime(scope.row.created_time) }}</template>
                        </el-table-column>
                        <el-table-column label="变更字段" min-width="260">
                          <template #default="scope">
                            <div class="message-stack">
                              <span v-for="item in scope.row.changed_fields_json" :key="`${scope.row.id}-${item.field}`" class="note-line">
                                {{ formatChangedFieldName(item.field) }}: {{ formatValue(item.before_value) }} -> {{ formatValue(item.after_value) }}
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
                </div>
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-dialog v-model="helpDialog.visible" title="交易执行器参数说明" width="760px">
      <div class="message-stack">
        <p>
          参数按三组生效范围组织：全局通用（限价/市价都生效）、限价单专属、五档市价专属。
        </p>
        <p>
          QMT 36 为交易所价格笼子拒单，主要与限价报价偏离有关；前置风控拦截不会下发到 QMT。
        </p>
        <p>
          拆单通常能降低冲击成本，但会增加委托笔数与手续费；请结合账户规模和成交时效权衡。
        </p>
      </div>
      <template #footer>
        <el-button type="primary" @click="helpDialog.visible = false">我知道了</el-button>
      </template>
    </el-dialog>

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
import { QuestionFilled } from '@element-plus/icons-vue';

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
const helpDialog = reactive({ visible: false });

const bundle = ref(null);
const replayPayload = ref(null);
const selectedTemplateKey = ref('');
const mainTab = ref('mode-select');
const configModeTab = ref('ADVANCED_AUTO');
const logFieldNameMode = ref('CN');
const logPage = reactive({ total: 0, page: 1, page_size: 10, items: [] });
const logFilters = reactive({
  operation_type: '',
  dateRange: [],
});
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
const configForm = reactive({});

const LOG_OPERATION_OPTIONS = [
  { value: 'SAVE', label: '手动保存' },
  { value: 'APPLY_TEMPLATE', label: '应用模板' },
  { value: 'RESET_DEFAULT', label: '重置默认' },
  { value: 'COPY_TO_ACCOUNT', label: '复制到账号' },
  { value: 'SAVE_GLOBAL_DEFAULT', label: '更新全局默认' },
];

const EXECUTION_MODE_OPTIONS = [
  {
    value: 'ADVANCED_AUTO',
    label: '高级自动模式',
    shortLabel: '高级模式',
    subtitle: '专业最优、收益优先',
    description: '保留当前交易执行器的智能切换能力，适合熟悉参数语义的成熟用户。',
    benefit: '优势：自动在限价/市价语义之间做平衡，兼顾成交率和滑点控制。',
    risk: '风险：参数较多，理解成本更高，仍需关注价格保护和波动阈值。',
    suggestion: '适合：30万以上中大型资金、量化波段策略、希望精细化调参的用户。',
    formDescription: '当前为高级自动模式，展示全局通用 + 高级切换 + 限价保护 + 市价告警参数。',
    tagType: 'danger',
  },
  {
    value: 'FIXED_MARKET',
    label: '固定市价模式',
    shortLabel: '市价模式',
    subtitle: '新手首选、稳定成交',
    description: '屏蔽复杂切换参数，稳定按市价语义执行，更适合新手和小资金自动交易。',
    benefit: '优势：无需理解复杂阈值，成交优先，显著降低“不会配参数”的门槛。',
    risk: '风险：长期运行会承担一定主动滑点成本。',
    suggestion: '适合：20万以内新手、小散户、追求简单稳定成交的自动交易场景。',
    formDescription: '当前为固定市价模式，仅展示真正生效的全局通用参数、市价模式选择和滑点告警参数。',
    tagType: 'success',
  },
  {
    value: 'FIXED_LIMIT',
    label: '固定限价模式',
    shortLabel: '限价模式',
    subtitle: '低滑点、场景专用',
    description: '强制走限价单，并在基准价上做小幅偏移，适合低频、低波动或人工辅助场景。',
    benefit: '优势：滑点可控，交易成本最低，适合底仓调仓与震荡行情。',
    risk: '风险：存在成交不足和价格笼子拒单风险，不适合作为默认万能模式。',
    suggestion: '适合：低频波段、长线底仓、愿意接受漏单风险换取低成本的用户。',
    formDescription: '当前为固定限价模式，仅展示全局通用参数、限价偏移参数和限价价格保护参数。',
    tagType: 'warning',
  },
];

const EXECUTION_MODE_META_MAP = EXECUTION_MODE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item;
  return acc;
}, {});

const FIXED_MARKET_MODE_OPTIONS = [
  { value: 'FIVE_TURN_LIMIT', label: '最优五档即时成交剩余转限价' },
  { value: 'FIVE_CANCEL', label: '最优五档即时成交剩余撤销' },
  { value: 'OPPONENT_BEST', label: '对手方最优价格' },
  { value: 'PASSIVE_BEST', label: '本方最优价格' },
  { value: 'SCI_TECH_PROTECTED', label: '高波动标的保护型市价' },
];

const FIXED_MARKET_MODE_LABEL_MAP = FIXED_MARKET_MODE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const ENUM_VALUE_LABEL_MAP = {
  ADVANCED_AUTO: '高级自动模式',
  FIXED_MARKET: '固定市价模式',
  FIXED_LIMIT: '固定限价模式',
  ...FIXED_MARKET_MODE_LABEL_MAP,
  LIMIT: '限价单',
  MARKET: '市价单',
};

const PERCENT_FIELD_KEYS = [
  'limit_buy_offset_ratio',
  'limit_sell_offset_ratio',
  'max_price_offset',
  'max_spread_ratio',
  'price_limit_ratio_cn',
  'price_limit_ratio_us_hk',
  'daily_loss_fuse_ratio',
  'five_slippage_warn_ratio_cn',
  'five_slippage_warn_ratio_us_hk',
];

const RAW_DEFAULT_CONFIG = {
  execution_mode: 'ADVANCED_AUTO',
  fixed_market_order_mode: 'FIVE_TURN_LIMIT',
  limit_buy_offset_ratio: 0.001,
  limit_sell_offset_ratio: 0.001,
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

const PARAMETER_FIELD_META = {
  fixed_market_order_mode: {
    key: 'fixed_market_order_mode',
    type: 'select',
    label: '固定市价委托风格',
    help: '用于选择固定市价模式下的执行偏好；新手默认建议保留“五档成交剩余转限价”。',
    options: FIXED_MARKET_MODE_OPTIONS,
  },
  limit_buy_offset_ratio: {
    key: 'limit_buy_offset_ratio',
    type: 'number',
    min: 0,
    max: 1.5,
    step: 0.1,
    precision: 1,
    label: '固定限价买入上浮偏移(%)',
    help: '固定限价买入时，在基准价上小幅上浮，提升成交概率；值越大，越容易成交但成本越高。',
  },
  limit_sell_offset_ratio: {
    key: 'limit_sell_offset_ratio',
    type: 'number',
    min: 0,
    max: 1.5,
    step: 0.1,
    precision: 1,
    label: '固定限价卖出下浮偏移(%)',
    help: '固定限价卖出时，在基准价上小幅下浮，提升成交概率；值越大，越容易成交但价格越保守。',
  },
  max_price_offset: {
    key: 'max_price_offset',
    type: 'number',
    min: 0.1,
    max: 0.8,
    step: 0.1,
    precision: 1,
    label: '限价/市价切换波动阈值(%)',
    help: '现价相对信号价偏离超阈值时，将从对手限价路径切向市价兜底路径。',
  },
  split_volume_threshold: {
    key: 'split_volume_threshold',
    type: 'number',
    min: 1000,
    max: 20000,
    step: 1000,
    label: '单笔最大委托股数（拆单阈值）',
    help: '单笔委托量超过阈值自动拆单；可降低冲击成本，但可能增加手续费。',
  },
  single_account_max_order_per_second: {
    key: 'single_account_max_order_per_second',
    type: 'number',
    min: 1,
    max: 5,
    step: 1,
    label: '每秒最大委托笔数',
    help: '账号级频控阈值，防止短时过高报单触发通道限流。',
  },
  order_timeout_ms: {
    key: 'order_timeout_ms',
    type: 'number',
    min: 1000,
    max: 10000,
    step: 500,
    label: '委托响应超时阈值(ms)',
    help: '超过该时间仍未完成响应时将进入失败/重试流程。',
  },
  max_retry_times: {
    key: 'max_retry_times',
    type: 'number',
    min: 1,
    max: 5,
    step: 1,
    label: '委托失败最大重试次数',
    help: '通道异常或临时失败时的自动重试上限。',
  },
  error_cool_seconds: {
    key: 'error_cool_seconds',
    type: 'number',
    min: 30,
    max: 120,
    step: 5,
    label: '委托失败冷却时长(秒)',
    help: '连续异常后暂停报单的冷却窗口。',
  },
  xt_busy_pause_second: {
    key: 'xt_busy_pause_second',
    type: 'number',
    min: 5,
    max: 30,
    step: 1,
    label: '通道繁忙暂停时长(秒)',
    help: 'XT 通道繁忙时的附加暂停，避免频繁失败重试。',
  },
  cool_queue_max: {
    key: 'cool_queue_max',
    type: 'number',
    min: 5,
    max: 50,
    step: 1,
    label: '未下发委托队列最大容量',
    help: '冷却期间待处理委托的最大缓存数。',
  },
  queue_depth_warn: {
    key: 'queue_depth_warn',
    type: 'number',
    min: 10,
    max: 10000,
    step: 10,
    label: '委托队列积压告警阈值',
    help: '队列深度达到阈值触发告警；该项默认仅管理员可改。',
    requireAdmin: true,
  },
  low_liquid_vol: {
    key: 'low_liquid_vol',
    type: 'number',
    min: 10000,
    max: 200000,
    step: 10000,
    label: '五档低流动性阈值',
    help: '五档总量低于该阈值时视为低流动性，滑点风险升高。',
  },
  retry_interval_ms: {
    key: 'retry_interval_ms',
    type: 'number',
    min: 200,
    max: 1000,
    step: 100,
    label: '委托重试间隔(ms)',
    help: '子单重报和重试动作之间的间隔。',
  },
  order_sync_check_interval_s: {
    key: 'order_sync_check_interval_s',
    type: 'number',
    min: 10,
    max: 60,
    step: 5,
    label: '子单增量对账周期(秒)',
    help: '批次子单状态巡检同步周期。',
  },
  enable_st_filter: {
    key: 'enable_st_filter',
    type: 'switch',
    label: '启用 ST/*ST 标的过滤',
    help: '开启后对 ST 类标的做前置拦截。',
  },
  enable_up_down_limit_check: {
    key: 'enable_up_down_limit_check',
    type: 'switch',
    label: '启用涨跌停标的过滤校验',
    help: '开启后买入涨停/卖出跌停场景会被前置阻断。',
  },
  enable_loss_fuse: {
    key: 'enable_loss_fuse',
    type: 'switch',
    label: '启用账户熔断保护',
    help: '开启账户级风控熔断，日内亏损超阈值时阻断后续委托。',
  },
  daily_loss_fuse_ratio: {
    key: 'daily_loss_fuse_ratio',
    type: 'number',
    min: 0.5,
    max: 5,
    step: 0.5,
    precision: 1,
    label: '日内亏损熔断比例(%)',
    help: '账户日内亏损达到该比例时触发熔断保护。',
  },
  max_spread_ratio: {
    key: 'max_spread_ratio',
    type: 'number',
    min: 0.1,
    max: 0.5,
    step: 0.1,
    precision: 1,
    label: '限价单最大允许偏离价差(%)',
    help: '价差过大时不走对手限价路径；仅限价逻辑生效。',
  },
  price_limit_ratio_cn: {
    key: 'price_limit_ratio_cn',
    type: 'number',
    min: 1,
    max: 8,
    step: 0.5,
    precision: 1,
    label: 'A股限价买入上浮保护上限(%)',
    help: '动态保护买入限价偏离，避免超保护区间。',
  },
  price_limit_ratio_us_hk: {
    key: 'price_limit_ratio_us_hk',
    type: 'number',
    min: 3,
    max: 10,
    step: 0.5,
    precision: 1,
    label: '港美股限价买入上浮保护上限(%)',
    help: '港美股场景下的动态限价保护上限。',
  },
  five_slippage_warn_ratio_cn: {
    key: 'five_slippage_warn_ratio_cn',
    type: 'number',
    min: 0.3,
    max: 1,
    step: 0.1,
    precision: 1,
    label: 'A股五档市价滑点告警阈值(%)',
    help: '仅用于滑点风险告警，不直接拦截委托。',
  },
  five_slippage_warn_ratio_us_hk: {
    key: 'five_slippage_warn_ratio_us_hk',
    type: 'number',
    min: 0.8,
    max: 2,
    step: 0.1,
    precision: 1,
    label: '港美股五档市价滑点告警阈值(%)',
    help: '仅用于滑点风险告警，不直接拦截委托。',
  },
};

// 参数分组：先按生效范围组织，再按业务语义排列。
const PARAMETER_SECTION_DEFS = [
  {
    key: 'global-common',
    title: '全局通用配置（三模式都生效）',
    description: '控制频控、重试、风控开关、队列和拆单等共性行为。',
    modes: ['ADVANCED_AUTO', 'FIXED_MARKET', 'FIXED_LIMIT'],
    fieldKeys: [
      'split_volume_threshold',
      'single_account_max_order_per_second',
      'order_timeout_ms',
      'max_retry_times',
      'retry_interval_ms',
      'error_cool_seconds',
      'xt_busy_pause_second',
      'cool_queue_max',
      'queue_depth_warn',
      'order_sync_check_interval_s',
      'enable_st_filter',
      'enable_up_down_limit_check',
      'enable_loss_fuse',
      'daily_loss_fuse_ratio',
    ],
  },
  {
    key: 'advanced-auto-only',
    title: '高级自动模式专属（仅高级模式生效）',
    description: '用于控制自动切换时机、限价路径容忍度和流动性判定。',
    modes: ['ADVANCED_AUTO'],
    fieldKeys: ['max_price_offset', 'max_spread_ratio', 'low_liquid_vol'],
  },
  {
    key: 'fixed-market-only',
    title: '固定市价模式专属（仅固定市价模式生效）',
    description: '用于选择固定市价执行风格，并保留必要的滑点风险提示。',
    modes: ['FIXED_MARKET'],
    fieldKeys: ['fixed_market_order_mode'],
  },
  {
    key: 'limit-protection',
    title: '限价价格保护（高级/固定限价生效）',
    description: '用于限制限价委托的保护边界，避免出现过度偏离的报价。',
    modes: ['ADVANCED_AUTO', 'FIXED_LIMIT'],
    fieldKeys: ['price_limit_ratio_cn', 'price_limit_ratio_us_hk'],
  },
  {
    key: 'fixed-limit-only',
    title: '固定限价模式专属（仅固定限价模式生效）',
    description: '用于控制买入上浮、卖出下浮的偏移力度，提升固定限价成交概率。',
    modes: ['FIXED_LIMIT'],
    fieldKeys: ['limit_buy_offset_ratio', 'limit_sell_offset_ratio'],
  },
  {
    key: 'market-alert-only',
    title: '市价滑点告警（高级/固定市价生效）',
    description: '用于提示市价链路潜在滑点风险，不直接阻断委托。',
    modes: ['ADVANCED_AUTO', 'FIXED_MARKET'],
    fieldKeys: ['five_slippage_warn_ratio_cn', 'five_slippage_warn_ratio_us_hk'],
  },
];

const currentExecutionMode = computed(() => {
  return String(configForm.execution_mode || 'ADVANCED_AUTO').toUpperCase();
});

const currentModeMeta = computed(() => {
  return EXECUTION_MODE_META_MAP[currentExecutionMode.value] || EXECUTION_MODE_OPTIONS[0];
});

const parameterSectionsByMode = computed(() => {
  return EXECUTION_MODE_OPTIONS.reduce((acc, mode) => {
    acc[mode.value] = PARAMETER_SECTION_DEFS.map((section) => ({
      ...section,
      fields: section.fieldKeys
        .map((key) => PARAMETER_FIELD_META[key])
        .filter(Boolean),
    })).filter((section) => {
      const modeList = Array.isArray(section.modes) ? section.modes : [];
      if (modeList.length && !modeList.includes(mode.value)) {
        return false;
      }
      return Array.isArray(section.fields) && section.fields.length > 0;
    });
    return acc;
  }, {});
});

const activeConfigModeMeta = computed(() => {
  return EXECUTION_MODE_META_MAP[configModeTab.value] || EXECUTION_MODE_OPTIONS[0];
});

const availableCopyTargets = computed(() => {
  return (props.accounts || []).filter((item) => {
    return (
      String(item.id) !== String(props.accountId) &&
      String(item.account_type || '').toUpperCase() !== 'SIMULATED'
    );
  });
});

const CHANGE_FIELD_LABEL_MAP = {
  execution_mode: '执行模式',
  template_key: '模板标识',
};

Object.values(PARAMETER_FIELD_META).forEach((field) => {
  if (field?.key && field?.label) {
    CHANGE_FIELD_LABEL_MAP[field.key] = field.label;
  }
});

function createDefaultConfigForm() {
  return toDisplayConfig(RAW_DEFAULT_CONFIG);
}

function toDisplayConfig(rawConfig = {}) {
  const nextConfig = { ...rawConfig };
  PERCENT_FIELD_KEYS.forEach((key) => {
    const num = Number(nextConfig[key]);
    if (Number.isFinite(num)) {
      nextConfig[key] = Number((num * 100).toFixed(2));
    }
  });
  return nextConfig;
}

function toPayloadConfig(displayConfig = {}) {
  const nextConfig = { ...displayConfig };
  PERCENT_FIELD_KEYS.forEach((key) => {
    const num = Number(nextConfig[key]);
    if (Number.isFinite(num)) {
      nextConfig[key] = Number((num / 100).toFixed(6));
    }
  });
  return nextConfig;
}

Object.assign(configForm, createDefaultConfigForm());

function syncFormFromBundle(payload) {
  const effective = payload?.effective_config || {};
  Object.assign(configForm, createDefaultConfigForm(), toDisplayConfig(effective));
  configModeTab.value = String(configForm.execution_mode || 'ADVANCED_AUTO').toUpperCase();
  selectedTemplateKey.value =
    payload?.template_key || payload?.templates?.[1]?.key || payload?.templates?.[0]?.key || '';
}

function percentText(value) {
  return `${Number(value || 0) * 100}%`;
}

function selectExecutionMode(mode) {
  const normalized = String(mode || 'ADVANCED_AUTO').toUpperCase();
  configForm.execution_mode = normalized;
  configModeTab.value = normalized;
}

function setCurrentModeFromConfigTab() {
  selectExecutionMode(configModeTab.value);
}

function getParameterSectionsByMode(mode) {
  const normalized = String(mode || '').toUpperCase();
  return parameterSectionsByMode.value[normalized] || [];
}

function formatDateTime(value) {
  if (!value) {
    return '--';
  }
  const text = String(value).trim();
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return text.replace('T', ' ');
  }
  const pad = (num) => String(num).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
}

function sideLabel(side) {
  const normalized = String(side || '').toUpperCase();
  if (normalized === 'BUY') {
    return { cn: '买入', en: 'BUY' };
  }
  if (normalized === 'SELL') {
    return { cn: '卖出', en: 'SELL' };
  }
  return { cn: side || '--', en: normalized || '--' };
}

function orderModeLabel(mode) {
  const normalized = String(mode || '').toUpperCase();
  const mapping = {
    OPPONENT_BEST: '对手方最优限价',
    PASSIVE_BEST: '本方最优价格',
    FIVE_TURN_LIMIT: '五档成交剩余转限价',
    FIVE_CANCEL: '五档成交剩余撤单',
    SCI_TECH_PROTECTED: '高波动标的保护型市价',
    FIXED_LIMIT: '固定限价报价',
    MARKET_GLOBAL: '境外市价兜底',
  };
  return {
    cn: mapping[normalized] || mode || '--',
    en: normalized || '--',
  };
}

function runtimeOrderTypeLabel(value) {
  const normalized = String(value || '').toUpperCase();
  const mapping = {
    LIMIT: '限价单',
    MARKET: '市价单',
  };
  return {
    cn: mapping[normalized] || value || '--',
    en: normalized || '--',
  };
}

function operationTypeLabel(value) {
  const normalized = String(value || '').toUpperCase();
  const mapping = {
    SAVE: { label: '手动保存', desc: '直接保存当前账号执行器参数。' },
    APPLY_TEMPLATE: { label: '应用模板', desc: '通过模板覆盖并保存当前账号参数。' },
    RESET_DEFAULT: { label: '重置默认', desc: '删除账号覆盖参数，回退到系统默认模板。' },
    COPY_TO_ACCOUNT: { label: '复制到账号', desc: '来源账号参数被复制到目标账号。' },
    SAVE_GLOBAL_DEFAULT: { label: '更新全局默认', desc: '管理员更新系统级默认执行器配置。' },
  };
  return mapping[normalized] || { label: value || '--', desc: normalized || '--' };
}

function normalizeDateTimeText(text, isEnd = false) {
  const source = String(text || '').trim();
  if (!source) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    return `${source} ${isEnd ? '23:59:59' : '00:00:00'}`;
  }
  return source.replace('T', ' ');
}

function getDateTimeRangeParams(dateRange = []) {
  const start = normalizeDateTimeText(dateRange?.[0], false);
  const end = normalizeDateTimeText(dateRange?.[1], true);
  return {
    start_time: start || null,
    end_time: end || null,
  };
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  const normalized = String(value).trim().toUpperCase();
  if (ENUM_VALUE_LABEL_MAP[normalized]) {
    return ENUM_VALUE_LABEL_MAP[normalized];
  }
  return String(value);
}

function formatChangedFieldName(field) {
  const normalized = String(field || '').trim();
  if (!normalized) {
    return '--';
  }
  if (logFieldNameMode.value === 'EN') {
    return normalized;
  }
  return CHANGE_FIELD_LABEL_MAP[normalized] || normalized;
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
      operation_type: logFilters.operation_type || null,
      ...getDateTimeRangeParams(logFilters.dateRange),
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
      ...getDateTimeRangeParams(batchFilters.dateRange),
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

function applyLogFilters() {
  logPage.page = 1;
  loadLogs().catch((error) => {
    console.error(error);
    ElMessage.error(error?.message || '加载变更日志失败');
  });
}

function resetLogFilters() {
  logFilters.operation_type = '';
  logFilters.dateRange = [];
  applyLogFilters();
}

function assessRiskWarnings() {
  const warnings = [];
  if (currentExecutionMode.value === 'ADVANCED_AUTO' && Number(configForm.max_price_offset) >= 0.6) {
    warnings.push('1. 波动阈值偏高，可能更频繁走市价兜底，成交成本上升。');
  }
  if (currentExecutionMode.value === 'ADVANCED_AUTO' && Number(configForm.max_spread_ratio) >= 0.4) {
    warnings.push('2. 限价价差阈值偏宽，限价成交偏离风险上升。');
  }
  if (Number(configForm.split_volume_threshold) <= 2000) {
    warnings.push('3. 拆单阈值偏低，委托笔数可能明显增加。');
  }
  if (Number(configForm.single_account_max_order_per_second) >= 5) {
    warnings.push('4. 每秒委托上限较高，通道限流与拒单风险提升。');
  }
  if (!configForm.enable_st_filter) {
    warnings.push('5. 已关闭 ST 过滤，ST/*ST 标的不再前置拦截。');
  }
  if (!configForm.enable_up_down_limit_check) {
    warnings.push('6. 已关闭涨跌停校验，极端行情委托风险上升。');
  }
  if (!configForm.enable_loss_fuse) {
    warnings.push('7. 已关闭账户熔断保护，回撤放大时不会自动阻断。');
  }
  if (currentExecutionMode.value === 'FIXED_LIMIT' && Number(configForm.limit_buy_offset_ratio) >= 1) {
    warnings.push('8. 固定限价买入偏移较高，虽然更易成交，但实际成本会明显上升。');
  }
  if (currentExecutionMode.value === 'FIXED_LIMIT' && Number(configForm.limit_sell_offset_ratio) >= 1) {
    warnings.push('9. 固定限价卖出偏移较高，虽然更易成交，但价格会更保守。');
  }
  return warnings;
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
  Object.assign(configForm, createDefaultConfigForm(), toDisplayConfig(template.config || {}));
}

async function saveConfig() {
  if (!props.accountId) {
    return;
  }
  const riskWarnings = assessRiskWarnings();
  if (riskWarnings.length) {
    try {
      await ElMessageBox.confirm(
        `检测到以下高风险配置变更：\n${riskWarnings.join('\n')}\n\n确认继续保存吗？`,
        '风险提示',
        {
          type: 'warning',
          confirmButtonText: '继续保存',
          cancelButtonText: '返回检查',
        }
      );
    } catch {
      return;
    }
  }
  saving.value = true;
  try {
    const res = await saveSimTradingTradeExecutorConfig(Number(props.accountId), {
      template_key: selectedTemplateKey.value || null,
      config: toPayloadConfig(configForm),
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
    mainTab.value = 'mode-select';
    configModeTab.value = 'ADVANCED_AUTO';
    logFilters.operation_type = '';
    logFilters.dateRange = [];
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

.executor-main-tabs {
  border: 1px solid #e7ecf3;
  border-radius: 14px;
  padding: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.executor-main-tabs :deep(.el-tabs__nav-wrap::after),
.mode-config-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #e5e7eb;
}

.executor-main-tabs :deep(.el-tabs__item.is-active),
.mode-config-tabs :deep(.el-tabs__item.is-active) {
  color: #c62828;
  font-weight: 600;
}

.executor-main-tabs :deep(.el-tabs__active-bar),
.mode-config-tabs :deep(.el-tabs__active-bar) {
  background-color: #c62828;
}

.mode-config-tabs {
  margin-top: 8px;
}

.mode-config-main-card {
  border: 1px solid #dfe6ef;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.mode-pane-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #e5eaf1;
  background: #ffffff;
}

.mode-pane-shell--advanced_auto {
  background: linear-gradient(165deg, #fffaf3 0%, #ffffff 60%);
  border-color: #f1d7b8;
}

.mode-pane-shell--fixed_market {
  background: linear-gradient(165deg, #f3fbf7 0%, #ffffff 60%);
  border-color: #bde5cd;
}

.mode-pane-shell--fixed_limit {
  background: linear-gradient(165deg, #f6f8fd 0%, #ffffff 60%);
  border-color: #cfd8f6;
}

.mode-pane-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(17, 24, 39, 0.08);
}

.mode-pane-hero h4 {
  margin: 0;
  font-size: 16px;
  color: #1f2937;
}

.mode-pane-hero p {
  margin: 6px 0 0;
  color: #4b5563;
  line-height: 1.6;
}

.advanced-only-card {
  border: 1px solid #ead7bf;
  box-shadow: 0 8px 24px rgba(123, 71, 0, 0.06);
}

.mode-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.mode-card {
  border: 1px solid #d8dee9;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.mode-card:hover {
  border-color: #9aa5b1;
  transform: translateY(-1px);
}

.mode-card.is-active {
  border-color: #c62828;
  box-shadow: 0 0 0 1px rgba(198, 40, 40, 0.15);
}

.mode-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.mode-card__header h4,
.mode-summary-card__content h4 {
  margin: 0;
}

.mode-card__header p,
.mode-summary-card__content p {
  margin: 6px 0 0;
  color: #5f6b7a;
  line-height: 1.6;
}

.mode-card__desc {
  margin: 14px 0 12px;
  color: #3b4552;
  line-height: 1.6;
}

.mode-summary-card {
  background: linear-gradient(135deg, #fffaf1 0%, #fff 100%);
}

.mode-summary-card__content {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.template-card {
  border: 1px solid #d8dee9;
  background: #ffffff;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.template-card:hover {
  border-color: #d15f3f;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(209, 95, 63, 0.12);
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
  grid-template-columns: repeat(auto-fit, minmax(520px, 1fr));
  gap: 0 24px;
}

.config-section-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.config-section-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.82);
}

.config-section-card__header h5 {
  margin: 0;
  font-size: 14px;
  color: #1f2937;
}

.config-section-card__header p {
  margin: 6px 0 10px;
  color: #64748b;
  font-size: 12px;
}

.config-label-with-help {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.help-icon {
  color: #64748b;
  cursor: help;
}

.config-input-control {
  width: 220px;
}

:deep(.config-grid .el-form-item__label) {
  white-space: nowrap;
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
  .template-card__header,
  .mode-card__header,
  .mode-summary-card__content {
    flex-direction: column;
  }

  .mode-pane-hero {
    flex-direction: column;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }

  .config-input-control {
    width: 100%;
  }

  :deep(.config-grid .el-form-item__label) {
    white-space: normal;
  }
}
</style>
