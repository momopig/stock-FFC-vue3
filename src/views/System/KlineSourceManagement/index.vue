<template>
  <div class="kline-source-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="hero-kicker">Kline Source Console</span>
        <h2>股票 K 线数据源管理</h2>
        <p>
          统一管理策略股票池、自选分组、持仓行情、筹码重算与回测依赖的行情/K线入口。
          1.0 版本支持富途 OpenD、国金 QMT、中金 QMT 三种运行时数据源。
        </p>
      </div>
      <div class="hero-side">
        <div class="active-chip">当前生效：{{ activeSourceName }}</div>
        <p>{{ activeSourceDesc }}</p>
        <div class="active-phase2-panel">
          <div class="active-phase2-title">盘中 Phase-2 能力</div>
          <div class="active-phase2-grid">
            <div class="active-phase2-item">
              <span>逐笔成交</span>
              <strong>{{ boolLabel(activeIntradayCapabilities.support_l2_ticker) }}</strong>
            </div>
            <div class="active-phase2-item">
              <span>盘口委托</span>
              <strong>{{ boolLabel(activeIntradayCapabilities.support_order_book) }}</strong>
            </div>
            <div class="active-phase2-item">
              <span>板块归属</span>
              <strong>{{ boolLabel(activeIntradayCapabilities.support_owner_plate) }}</strong>
            </div>
          </div>
          <ul v-if="activeIntradayWarnings.length" class="active-warning-list">
            <li v-for="warning in activeIntradayWarnings" :key="warning">{{ warning }}</li>
          </ul>
        </div>
        <el-button :loading="loading" plain @click="loadSettings">刷新配置</el-button>
        <el-button
          plain
          :loading="checkingAllSources"
          :disabled="!canWrite || switching || checkingSourceKey"
          @click="handleCheckAllClientConnections"
        >
          批量检测全部数据源连通性
        </el-button>
      </div>
    </section>

    <section class="source-grid-panel">
      <div class="panel-header">
        <div>
          <h3>可切换数据源</h3>
          <p>后端统一返回数据源状态，前端只负责展示和切换，不额外维护适配逻辑。</p>
        </div>
        <div class="legend-row">
          <span class="legend-item is-active">Active</span>
          <span class="legend-item is-ready">Ready</span>
          <span class="legend-item is-pending">Need Config</span>
        </div>
      </div>

      <div class="source-grid">
        <article
          v-for="source in sources"
          :key="source.source_key"
          class="source-card"
          :class="{
            'is-current': source.is_active,
            'is-disabled': !source.available,
          }"
        >
          <header class="source-card-header">
            <div>
              <h4>{{ source.source_name }}</h4>
              <p>{{ source.desc || '暂无描述' }}</p>
            </div>
            <el-tag v-if="source.is_active" type="danger" effect="dark">当前生效</el-tag>
            <el-tag v-else-if="source.available" type="success">可切换</el-tag>
            <el-tag v-else type="info">待配置</el-tag>
          </header>

          <div class="capability-matrix">
            <div class="capability-item">
              <span>实时行情</span>
              <strong>{{ source.support_realtime_quote ? '支持' : '不支持' }}</strong>
            </div>
            <div class="capability-item">
              <span>历史日 K</span>
              <strong>{{ source.support_history_kline ? '支持' : '不支持' }}</strong>
            </div>
            <div class="capability-item">
              <span>分钟级 K 线</span>
              <strong>{{ source.support_intraday_kline ? '支持' : '不支持' }}</strong>
            </div>
          </div>

          <div class="client-status-card">
            <span>{{ clientStatusTitle(source) }}</span>
            <el-tooltip :content="source.client_connection_message || clientStatusFallbackMessage(source)" placement="top">
              <el-tag :type="clientStatusTagType(source.client_connection_status)" effect="light">
                {{ clientStatusLabel(source.client_connection_status, source) }}
              </el-tag>
            </el-tooltip>
            <small v-if="source.client_connection_checked_at">最近检测：{{ source.client_connection_checked_at }}</small>
          </div>

          <div class="phase2-capability-card">
            <div class="phase2-capability-title">盘中上下文能力</div>
            <div class="phase2-capability-grid">
              <div class="capability-item is-phase2">
                <span>逐笔成交</span>
                <strong>{{ boolLabel(source.intraday_context_capabilities?.support_l2_ticker) }}</strong>
              </div>
              <div class="capability-item is-phase2">
                <span>盘口委托</span>
                <strong>{{ boolLabel(source.intraday_context_capabilities?.support_order_book) }}</strong>
              </div>
              <div class="capability-item is-phase2">
                <span>板块归属</span>
                <strong>{{ boolLabel(source.intraday_context_capabilities?.support_owner_plate) }}</strong>
              </div>
            </div>
            <div
              v-if="source.intraday_context_capabilities?.degraded_features?.length"
              class="degraded-feature-row"
            >
              <span>降级项</span>
              <strong>{{ formatFeatureList(source.intraday_context_capabilities.degraded_features) }}</strong>
            </div>
            <ul
              v-if="source.intraday_context_capabilities?.warnings?.length"
              class="source-warning-list"
            >
              <li v-for="warning in source.intraday_context_capabilities.warnings" :key="warning">{{ warning }}</li>
            </ul>
          </div>

          <div class="phase2-capability-card">
            <div class="phase2-capability-title">Quote 契约校验</div>
            <div class="phase2-capability-grid">
              <div class="capability-item is-phase2">
                <span>强制实现</span>
                <strong>{{ boolLabel(source.quote_contract_capabilities?.strong_enforced) }}</strong>
              </div>
              <div class="capability-item is-phase2">
                <span>状态</span>
                <strong>{{ formatQuoteContractStatus(source.quote_contract_capabilities?.status) }}</strong>
              </div>
              <div class="capability-item is-phase2">
                <span>源字段要求</span>
                <strong>{{ source.quote_contract_capabilities?.source_required_fields?.length || 0 }} 项</strong>
              </div>
            </div>
            <div
              v-if="source.quote_contract_capabilities?.source_required_fields?.length"
              class="degraded-feature-row"
            >
              <span>必须原生提供</span>
              <strong>{{ source.quote_contract_capabilities.source_required_fields.join(' / ') }}</strong>
            </div>
            <ul
              v-if="source.quote_contract_capabilities?.warnings?.length"
              class="source-warning-list"
            >
              <li v-for="warning in source.quote_contract_capabilities.warnings" :key="warning">{{ warning }}</li>
            </ul>
          </div>

          <div class="meta-row">
            <span>标识：{{ source.source_key }}</span>
            <span>类型：{{ source.source_type }}</span>
            <span>默认：{{ source.is_default ? '是' : '否' }}</span>
          </div>

          <div v-if="source.connection_settings" class="connection-preview">
            <span>Agent：{{ source.connection_settings.agent_base_url || '未配置' }}</span>
            <span>账号：{{ source.connection_settings.account_id || '未配置' }}</span>
            <span>会话：{{ source.connection_settings.session_id || '--' }}</span>
          </div>

          <p v-if="source.unavailable_reason" class="warning-text">
            {{ source.unavailable_reason }}
          </p>

          <footer class="action-row">
            <el-button
              v-if="source.source_type === 'qmt_remote_agent'"
              plain
              :disabled="!canWrite || switching"
              @click="openConnectionDialog(source)"
            >
              配置连接
            </el-button>
            <el-button
              plain
              :loading="checkingSourceKey === source.source_key"
              :disabled="!canWrite || !source.configured || switching"
              @click="handleCheckClientConnection(source)"
            >
              手动检测客户端连通性
            </el-button>
            <el-button
              type="danger"
              :disabled="!canWrite || !source.available || source.is_active || switching"
              :loading="switching && pendingSourceKey === source.source_key"
              @click="handleSwitch(source)"
            >
              切换到此数据源
            </el-button>
            <span class="permission-tip">
              {{ canWrite ? '具备切换权限' : '仅具备只读权限，无法切换' }}
            </span>
          </footer>
        </article>
      </div>
    </section>

    <section class="impact-panel">
      <div class="panel-header">
        <div>
          <h3>受影响接口清单</h3>
          <p>后续只要有新增统一 K 线入口的接口，应在后端补录到当前返回结果中。</p>
        </div>
        <div class="impact-count">{{ impactedApis.length }} 个接口</div>
      </div>

      <el-table :data="impactedApis" border stripe>
        <el-table-column prop="name" label="业务场景" min-width="180" />
        <el-table-column prop="method" label="方法" width="100" />
        <el-table-column prop="path" label="接口路径" min-width="320" />
        <el-table-column prop="scene" label="影响说明" min-width="260" />
      </el-table>
    </section>

    <section class="notes-panel">
      <div class="panel-header compact">
        <h3>1.0 说明</h3>
      </div>
      <ul>
        <li>当前数据源切换覆盖统一行情列表、筹码集中价和分钟级回测入口，不覆盖逐笔、盘口等 Level-2 能力。</li>
        <li>QMT 数据源通过 qmt-agent 远程代理接入，主后端不直接依赖 xtquant。</li>
        <li>QMT 的 agent_base_url、account_id、session_id 等连接参数可在当前页面点“配置连接”维护。</li>
        <li>切换状态和连接覆盖项都写入后端运行时状态文件，1.0 阶段不新增数据库配置表。</li>
      </ul>
    </section>

    <el-dialog
      v-model="connectionDialogVisible"
      width="720px"
      :title="connectionDialogTitle"
      destroy-on-close
    >
      <el-form label-width="130px">
        <el-form-item required>
          <template #label>
            <span class="field-label required">Agent 地址</span>
          </template>
          <el-input v-model="connectionForm.agent_base_url" placeholder="http://127.0.0.1:8010" />
          <div class="field-help-text">必填。填写 qmt-agent 的 HTTP 地址，例如 http://127.0.0.1:8010。</div>
        </el-form-item>
        <el-form-item required>
          <template #label>
            <span class="field-label required">资金账号</span>
            <el-tooltip content="account_id 是券商资金账号，通常是你在券商客户端里看到的实际交易账号。" placement="top">
              <el-icon class="label-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <el-input v-model="connectionForm.account_id" placeholder="券商资金账号" />
          <div class="field-help-text">必填。建议直接参照“账号管理”里的 QMT 实盘账户资金账号填写。</div>
        </el-form-item>
        <el-form-item>
          <template #label>
            <span class="field-label optional">账号类型</span>
          </template>
          <el-input v-model="connectionForm.account_type" placeholder="默认 STOCK" />
          <div class="field-help-text">选填。普通证券账户默认 STOCK，信用账户可填写 CREDIT。</div>
        </el-form-item>
        <el-form-item>
          <template #label>
            <span class="field-label optional">本地账号ID</span>
            <el-tooltip content="local_account_id 是 qmt-agent 运行时内部绑定用的本地账号标识，不是券商展示给你的资金账号；不确定时可留空。" placement="top">
              <el-icon class="label-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </template>
          <el-input-number v-model="connectionForm.local_account_id" :min="0" :step="1" style="width: 100%" />
          <div class="field-help-text">选填。仅当 agent 部署侧明确要求时再填写。</div>
        </el-form-item>
        <el-form-item>
          <template #label>
            <span class="field-label optional">会话ID</span>
          </template>
          <el-input-number v-model="connectionForm.session_id" :min="0" :step="1" style="width: 100%" />
          <div class="field-help-text">选填。若留空，后端会使用默认会话参数；测试连接失败时再按 agent 要求补充。</div>
        </el-form-item>
        <el-form-item>
          <template #label>
            <span class="field-label optional">超时时间</span>
          </template>
          <el-input-number v-model="connectionForm.agent_timeout_seconds" :min="1" :step="1" style="width: 100%" />
          <div class="field-help-text">选填。默认 30 秒，网络较慢时可适度调大。</div>
        </el-form-item>
        <el-form-item>
          <template #label>
            <span class="field-label optional">校验证书</span>
          </template>
          <el-switch v-model="connectionForm.agent_verify_ssl" />
          <div class="field-help-text">选填。内网/自签名环境一般关闭，HTTPS 正式证书环境建议开启。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="connectionDialogVisible = false">取消</el-button>
          <el-button :loading="connectionTesting" :disabled="!canWrite || connectionSaving" plain @click="handleTestConnection">
            测试连接
          </el-button>
          <el-button type="danger" :loading="connectionSaving" @click="handleSaveConnection">
            保存连接配置
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { QuestionFilled } from '@element-plus/icons-vue';

import {
  checkAllKlineSourceClientConnections,
  checkKlineSourceClientConnection,
  getKlineSourceSettings,
  testKlineSourceConnections,
  updateKlineSourceConnections,
  updateKlineSourceSettings,
} from '@/api/modules/klineSource';
import { PermissionCodes } from '@/config/permissionCodes';
import { UserStore } from '@/state/user';

// 统一维护页面拉取结果，避免视图层散落多个来源状态。
const loading = ref(false);
const switching = ref(false);
const connectionSaving = ref(false);
const connectionTesting = ref(false);
const checkingSourceKey = ref('');
const pendingSourceKey = ref('');
const connectionDialogVisible = ref(false);
const editingSourceKey = ref('');
const settings = ref({
  active_source: '',
  sources: [],
  impacted_apis: [],
});
const connectionForm = ref(buildEmptyConnectionForm());

const userStore = UserStore();

const sources = computed(() => settings.value?.sources || []);
const impactedApis = computed(() => settings.value?.impacted_apis || []);
const activeSource = computed(() => {
  return sources.value.find((item) => item.is_active) || null;
});
const activeSourceName = computed(() => activeSource.value?.source_name || '--');
const activeSourceDesc = computed(() => {
  return activeSource.value?.desc || '当前还没有可展示的数据源说明。';
});
const activeIntradayCapabilities = computed(() => {
  return activeSource.value?.intraday_context_capabilities || {};
});
const activeIntradayWarnings = computed(() => {
  return activeIntradayCapabilities.value?.warnings || [];
});

function formatQuoteContractStatus(status) {
  if (status === 'ready') {
    return '已就绪';
  }
  if (status === 'warning') {
    return '需关注';
  }
  if (status === 'blocked') {
    return '已阻断';
  }
  return status || '未知';
}

function clientNameBySource(source) {
  if (source?.source_key === 'futu') return 'Futu客户端';
  return 'QMT客户端';
}

const checkingAllSources = ref(false);
function clientStatusTitle(source) {
  return `${clientNameBySource(source)}状态`;
}

function clientStatusFallbackMessage(source) {
  const clientName = clientNameBySource(source);
  return `尚未检测 ${clientName}连通性`;
}

function clientStatusLabel(status, source) {
  const clientName = clientNameBySource(source);
  if (status === 'connected') return `${clientName}已开启`;
  if (status === 'disconnected') return `${clientName}未开启`;
  if (status === 'unconfigured') return '待配置连接';
  return '待检测客户端';
}

function clientStatusTagType(status) {
  if (status === 'connected') return 'success';
  if (status === 'disconnected') return 'danger';
  if (status === 'unconfigured') return 'info';
  return 'warning';
}
const canWrite = computed(() => userStore.hasPermission(PermissionCodes.SYSTEM_KLINE_SOURCE_WRITE));
const connectionDialogTitle = computed(() => {
  const currentSource = sources.value.find((item) => item.source_key === editingSourceKey.value);
  return currentSource ? `${currentSource.source_name} 连接配置` : 'QMT 连接配置';
});

// 首次进入页面时从后端读取统一配置，避免和浏览器本地状态脱节。
onMounted(() => {
  loadSettings();
});

async function loadSettings() {
  loading.value = true;
  try {
    const result = await getKlineSourceSettings();
    settings.value = result?.payload || settings.value;
  } catch (error) {
    ElMessage.error(error?.message || '获取 K 线数据源配置失败');
  } finally {
    loading.value = false;
  }
}

// 切换动作始终走后端校验，前端只做交互兜底和结果刷新。
async function handleSwitch(source) {
  if (!source?.source_key || switching.value || !canWrite.value) {
    return;
  }
  switching.value = true;
  pendingSourceKey.value = source.source_key;
  try {
    const result = await updateKlineSourceSettings(source.source_key);
    settings.value = result?.payload || settings.value;
    ElMessage.success(`已切换到 ${source.source_name}`);
  } catch (error) {
    ElMessage.error(error?.message || '切换 K 线数据源失败');
  } finally {
    switching.value = false;
    pendingSourceKey.value = '';
  }
}

// 只给 QMT 数据源开放连接配置表单，配置结果回写到后端运行时状态文件。
function openConnectionDialog(source) {
  editingSourceKey.value = source?.source_key || '';
  connectionForm.value = {
    ...buildEmptyConnectionForm(),
    ...(source?.connection_settings || {}),
  };
  connectionDialogVisible.value = true;
}

async function handleSaveConnection() {
  if (!editingSourceKey.value || !canWrite.value) {
    return;
  }
  if (!validateConnectionForm()) {
    return;
  }
  connectionSaving.value = true;
  try {
    const payload = sanitizeConnectionForm(connectionForm.value);
    const result = await updateKlineSourceConnections(editingSourceKey.value, payload);
    settings.value = result?.payload || settings.value;
    connectionDialogVisible.value = false;
    ElMessage.success('QMT 连接配置已保存');
  } catch (error) {
    ElMessage.error(error?.message || '保存 QMT 连接配置失败');
  } finally {
    connectionSaving.value = false;
  }
}

async function handleTestConnection() {
  if (!editingSourceKey.value || !canWrite.value) {
    return;
  }
  if (!validateConnectionForm()) {
    return;
  }
  connectionTesting.value = true;
  try {
    const payload = sanitizeConnectionForm(connectionForm.value);
    const result = await testKlineSourceConnections(editingSourceKey.value, payload);
    const probe = result?.payload?.quote_probe || {};
    ElMessage.success(`连接测试成功：${probe.code || '--'} ${probe.name || ''} 最新价 ${probe.last_price ?? '--'}`);
  } catch (error) {
    ElMessage.error(error?.message || 'QMT 连接测试失败');
  } finally {
    connectionTesting.value = false;
  }
}

// 检测使用已保存配置，检测结果由后端持久化后重新回填到数据源卡片。
async function handleCheckClientConnection(source) {
  if (!source?.source_key || !canWrite.value || checkingSourceKey.value) {
    return;
  }
  checkingSourceKey.value = source.source_key;
  try {
    const result = await checkKlineSourceClientConnection(source.source_key);
    settings.value = result?.payload || settings.value;
    const checkedSource = settings.value.sources?.find((item) => item.source_key === source.source_key);
    const clientName = clientNameBySource(checkedSource || source);
    if (checkedSource?.client_connection_status === 'connected') {
      ElMessage.success(`${clientName}已开启，连通性检测成功`);
    } else {
      ElMessage.warning(checkedSource?.client_connection_message || `${clientName}未开启，将无法正常获取K线数据`);
    }
  } catch (error) {
    ElMessage.error(error?.message || '检测客户端连通性失败');
  } finally {
    checkingSourceKey.value = '';
  }
}

async function handleCheckAllClientConnections() {
  if (!canWrite.value || checkingAllSources.value || checkingSourceKey.value) {
    return;
  }
  checkingAllSources.value = true;
  try {
    const sourceKeys = (sources.value || []).map((item) => item.source_key).filter(Boolean);
    const result = await checkAllKlineSourceClientConnections(sourceKeys);
    settings.value = result?.payload || settings.value;
    const disconnected = (settings.value.sources || []).filter((item) => item.client_connection_status === 'disconnected');
    if (disconnected.length === 0) {
      ElMessage.success('全部数据源客户端连通性检测完成，状态正常');
    } else {
      ElMessage.warning(`批量检测完成，${disconnected.length} 个数据源客户端未开启`);
    }
  } catch (error) {
    ElMessage.error(error?.message || '批量检测客户端连通性失败');
  } finally {
    checkingAllSources.value = false;
  }
}

function buildEmptyConnectionForm() {
  return {
    agent_base_url: '',
    account_id: '',
    account_type: 'STOCK',
    local_account_id: null,
    session_id: null,
    client_path: '',
    agent_timeout_seconds: 30,
    agent_verify_ssl: true,
  };
}

function sanitizeConnectionForm(formValue) {
  return {
    agent_base_url: String(formValue?.agent_base_url || '').trim(),
    account_id: String(formValue?.account_id || '').trim(),
    account_type: String(formValue?.account_type || 'STOCK').trim() || 'STOCK',
    local_account_id: formValue?.local_account_id ?? null,
    session_id: formValue?.session_id ?? null,
    client_path: String(formValue?.client_path || '').trim(),
    agent_timeout_seconds: formValue?.agent_timeout_seconds ?? 30,
    agent_verify_ssl: Boolean(formValue?.agent_verify_ssl),
  };
}

function validateConnectionForm() {
  if (!String(connectionForm.value?.agent_base_url || '').trim()) {
    ElMessage.warning('请填写 Agent 地址');
    return false;
  }
  if (!String(connectionForm.value?.account_id || '').trim()) {
    ElMessage.warning('请填写资金账号');
    return false;
  }
  return true;
}

function boolLabel(value) {
  return value ? '支持' : '降级';
}

function formatFeatureList(features) {
  const labels = {
    l2_ticker: '逐笔成交',
    order_book: '盘口委托',
    owner_plate: '板块归属',
  };
  return (features || []).map((item) => labels[item] || item).join('、');
}
</script>

<style scoped>
.kline-source-page {
  --page-ink: #19324d;
  --page-muted: #5b6f86;
  --page-line: rgba(25, 50, 77, 0.08);
  --page-shell: rgba(255, 255, 255, 0.94);
  --page-red: #d84c3f;
  --page-green: #1d8f5f;
  --page-gold: #c7902b;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background:
    radial-gradient(circle at top left, rgba(255, 228, 196, 0.75), transparent 34%),
    radial-gradient(circle at right center, rgba(202, 224, 255, 0.65), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #edf2f7 100%);
}

.client-status-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(25, 50, 77, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.58);
  color: var(--page-muted);
  font-size: 13px;
}

.client-status-card small {
  color: var(--page-muted);
}

.hero-panel,
.source-grid-panel,
.impact-panel,
.notes-panel {
  border: 1px solid var(--page-line);
  border-radius: 26px;
  background: var(--page-shell);
  box-shadow: 0 18px 42px rgba(22, 50, 84, 0.08);
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  gap: 22px;
  padding: 28px;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(216, 76, 63, 0.12);
  color: #b53f35;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h2,
.panel-header h3,
.source-card h4 {
  color: var(--page-ink);
}

.hero-copy h2 {
  margin: 12px 0 10px;
  font-size: 30px;
}

.hero-copy p,
.hero-side p,
.panel-header p,
.permission-tip,
.warning-text,
.notes-panel li,
.meta-row {
  color: var(--page-muted);
  line-height: 1.65;
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: 20px;
  background: linear-gradient(160deg, #173450 0%, #2b648c 55%, #d84c3f 100%);
}

.hero-side .active-chip,
.hero-side p {
  color: #fff;
}

.active-phase2-panel {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.14);
}

.active-phase2-title,
.phase2-capability-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.active-phase2-grid,
.phase2-capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.active-phase2-item {
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
}

.active-phase2-item span,
.active-phase2-item strong {
  display: block;
}

.active-phase2-item span {
  margin-bottom: 4px;
  font-size: 12px;
  opacity: 0.85;
}

.active-warning-list,
.source-warning-list {
  margin: 12px 0 0;
  padding-left: 18px;
}

.active-warning-list li {
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.6;
}

.active-chip {
  width: fit-content;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 13px;
}

.source-grid-panel,
.impact-panel,
.notes-panel {
  padding: 24px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-header h3 {
  margin: 0 0 8px;
  font-size: 22px;
}

.panel-header p,
.notes-panel ul {
  margin: 0;
}

.panel-header.compact {
  margin-bottom: 10px;
}

.legend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.legend-item,
.impact-count {
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.legend-item.is-active {
  background: rgba(216, 76, 63, 0.12);
  color: var(--page-red);
}

.legend-item.is-ready {
  background: rgba(29, 143, 95, 0.14);
  color: var(--page-green);
}

.legend-item.is-pending,
.impact-count {
  background: rgba(199, 144, 43, 0.14);
  color: var(--page-gold);
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.source-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 280px;
  padding: 22px;
  border: 1px solid rgba(25, 50, 77, 0.08);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(247, 250, 253, 0.96) 100%),
    linear-gradient(135deg, rgba(216, 76, 63, 0.05), rgba(23, 52, 80, 0.02));
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.source-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 28px rgba(21, 47, 79, 0.08);
}

.source-card.is-current {
  border-color: rgba(216, 76, 63, 0.35);
  box-shadow: 0 18px 34px rgba(216, 76, 63, 0.12);
}

.source-card.is-disabled {
  opacity: 0.88;
}

.source-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.source-card h4 {
  margin: 0 0 8px;
  font-size: 22px;
}

.source-card p {
  margin: 0;
}

.capability-matrix {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.capability-item {
  padding: 12px;
  border-radius: 16px;
  background: rgba(24, 53, 84, 0.04);
}

.capability-item.is-phase2 {
  background: rgba(216, 76, 63, 0.06);
}

.capability-item span,
.capability-item strong {
  display: block;
}

.capability-item span {
  margin-bottom: 6px;
  color: var(--page-muted);
  font-size: 12px;
}

.capability-item strong {
  color: var(--page-ink);
  font-size: 15px;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  font-size: 12px;
}

.warning-text {
  min-height: 42px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(199, 144, 43, 0.1);
}

.connection-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(24, 53, 84, 0.04);
  color: var(--page-muted);
  font-size: 12px;
}

.phase2-capability-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(216, 76, 63, 0.04);
}

.degraded-feature-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--page-muted);
  font-size: 12px;
}

.degraded-feature-row strong {
  color: var(--page-ink);
}

.source-warning-list {
  color: var(--page-muted);
  line-height: 1.6;
}

.action-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.field-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.field-label.required::after {
  content: '必填';
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(216, 76, 63, 0.12);
  color: var(--page-red);
  font-size: 11px;
  font-weight: 700;
}

.field-label.optional::after {
  content: '选填';
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(24, 53, 84, 0.08);
  color: var(--page-muted);
  font-size: 11px;
  font-weight: 700;
}

.label-icon {
  color: var(--page-muted);
  cursor: help;
}

.field-help-text {
  margin-top: 6px;
  color: var(--page-muted);
  line-height: 1.6;
  font-size: 12px;
}

.permission-tip {
  font-size: 12px;
}

.notes-panel ul {
  padding-left: 18px;
}

@media (max-width: 980px) {
  .hero-panel {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
  }

  .capability-matrix {
    grid-template-columns: 1fr;
  }

  .active-phase2-grid,
  .phase2-capability-grid {
    grid-template-columns: 1fr;
  }
}
</style>
