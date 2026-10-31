<template>
  <section class="ledger" v-loading="loading">
    <header class="hero">
      <div><span class="eyebrow">PROFIT LEDGER</span><h2>盈亏分析</h2><p>同一发布版本 · 服务端精确计算 · 缺失数据不估算</p></div>
      <div class="toolbar">
        <el-date-picker v-model="range" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" />
        <el-button :disabled="loading" @click="reload()">查询 / 刷新</el-button>
      </div>
    </header>

    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon />
    <div class="version-bar">
      <el-tag :type="healthType">{{ health.status || meta.validity || '状态未知' }}</el-tag>
      <span>版本 {{ text(meta.generation_id ?? meta.active_run_id) }}</span><span>开账 {{ text(meta.opening_date) }} · 当前正式截止 {{ text(meta.formal_cutoff) }} · 已发布截止 {{ text(meta.published_end_date) }}</span>
      <span>覆盖：{{ text(meta.coverage_status) }}</span><span>当前查询：{{ queryRangeText }}</span>
      <span>最后完整日：{{ text(health.last_complete_date ?? meta.last_complete_date) }}</span>
      <el-button link type="primary" @click="activeTab = 'maintenance'">检查与修复</el-button>
    </div>
    <el-alert v-if="diagnosticWarning" :title="diagnosticWarning" type="warning" :closable="false" show-icon />
    <el-alert v-if="needsOpening" title="缺少可信日初开账：请先在维护中心填写日初现金、持仓及凭证，不能用当前总资产猜测期初。" type="warning" :closable="false" show-icon />

    <div class="metrics">
      <article v-for="metric in summaryColumns" :key="metric.key">
        <span>{{ metric.label }}</span><strong :class="metric.profit ? profitClass(value(summary, metric)) : ''">{{ display(value(summary, metric), metric) }}</strong>
        <small>{{ diagnosticWarning ? '旧发布版本 · 仅供诊断' : '服务端发布值' }}</small>
      </article>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="收益排行" name="ranking">
        <p class="hint">排行直接来自服务端；缺少收益率基准时显示 —，不按买入金额回算。</p>
        <LedgerTable :rows="rankings" :columns="rankingColumns" @history="viewHistory" />
      </el-tab-pane>
      <el-tab-pane label="每日股票" name="stocks" lazy>
        <div class="toolbar filters"><StockPicker v-model="stockFilter" /><el-date-picker v-model="stockDate" value-format="YYYY-MM-DD" placeholder="查询自然日" clearable @change="queryStockDay" /><el-button @click="stockFilter = null; stockDate = ''">重置筛选</el-button></div>
        <p class="hint">同日多周期时，日金额包含当日全部周期，建仓日、清仓日及持仓天数仅描述最后周期；开账边界标记为“是”时，建仓日只是审计起点。</p>
        <LedgerTable :rows="filteredStocks" :columns="stockColumns" @history="viewHistory" />
      </el-tab-pane>
      <el-tab-pane label="账号日表" name="accounts" lazy>
        <LedgerTable :rows="accounts" :columns="accountColumns" />
      </el-tab-pane>
      <el-tab-pane label="资产轨迹" name="curve" lazy>
        <div class="section-title"><h3>资产轨迹</h3><span>空值、失效点及服务标记缺口均断线，不补造估值</span></div>
        <div v-if="curveGeometry.points.length" class="chart-shell">
          <svg viewBox="0 0 960 260" role="img" aria-label="账号资产曲线">
            <line x1="72" y1="222" x2="930" y2="222" class="axis" />
            <text x="8" y="28">{{ money(curveGeometry.max) }}</text><text x="8" y="216">{{ money(curveGeometry.min) }}</text>
            <path :d="curveGeometry.path" class="asset-line" />
            <circle v-for="point in curveGeometry.points" :key="point.index" :cx="point.x" :cy="point.y" r="4" class="asset-dot">
              <title>{{ dayOf(point.row) }} · 总资产 {{ money(point.row.total_asset) }} · 资金流 {{ money(value(point.row, flowColumn)) }} · {{ eventText(point.row.events) }}</title>
            </circle>
            <text x="72" y="250">{{ dayOf(curveRows[0]) }}</text><text x="825" y="250">{{ dayOf(curveRows.at(-1)) }}</text>
          </svg>
        </div>
        <el-empty v-else description="暂无有效资产估值，查看维护中心了解缺口" />
        <LedgerTable :rows="curveRows" :columns="curveColumns" />
      </el-tab-pane>
      <el-tab-pane label="盈亏日历" name="calendar" lazy>
        <div class="toolbar filters">
          <el-radio-group v-model="calendarMode" @change="queryCalendar"><el-radio-button value="month">月历</el-radio-button><el-radio-button value="year">年历（按月）</el-radio-button></el-radio-group>
          <el-date-picker v-model="calendarAnchor" :type="calendarMode === 'month' ? 'month' : 'year'" value-format="YYYY-MM-DD" :clearable="false" @change="queryCalendar" />
          <el-button :disabled="loading" @click="queryCalendar">查询所选{{ calendarMode === 'month' ? '月' : '年' }}</el-button>
          <StockPicker v-model="calendarStock" placeholder="账号日历 / 搜索单股" />
        </div>
        <p class="hint">当前查询：{{ queryRangeText }}；切换月份 / 年份会同步顶部查询范围。{{ diagnosticWarning ? '本页全部日历值为旧版本诊断数据。' : '' }}</p>
        <p class="hint">{{ calendarStock ? '单股使用当前发布版本的股票日表' : '账号使用服务端日历' }}；空白日期代表无服务记录，不代表收益为零。未提供月汇总时不计算月收益率。</p>
        <div v-if="calendarMode === 'month'" class="calendar-grid">
          <div v-for="weekday in weekdays" :key="weekday" class="weekday">{{ weekday }}</div>
          <div v-for="(cell, index) in monthCells" :key="index" class="day-cell" :class="{ blank: !cell.date }">
            <template v-if="cell.date"><span class="day-number">{{ cell.date.slice(-2) }}</span>
              <div v-for="(row, rowIndex) in cell.rows" :key="rowIndex" class="day-result">
                <strong :class="profitClass(calendarProfit(row))">{{ money(calendarProfit(row)) }}</strong>
                <small :class="profitClass(calendarRate(row))">{{ percent(calendarRate(row)) }}</small>
                <small>{{ text(row.status ?? row.validity) }}</small>
              </div><span v-if="!cell.rows.length" class="muted">—</span>
            </template>
          </div>
        </div>
        <template v-else>
          <el-alert v-if="calendarStock" title="服务暂未提供单股年汇总；下方仅展示单股年内日明细，不使用账号月汇总代替。" type="info" :closable="false" />
          <template v-else>
            <div v-if="calendarMonths.length" class="monthly-grid">
              <article v-for="month in calendarMonths" :key="month.month" class="card monthly-card">
                <h3>{{ month.month }}</h3>
                <strong :class="profitClass(month.profit_amount)">{{ money(month.profit_amount) }}</strong>
                <p :class="profitClass(month.profit_rate)">月收益率 {{ percent(month.profit_rate) }}</p>
                <p>期末总资产 {{ money(month.total_asset) }}</p>
                <small class="muted">覆盖：{{ text(month.coverage_status) }} · {{ diagnosticWarning ? '旧版本诊断数据' : '服务端月汇总' }}</small>
              </article>
            </div>
            <el-empty v-else description="服务暂未提供所选年份的年汇总（月粒度）；不从日明细回算金额或累加日收益率" />
          </template>
          <h3 class="annual-details-title">年内日明细</h3>
          <LedgerTable :rows="calendarRows" :columns="calendarStock ? stockCalendarColumns : calendarColumns" />
        </template>
      </el-tab-pane>
      <el-tab-pane label="维护中心" name="maintenance" lazy>
        <div class="maintenance-grid">
          <section class="card">
            <h3>账本健康</h3><p>{{ health.message || health.status || '等待服务端健康检查' }}</p>
            <p>缺失日期：{{ listText(meta.missing_dates) }}</p><p>过期日期：{{ listText(meta.stale_dates) }}</p>
            <el-table :data="issues" stripe max-height="300" empty-text="服务未报告异常">
              <el-table-column prop="code" label="异常类型" min-width="160" /><el-table-column prop="date" label="日期" width="115" />
              <el-table-column prop="stock_code" label="股票" width="110" /><el-table-column prop="message" label="详情 / K线状态" min-width="250" />
              <el-table-column label="快捷修复" width="100"><template #default="{ row }"><el-button link type="primary" :disabled="!canWrite || writeBusy" @click="targetIssue(row)">预览修复</el-button></template></el-table-column>
            </el-table>
          </section>
          <section class="card">
            <h3>维护目标与范围</h3><p class="hint">只维护盈亏账本，不触发下单、撤单或交易。当前实现可能从开账日全量回放，以预览实际起点为准。</p>
            <el-form label-position="top">
              <el-form-item label="目标"><el-radio-group v-model="repair.operation" :disabled="writeBusy"><el-radio-button value="fill">补缺</el-radio-button><el-radio-button value="recalculate">重新核验</el-radio-button></el-radio-group></el-form-item>
              <el-form-item label="范围"><el-select v-model="repair.scope" :disabled="writeBusy"><el-option label="异常数据" value="issues" /><el-option label="一天" value="day" /><el-option label="日期区间" value="range" /><el-option label="全部历史" value="all" /></el-select></el-form-item>
              <el-form-item v-if="repair.scope === 'day'" label="目标日期"><el-date-picker v-model="repair.trade_date" value-format="YYYY-MM-DD" :disabled="writeBusy" /></el-form-item>
              <el-form-item v-if="repair.scope === 'range'" label="目标区间"><el-date-picker v-model="repairRange" type="daterange" value-format="YYYY-MM-DD" :disabled="writeBusy" /></el-form-item>
            </el-form>
            <el-button type="primary" :loading="previewBusy" :disabled="!canWrite || writeBusy || !repairValid" @click="makePreview">预览影响</el-button>
            <span v-if="!canWrite" class="hint">仅超级管理员可写入</span>
            <div v-if="preview" class="preview">
              <h4>修复预览</h4><p>{{ preview.message || '请核对实际影响范围后执行' }}</p>
              <p>请求范围：{{ repair.scope }} · {{ text(preview.requested_start_date ?? preview.requested_start ?? (repair.scope === 'range' ? repairRange[0] : repair.trade_date)) }} 至 {{ text(preview.requested_end_date ?? preview.requested_end ?? (repair.scope === 'range' ? repairRange[1] : repair.trade_date)) }}</p>
              <p><b>实际回放：{{ text(preview.calculation_start ?? preview.calculation_start_date ?? preview.actual_start_date) }} 至 {{ text(preview.calculation_end ?? preview.calculation_end_date ?? preview.actual_end_date) }}</b></p>
              <p>来源版本：{{ text(preview.source_digest) }}</p>
              <el-alert v-if="previewBlocked" title="存在阻断条件，不能执行；请先补齐开账、资金覆盖或来源事实。" type="warning" :closable="false" />
              <el-alert v-else-if="previewRetryable" title="当日收盘价缺失（PRICE_MISSING）：可提交任务重试，执行仍可能失败；不会回退旧价格或发布假成功。" type="warning" :closable="false" />
              <pre v-if="preview.blockers || preview.issues || preview.error || preview.opening_required">{{ details({ blockers: preview.blockers, issues: preview.issues, error: preview.error, opening_required: preview.opening_required }) }}</pre>
              <el-button type="danger" :disabled="!canWrite || writeBusy || previewBlocked || previewBusy" :loading="submitting" @click="executeRepair">确认执行维护</el-button>
            </div>
          </section>
        </div>
        <section v-if="task || submissionUnknown" class="card task-card">
          <div class="section-title"><h3>维护任务 · {{ text(task?.task_id) }}</h3><el-button :disabled="pollBusy" @click="checkTask">查询任务状态</el-button></div>
          <el-tag>{{ task?.status || '提交结果待确认' }}</el-tag><span class="task-stage">{{ text(task?.stage) }}</span><p>{{ task?.message }}</p>
          <p v-if="task?.progress != null">进度：{{ details(task.progress) }}</p>
          <el-alert v-if="pollNotice || submissionUnknown" :title="pollNotice || '提交结果未知：请查询健康状态确认已有任务，不要重复提交。'" type="warning" :closable="false" />
          <pre v-if="task?.error || task?.details">{{ details(task.error ?? task.details) }}</pre>
        </section>
        <section v-if="isQmtAccount" class="card qmt-card">
          <div class="section-title"><h3>QMT 来源归档与资金覆盖</h3><div><el-button :disabled="!canWrite || writeBusy" :loading="captureBusy" @click="captureToday">采集当日事实</el-button><el-button :disabled="!canWrite || writeBusy" @click="goToCashFlows">前往资金流水补录</el-button><el-button :disabled="!canWrite || writeBusy" @click="openCashCoverage">QMT 当日资金覆盖确认</el-button></div></div>
          <el-alert title="QMT 一般仅能查询当日成交，不能自动找回接入前历史。当日采集不等于历史补全；归档不足时需要来源凭证和可信开账。" type="warning" :closable="false" />
          <p>本地归档范围：{{ archiveRange }}</p>
          <el-alert title="先凭券商完整流水在已有资金流水页面补齐缺失的入出金、分红、利息，再确认覆盖。页面仅支持这四类；税费等未支持事件须联系管理员按凭证处理，未处理不得确认完整。空券商响应或 HTTP 成功不能证明资金完整，人工确认也不代表券商自动数据完整。" type="warning" :closable="false" />
          <template v-if="captureResult"><h4>最近一次采集 raw 摘要</h4><el-tag :type="captureSealed ? 'success' : 'warning'">归档 {{ text(captureResult.status) }}</el-tag><p>资金状态：{{ text(captureResult.cash_source_status) }} · 本轮尝试：{{ text(captureResult.attempt_status) }}</p><pre>{{ details(captureResult) }}</pre></template>
        </section>
        <section class="card task-card">
          <div class="section-title"><h3>可信日初开账（高级功能）</h3><el-button type="primary" :disabled="!canWrite || writeBusy" @click="openingVisible = true">显式设置日初开账</el-button></div>
          <p class="hint">模拟账号使用完整本地资金与成交历史回放，无需每日资金覆盖确认；仅在需要审计开账边界时使用此高级功能。</p>
        </section>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-if="isQmtAccount" v-model="cashCoverageVisible" title="QMT 当日资金覆盖确认" width="min(680px, 96vw)" :close-on-click-modal="false" :close-on-press-escape="!cashCoverageBusy" :show-close="!cashCoverageBusy">
      <el-alert title="请先核对券商当日完整现金流水，在资金流水页面补齐缺失的入出金、分红、利息。该页面不支持税费等其他事件，须联系管理员按凭证处理；仍有未处理事件时不要确认。空券商响应不等于无流水，人工确认不会自动补账，也不证明券商自动数据完整。" type="warning" :closable="false" show-icon />
      <el-button :disabled="cashCoverageBusy" link type="primary" @click="goToCashFlows">先前往资金流水页面补录</el-button>
      <el-form label-position="top" :disabled="cashCoverageBusy">
        <el-form-item label="确认日期（仅上海今日）"><el-input :model-value="cashCoverage.date" readonly /></el-form-item>
        <el-form-item label="核对原因（必填）"><el-input v-model="cashCoverage.reason" type="textarea" /></el-form-item>
        <el-form-item label="核对凭证（必填：券商流水编号、查询时段或凭证说明）"><el-input v-model="cashCoverage.evidence" type="textarea" /></el-form-item>
        <el-checkbox v-model="cashCoverage.confirmed">已凭完整券商流水核对并补齐缺项；未支持的税费等事件已由管理员按凭证处理，无未处理事件；不是仅凭空响应确认</el-checkbox>
      </el-form>
      <template #footer><el-button :disabled="cashCoverageBusy" @click="cashCoverageVisible = false">取消</el-button><el-button type="primary" :loading="cashCoverageBusy" :disabled="!canWrite || writeBusy || !cashCoverageValid" @click="saveCashCoverage">保存确认并重新采集</el-button></template>
    </el-dialog>

    <el-dialog v-model="openingVisible" title="可信日初开账" width="min(1100px, 96vw)" :close-on-click-modal="false" :close-on-press-escape="!openingBusy" :show-close="!openingBusy">
      <el-alert title="填写开账日日初事实，而非当前资产。数量、总成本、市值及现金均保持十进制字符串，提交后由服务端核验。" type="warning" :closable="false" />
      <el-form label-position="top" class="opening-form" :disabled="openingBusy">
        <div class="opening-head"><el-form-item label="开账日期"><el-date-picker v-model="opening.date" value-format="YYYY-MM-DD" /></el-form-item><el-form-item label="日初现金"><el-input v-model="opening.cash" placeholder="十进制金额" /></el-form-item></div>
        <div v-for="(position, index) in opening.positions" :key="position.localId" class="position-row">
          <el-form-item label="股票（代码 / 名称 / 拼音）"><StockPicker v-model="position.selection" @update:model-value="selectOpeningStock(position, $event)" /></el-form-item>
          <el-form-item label="日初持仓数量"><el-input v-model="position.quantity" /></el-form-item><el-form-item label="持仓总成本"><el-input v-model="position.cost_amount" /></el-form-item><el-form-item label="期初市值"><el-input v-model="position.market_value" /></el-form-item><el-button text type="danger" @click="opening.positions.splice(index, 1)">移除行</el-button>
        </div>
        <el-button @click="addOpeningPosition">增加持仓行</el-button>
        <el-form-item label="开账原因"><el-input v-model="opening.reason" type="textarea" /></el-form-item><el-form-item label="来源凭证（对账单编号、来源日期、凭证说明）"><el-input v-model="opening.evidence" type="textarea" /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="openingBusy" @click="openingVisible = false">取消</el-button><el-button type="primary" :loading="openingBusy" :disabled="!canWrite || writeBusy" @click="saveOpening">提交可信开账</el-button></template>
    </el-dialog>
  </section>
</template>

<script setup>
// 本面板仅展示同版本服务结果；父级成交和流水 props 只为调用接口保留，不参与金融计算。
import { computed, defineComponent, h, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { ElButton, ElMessage, ElOption, ElPagination, ElSelect, ElTable, ElTableColumn } from 'element-plus';
import moment from 'moment';
import { getStock } from '@/api/modules/stockPool';
import { captureProfitFacts, confirmProfitCashCoverage, createProfitRepair, getProfitLedgerData, getProfitLedgerHealth, getProfitLedgerTask, previewProfitRepair, putProfitOpening } from '@/api/modules/profitLedger';

const props = defineProps({
  accountId: { type: [Number, String], required: true },
  trades: { type: Array, default: () => [] }, cashFlows: { type: Array, default: () => [] },
  isSuperAdmin: Boolean, canUpdateDailyStock: Boolean, canDeleteDailyStock: Boolean,
  canUpdateDailyAccount: Boolean, canDeleteDailyAccount: Boolean,
});
const emit = defineEmits(['view-history-trades', 'open-cash-flows']);

// 列声明集中维护字段别名；仅选择服务已有值，不使用前端备用公式。
const col = (key, label, options = {}) => ({ key, label, ...options });
const summaryColumns = [col('profit_amount', '区间收益', { profit: true }), col('stock_profit', '股票收益', { profit: true }), col('other_profit', '其他收益', { profit: true }), col('total_asset', '期末总资产'), col('external_net_flow', '期间净入金')];
const stockIdentity = [col('stock_name', '股票', { plain: true }), col('stock_code', '代码', { plain: true }), col('exchange_code', '市场', { plain: true })];
const dateColumn = col('date', '自然日', { aliases: ['trade_date'], plain: true });
// 审计列直接消费发布字段，保持账号日表与股票日表批次可核对。
const auditColumns = [col('created_time', '生成时间（上海）', { time: true, width: 185 }), col('generation_id', '生成版本', { plain: true, width: 220 }), col('status', '状态', { aliases: ['validity'], plain: true })];
const stateColumns = [col('price_status', 'K线 / 估值状态', { aliases: ['valuation_status', 'kline_status'], plain: true }), col('evidence', '证据 / 来源', { aliases: ['price_evidence', 'evidence_json', 'source_digest'], plain: true }), ...auditColumns];
const rankingColumns = [...stockIdentity, col('profit_amount', '区间盈亏', { profit: true }), col('profit_rate', '收益率', { percent: true, profit: true }), col('start_market_value', '期初市值'), col('end_market_value', '期末市值'), col('buy_amount', '买入金额'), col('sell_amount', '卖出金额'), col('end_quantity', '期末数量'), col('holding_days', '持仓天数'), col('first_open_date', '首次建仓', { plain: true }), col('close_date', '清仓日', { plain: true })];
const stockColumns = [dateColumn, ...stockIdentity,
  col('opening_quantity', '期初数量'), col('opening_cost_amount', '期初总成本'), col('sold_cost_amount', '卖出结转成本'),
  col('quantity', '期末数量'), col('closing_cost_amount', '期末总成本'), col('avg_cost_price', '成本单价'),
  col('buy_quantity', '买入数量'), col('sell_quantity', '卖出数量'), col('daily_buy_amount', '买入成交额'), col('daily_sell_amount', '卖出成交额'), col('buy_fee', '买入费用'), col('sell_fee', '卖出费用'),
  col('opening_market_value', '期初市值'), col('market_value', '期末市值'),
  col('daily_total_profit', '日盈亏', { profit: true }), col('day_profit_rate', '日收益率', { percent: true, profit: true }),
  col('closing_unrealized_profit', '期末浮盈', { profit: true }), col('daily_unrealized_change', '浮盈变动', { profit: true }), col('daily_realized_profit', '已实现盈亏', { profit: true }),
  col('daily_fee', '当日费用'), col('buy_net', '含费净买入'), col('sell_net', '含费净卖出'),
  col('holding_days', '持仓天数'), col('first_open_date', '本周期建仓日', { plain: true }), col('first_open_date_is_opening_boundary', '建仓日为开账边界', { boolean: true }), col('close_date', '本周期清仓日', { plain: true }), col('position_ratio', '期末仓位占比', { percent: true }), col('loss_to_asset_ratio', '亏损占总资产比', { percent: true, profit: true }), col('is_closed', '是否清仓', { boolean: true }), col('multi_cycle_day', '同日多周期', { boolean: true }),
  col('value_path_profit', '市值路径收益', { profit: true }), col('difference', '核对差额', { profit: true }), col('is_trading_day', '是否交易日', { boolean: true }), ...stateColumns];
const accountColumns = [dateColumn, col('opening_total_asset', '期初总资产'), col('opening_cash', '期初现金'), col('cash_balance', '现金'), col('market_value', '持仓市值'), col('total_asset', '总资产'), col('external_net_flow', '当日净入金'), col('daily_total_profit', '资产差日收益', { profit: true }), col('daily_profit_rate', '日收益率', { percent: true, profit: true }), col('daily_realized_profit', '已实现盈亏', { profit: true }), col('daily_unrealized_change', '浮盈变动', { profit: true }), col('stock_profit', '股票收益', { profit: true }), col('other_profit', '其他收益', { profit: true }), col('attribution_profit', '归因收益', { profit: true }), col('difference', '核对差额', { profit: true }), col('cumulative_profit', '开账起累计收益', { profit: true }), col('cash_evidence', '现金证据', { plain: true }), col('is_trading_day', '是否交易日', { boolean: true }), ...auditColumns];
const flowColumn = col('external_net_flow', '资金流');
const curveColumns = [dateColumn, col('total_asset', '总资产'), flowColumn, col('day_profit_amount', '日盈亏', { aliases: ['daily_total_profit'], profit: true }), col('events', '相关事件', { plain: true, width: 260 }), col('status', '状态', { plain: true })];
const calendarColumns = [dateColumn, col('profit_amount', '日盈亏', { aliases: ['day_profit_amount', 'daily_total_profit'], profit: true }), col('daily_profit_rate', '日收益率', { aliases: ['profit_rate', 'day_profit_rate'], percent: true, profit: true }), col('status', '状态', { plain: true })];
// 单股年内明细与单股月历共用股票收益率字段，不误用账号日收益率。
const stockCalendarColumns = [dateColumn, stockColumns.find((column) => column.key === 'daily_total_profit'), stockColumns.find((column) => column.key === 'day_profit_rate'), col('status', '状态', { plain: true })];

// 格式化严格区分缺失与零；Number 仅用于显示、图形坐标，不参与盈亏回算。
function value(row, column) { return [column.key, ...(column.aliases || [])].map((key) => row?.[key]).find((item) => item !== undefined && item !== null); }
function text(input) { return input == null || input === '' ? '—' : typeof input === 'object' ? details(input) : String(input); }
function details(input) { return typeof input === 'string' ? input : JSON.stringify(input, null, 2); }
function numeric(input) { return input !== null && input !== undefined && input !== '' && Number.isFinite(Number(input)); }
function money(input) { return numeric(input) ? Number(input).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
function percent(input) { return numeric(input) ? `${(Number(input) * 100).toFixed(2)}%` : '—'; }
function profitClass(input) { return numeric(input) ? Number(input) > 0 ? 'profit-up' : Number(input) < 0 ? 'profit-down' : '' : ''; }
function generationTime(input) { const parsed = input ? moment.utc(input).utcOffset(8) : null; return parsed?.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : '—'; }
function display(input, column) { return column.boolean ? input == null ? '—' : input === true ? '是' : input === false ? '否' : text(input) : column.time ? generationTime(input) : column.plain ? text(input) : column.percent ? percent(input) : money(input); }
function listText(input) { return Array.isArray(input) ? input.length ? input.map(text).join('、') : '无' : text(input); }
function rowsOf(input) { return Array.isArray(input) ? input : Array.isArray(input?.items) ? input.items : Array.isArray(input?.days) ? input.days : Array.isArray(input?.points) ? input.points : []; }
function dayOf(row) { return row?.trade_date ?? row?.date ?? ''; }
function eventText(events) { return Array.isArray(events) ? events.map((item) => typeof item === 'string' ? item : item.message || item.type || details(item)).join('；') : text(events); }

// 精确十进制字符串排序避免将金额先转浮点；空值在升降序时均由表格排序处理。
function compareDecimal(left, right) {
  const normalize = (input) => {
    const match = String(input ?? '').match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
    return match ? { negative: match[1] === '-' && !/^0*(?:\.0*)?$/.test(`${match[2]}.${match[3] || ''}`), whole: match[2].replace(/^0+(?=\d)/, ''), fraction: (match[3] || '').replace(/0+$/, '') } : null;
  };
  const a = normalize(left); const b = normalize(right);
  if (!a || !b) return a ? 1 : b ? -1 : 0;
  if (a.negative !== b.negative) return a.negative ? -1 : 1;
  const length = Math.max(a.fraction.length, b.fraction.length);
  const order = a.whole.length - b.whole.length || a.whole.localeCompare(b.whole) || a.fraction.padEnd(length, '0').localeCompare(b.fraction.padEnd(length, '0'));
  return a.negative ? -order : order;
}

// 内聚的通用结果表：先排序完整服务结果，再前端分页，不只排序当前页。
const LedgerTable = defineComponent({
  props: { rows: { type: Array, default: () => [] }, columns: { type: Array, default: () => [] } }, emits: ['history'],
  setup(tableProps, { emit: tableEmit }) {
    const page = ref(1); const pageSize = ref(20); const sort = ref({});
    watch(() => tableProps.rows, () => { page.value = 1; });
    const ordered = computed(() => {
      const column = tableProps.columns.find((item) => item.key === sort.value.prop);
      if (!column || !sort.value.order) return tableProps.rows;
      const direction = sort.value.order === 'ascending' ? 1 : -1;
      return [...tableProps.rows].sort((a, b) => direction * (column.plain || column.time || column.boolean ? text(value(a, column)).localeCompare(text(value(b, column))) : compareDecimal(value(a, column), value(b, column))));
    });
    return () => h('div', { class: 'ledger-table' }, [
      h(ElTable, { data: ordered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value), stripe: true, border: false, maxHeight: 620, emptyText: '当前版本无服务记录；请检查范围、健康状态与来源', onSortChange: (event) => { sort.value = event; page.value = 1; } }, () => [
        ...tableProps.columns.map((column) => h(ElTableColumn, { key: column.key, prop: column.key, label: column.label, minWidth: column.width || (column.plain ? 130 : 135), sortable: 'custom', showOverflowTooltip: true }, { default: ({ row }) => h('span', { class: column.profit ? profitClass(value(row, column)) : '', title: text(value(row, column)) }, display(value(row, column), column)) })),
        ...(tableProps.rows.some((row) => row.stock_code) ? [h(ElTableColumn, { label: '成交', width: 100, fixed: 'right' }, { default: ({ row }) => h(ElButton, { link: true, type: 'primary', onClick: () => tableEmit('history', row) }, () => '历史成交') })] : []),
      ]),
      h(ElPagination, { currentPage: page.value, pageSize: pageSize.value, total: tableProps.rows.length, pageSizes: [20, 50, 100], layout: 'total, sizes, prev, pager, next', 'onUpdate:currentPage': (next) => { page.value = next; }, 'onUpdate:pageSize': (next) => { pageSize.value = next; page.value = 1; } }),
    ]);
  },
});

// 复用股票分组添加弹窗的 getStock 搜索链路，支持代码、名称、拼音；项目没有独立通用股票选择组件。
const StockPicker = defineComponent({
  props: { modelValue: Object, placeholder: { type: String, default: '搜索代码 / 名称 / 拼音' } }, emits: ['update:modelValue'],
  setup(pickerProps, { emit: pickerEmit }) {
    const options = ref([]); const busy = ref(false); let serial = 0; let timer = null; let alive = true;
    const search = (query) => {
      clearTimeout(timer); const requestSerial = ++serial;
      if (!query?.trim()) { options.value = []; busy.value = false; return; }
      busy.value = true;
      timer = setTimeout(async () => {
        try {
          const result = await getStock(query.trim(), false);
          if (!alive || requestSerial !== serial) return;
          if (result?.success === false) throw new Error(result.message || '股票搜索失败');
          options.value = rowsOf(result?.payload).map((stock) => {
            const exchange = stock.exchange_code || stock.exchange || '';
            const exchangeCode = { SSE: 'SH', SZSE: 'SZ', XSHG: 'SH', XSHE: 'SZ' }[exchange] || exchange;
            const code = stock.code || stock.stock_code || '';
            return { stock_code: code, stock_name: stock.name || stock.stock_name || '', exchange_code: exchangeCode, key: `${code}|${exchangeCode}` };
          });
        } catch (error) { if (alive && requestSerial === serial) { options.value = []; ElMessage.error(error.message || '股票搜索失败'); } }
        finally { if (alive && requestSerial === serial) busy.value = false; }
      }, 250);
    };
    onBeforeUnmount(() => { alive = false; serial += 1; clearTimeout(timer); });
    return () => {
      const selected = pickerProps.modelValue;
      const items = selected && !options.value.some((item) => item.key === selected.key) ? [selected, ...options.value] : options.value;
      return h(ElSelect, { modelValue: selected?.key, filterable: true, remote: true, clearable: true, reserveKeyword: false, loading: busy.value, remoteMethod: search, placeholder: pickerProps.placeholder, 'onUpdate:modelValue': (key) => pickerEmit('update:modelValue', items.find((item) => item.key === key) || null) }, () => items.map((item) => h(ElOption, { key: item.key, value: item.key, label: `${item.stock_name} ${item.stock_code} ${item.exchange_code}` })));
    };
  },
});

// 请求 epoch 隔离账号；独立读取序号避免同账号快速切换日期时后返回的数据覆盖新结果。
const activeTab = ref('ranking'); const range = ref([]); const data = ref({}); const health = ref({});
const loading = ref(false); const healthReady = ref(false); const loadError = ref(''); const stockFilter = ref(null); const stockDate = ref('');
let epoch = 0; let loadSerial = 0; let pollTimer = null; let disposed = false; let completedTask = '';
const meta = computed(() => data.value.meta || {}); const summary = computed(() => data.value.summary || {});
const stocks = computed(() => rowsOf(data.value.stocks)); const accounts = computed(() => rowsOf(data.value.accounts));
const rankings = computed(() => rowsOf(data.value.rankings)); const curveRows = computed(() => [...rowsOf(data.value.curve)].sort((a, b) => dayOf(a).localeCompare(dayOf(b))));
const issues = computed(() => rowsOf(health.value.issues));
const needsOpening = computed(() => Boolean(meta.value.opening_required || health.value.opening_required || issues.value.some((issue) => issue.code === 'OPENING_REQUIRED')));
// health.status 与布尔位都要判断，旧版本完整证书不代表当前来源仍完整。
const diagnosticWarning = computed(() => {
  const states = [health.value.status, meta.value.coverage_status, data.value.health?.status].map((item) => String(item || '').toLowerCase());
  return health.value.blocked || health.value.stale || data.value.health?.blocked || data.value.health?.stale || states.some((state) => ['blocked', 'stale', 'failed'].includes(state))
    ? '当前账本存在阻断、失效或最近任务失败：所有摘要、排行、日表及日历旧数据仅供诊断，不代表当前完整正式结果；请查看维护中心。' : '';
});
const healthType = computed(() => !diagnosticWarning.value && health.value.status === 'ready' ? 'success' : 'warning');
// 展示响应实际查询边界，避免用户编辑日期但尚未查询时误标旧数据。
const queryRangeText = computed(() => `${text(meta.value.requested_start_date ?? meta.value.opening_date)} 至 ${text(meta.value.requested_end_date ?? meta.value.formal_cutoff)}`);
const canWrite = computed(() => props.isSuperAdmin && Boolean(props.accountId));
// 类型只能依据当前读取的 meta，未知或模拟账号不得显示或发起 QMT 专属操作。
const isQmtAccount = computed(() => meta.value.account_type === 'QMT');
const archiveRange = computed(() => {
  const archive = health.value.archive_range ?? meta.value.archive_range ?? health.value.local_archive_range ?? meta.value.local_archive_range;
  return archive ? text(archive) : '服务未提供归档范围，不能据此认定历史已完整';
});
const matchesStock = (row, selected) => !selected || (String(row.stock_code) === String(selected.stock_code) && (!selected.exchange_code || row.exchange_code === selected.exchange_code));
const filteredStocks = computed(() => stocks.value.filter((row) => matchesStock(row, stockFilter.value) && (!stockDate.value || dayOf(row) === stockDate.value)));
function current(token) { return !disposed && token === epoch; }
function viewHistory(row) { emit('view-history-trades', { stock_code: row.stock_code || '', stock_name: row.stock_name || '' }); }
// 使用父页面已有资金流水入口，不新增补账接口，也不默认认定资金已完整。
function goToCashFlows() { if (!isQmtAccount.value || cashCoverageBusy.value) return; cashCoverageVisible.value = false; cashCoverage.confirmed = false; emit('open-cash-flows'); }

// 单次读取 data 与 health；先清旧结果，读取失败时绝不保留旧版本冒充当前版本。
async function reload({ restoreTask = true } = {}) {
  const token = epoch; const serial = ++loadSerial; const id = props.accountId;
  if (!id) return;
  if (range.value?.length === 2 && range.value[0] > range.value[1]) { ElMessage.warning('日期范围无效'); return; }
  loading.value = true; healthReady.value = false; loadError.value = ''; data.value = {}; health.value = {}; preview.value = null;
  const params = range.value?.length === 2 ? { start_date: range.value[0], end_date: range.value[1] } : {};
  const results = await Promise.allSettled([getProfitLedgerData(id, params), getProfitLedgerHealth(id)]);
  if (!current(token) || serial !== loadSerial) return;
  if (results[0].status === 'fulfilled') { data.value = results[0].value; health.value = results[0].value.health || {}; }
  if (results[1].status === 'fulfilled') {
    health.value = results[1].value; healthReady.value = true;
    if (restoreTask) restoreLatestTask(health.value, token);
  }
  loadError.value = results.filter((result) => result.status === 'rejected').map((result) => result.reason?.message || '读取失败').join('；');
  loading.value = false;
}

// 资产曲线只做绘图映射：按实际日期横轴绘制，缺失/失效状态和缺失日期明确断开。
const curveGeometry = computed(() => {
  const rows = curveRows.value; const gaps = new Set([...(meta.value.missing_dates || []), ...(meta.value.stale_dates || [])]);
  const valid = (row) => !diagnosticWarning.value && numeric(row.total_asset) && !row.gap && row.valid !== false && !['missing', 'invalid', 'stale', 'blocked', 'failed'].includes(row.status ?? row.validity) && !gaps.has(dayOf(row));
  const amounts = rows.filter(valid).map((row) => Number(row.total_asset));
  if (!amounts.length) return { points: [], path: '' };
  const min = Math.min(...amounts); const max = Math.max(...amounts); const span = max - min || 1;
  const first = moment.utc(dayOf(rows[0])).valueOf(); const last = moment.utc(dayOf(rows.at(-1))).valueOf();
  const points = []; let path = ''; let previous = null;
  rows.forEach((row, index) => {
    if (!valid(row)) { previous = null; return; }
    const timestamp = moment.utc(dayOf(row)).valueOf();
    if (!Number.isFinite(timestamp)) { previous = null; return; }
    const x = rows.length === 1 ? 500 : 72 + 850 * (timestamp - first) / (last - first || 1); const y = 215 - (Number(row.total_asset) - min) / span * 180;
    const crossedGap = previous && [...gaps].some((date) => date > dayOf(previous) && date < dayOf(row));
    path += `${previous && !crossedGap && !row.break_before ? 'L' : 'M'}${x},${y} `;
    points.push({ x, y, row, index }); previous = row;
  });
  return { points, path, min, max };
});

// 日历仅编排日期；月汇总只消费 data.calendar_months，不进行金额回算或日收益率累加。
const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
const calendarMode = ref('month'); const calendarAnchor = ref(moment().format('YYYY-MM-DD')); const calendarStock = ref(null);
const calendarSource = computed(() => calendarStock.value ? stocks.value.filter((row) => matchesStock(row, calendarStock.value)) : rowsOf(data.value.calendar));
const calendarRows = computed(() => calendarSource.value.filter((row) => dayOf(row).startsWith(calendarAnchor.value.slice(0, calendarMode.value === 'month' ? 7 : 4))).sort((a, b) => dayOf(a).localeCompare(dayOf(b))));
// 月份协议为 YYYY-MM；缺少月行或空收益率原样留空，不造十二个月零值。
const calendarMonths = computed(() => rowsOf(data.value.calendar_months).filter((row) => String(row.month || '').startsWith(`${calendarAnchor.value.slice(0, 4)}-`)).slice().sort((a, b) => String(a.month).localeCompare(String(b.month))));
function calendarProfit(row) { return value(row, calendarStock.value ? stockColumns.find((column) => column.key === 'daily_total_profit') : calendarColumns[1]); }
function calendarRate(row) { return value(row, calendarStock.value ? stockColumns.find((column) => column.key === 'day_profit_rate') : calendarColumns[2]); }
// 日历与日查询均通过同一 data 范围获取，不用已截断区间假装整月/全年。
function queryCalendar() {
  const anchor = moment(calendarAnchor.value, 'YYYY-MM-DD', true);
  if (!anchor.isValid()) return;
  const unit = calendarMode.value === 'month' ? 'month' : 'year';
  range.value = [anchor.clone().startOf(unit).format('YYYY-MM-DD'), anchor.clone().endOf(unit).format('YYYY-MM-DD')];
  stockDate.value = ''; reload();
}
function queryStockDay(date) {
  if (!date) return;
  range.value = [date, date]; calendarAnchor.value = date; reload();
}
const monthCells = computed(() => {
  const start = moment(calendarAnchor.value).startOf('month'); const offset = (start.day() + 6) % 7;
  const cells = Array.from({ length: offset }, () => ({}));
  for (let day = 1; day <= start.daysInMonth(); day += 1) {
    const date = start.clone().date(day).format('YYYY-MM-DD'); cells.push({ date, rows: calendarRows.value.filter((row) => dayOf(row) === date) });
  }
  while (cells.length % 7) cells.push({});
  return cells;
});

// 统一维护状态；任一写操作或不确定提交锁住执行，避免双击和超时后的重复创建。
const repair = reactive({ operation: 'fill', scope: 'issues', trade_date: '' }); const repairRange = ref([]);
const preview = ref(null); const previewBusy = ref(false); const submitting = ref(false); const task = ref(null);
const submissionUnknown = ref(false); const pollBusy = ref(false); const pollNotice = ref('');
const captureBusy = ref(false); const captureResult = ref(null); const openingBusy = ref(false); const openingVisible = ref(false);
// 日期固定上海今日；每次打开必须重新主动勾选，不能默认为已核对。
const shanghaiToday = () => moment.utc().utcOffset(8).format('YYYY-MM-DD');
const cashCoverageVisible = ref(false); const cashCoverageBusy = ref(false);
const cashCoverage = reactive({ date: '', reason: '', evidence: '', confirmed: false });
const cashCoverageValid = computed(() => cashCoverage.confirmed && cashCoverage.date === shanghaiToday() && Boolean(cashCoverage.reason.trim()) && Boolean(cashCoverage.evidence.trim()));
const captureSealed = computed(() => captureResult.value?.status === 'SEALED');
const taskRunning = computed(() => ['pending', 'running'].includes(task.value?.status));
const writeBusy = computed(() => loading.value || !healthReady.value || submitting.value || previewBusy.value || taskRunning.value || submissionUnknown.value || captureBusy.value || openingBusy.value || cashCoverageBusy.value);
const repairValid = computed(() => repair.scope === 'day' ? Boolean(repair.trade_date) : repair.scope === 'range' ? repairRange.value?.length === 2 && repairRange.value[0] <= repairRange.value[1] : true);
const hasBlockers = (input) => Array.isArray(input) ? input.length > 0 : input && typeof input === 'object' ? Object.keys(input).length > 0 : Boolean(input);
// 仅明确 PRICE_MISSING + retryable 的错误允许执行；其余 issues/error 均保守阻断。
const previewRetryable = computed(() => {
  const entries = [...rowsOf(preview.value?.issues), ...(preview.value?.error ? [preview.value.error] : [])];
  return entries.length > 0 && entries.every((item) => item.code === 'PRICE_MISSING' && item.retryable === true);
});
const previewBlocked = computed(() => !preview.value || preview.value.blocked === true || preview.value.status === 'blocked' || preview.value.can_execute === false || preview.value.opening_required || hasBlockers(preview.value.blockers) || (!previewRetryable.value && (hasBlockers(preview.value.issues) || hasBlockers(preview.value.error) || preview.value.status === 'error')));
function repairBody() {
  return { operation: repair.operation, scope: repair.scope, ...(repair.scope === 'day' ? { trade_date: repair.trade_date } : {}), ...(repair.scope === 'range' ? { start_date: repairRange.value[0], end_date: repairRange.value[1] } : {}) };
}
watch(() => JSON.stringify([repair, repairRange.value]), () => { preview.value = null; });
function targetIssue(issue) {
  if (!canWrite.value || writeBusy.value) return;
  repair.operation = 'fill'; repair.scope = issue.date || issue.trade_date ? 'day' : 'issues'; repair.trade_date = issue.date || issue.trade_date || ''; preview.value = null;
  // 等待表单监听完成后再预览，不直接执行任何修复。
  Promise.resolve().then(makePreview);
}
async function makePreview() {
  if (!canWrite.value || writeBusy.value || !repairValid.value) return;
  const token = epoch; const body = repairBody(); const signature = JSON.stringify(body); previewBusy.value = true; preview.value = null;
  try { const result = await previewProfitRepair(props.accountId, body); if (current(token) && signature === JSON.stringify(repairBody())) preview.value = result; }
  catch (error) { if (current(token)) ElMessage.error(error.message || '预览失败'); }
  finally { if (current(token)) previewBusy.value = false; }
}
async function executeRepair() {
  if (!canWrite.value || writeBusy.value || previewBlocked.value) return;
  const token = epoch; const id = props.accountId; const body = repairBody(); submitting.value = true;
  try {
    const result = await createProfitRepair(id, body);
    if (!current(token)) return;
    preview.value = null;
    if (!result.task_id) { submissionUnknown.value = true; pollNotice.value = result.message || '未返回任务ID，请查询状态确认，勿重复提交'; return; }
    task.value = result; submissionUnknown.value = false;
    await receiveTask(result, token);
  } catch (error) {
    if (current(token)) {
      const status = error?.response?.status;
      // 明确的客户端拒绝不属于未知提交；超时、冲突及服务端故障必须先确认任务。
      if (status >= 400 && status < 500 && ![408, 409].includes(status)) { preview.value = null; ElMessage.error(error.message || '维护请求被拒绝，请重新预览'); }
      else { submissionUnknown.value = true; pollNotice.value = `提交未确认：${error.message || '网络异常'}。请查询状态，不会自动重发。`; }
    }
  } finally { if (current(token)) submitting.value = false; }
}

// 优先完整 latest_task，旧响应仅有 active_task_id 时按真实ID恢复查询，不把 latest_task_status 当作任务身份。
function stopPolling() { clearTimeout(pollTimer); pollTimer = null; }
function schedulePoll(token, delay = 2000) {
  stopPolling(); if (!current(token) || !taskRunning.value) return;
  const id = task.value?.task_id; pollTimer = setTimeout(() => pollTask(id, token), delay);
}
function restoreLatestTask(state, token) {
  const latest = state.active_task_id && state.latest_task?.task_id !== state.active_task_id
    ? { task_id: state.active_task_id, status: 'pending' } : state.latest_task || null;
  if (!latest || !current(token)) return;
  const restored = typeof latest === 'string' ? { task_id: latest, status: 'pending' } : latest;
  if (!restored.task_id) return;
  task.value = restored; submissionUnknown.value = false;
  if (taskRunning.value) schedulePoll(token);
}
async function receiveTask(result, token) {
  if (!current(token)) return;
  task.value = result;
  if (result.status === 'success') {
    stopPolling(); preview.value = null; pollNotice.value = '';
    if (completedTask !== result.task_id) { completedTask = result.task_id; await reload({ restoreTask: false }); }
  } else if (result.status === 'failed') { stopPolling(); preview.value = null; pollNotice.value = ''; }
  else if (['pending', 'running'].includes(result.status)) schedulePoll(token);
  else { submissionUnknown.value = true; pollNotice.value = '服务返回未知任务状态，请查询确认，不能重复提交'; }
}
async function pollTask(taskId, token) {
  if (!current(token) || !taskId || pollBusy.value) return;
  pollBusy.value = true;
  try {
    const result = await getProfitLedgerTask(props.accountId, taskId);
    if (!current(token) || task.value?.task_id !== taskId) return;
    pollNotice.value = ''; await receiveTask(result, token);
  } catch (error) {
    if (current(token)) { pollNotice.value = `状态查询暂不可用：${error.message || '网络异常'}；任务仍待确认，不会重发。`; schedulePoll(token, 5000); }
  } finally { if (current(token)) pollBusy.value = false; }
}
async function checkTask() {
  if (pollBusy.value) return;
  if (task.value?.task_id) { stopPolling(); await pollTask(task.value.task_id, epoch); return; }
  const token = epoch; pollBusy.value = true;
  try {
    const result = await getProfitLedgerHealth(props.accountId);
    if (current(token)) { health.value = result; healthReady.value = true; restoreLatestTask(result, token); if (!result.latest_task && !result.active_task_id) pollNotice.value = `服务尚未提供可确认的任务ID（最近状态：${text(result.latest_task_status)}），提交结果仍未知；请稍后查询或联系管理员。`; }
  } catch (error) { if (current(token)) pollNotice.value = error.message || '查询状态失败'; }
  finally { if (current(token)) pollBusy.value = false; }
}

// QMT 当日采集只归档事实，明确展示服务反馈，不宣称找回历史。
function captureMessage(result) {
  // 旧 SEALED 可被保留，而最新采集失败；必须单独披露 attempt_status。
  return result.status === 'SEALED' && result.attempt_status !== 'FAILED'
    ? '归档状态为 SEALED；仍须健康检查、预览与正式回放通过后才可认定账本完整'
    : '采集已返回，但未形成新的完整封存；请核对资金覆盖、coverages 和 issues / validation_errors';
}
async function captureToday() {
  if (!isQmtAccount.value || !canWrite.value || writeBusy.value) return;
  const token = epoch; captureBusy.value = true; captureResult.value = null;
  try { const result = await captureProfitFacts(props.accountId); if (current(token)) { captureResult.value = result; await reload(); if (current(token)) ElMessage.info(captureMessage(result)); } }
  catch (error) { if (current(token)) ElMessage.error(error.message || '采集结果未确认，请核对归档状态'); }
  finally { if (current(token)) captureBusy.value = false; }
}

// 只在人工核对并主动勾选后提交；服务端负责先保存确认再 capture，不重复调用采集接口。
function openCashCoverage() {
  if (!isQmtAccount.value || !canWrite.value || writeBusy.value) return;
  Object.assign(cashCoverage, { date: shanghaiToday(), reason: '', evidence: '', confirmed: false });
  cashCoverageVisible.value = true;
}
async function saveCashCoverage() {
  if (!isQmtAccount.value || !canWrite.value || writeBusy.value || !cashCoverageValid.value) return;
  // computed 不随时钟主动刷新，提交时再次验证，拒绝跨上海午夜后过期的弹窗。
  if (cashCoverage.date !== shanghaiToday()) { cashCoverage.confirmed = false; ElMessage.warning('日期已切换，请重新打开当日资金覆盖确认并核对凭证'); return; }
  const token = epoch; cashCoverageBusy.value = true;
  const body = { date: cashCoverage.date, reason: cashCoverage.reason.trim(), evidence: cashCoverage.evidence.trim() };
  try {
    const result = await confirmProfitCashCoverage(props.accountId, body);
    if (!current(token)) return;
    // 接口可返回采集结果或带审计信息的 capture 包装，保留完整摘要供核对。
    captureResult.value = result.capture ?? result.capture_result ?? result;
    cashCoverageVisible.value = false; cashCoverage.confirmed = false;
    await reload();
    if (current(token)) ElMessage.info(captureMessage(captureResult.value));
  } catch (error) {
    if (current(token)) {
      cashCoverage.confirmed = false;
      ElMessage.warning(`资金覆盖确认或后续采集未确认：${error.message || '网络异常'}；不会自动重发，请先查询健康状态并核对归档。`);
    }
  } finally { if (current(token)) cashCoverageBusy.value = false; }
}

// 开账输入不用浮点转换；所有必填数值均验证十进制字符串，由服务端核验金融约束。
const opening = reactive({ date: '', cash: '', positions: [], reason: '', evidence: '' }); let positionSerial = 0;
function addOpeningPosition() { opening.positions.push({ localId: ++positionSerial, selection: null, stock_code: '', exchange_code: '', stock_name: '', quantity: '', cost_amount: '', market_value: '' }); }
function selectOpeningStock(position, selected) { position.stock_code = selected?.stock_code || ''; position.exchange_code = selected?.exchange_code || ''; position.stock_name = selected?.stock_name || ''; }
async function saveOpening() {
  if (!canWrite.value || writeBusy.value) return;
  const decimal = (input) => /^\d+(?:\.\d+)?$/.test(String(input).trim());
  if (!opening.date || !decimal(opening.cash) || !opening.reason.trim() || !opening.evidence.trim()) { ElMessage.warning('请完整填写日期、非负日初现金、开账原因与来源凭证'); return; }
  if (opening.positions.some((row) => !row.stock_code || !row.exchange_code || !row.stock_name || !decimal(row.quantity) || !decimal(row.cost_amount) || !decimal(row.market_value))) { ElMessage.warning('请为每行选择股票并填写非负十进制数量、总成本和期初市值'); return; }
  const identities = opening.positions.map((row) => `${row.stock_code}|${row.exchange_code}`);
  if (new Set(identities).size !== identities.length) { ElMessage.warning('开账持仓不允许重复股票'); return; }
  const body = { date: opening.date, boundary: 'START_OF_DAY', cash: opening.cash.trim(), reason: opening.reason.trim(), evidence: opening.evidence.trim(), positions: opening.positions.map((row) => ({ stock_code: row.stock_code, exchange_code: row.exchange_code, stock_name: row.stock_name, quantity: row.quantity.trim(), cost_amount: row.cost_amount.trim(), market_value: row.market_value.trim() })) };
  const token = epoch; openingBusy.value = true;
  try { await putProfitOpening(props.accountId, body); if (current(token)) { openingVisible.value = false; await reload(); ElMessage.success('开账已保存，请预览维护以生成账本'); } }
  catch (error) { if (current(token)) ElMessage.error(error.message || '开账结果未确认，请查询状态后核对'); }
  finally { if (current(token)) openingBusy.value = false; }
}

// 切账号销毁所有旧状态、弹窗及定时器；过期请求只允许结束自身，不能污染新账号。
watch(() => props.accountId, () => {
  epoch += 1; stopPolling(); completedTask = ''; data.value = {}; health.value = {}; range.value = [];
  task.value = null; preview.value = null; loadError.value = ''; pollNotice.value = ''; submissionUnknown.value = false;
  loading.value = false; healthReady.value = false; submitting.value = false; previewBusy.value = false; pollBusy.value = false; captureBusy.value = false; openingBusy.value = false;
  captureResult.value = null; openingVisible.value = false; stockFilter.value = null; stockDate.value = ''; calendarStock.value = null;
  cashCoverageVisible.value = false; cashCoverageBusy.value = false;
  Object.assign(cashCoverage, { date: '', reason: '', evidence: '', confirmed: false });
  calendarAnchor.value = shanghaiToday();
  Object.assign(opening, { date: '', cash: '', positions: [], reason: '', evidence: '' });
  Object.assign(repair, { operation: 'fill', scope: 'issues', trade_date: '' }); repairRange.value = [];
  reload();
}, { immediate: true });
onBeforeUnmount(() => { disposed = true; epoch += 1; stopPolling(); });
</script>

<style scoped>
.ledger { --ink: #20324e; --muted: #78869b; color: var(--ink); padding: 8px 0 20px; }
.hero { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 24px; border: 1px solid #e6ecf5; border-radius: 16px; background: linear-gradient(120deg, #f3f7ff, #f8fbfc); }
.eyebrow { color: #5273ad; font-size: 11px; font-weight: 700; letter-spacing: 2px; }
h2 { font-size: 25px; margin: 8px 0; } h3 { margin: 0 0 14px; font-size: 16px; } h4 { margin: 0 0 10px; }
p { line-height: 1.7; } .hero p { margin: 0; color: var(--muted); font-size: 13px; }
.toolbar, .version-bar, .section-title { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.toolbar :deep(.el-date-editor) { max-width: 330px; } .filters { margin: 12px 0 18px; }
.version-bar { padding: 16px 2px; font-size: 12px; color: var(--muted); }
.metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 16px 0 22px; }
.metrics article { display: flex; flex-direction: column; gap: 12px; border: 1px solid #e8edf5; border-radius: 12px; padding: 20px; background: #fff; }
.metrics span, .metrics small { color: var(--muted); font-size: 12px; } .metrics strong { font-size: 23px; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.hint, .muted, .section-title > span { color: var(--muted); font-size: 13px; }
.ledger :deep(.profit-up) { color: #dc4446; } .ledger :deep(.profit-down) { color: #15976a; }
.ledger :deep(.el-table th) { background: #f6f8fc; color: #60718b; } .ledger :deep(.el-pagination) { justify-content: flex-end; padding: 18px 0; overflow-x: auto; }
.section-title { justify-content: space-between; margin-bottom: 16px; } .section-title h3 { margin: 0; }
.chart-shell { border: 1px solid #e8edf5; border-radius: 12px; padding: 18px; margin-bottom: 20px; overflow: auto; }
svg { width: 100%; min-width: 620px; height: 280px; } svg text { fill: #8190a4; font-size: 11px; }
.axis { stroke: #e4eaf3; } .asset-line { fill: none; stroke: #557be7; stroke-width: 2.5; stroke-linejoin: round; } .asset-dot { fill: #557be7; stroke: white; stroke-width: 1.5; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.monthly-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.monthly-card strong { font-size: 24px; font-variant-numeric: tabular-nums; } .monthly-card p { margin: 10px 0; } .annual-details-title { margin-top: 24px; }
.weekday { padding: 12px; text-align: center; color: var(--muted); font-size: 12px; }
.day-cell { padding: 12px; min-height: 100px; border: 1px solid #e7edf5; border-radius: 10px; background: #fff; } .day-cell.blank { border-color: transparent; background: #fafbfd; }
.day-number { font-size: 12px; color: var(--muted); } .day-result { display: flex; flex-direction: column; gap: 5px; padding-top: 9px; font-size: 14px; } .day-result small { font-size: 11px; }
.maintenance-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 16px; }
.card { border: 1px solid #e6ecf5; border-radius: 12px; padding: 22px; background: #fff; min-width: 0; } .task-card, .qmt-card { margin-top: 16px; } .task-stage { margin-left: 12px; }
.preview { margin-top: 20px; border-top: 1px solid #e7edf5; padding-top: 20px; } pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 12px; background: #f6f8fc; border-radius: 8px; max-height: 250px; overflow: auto; font-size: 12px; }
.opening-form { margin-top: 20px; } .opening-head { display: flex; gap: 20px; } .position-row { display: grid; grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(100px, 1fr)) 75px; gap: 10px; align-items: center; }
.position-row :deep(.el-select) { width: 100%; } .opening-form > .el-form-item { margin-top: 20px; }
@media (max-width: 1000px) { .hero { align-items: flex-start; flex-direction: column; } .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .maintenance-grid { grid-template-columns: 1fr; } .position-row { display: flex; flex-wrap: wrap; } .day-cell { padding: 7px; } }
@media (max-width: 600px) { .metrics strong { font-size: 18px; } .calendar-grid { gap: 2px; } .day-result { font-size: 11px; } .day-cell { padding: 4px; min-height: 90px; } .hero { padding: 16px; } }
</style>
