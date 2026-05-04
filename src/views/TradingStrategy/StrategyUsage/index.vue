<template>
  <div class="strategy-usage-page">
    <div class="page-header">
      <div>
        <div class="header-top">
          <el-button text @click="goBack">返回执行策略列表</el-button>
        </div>
        <h2>策略使用情况</h2>
        <p>从策略模板视角查看绑定账号、启停状态和最近执行结果。</p>
      </div>
    </div>

    <el-card shadow="never" v-loading="loading">
      <template v-if="strategy.id">
        <div class="usage-header">
          <div class="usage-card name-card">
            <span>策略名称</span>
            <strong>{{ strategy.strategy_name }}</strong>
            <small>{{ strategy.strategy_code }}</small>
          </div>
          <div class="usage-card principle-card">
            <span>设计原理</span>
            <strong>{{ strategy.design_principle || '未填写' }}</strong>
          </div>
          <div class="usage-card">
            <span>绑定账号数</span>
            <strong>{{ usageSummary.binding_account_count || 0 }}</strong>
            <small>启用绑定 {{ usageSummary.enabled_binding_count || 0 }}</small>
          </div>
          <div class="usage-card">
            <span>最近执行</span>
            <strong>{{ usageSummary.latest_result_code || '暂无' }}</strong>
            <small>{{ formatDateTime(usageSummary.latest_dispatch_time) }}</small>
          </div>
        </div>

        <el-alert v-if="usageSummary.usage_warning" :title="usageSummary.usage_warning" type="warning" show-icon :closable="false" class="usage-alert" />

        <el-table :data="usageBindings.items" border>
          <el-table-column prop="account_name" label="账号名称" min-width="160" />
          <el-table-column label="账号状态" width="100">
            <template #default="scope">
              <el-tag size="small" :type="scope.row.account_status === 'ACTIVE' ? 'success' : 'info'">{{ scope.row.account_status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="自动化" width="100">
            <template #default="scope">{{ scope.row.automation_enabled ? '开启' : '关闭' }}</template>
          </el-table-column>
          <el-table-column label="绑定状态" width="100">
            <template #default="scope">{{ scope.row.binding_enabled ? '启用' : '停用' }}</template>
          </el-table-column>
          <el-table-column prop="priority" label="优先级" width="90" />
          <el-table-column prop="bound_config_version" label="版本" width="80" />
          <el-table-column label="最近结果" min-width="160">
            <template #default="scope">{{ scope.row.last_execute_result || '-' }}</template>
          </el-table-column>
          <el-table-column label="最近执行时间" min-width="180">
            <template #default="scope">{{ formatDateTime(scope.row.last_execute_time) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click="goToAccountStrategy(scope.row.account_id)">查看账号绑定</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            background
            layout="total, sizes, prev, pager, next"
            :page-sizes="[10, 20, 50]"
            :total="usageBindings.total"
            @current-change="loadUsageBindings"
            @size-change="loadUsageBindings"
          />
        </div>
      </template>
      <el-empty v-else description="未找到策略信息" />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import {
  getTradingStrategyDetail,
  getTradingStrategyUsageBindings,
  getTradingStrategyUsageSummary,
} from '@/api/modules/tradingStrategy';
import { useTabsStore } from '@/composables/useTabsStore';

const route = useRoute();
const router = useRouter();
const { addTab } = useTabsStore();

const loading = ref(false);
const strategy = reactive({});
const usageSummary = reactive({
  strategy_id: null,
  binding_account_count: 0,
  enabled_binding_count: 0,
  latest_dispatch_time: '',
  latest_result_code: '',
  can_delete: true,
  usage_warning: '',
});
const usageBindings = reactive({ total: 0, items: [] });
const pagination = reactive({ page: 1, pageSize: 10 });

const strategyId = ref('');

watch(
  () => route.query.strategyId,
  async (value, oldValue) => {
    strategyId.value = String(value || '');
    if (!value || value === oldValue) {
      return;
    }
    pagination.page = 1;
    await loadPageData();
  },
  { immediate: true }
);

async function loadPageData() {
  if (!strategyId.value) {
    ElMessage.warning('缺少策略 ID');
    return;
  }
  loading.value = true;
  try {
    const [detailRes, summaryRes, bindingsRes] = await Promise.all([
      getTradingStrategyDetail(strategyId.value),
      getTradingStrategyUsageSummary(strategyId.value),
      getTradingStrategyUsageBindings(strategyId.value, {
        page: pagination.page,
        page_size: pagination.pageSize,
      }),
    ]);
    Object.assign(strategy, detailRes.payload || {});
    Object.assign(usageSummary, summaryRes.payload || {});
    usageBindings.total = bindingsRes.payload?.total || 0;
    usageBindings.items = bindingsRes.payload?.items || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('获取策略使用情况失败');
  } finally {
    loading.value = false;
  }
}

async function loadUsageBindings() {
  if (!strategyId.value) {
    return;
  }
  loading.value = true;
  try {
    const res = await getTradingStrategyUsageBindings(strategyId.value, {
      page: pagination.page,
      page_size: pagination.pageSize,
    });
    usageBindings.total = res.payload?.total || 0;
    usageBindings.items = res.payload?.items || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('获取策略使用明细失败');
  } finally {
    loading.value = false;
  }
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

function goToAccountStrategy(accountId) {
  addTab('/sim-trading/account-detail', '模拟交易详情');
  router.push(`/sim-trading/account-detail?accountId=${accountId}&tab=strategy`);
}

function goBack() {
  addTab('/trading-strategy/execution', '执行策略管理');
  router.push('/trading-strategy/execution');
}
</script>

<style scoped>
.strategy-usage-page {
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

.header-top {
  margin-bottom: 8px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
}

.page-header p {
  margin: 8px 0 0;
  color: #606266;
}

.usage-header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.usage-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 108px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 16px;
  background: #fafafa;
}

.usage-card span {
  color: #909399;
  font-size: 13px;
}

.usage-card strong {
  color: #303133;
  font-size: 18px;
  line-height: 1.6;
}

.usage-card small {
  color: #909399;
  font-size: 12px;
}

.name-card strong,
.principle-card strong {
  font-size: 16px;
}

.usage-alert {
  margin-bottom: 16px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
