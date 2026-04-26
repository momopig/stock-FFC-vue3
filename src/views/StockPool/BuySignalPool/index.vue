<template>
  <div class="buy-signal-monitor-page">
    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-label">当前信号样本</div>
        <div class="summary-value">
          {{ signalAnalytics.summary.totalSignals }}
        </div>
        <div class="summary-subtext">
          去重股票：{{ signalAnalytics.summary.uniqueStocks }}
        </div>
      </div>
      <div class="summary-card">
        <el-tooltip
          :content="strongestDefinitionTips.config"
          placement="top"
          effect="dark"
          popper-class="strength-definition-tooltip"
        >
          <div class="summary-label summary-label-help">最强配置</div>
        </el-tooltip>
        <div class="summary-value enabled summary-value-compact">
          <el-button
            v-if="signalAnalytics.summary.strongestConfig"
            link
            type="primary"
            @click="
              handleEditByConfigId(signalAnalytics.summary.strongestConfig.id)
            "
          >
            {{ signalAnalytics.summary.strongestConfig.name }}
          </el-button>
          <span v-else>--</span>
        </div>
        <div class="summary-subtext">
          平均涨幅：
          {{
            formatPercent(signalAnalytics.summary.strongestConfig?.avgChange)
          }}
        </div>
      </div>
      <div class="summary-card">
        <el-tooltip
          :content="strongestDefinitionTips.group"
          placement="top"
          effect="dark"
          popper-class="strength-definition-tooltip"
        >
          <div class="summary-label summary-label-help">最强分组</div>
        </el-tooltip>
        <div class="summary-value signal summary-value-compact">
          <el-button
            v-if="signalAnalytics.summary.strongestGroup"
            link
            type="primary"
            @click="
              openGroupInNewTab(signalAnalytics.summary.strongestGroup.id)
            "
          >
            {{ signalAnalytics.summary.strongestGroup.name }}
          </el-button>
          <span v-else>--</span>
        </div>
        <div class="summary-subtext">
          平均涨幅：
          {{ formatPercent(signalAnalytics.summary.strongestGroup?.avgChange) }}
        </div>
      </div>
      <div class="summary-card">
        <el-tooltip
          :content="strongestDefinitionTips.stock"
          placement="top"
          effect="dark"
          popper-class="strength-definition-tooltip"
        >
          <div class="summary-label summary-label-help">最强个股 / 风格</div>
        </el-tooltip>
        <div class="summary-value webhook summary-value-compact">
          <el-button
            v-if="signalAnalytics.summary.strongestStock"
            link
            type="primary"
            @click="
              handleStockCodeClick(signalAnalytics.summary.strongestStock)
            "
          >
            {{ signalAnalytics.summary.strongestStock.stock_name }}
            {{ signalAnalytics.summary.strongestStock.stock_code }}
          </el-button>
          <span v-else>--</span>
        </div>
        <div class="summary-subtext">
          {{ signalAnalytics.summary.marketBiasText }}
        </div>
      </div>
    </div>

    <div class="page-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="监控配置" name="configs">
          <div class="toolbar-row">
            <div class="toolbar-left">
              <el-input
                v-model="configSearchForm.keyword"
                class="toolbar-input"
                clearable
                placeholder="搜索配置名称"
                @keyup.enter="handleConfigSearch"
              />
              <el-select
                v-model="configSearchForm.is_enabled"
                clearable
                placeholder="启用状态"
                class="toolbar-select"
              >
                <el-option :value="true" label="仅启用" />
                <el-option :value="false" label="仅停用" />
              </el-select>
              <el-button type="primary" @click="handleConfigSearch"
                >查询</el-button
              >
              <el-button @click="handleConfigReset">重置</el-button>
            </div>
            <el-button type="primary" @click="handleCreate"
              >新建监控配置</el-button
            >
          </div>

          <el-table
            :data="configList"
            v-loading="tableLoading"
            height="calc(100vh - 360px)"
          >
            <el-table-column type="index" label="序号" width="70" />
            <el-table-column
              prop="name"
              label="配置名称"
              min-width="180"
              show-overflow-tooltip
            />
            <el-table-column label="监控分组" min-width="220">
              <template #default="{ row }">
                <div class="group-tags">
                  <el-tag
                    v-for="groupName in row.group_names || []"
                    :key="groupName"
                    size="small"
                    effect="plain"
                  >
                    {{ groupName }}
                  </el-tag>
                  <span v-if="!row.group_names?.length" class="text-muted"
                    >未绑定分组</span
                  >
                </div>
              </template>
            </el-table-column>
            <el-table-column label="触发条件" min-width="240">
              <template #default="{ row }">
                <div>涨幅：{{ formatChangeRange(row) }}</div>
                <div>量比：{{ formatNumber(row.min_volume_ratio) }}</div>
              </template>
            </el-table-column>
            <el-table-column label="执行策略" min-width="240">
              <template #default="{ row }">
                <div>间隔：{{ row.monitor_interval_seconds }} 秒</div>
                <div>单股日上限：{{ row.max_alerts_per_stock_per_day }} 次</div>
                <div>时段：{{ formatTimeRanges(row.monitor_time_ranges) }}</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.is_enabled"
                  inline-prompt
                  active-text="启用"
                  inactive-text="停用"
                  @change="(value) => handleToggleStatus(row, value)"
                />
              </template>
            </el-table-column>
            <el-table-column label="最近运行" width="180">
              <template #default="{ row }">
                {{ row.last_run_at ? formatDateTime(row.last_run_at) : '--' }}
              </template>
            </el-table-column>
            <el-table-column label="最近成功" width="180">
              <template #default="{ row }">
                {{
                  row.last_success_at
                    ? formatDateTime(row.last_success_at)
                    : '--'
                }}
              </template>
            </el-table-column>
            <el-table-column
              label="最近错误"
              min-width="220"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ row.last_error_message || '--' }}
              </template>
            </el-table-column>
            <el-table-column fixed="right" label="操作" width="320">
              <template #default="{ row }">
                <el-button link type="primary" @click="handleEdit(row)"
                  >编辑</el-button
                >
                <el-button link type="info" @click="handleViewConfigStocks(row)"
                  >查看股票</el-button
                >
                <el-tooltip content="可绕开监控时间段限制" placement="top">
                  <el-button link type="success" @click="handleRun(row)"
                    >立即执行</el-button
                  >
                </el-tooltip>
                <el-button link type="warning" @click="handleViewSignals(row)"
                  >查看信号</el-button
                >
                <el-popconfirm
                  title="确定删除该监控配置吗？历史信号将保留。"
                  confirm-button-text="确定"
                  cancel-button-text="取消"
                  @confirm="handleDelete(row)"
                >
                  <template #reference>
                    <el-button link type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="configPage.pageNo"
              v-model:page-size="configPage.pageSize"
              :total="configPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @current-change="fetchConfigs"
              @size-change="handleConfigSizeChange"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="监控信号" name="signals">
          <div class="toolbar-row">
            <div class="toolbar-left toolbar-wrap">
              <el-select
                v-model="signalSearchForm.config_id"
                clearable
                filterable
                placeholder="配置"
                class="toolbar-select-wide"
              >
                <el-option
                  v-for="item in configOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
              <el-select
                v-model="signalSearchForm.group_id"
                clearable
                filterable
                placeholder="分组"
                class="toolbar-select-wide"
              >
                <el-option
                  v-for="group in groups"
                  :key="group.id"
                  :label="group.name"
                  :value="group.id"
                />
              </el-select>
              <el-select
                v-model="signalSearchForm.signal_type"
                clearable
                placeholder="信号类型"
                class="toolbar-select"
              >
                <el-option label="提醒买入" value="buy_alert" />
                <el-option label="提醒上涨" value="rise_alert" />
                <el-option label="提醒卖出" value="sell_alert" />
              </el-select>
              <el-input
                v-model="signalSearchForm.stock_code"
                clearable
                placeholder="股票代码"
                class="toolbar-input"
                @keyup.enter="handleSignalSearch"
              />
              <el-input
                v-model="signalSearchForm.stock_name"
                clearable
                placeholder="股票名称"
                class="toolbar-input"
                @keyup.enter="handleSignalSearch"
              />
              <el-date-picker
                v-model="signalSearchForm.date_range"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                :shortcuts="signalDateShortcuts"
                class="toolbar-date-range"
              />
              <el-button type="primary" @click="handleSignalSearch"
                >查询</el-button
              >
              <el-button @click="handleSignalReset">重置</el-button>
            </div>
          </div>

          <div class="signal-list-header text-muted">
            统计分析已独立到“统计分析”页签，当前页面更聚焦信号列表。
          </div>

          <el-table
            :data="signalList"
            v-loading="signalLoading"
            height="calc(100vh - 300px)"
          >
            <el-table-column label="时间" width="180">
              <template #default="{ row }">{{
                formatDateTime(row.created_at)
              }}</template>
            </el-table-column>
            <el-table-column
              label="配置名"
              min-width="160"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  @click="handleEditByConfigId(row.config_id)"
                >
                  {{ row.config_name || '--' }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column
              prop="group_name"
              label="分组名"
              min-width="120"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <el-button link type="primary" @click="handleGroupClick(row)">
                  {{ row.group_name || '--' }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="股票" min-width="160">
              <template #default="{ row }">
                <div class="stock-link-text" @click="handleStockCodeClick(row)">
                  {{ row.stock_name }}
                </div>
                <div
                  class="text-muted stock-link-code"
                  @click="handleStockCodeClick(row)"
                >
                  {{ row.stock_code }}
                </div>
              </template>
            </el-table-column>
            <el-table-column label="信号类型" width="110">
              <template #default="{ row }">
                <el-tag
                  :type="getSignalTagType(row.signal_type)"
                  effect="light"
                  >{{ getSignalTypeLabel(row.signal_type) }}</el-tag
                >
              </template>
            </el-table-column>
            <el-table-column label="当前价" width="100">
              <template #default="{ row }">{{
                formatNumber(row.current_price)
              }}</template>
            </el-table-column>
            <el-table-column
              prop="change_pct"
              label="涨幅"
              width="100"
              sortable
              :sort-method="signalSortMethods.change_pct"
            >
              <template #default="{ row }">{{
                formatPercent(row.change_pct)
              }}</template>
            </el-table-column>
            <el-table-column
              prop="volume_ratio"
              label="量比"
              width="100"
              sortable
              :sort-method="signalSortMethods.volume_ratio"
            >
              <template #default="{ row }">{{
                formatNumber(row.volume_ratio)
              }}</template>
            </el-table-column>
            <el-table-column
              prop="turnover_rate"
              label="换手率"
              width="100"
              sortable
              :sort-method="signalSortMethods.turnover_rate"
            >
              <template #default="{ row }">{{
                formatPercent(row.turnover_rate)
              }}</template>
            </el-table-column>
            <el-table-column
              prop="signal_detail"
              label="信号详情"
              min-width="260"
              show-overflow-tooltip
            />
            <el-table-column label="webhook" width="120">
              <template #default="{ row }">
                <el-tag
                  :type="row.webhook_sent ? 'success' : 'info'"
                  effect="plain"
                >
                  {{ row.webhook_sent ? '已发送' : '未发送' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column fixed="right" label="操作" width="140">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  @click="handleViewSignalDetail(row)"
                  >详情</el-button
                >
                <el-popconfirm
                  title="确定删除该监控信号吗？"
                  confirm-button-text="确定"
                  cancel-button-text="取消"
                  @confirm="handleDeleteSignal(row)"
                >
                  <template #reference>
                    <el-button link type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="signalPage.pageNo"
              v-model:page-size="signalPage.pageSize"
              :total="signalPage.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @current-change="fetchSignals"
              @size-change="handleSignalSizeChange"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="统计分析" name="analytics">
          <div class="toolbar-row">
            <div class="toolbar-left toolbar-wrap">
              <el-select
                v-model="signalSearchForm.config_id"
                clearable
                filterable
                placeholder="配置"
                class="toolbar-select-wide"
              >
                <el-option
                  v-for="item in configOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
              <el-select
                v-model="signalSearchForm.group_id"
                clearable
                filterable
                placeholder="分组"
                class="toolbar-select-wide"
              >
                <el-option
                  v-for="group in groups"
                  :key="group.id"
                  :label="group.name"
                  :value="group.id"
                />
              </el-select>
              <el-select
                v-model="signalSearchForm.signal_type"
                clearable
                placeholder="信号类型"
                class="toolbar-select"
              >
                <el-option label="提醒买入" value="buy_alert" />
                <el-option label="提醒上涨" value="rise_alert" />
                <el-option label="提醒卖出" value="sell_alert" />
              </el-select>
              <el-input
                v-model="signalSearchForm.stock_code"
                clearable
                placeholder="股票代码"
                class="toolbar-input"
                @keyup.enter="handleSignalSearch"
              />
              <el-input
                v-model="signalSearchForm.stock_name"
                clearable
                placeholder="股票名称"
                class="toolbar-input"
                @keyup.enter="handleSignalSearch"
              />
              <el-date-picker
                v-model="signalSearchForm.date_range"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                :shortcuts="signalDateShortcuts"
                class="toolbar-date-range"
              />
              <el-button type="primary" @click="handleSignalSearch"
                >查询</el-button
              >
              <el-button @click="handleSignalReset">重置</el-button>
            </div>
          </div>

          <div class="signal-dashboard" v-loading="signalAnalyticsLoading">
            <div class="signal-dashboard-header">
              <div>
                <div class="signal-dashboard-title">信号统计驾驶舱</div>
                <div class="signal-dashboard-subtitle text-muted">
                  基于当前筛选条件统计
                  <template v-if="signalAnalyticsMeta.total">
                    ，已加载 {{ signalAnalyticsMeta.loaded }} /
                    {{ signalAnalyticsMeta.total }} 条信号
                  </template>
                  <template v-if="signalAnalyticsMeta.truncated">
                    （已截取样本）
                  </template>
                </div>
              </div>
              <el-tag effect="plain" type="info">
                正涨占比
                {{ formatPercent(signalAnalytics.summary.positiveRate) }}
              </el-tag>
            </div>

            <div class="signal-summary-grid">
              <div class="signal-summary-card">
                <div class="signal-summary-label">样本信号数</div>
                <div class="signal-summary-value">
                  {{ signalAnalytics.summary.totalSignals }}
                </div>
              </div>
              <el-popover
                trigger="hover"
                placement="bottom-start"
                :width="420"
                popper-class="signal-summary-popover"
              >
                <template #reference>
                  <div
                    class="signal-summary-card signal-summary-card-hoverable"
                  >
                    <div class="signal-summary-label">去重股票数</div>
                    <div class="signal-summary-value signal-summary-stock">
                      {{ signalAnalytics.summary.uniqueStocks }}
                    </div>
                  </div>
                </template>
                <div class="signal-summary-popover-title">去重股票列表</div>
                <div class="signal-summary-popover-subtitle text-muted">
                  按命中次数、最大涨幅排序
                </div>
                <div class="signal-summary-popover-list">
                  <div
                    v-for="item in signalAnalytics.details.uniqueStocks"
                    :key="`unique-stock-${item.stock_code}-${item.stock_name}`"
                    class="signal-summary-popover-item"
                  >
                    <div class="signal-summary-popover-main">
                      <div class="signal-summary-popover-name">
                        {{ item.stock_name || '--' }}
                        {{ item.stock_code || '' }}
                      </div>
                      <div class="signal-summary-popover-meta text-muted">
                        命中 {{ item.signalCount }} · 最大涨幅
                        {{ formatPercent(item.maxChange) }}
                      </div>
                    </div>
                    <el-button
                      link
                      type="primary"
                      @click="handleStockCodeClick(item)"
                    >
                      查看
                    </el-button>
                  </div>
                </div>
              </el-popover>
              <el-popover
                trigger="hover"
                placement="bottom-start"
                :width="420"
                popper-class="signal-summary-popover"
              >
                <template #reference>
                  <div
                    class="signal-summary-card signal-summary-card-hoverable"
                  >
                    <div class="signal-summary-label">命中配置数</div>
                    <div class="signal-summary-value signal-summary-config">
                      {{ signalAnalytics.summary.hitConfigs }}
                    </div>
                  </div>
                </template>
                <div class="signal-summary-popover-title">命中配置列表</div>
                <div class="signal-summary-popover-subtitle text-muted">
                  按综合强度分排序
                </div>
                <div class="signal-summary-popover-list">
                  <div
                    v-for="item in signalAnalytics.details.hitConfigs"
                    :key="`hit-config-${item.id || item.name}`"
                    class="signal-summary-popover-item"
                  >
                    <div class="signal-summary-popover-main">
                      <div class="signal-summary-popover-name">
                        {{ item.name }}
                      </div>
                      <div class="signal-summary-popover-meta text-muted">
                        命中 {{ item.signalCount }} · 平均涨幅
                        {{ formatPercent(item.avgChange) }} · 强度
                        {{ formatNumber(item.strengthScore) }}
                      </div>
                    </div>
                    <el-button
                      link
                      type="primary"
                      @click="handleEditByConfigId(item.id)"
                    >
                      查看
                    </el-button>
                  </div>
                </div>
              </el-popover>
              <el-popover
                trigger="hover"
                placement="bottom-start"
                :width="420"
                popper-class="signal-summary-popover"
              >
                <template #reference>
                  <div
                    class="signal-summary-card signal-summary-card-hoverable"
                  >
                    <div class="signal-summary-label">命中分组数</div>
                    <div class="signal-summary-value signal-summary-group">
                      {{ signalAnalytics.summary.hitGroups }}
                    </div>
                  </div>
                </template>
                <div class="signal-summary-popover-title">命中分组列表</div>
                <div class="signal-summary-popover-subtitle text-muted">
                  按综合强度分排序
                </div>
                <div class="signal-summary-popover-list">
                  <div
                    v-for="item in signalAnalytics.details.hitGroups"
                    :key="`hit-group-${item.id || item.name}`"
                    class="signal-summary-popover-item"
                  >
                    <div class="signal-summary-popover-main">
                      <div class="signal-summary-popover-name">
                        {{ item.name }}
                      </div>
                      <div class="signal-summary-popover-meta text-muted">
                        命中 {{ item.signalCount }} · 平均涨幅
                        {{ formatPercent(item.avgChange) }} · 龙头
                        {{ item.leaderStockName || '--' }}
                      </div>
                    </div>
                    <el-button
                      link
                      type="primary"
                      @click="openGroupInNewTab(item.id)"
                    >
                      查看
                    </el-button>
                  </div>
                </div>
              </el-popover>
              <el-popover
                trigger="hover"
                placement="bottom-start"
                :width="420"
                popper-class="signal-summary-popover"
              >
                <template #reference>
                  <div
                    class="signal-summary-card signal-summary-card-hoverable"
                  >
                    <div class="signal-summary-label">最大涨幅</div>
                    <div class="signal-summary-value signal-summary-rise">
                      {{ formatPercent(signalAnalytics.summary.maxChangePct) }}
                    </div>
                    <div class="signal-summary-subtext text-muted">
                      {{ signalAnalytics.summary.maxChangeStockLabel || '--' }}
                    </div>
                  </div>
                </template>
                <div class="signal-summary-popover-title">
                  最大涨幅 Top 列表
                </div>
                <div class="signal-summary-popover-subtitle text-muted">
                  按个股最大涨幅从高到低排序
                </div>
                <div class="signal-summary-popover-list">
                  <div
                    v-for="item in signalAnalytics.details.maxChangeStocks"
                    :key="`max-change-${item.stock_code}-${item.stock_name}`"
                    class="signal-summary-popover-item"
                  >
                    <div class="signal-summary-popover-main">
                      <div class="signal-summary-popover-name">
                        {{ item.stock_name || '--' }}
                        {{ item.stock_code || '' }}
                      </div>
                      <div class="signal-summary-popover-meta text-muted">
                        最大涨幅 {{ formatPercent(item.maxChange) }} · 命中
                        {{ item.signalCount }}
                      </div>
                    </div>
                    <el-button
                      link
                      type="primary"
                      @click="handleStockCodeClick(item)"
                    >
                      查看
                    </el-button>
                  </div>
                </div>
              </el-popover>
              <el-popover
                trigger="hover"
                placement="bottom-start"
                :width="420"
                popper-class="signal-summary-popover"
              >
                <template #reference>
                  <div
                    class="signal-summary-card signal-summary-card-hoverable"
                  >
                    <div class="signal-summary-label">最小涨幅</div>
                    <div class="signal-summary-value signal-summary-fall">
                      {{ formatPercent(signalAnalytics.summary.minChangePct) }}
                    </div>
                    <div class="signal-summary-subtext text-muted">
                      {{ signalAnalytics.summary.minChangeStockLabel || '--' }}
                    </div>
                  </div>
                </template>
                <div class="signal-summary-popover-title">
                  最小涨幅 Top 列表
                </div>
                <div class="signal-summary-popover-subtitle text-muted">
                  按个股最小涨幅从低到高排序
                </div>
                <div class="signal-summary-popover-list">
                  <div
                    v-for="item in signalAnalytics.details.minChangeStocks"
                    :key="`min-change-${item.stock_code}-${item.stock_name}`"
                    class="signal-summary-popover-item"
                  >
                    <div class="signal-summary-popover-main">
                      <div class="signal-summary-popover-name">
                        {{ item.stock_name || '--' }}
                        {{ item.stock_code || '' }}
                      </div>
                      <div class="signal-summary-popover-meta text-muted">
                        最小涨幅 {{ formatPercent(item.minChange) }} · 命中
                        {{ item.signalCount }}
                      </div>
                    </div>
                    <el-button
                      link
                      type="primary"
                      @click="handleStockCodeClick(item)"
                    >
                      查看
                    </el-button>
                  </div>
                </div>
              </el-popover>
              <el-popover
                trigger="hover"
                placement="bottom-start"
                :width="420"
                popper-class="signal-summary-popover"
              >
                <template #reference>
                  <div
                    class="signal-summary-card signal-summary-card-hoverable"
                  >
                    <div class="signal-summary-label">最大量比</div>
                    <div class="signal-summary-value signal-summary-fluid">
                      {{ formatNumber(signalAnalytics.summary.maxVolumeRatio) }}
                    </div>
                    <div class="signal-summary-subtext text-muted">
                      {{
                        signalAnalytics.summary.maxVolumeRatioStockLabel || '--'
                      }}
                    </div>
                  </div>
                </template>
                <div class="signal-summary-popover-title">
                  最大量比 Top 列表
                </div>
                <div class="signal-summary-popover-subtitle text-muted">
                  按个股最大量比从高到低排序
                </div>
                <div class="signal-summary-popover-list">
                  <div
                    v-for="item in signalAnalytics.details.maxVolumeRatioStocks"
                    :key="`max-volume-${item.stock_code}-${item.stock_name}`"
                    class="signal-summary-popover-item"
                  >
                    <div class="signal-summary-popover-main">
                      <div class="signal-summary-popover-name">
                        {{ item.stock_name || '--' }}
                        {{ item.stock_code || '' }}
                      </div>
                      <div class="signal-summary-popover-meta text-muted">
                        最大量比 {{ formatNumber(item.maxVolumeRatio) }} · 命中
                        {{ item.signalCount }}
                      </div>
                    </div>
                    <el-button
                      link
                      type="primary"
                      @click="handleStockCodeClick(item)"
                    >
                      查看
                    </el-button>
                  </div>
                </div>
              </el-popover>
              <el-popover
                trigger="hover"
                placement="bottom-start"
                :width="420"
                popper-class="signal-summary-popover"
              >
                <template #reference>
                  <div
                    class="signal-summary-card signal-summary-card-hoverable"
                  >
                    <div class="signal-summary-label">最大换手率</div>
                    <div class="signal-summary-value signal-summary-fluid">
                      {{
                        formatPercent(signalAnalytics.summary.maxTurnoverRate)
                      }}
                    </div>
                    <div class="signal-summary-subtext text-muted">
                      {{
                        signalAnalytics.summary.maxTurnoverRateStockLabel ||
                        '--'
                      }}
                    </div>
                  </div>
                </template>
                <div class="signal-summary-popover-title">
                  最大换手率 Top 列表
                </div>
                <div class="signal-summary-popover-subtitle text-muted">
                  按个股最大换手率从高到低排序
                </div>
                <div class="signal-summary-popover-list">
                  <div
                    v-for="item in signalAnalytics.details
                      .maxTurnoverRateStocks"
                    :key="`max-turnover-${item.stock_code}-${item.stock_name}`"
                    class="signal-summary-popover-item"
                  >
                    <div class="signal-summary-popover-main">
                      <div class="signal-summary-popover-name">
                        {{ item.stock_name || '--' }}
                        {{ item.stock_code || '' }}
                      </div>
                      <div class="signal-summary-popover-meta text-muted">
                        最大换手率 {{ formatPercent(item.maxTurnoverRate) }} ·
                        命中
                        {{ item.signalCount }}
                      </div>
                    </div>
                    <el-button
                      link
                      type="primary"
                      @click="handleStockCodeClick(item)"
                    >
                      查看
                    </el-button>
                  </div>
                </div>
              </el-popover>
            </div>

            <template v-if="signalAnalytics.summary.totalSignals">
              <div class="signal-panel-grid">
                <div class="signal-panel">
                  <div class="signal-panel-title">快速结论</div>
                  <div class="signal-highlight-list">
                    <div class="signal-highlight-item">
                      <el-tooltip
                        :content="strongestDefinitionTips.config"
                        placement="top"
                        effect="dark"
                        popper-class="strength-definition-tooltip"
                      >
                        <span class="signal-highlight-label signal-help-label"
                          >最强配置</span
                        >
                      </el-tooltip>
                      <span class="signal-highlight-content">
                        <el-button
                          v-if="signalAnalytics.summary.strongestConfig"
                          link
                          type="primary"
                          @click="
                            handleEditByConfigId(
                              signalAnalytics.summary.strongestConfig.id
                            )
                          "
                        >
                          {{ signalAnalytics.summary.strongestConfig.name }}
                        </el-button>
                        <span v-else>--</span>
                        <span class="text-muted">
                          强度
                          {{
                            formatNumber(
                              signalAnalytics.summary.strongestConfig
                                ?.strengthScore
                            )
                          }}
                        </span>
                      </span>
                    </div>
                    <div class="signal-highlight-item">
                      <el-tooltip
                        :content="strongestDefinitionTips.group"
                        placement="top"
                        effect="dark"
                        popper-class="strength-definition-tooltip"
                      >
                        <span class="signal-highlight-label signal-help-label"
                          >最强分组</span
                        >
                      </el-tooltip>
                      <span class="signal-highlight-content">
                        <el-button
                          v-if="signalAnalytics.summary.strongestGroup"
                          link
                          type="primary"
                          @click="
                            openGroupInNewTab(
                              signalAnalytics.summary.strongestGroup.id
                            )
                          "
                        >
                          {{ signalAnalytics.summary.strongestGroup.name }}
                        </el-button>
                        <span v-else>--</span>
                        <span class="text-muted">
                          平均涨幅
                          {{
                            formatPercent(
                              signalAnalytics.summary.strongestGroup?.avgChange
                            )
                          }}
                        </span>
                      </span>
                    </div>
                    <div class="signal-highlight-item">
                      <el-tooltip
                        :content="strongestDefinitionTips.stock"
                        placement="top"
                        effect="dark"
                        popper-class="strength-definition-tooltip"
                      >
                        <span class="signal-highlight-label signal-help-label"
                          >最强个股</span
                        >
                      </el-tooltip>
                      <span class="signal-highlight-content">
                        <el-button
                          v-if="signalAnalytics.summary.strongestStock"
                          link
                          type="primary"
                          @click="
                            handleStockCodeClick(
                              signalAnalytics.summary.strongestStock
                            )
                          "
                        >
                          {{
                            signalAnalytics.summary.strongestStock.stock_name
                          }}
                          {{
                            signalAnalytics.summary.strongestStock.stock_code
                          }}
                        </el-button>
                        <span v-else>--</span>
                        <span class="text-muted">
                          最高涨幅
                          {{
                            formatPercent(
                              signalAnalytics.summary.strongestStock?.maxChange
                            )
                          }}
                        </span>
                      </span>
                    </div>
                    <div class="signal-highlight-item">
                      <span class="signal-highlight-label">当前风格</span>
                      <span class="signal-highlight-content">
                        {{ signalAnalytics.summary.marketBiasText }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="signal-panel">
                  <el-tooltip
                    :content="rankingDefinitionTips.config"
                    placement="top"
                    effect="dark"
                    popper-class="strength-definition-tooltip"
                  >
                    <div class="signal-panel-title signal-help-label">
                      配置强度榜
                    </div>
                  </el-tooltip>
                  <div
                    v-for="(item, index) in signalAnalytics.configRankings"
                    :key="`config-${item.id || item.name}`"
                    class="signal-rank-row"
                  >
                    <div class="signal-rank-index">{{ index + 1 }}</div>
                    <div class="signal-rank-main">
                      <el-button
                        link
                        type="primary"
                        @click="handleEditByConfigId(item.id)"
                      >
                        {{ item.name }}
                      </el-button>
                      <div class="signal-rank-meta text-muted">
                        命中 {{ item.signalCount }} · 去重股票
                        {{ item.stockCount }} · 最大涨幅
                        {{ formatPercent(item.maxChange) }}
                      </div>
                    </div>
                    <div class="signal-rank-value">
                      {{ formatPercent(item.avgChange) }}
                    </div>
                  </div>
                </div>

                <div class="signal-panel">
                  <el-tooltip
                    :content="rankingDefinitionTips.group"
                    placement="top"
                    effect="dark"
                    popper-class="strength-definition-tooltip"
                  >
                    <div class="signal-panel-title signal-help-label">
                      分组强度榜
                    </div>
                  </el-tooltip>
                  <div
                    v-for="(item, index) in signalAnalytics.groupRankings"
                    :key="`group-${item.id || item.name}`"
                    class="signal-rank-row"
                  >
                    <div class="signal-rank-index">{{ index + 1 }}</div>
                    <div class="signal-rank-main">
                      <el-button
                        link
                        type="primary"
                        @click="openGroupInNewTab(item.id)"
                      >
                        {{ item.name }}
                      </el-button>
                      <div class="signal-rank-meta text-muted">
                        命中 {{ item.signalCount }} · 去重股票
                        {{ item.stockCount }} · 龙头
                        {{ item.leaderStockName || '--' }}
                      </div>
                    </div>
                    <div class="signal-rank-value">
                      {{ formatPercent(item.avgChange) }}
                    </div>
                  </div>
                </div>

                <div class="signal-panel">
                  <el-tooltip
                    :content="rankingDefinitionTips.stock"
                    placement="top"
                    effect="dark"
                    popper-class="strength-definition-tooltip"
                  >
                    <div class="signal-panel-title signal-help-label">
                      最强个股榜
                    </div>
                  </el-tooltip>
                  <div
                    v-for="(item, index) in signalAnalytics.stockRankings"
                    :key="`stock-${item.stock_code}-${item.stock_name}`"
                    class="signal-rank-row"
                  >
                    <div class="signal-rank-index">{{ index + 1 }}</div>
                    <div class="signal-rank-main">
                      <el-button
                        link
                        type="primary"
                        @click="handleStockCodeClick(item)"
                      >
                        {{ item.stock_name || '--' }}
                        {{ item.stock_code || '' }}
                      </el-button>
                      <div class="signal-rank-meta text-muted">
                        命中 {{ item.signalCount }} · 配置
                        {{ item.configCount }} · 分组 {{ item.groupCount }}
                      </div>
                    </div>
                    <div class="signal-rank-value">
                      {{ formatPercent(item.maxChange) }}
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <div v-else class="signal-dashboard-empty text-muted">
              当前筛选条件下暂无可统计的监控信号
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <ConfigDialog
      v-model:visible="dialogVisible"
      :form-data="dialogForm"
      :groups="groups"
      :mode="dialogMode"
      :submitting="dialogSubmitting"
      @submit="handleSubmit"
    />

    <el-drawer
      v-model="configStocksVisible"
      :title="configStocksDrawerTitle"
      size="92%"
      destroy-on-close
    >
      <div class="config-stock-drawer">
        <div class="config-stock-summary">
          <div class="config-stock-summary-main">
            <span>已合并分组股票 {{ configStockPage.total }} 只</span>
            <span class="text-muted">
              分组数：{{ currentConfigGroupNames.length }}
            </span>
          </div>
          <div class="group-tags">
            <el-tag
              v-for="groupName in currentConfigGroupNames"
              :key="groupName"
              size="small"
              effect="plain"
            >
              {{ groupName }}
            </el-tag>
          </div>
        </div>

        <StockInsights
          :insightsData="configStockInsightsData"
          :showBasicStats="false"
        />

        <StockList
          :stockList="configStockDisplayList"
          :loading="configStockLoading"
          :total="configStockPage.total"
          :currentPage="configStockPage.pageNo"
          :pageSize="configStockPage.pageSize"
          :isSelfSelected="true"
          :showAddButton="false"
          :showAddToSelfButton="false"
          :showActionColumn="false"
          @page-change="handleConfigStockPageChange"
          @size-change="handleConfigStockPageSizeChange"
          @search="handleConfigStockSearch"
        />
      </div>
    </el-drawer>

    <el-drawer
      v-model="signalDetailVisible"
      title="监控信号详情"
      size="520px"
      destroy-on-close
    >
      <div
        v-loading="signalDetailLoading"
        class="signal-detail"
        v-if="signalDetail"
      >
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">配置名称</span
            ><span>{{ signalDetail.config_name || '--' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">分组名称</span
            ><span>{{ signalDetail.group_name || '--' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">股票</span
            ><span
              >{{ signalDetail.stock_name || '--' }}（{{
                signalDetail.stock_code || '--'
              }}）</span
            >
          </div>
          <div class="detail-item">
            <span class="detail-label">信号类型</span
            ><span>{{ getSignalTypeLabel(signalDetail.signal_type) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">当前价</span
            ><span>{{ formatNumber(signalDetail.current_price) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">涨幅</span
            ><span>{{ formatPercent(signalDetail.change_pct) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">量比</span
            ><span>{{ formatNumber(signalDetail.volume_ratio) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">换手率</span
            ><span>{{ formatPercent(signalDetail.turnover_rate) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">交易日</span
            ><span>{{ signalDetail.trading_date || '--' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">创建时间</span
            ><span>{{
              signalDetail.created_at
                ? formatDateTime(signalDetail.created_at)
                : '--'
            }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Webhook 状态</span
            ><span>{{ signalDetail.webhook_sent ? '已发送' : '未发送' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Webhook 结果</span
            ><span>{{ signalDetail.webhook_result || '--' }}</span>
          </div>
        </div>
        <div class="detail-block">
          <div class="detail-block-title">信号详情</div>
          <div class="detail-block-content">
            {{ signalDetail.signal_detail || '--' }}
          </div>
        </div>
        <div class="detail-block">
          <div class="detail-block-title">行情快照</div>
          <pre class="json-block">{{ formattedQuotePayload }}</pre>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';

import {
  createGroupMonitorConfig,
  deleteGroupMonitorConfig,
  deleteGroupMonitorSignal,
  getGroupMonitorConfigDetail,
  getGroupMonitorConfigs,
  getGroupMonitorSignalDetail,
  getGroupMonitorSignals,
  runGroupMonitorConfig,
  toggleGroupMonitorConfigStatus,
  updateGroupMonitorConfig,
} from '@/api/modules/groupMonitor';
import {
  getGroupStocksByGroups,
  getUserGroups,
} from '@/api/modules/stockGroup';
import StockInsights from '@/components/StockInsights/index.vue';
import StockList from '@/components/StockList/index.vue';
import ConfigDialog from './components/ConfigDialog.vue';
import { calculateDaysAdded, formatDateTime } from '@/utils/time';
import { useStockInsights } from '../composables/useStockInsights';
import { mapQuoteToFlatRowFields } from '../utils/stockQuoteFields';

const route = useRoute();
const router = useRouter();

const activeTab = ref('configs');
const tableLoading = ref(false);
const signalLoading = ref(false);
const dialogVisible = ref(false);
const dialogSubmitting = ref(false);
const dialogMode = ref('create');
const groups = ref([]);
const configList = ref([]);
const configOptions = ref([]);
const signalList = ref([]);
const dialogForm = ref({});
const configStocksVisible = ref(false);
const configStockLoading = ref(false);
const configStockAllList = ref([]);
const currentConfigStockMeta = ref(null);
const signalDetailVisible = ref(false);
const signalDetailLoading = ref(false);
const signalDetail = ref(null);
const signalAnalyticsLoading = ref(false);
const signalAnalyticsRows = ref([]);

const signalAnalyticsMeta = reactive({
  loaded: 0,
  total: 0,
  truncated: false,
});

const configSearchForm = reactive({
  keyword: '',
  is_enabled: undefined,
});

const signalSearchForm = reactive({
  config_id: undefined,
  group_id: undefined,
  signal_type: '',
  stock_code: '',
  stock_name: '',
  date_range: [],
});

const configPage = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0,
});

const signalPage = reactive({
  pageNo: 1,
  pageSize: 100,
  total: 0,
});

const configStockPage = reactive({
  pageNo: 1,
  pageSize: 50,
  total: 0,
});

const configStockSearchParams = reactive({
  stock_code: '',
  stock_name: '',
  exchange_code: '',
  snapshot_date: '',
});

const buildRecentDateShortcut = (text, getStartDate) => ({
  text,
  value: () => {
    const end = new Date();
    const start = getStartDate(new Date(end));
    return [start, end];
  },
});

const signalDateShortcuts = [
  buildRecentDateShortcut('最近3日', (date) => {
    date.setDate(date.getDate() - 2);
    return date;
  }),
  buildRecentDateShortcut('最近5日', (date) => {
    date.setDate(date.getDate() - 4);
    return date;
  }),
  buildRecentDateShortcut('最近10日', (date) => {
    date.setDate(date.getDate() - 9);
    return date;
  }),
  buildRecentDateShortcut('最近20日', (date) => {
    date.setDate(date.getDate() - 19);
    return date;
  }),
  buildRecentDateShortcut('最近1个月', (date) => {
    date.setMonth(date.getMonth() - 1);
    return date;
  }),
];

const toSortableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const compareNullableNumberByKey = (a, b, key) => {
  const leftValue = toSortableNumber(a?.[key]);
  const rightValue = toSortableNumber(b?.[key]);

  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;

  return leftValue - rightValue;
};

const signalSortMethods = {
  change_pct: (a, b) => compareNullableNumberByKey(a, b, 'change_pct'),
  volume_ratio: (a, b) => compareNullableNumberByKey(a, b, 'volume_ratio'),
  turnover_rate: (a, b) => compareNullableNumberByKey(a, b, 'turnover_rate'),
};

const strongestDefinitionTips = {
  config:
    '最强配置 = 综合强度分最高。\n计算逻辑：平均涨幅×4 + 最大涨幅×2 + 平均量比×1.5 + 平均换手率×1 + 命中次数归一化×6 + 正涨占比×3。\n其中：命中次数归一化 = 当前配置命中次数 ÷ 配置榜最高命中次数；正涨占比 = 正涨信号数 ÷ 有涨幅信号数。\n结论含义：不是只看命中数量，而是优先找“涨得更强、放量更明显、持续命中更多”的配置。',
  group:
    '最强分组 = 综合强度分最高。\n计算逻辑：平均涨幅×4 + 最大涨幅×2 + 平均量比×1.5 + 平均换手率×1 + 命中次数归一化×6 + 正涨占比×3。\n其中：命中次数归一化 = 当前分组命中次数 ÷ 分组榜最高命中次数。\n结论含义：优先找“组内整体更强、信号更多、正涨一致性更高”的分组，而不是只看单只龙头。',
  stock:
    '最强个股 = 个股热度分最高；风格 = 当前样本整体强弱结论。\n个股热度分计算逻辑：最大涨幅×4 + 平均涨幅×2 + 平均量比×1.5 + 平均换手率×1 + 命中配置数×2 + 命中分组数×1.5 + 重复命中次数归一化×4。\n其中：重复命中次数归一化 = 当前个股命中次数 ÷ 个股榜最高命中次数。\n风格结论逻辑：正涨占比≥70% 且平均涨幅≥3% = 高强度共振；正涨占比≥55% 且平均涨幅≥1% = 偏强运行；平均涨幅<0 = 整体偏弱；其余 = 强弱分化。',
};

const rankingDefinitionTips = {
  config:
    '配置强度榜 = 按 strengthScore 从高到低排序。\nstrengthScore = 平均涨幅×4 + 最大涨幅×2 + 平均量比×1.5 + 平均换手率×1 + 命中次数归一化×6 + 正涨占比×3。\n同分时：先比平均涨幅，再比命中次数。\n卡片右侧显示的是“平均涨幅”，不是最终排名分；真正排序依据是综合强度分。',
  group:
    '分组强度榜 = 按 strengthScore 从高到低排序。\nstrengthScore = 平均涨幅×4 + 最大涨幅×2 + 平均量比×1.5 + 平均换手率×1 + 命中次数归一化×6 + 正涨占比×3。\n同分时：先比平均涨幅，再比命中次数。\n榜单更强调“分组整体强度 + 一致性 + 持续命中”，不是只看单只龙头。',
  stock:
    '最强个股榜 = 按 hotScore 从高到低排序。\nhotScore = 最大涨幅×4 + 平均涨幅×2 + 平均量比×1.5 + 平均换手率×1 + 命中配置数×2 + 命中分组数×1.5 + 重复命中次数归一化×4。\n同分时：先比平均涨幅，再比命中次数。\n卡片右侧显示的是“最高涨幅”，不是最终排名分；真正排序依据是综合热度分。',
};

const SIGNAL_ANALYTICS_PAGE_SIZE = 200;
const SIGNAL_ANALYTICS_MAX_RECORDS = 1000;
const SIGNAL_ANALYTICS_TOP_COUNT = 5;

const sumAverage = (sum, count) => (count ? sum / count : null);

const toSignalTimeValue = (value) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const toStockKey = (item) =>
  `${item?.exchange_code || ''}::${item?.stock_code || ''}`;

const toStockDisplayName = (item) => {
  if (!item) return '--';
  const stockName = item.stock_name || '--';
  const stockCode = item.stock_code || '--';
  return `${stockName} ${stockCode}`;
};

const createSignalAggregate = (seed = {}) => ({
  ...seed,
  signalCount: 0,
  stockSet: new Set(),
  configSet: new Set(),
  groupSet: new Set(),
  changeSum: 0,
  changeCount: 0,
  volumeSum: 0,
  volumeCount: 0,
  turnoverSum: 0,
  turnoverCount: 0,
  positiveCount: 0,
  maxChange: null,
  minChange: null,
  lastSignalAt: '',
  leaderStockName: '',
  leaderStockCode: '',
});

const applySignalMetrics = (entry, item) => {
  entry.signalCount += 1;

  const stockKey = toStockKey(item);
  if (stockKey !== '::') {
    entry.stockSet.add(stockKey);
  }
  if (
    item?.config_id !== null &&
    item?.config_id !== undefined &&
    item?.config_id !== ''
  ) {
    entry.configSet.add(String(item.config_id));
  }
  if (
    item?.group_id !== null &&
    item?.group_id !== undefined &&
    item?.group_id !== ''
  ) {
    entry.groupSet.add(String(item.group_id));
  }

  const changePct = toSortableNumber(item?.change_pct);
  if (changePct !== null) {
    entry.changeSum += changePct;
    entry.changeCount += 1;
    if (changePct > 0) {
      entry.positiveCount += 1;
    }
    if (entry.maxChange === null || changePct > entry.maxChange) {
      entry.maxChange = changePct;
      entry.leaderStockName = item?.stock_name || '';
      entry.leaderStockCode = item?.stock_code || '';
    }
    if (entry.minChange === null || changePct < entry.minChange) {
      entry.minChange = changePct;
    }
  }

  const volumeRatio = toSortableNumber(item?.volume_ratio);
  if (volumeRatio !== null) {
    entry.volumeSum += volumeRatio;
    entry.volumeCount += 1;
  }

  const turnoverRate = toSortableNumber(item?.turnover_rate);
  if (turnoverRate !== null) {
    entry.turnoverSum += turnoverRate;
    entry.turnoverCount += 1;
  }

  if (
    toSignalTimeValue(item?.created_at) > toSignalTimeValue(entry.lastSignalAt)
  ) {
    entry.lastSignalAt = item?.created_at || '';
  }
};

const finalizeSignalAggregate = (entry) => ({
  ...entry,
  stockCount: entry.stockSet.size,
  configCount: entry.configSet.size,
  groupCount: entry.groupSet.size,
  avgChange: sumAverage(entry.changeSum, entry.changeCount),
  avgVolumeRatio: sumAverage(entry.volumeSum, entry.volumeCount),
  avgTurnoverRate: sumAverage(entry.turnoverSum, entry.turnoverCount),
  positiveRate: entry.changeCount
    ? (entry.positiveCount / entry.changeCount) * 100
    : null,
});

const computeStrengthScore = (entry, maxSignalCount = 1) => {
  const countFactor =
    maxSignalCount > 0 ? entry.signalCount / maxSignalCount : 0;
  return (
    (entry.avgChange || 0) * 4 +
    (entry.maxChange || 0) * 2 +
    (entry.avgVolumeRatio || 0) * 1.5 +
    (entry.avgTurnoverRate || 0) * 1 +
    countFactor * 6 +
    ((entry.positiveRate || 0) / 100) * 3
  );
};

const computeStockHotScore = (entry, maxSignalCount = 1) => {
  const countFactor =
    maxSignalCount > 0 ? entry.signalCount / maxSignalCount : 0;
  return (
    (entry.maxChange || 0) * 4 +
    (entry.avgChange || 0) * 2 +
    (entry.avgVolumeRatio || 0) * 1.5 +
    (entry.avgTurnoverRate || 0) * 1 +
    entry.configCount * 2 +
    entry.groupCount * 1.5 +
    countFactor * 4
  );
};

const rankSignalAggregates = (entries, scoreKey = 'strengthScore') =>
  [...entries]
    .sort((a, b) => {
      const scoreDiff = (b?.[scoreKey] || 0) - (a?.[scoreKey] || 0);
      if (scoreDiff !== 0) return scoreDiff;

      const avgChangeDiff = (b?.avgChange || 0) - (a?.avgChange || 0);
      if (avgChangeDiff !== 0) return avgChangeDiff;

      return (b?.signalCount || 0) - (a?.signalCount || 0);
    })
    .slice(0, SIGNAL_ANALYTICS_TOP_COUNT);

const toExtremeText = (item, value, formatter) => {
  if (!item || value === null || value === undefined) return '--';
  return `${toStockDisplayName(item)} · ${formatter(value)}`;
};

const buildMarketBiasText = (summary) => {
  if (!summary.totalSignals) return '暂无信号样本';
  if ((summary.positiveRate || 0) >= 70 && (summary.avgChangePct || 0) >= 3) {
    return '高强度共振，优先关注最强配置与最强分组';
  }
  if ((summary.positiveRate || 0) >= 55 && (summary.avgChangePct || 0) >= 1) {
    return '偏强运行，适合围绕共振个股做强中选强';
  }
  if ((summary.avgChangePct || 0) < 0) {
    return '整体偏弱，优先规避弱分组与低量能信号';
  }
  return '强弱分化，建议重点观察量价共振与重复命中个股';
};

const signalAnalytics = computed(() => {
  const items = signalAnalyticsRows.value || [];

  if (!items.length) {
    const emptySummary = {
      totalSignals: 0,
      uniqueStocks: 0,
      hitConfigs: 0,
      hitGroups: 0,
      avgChangePct: null,
      maxChangePct: null,
      minChangePct: null,
      avgVolumeRatio: null,
      avgTurnoverRate: null,
      maxVolumeRatio: null,
      maxTurnoverRate: null,
      positiveRate: null,
      maxChangeStockLabel: '--',
      minChangeStockLabel: '--',
      maxVolumeRatioStockLabel: '--',
      maxTurnoverRateStockLabel: '--',
      strongestConfig: null,
      strongestGroup: null,
      strongestStock: null,
      marketBiasText: '暂无信号样本',
    };

    return {
      summary: emptySummary,
      configRankings: [],
      groupRankings: [],
      stockRankings: [],
      details: {
        uniqueStocks: [],
        hitConfigs: [],
        hitGroups: [],
      },
      extremes: {
        maxChangeStockText: '--',
        minChangeStockText: '--',
        maxVolumeRatioStockText: '--',
        maxTurnoverRateStockText: '--',
      },
    };
  }

  const uniqueStocks = new Set();
  const configMap = new Map();
  const groupMap = new Map();
  const stockMap = new Map();

  let changeSum = 0;
  let changeCount = 0;
  let positiveCount = 0;
  let maxChange = null;
  let minChange = null;
  let volumeSum = 0;
  let volumeCount = 0;
  let turnoverSum = 0;
  let turnoverCount = 0;
  let maxChangeItem = null;
  let minChangeItem = null;
  let maxVolumeItem = null;
  let maxVolumeValue = null;
  let maxTurnoverItem = null;
  let maxTurnoverValue = null;

  items.forEach((item) => {
    const stockKey = toStockKey(item);
    if (stockKey !== '::') {
      uniqueStocks.add(stockKey);
    }

    const changePct = toSortableNumber(item?.change_pct);
    if (changePct !== null) {
      changeSum += changePct;
      changeCount += 1;
      if (changePct > 0) positiveCount += 1;
      if (maxChange === null || changePct > maxChange) {
        maxChange = changePct;
        maxChangeItem = item;
      }
      if (minChange === null || changePct < minChange) {
        minChange = changePct;
        minChangeItem = item;
      }
    }

    const volumeRatio = toSortableNumber(item?.volume_ratio);
    if (volumeRatio !== null) {
      volumeSum += volumeRatio;
      volumeCount += 1;
      if (maxVolumeValue === null || volumeRatio > maxVolumeValue) {
        maxVolumeValue = volumeRatio;
        maxVolumeItem = item;
      }
    }

    const turnoverRate = toSortableNumber(item?.turnover_rate);
    if (turnoverRate !== null) {
      turnoverSum += turnoverRate;
      turnoverCount += 1;
      if (maxTurnoverValue === null || turnoverRate > maxTurnoverValue) {
        maxTurnoverValue = turnoverRate;
        maxTurnoverItem = item;
      }
    }

    if (
      item?.config_id !== null &&
      item?.config_id !== undefined &&
      item?.config_id !== ''
    ) {
      const configKey = String(item.config_id);
      if (!configMap.has(configKey)) {
        configMap.set(
          configKey,
          createSignalAggregate({
            id: item.config_id,
            name: item.config_name || `配置${item.config_id}`,
          })
        );
      }
      applySignalMetrics(configMap.get(configKey), item);
    }

    if (
      item?.group_id !== null &&
      item?.group_id !== undefined &&
      item?.group_id !== ''
    ) {
      const groupKey = String(item.group_id);
      if (!groupMap.has(groupKey)) {
        groupMap.set(
          groupKey,
          createSignalAggregate({
            id: item.group_id,
            name: item.group_name || `分组${item.group_id}`,
          })
        );
      }
      applySignalMetrics(groupMap.get(groupKey), item);
    }

    if (!stockMap.has(stockKey)) {
      stockMap.set(
        stockKey,
        createSignalAggregate({
          stock_code: item?.stock_code || '',
          stock_name: item?.stock_name || '',
          exchange_code: item?.exchange_code || '',
        })
      );
    }
    applySignalMetrics(stockMap.get(stockKey), item);
  });

  const configEntries = [...configMap.values()].map(finalizeSignalAggregate);
  const groupEntries = [...groupMap.values()].map(finalizeSignalAggregate);
  const stockEntries = [...stockMap.values()].map(finalizeSignalAggregate);

  const maxConfigSignalCount = Math.max(
    1,
    ...configEntries.map((item) => item.signalCount || 0)
  );
  const maxGroupSignalCount = Math.max(
    1,
    ...groupEntries.map((item) => item.signalCount || 0)
  );
  const maxStockSignalCount = Math.max(
    1,
    ...stockEntries.map((item) => item.signalCount || 0)
  );

  configEntries.forEach((item) => {
    item.strengthScore = computeStrengthScore(item, maxConfigSignalCount);
  });
  groupEntries.forEach((item) => {
    item.strengthScore = computeStrengthScore(item, maxGroupSignalCount);
  });
  stockEntries.forEach((item) => {
    item.hotScore = computeStockHotScore(item, maxStockSignalCount);
  });

  const configRankings = rankSignalAggregates(configEntries, 'strengthScore');
  const groupRankings = rankSignalAggregates(groupEntries, 'strengthScore');
  const stockRankings = rankSignalAggregates(stockEntries, 'hotScore');
  const uniqueStockDetails = [...stockEntries].sort((a, b) => {
    const signalCountDiff = (b?.signalCount || 0) - (a?.signalCount || 0);
    if (signalCountDiff !== 0) return signalCountDiff;

    const maxChangeDiff = (b?.maxChange || 0) - (a?.maxChange || 0);
    if (maxChangeDiff !== 0) return maxChangeDiff;

    return String(a?.stock_code || '').localeCompare(
      String(b?.stock_code || '')
    );
  });
  const hitConfigDetails = [...configEntries].sort((a, b) => {
    const scoreDiff = (b?.strengthScore || 0) - (a?.strengthScore || 0);
    if (scoreDiff !== 0) return scoreDiff;

    return (b?.signalCount || 0) - (a?.signalCount || 0);
  });
  const hitGroupDetails = [...groupEntries].sort((a, b) => {
    const scoreDiff = (b?.strengthScore || 0) - (a?.strengthScore || 0);
    if (scoreDiff !== 0) return scoreDiff;

    return (b?.signalCount || 0) - (a?.signalCount || 0);
  });

  const summary = {
    totalSignals: items.length,
    uniqueStocks: uniqueStocks.size,
    hitConfigs: configEntries.length,
    hitGroups: groupEntries.length,
    avgChangePct: sumAverage(changeSum, changeCount),
    maxChangePct: maxChange,
    minChangePct: minChange,
    avgVolumeRatio: sumAverage(volumeSum, volumeCount),
    avgTurnoverRate: sumAverage(turnoverSum, turnoverCount),
    maxVolumeRatio: maxVolumeValue,
    maxTurnoverRate: maxTurnoverValue,
    positiveRate: changeCount ? (positiveCount / changeCount) * 100 : null,
    maxChangeStockLabel: toStockDisplayName(maxChangeItem),
    minChangeStockLabel: toStockDisplayName(minChangeItem),
    maxVolumeRatioStockLabel: toStockDisplayName(maxVolumeItem),
    maxTurnoverRateStockLabel: toStockDisplayName(maxTurnoverItem),
    strongestConfig: configRankings[0] || null,
    strongestGroup: groupRankings[0] || null,
    strongestStock: stockRankings[0] || null,
    marketBiasText: '',
  };

  summary.marketBiasText = buildMarketBiasText(summary);

  return {
    summary,
    configRankings,
    groupRankings,
    stockRankings,
    details: {
      uniqueStocks: uniqueStockDetails,
      hitConfigs: hitConfigDetails,
      hitGroups: hitGroupDetails,
    },
    extremes: {
      maxChangeStockText: toExtremeText(
        maxChangeItem,
        maxChange,
        formatPercent
      ),
      minChangeStockText: toExtremeText(
        minChangeItem,
        minChange,
        formatPercent
      ),
      maxVolumeRatioStockText: toExtremeText(
        maxVolumeItem,
        maxVolumeValue,
        formatNumber
      ),
      maxTurnoverRateStockText: toExtremeText(
        maxTurnoverItem,
        maxTurnoverValue,
        formatPercent
      ),
    },
  };
});

const formattedQuotePayload = computed(() => {
  if (!signalDetail.value?.quote_payload) return '--';
  return JSON.stringify(signalDetail.value.quote_payload, null, 2);
});

const configStocksDrawerTitle = computed(() => {
  const name = currentConfigStockMeta.value?.name || '监控配置';
  return `${name} - 合并分组股票`;
});

const currentConfigGroupNames = computed(() => {
  return currentConfigStockMeta.value?.group_names || [];
});

const configStockDisplayList = computed(() => {
  const start = (configStockPage.pageNo - 1) * configStockPage.pageSize;
  const end = start + configStockPage.pageSize;
  return configStockAllList.value.slice(start, end);
});

const configStockInsightList = computed(() => configStockAllList.value);

const {
  insightsData: configStockInsightsData,
  calculateInsightsFromList: calculateConfigStockInsights,
} = useStockInsights(configStockInsightList);

const getPayload = (response) =>
  response?.payload || response?.data || response;

const createEmptyForm = () => ({
  id: null,
  name: '',
  group_ids: [],
  monitor_interval_seconds: 10,
  min_change_pct: null,
  max_change_pct: null,
  min_volume_ratio: null,
  max_alerts_per_stock_per_day: 10,
  monitor_time_ranges: ['09:30-11:30', '13:00-15:00'],
  start_date: '',
  end_date: '',
  webhook_url: '',
  reason: '',
  remark: '',
  is_enabled: true,
});

const resetConfigStockSearchParams = () => {
  configStockSearchParams.stock_code = '';
  configStockSearchParams.stock_name = '';
  configStockSearchParams.exchange_code = '';
  configStockSearchParams.snapshot_date = '';
};

const flattenMergedGroupStockData = (stock) => {
  const quote = stock?.quote || {};
  const initialPrice = stock.initial_price ? Number(stock.initial_price) : null;

  return {
    id: stock.id,
    stock_code: stock.stock_code || '',
    stock_name: stock.stock_name || '',
    exchange_code: stock.exchange_code || '',
    add_method: 'manual',
    add_time: stock.joined_at || '',
    initial_price: initialPrice,
    add_reason: stock.add_reason || '',
    strategy_name: '',
    is_self_selected: true,
    created_by: '',
    status: 'active',
    priority_level: null,
    notes: stock.remark || '',
    updated_time: stock.updated_at || '',
    statusLoading: false,
    merged_group_names: stock.group_name ? [stock.group_name] : [],
    ...mapQuoteToFlatRowFields(quote, initialPrice),
  };
};

const mergeConfigStocks = (items = []) => {
  const mergedMap = new Map();

  items.forEach((item) => {
    const key = `${item.exchange_code || ''}::${item.stock_code || ''}`;
    const groupName =
      groups.value.find((group) => group.id === item.group_id)?.name || '';

    if (!mergedMap.has(key)) {
      const row = flattenMergedGroupStockData({
        ...item,
        group_name: groupName,
      });
      mergedMap.set(key, row);
      return;
    }

    const existing = mergedMap.get(key);
    const mergedGroupNames = new Set(existing.merged_group_names || []);
    if (groupName) {
      mergedGroupNames.add(groupName);
    }
    existing.merged_group_names = Array.from(mergedGroupNames);

    if (!existing.initial_price && item.initial_price) {
      existing.initial_price = Number(item.initial_price);
    }
    if (!existing.add_reason && item.add_reason) {
      existing.add_reason = item.add_reason;
    }
    if (!existing.notes && item.remark) {
      existing.notes = item.remark;
    }
    if (!existing.add_time && item.joined_at) {
      existing.add_time = item.joined_at;
    }
    if (
      item.updated_at &&
      (!existing.updated_time || item.updated_at > existing.updated_time)
    ) {
      existing.updated_time = item.updated_at;
    }
  });

  const mergedRows = Array.from(mergedMap.values()).map((row) => {
    if (row.add_time) {
      row.days_added = calculateDaysAdded(
        row.add_time,
        configStockSearchParams.snapshot_date
      );
    }
    return row;
  });

  mergedRows.sort((a, b) => {
    if (!a.add_time && !b.add_time) return 0;
    if (!a.add_time) return 1;
    if (!b.add_time) return -1;
    return String(b.add_time).localeCompare(String(a.add_time));
  });

  return mergedRows;
};

const fetchGroups = async () => {
  const response = await getUserGroups();
  const payload = getPayload(response);
  groups.value = payload?.items || [];
};

const fetchConfigOptions = async () => {
  const response = await getGroupMonitorConfigs({ page: 1, page_size: 200 });
  const payload = getPayload(response);
  configOptions.value = payload?.items || [];
};

const fetchConfigStocks = async () => {
  const groupIds = currentConfigStockMeta.value?.group_ids || [];
  const normalizedIds = Array.isArray(groupIds)
    ? groupIds.filter(
        (item) => item !== null && item !== undefined && item !== ''
      )
    : [];

  if (!normalizedIds.length) {
    configStockAllList.value = [];
    configStockPage.total = 0;
    calculateConfigStockInsights([]);
    return;
  }

  try {
    configStockLoading.value = true;
    const pageSize = 200;
    let page = 1;
    let total = 0;
    const allItems = [];

    do {
      const response = await getGroupStocksByGroups(normalizedIds, {
        page,
        page_size: pageSize,
        exchange_code: configStockSearchParams.exchange_code || undefined,
        stock_code: configStockSearchParams.stock_code || undefined,
        stock_name: configStockSearchParams.stock_name || undefined,
        snapshot_date: configStockSearchParams.snapshot_date || undefined,
      });
      const payload = getPayload(response) || {};
      const items = payload?.items || [];
      total = payload?.total || 0;
      allItems.push(...items);
      if (!items.length || items.length < pageSize) {
        break;
      }
      page += 1;
    } while (allItems.length < total);

    configStockAllList.value = mergeConfigStocks(allItems);
    configStockPage.total = configStockAllList.value.length;
    calculateConfigStockInsights(configStockAllList.value);
  } catch (error) {
    console.error('获取监控配置股票失败:', error);
    configStockAllList.value = [];
    configStockPage.total = 0;
    calculateConfigStockInsights([]);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '获取监控配置股票失败'
    );
  } finally {
    configStockLoading.value = false;
  }
};

const fetchConfigs = async () => {
  try {
    tableLoading.value = true;
    const response = await getGroupMonitorConfigs({
      page: configPage.pageNo,
      page_size: configPage.pageSize,
      keyword: configSearchForm.keyword || undefined,
      is_enabled:
        typeof configSearchForm.is_enabled === 'boolean'
          ? configSearchForm.is_enabled
          : undefined,
    });
    const payload = getPayload(response);
    configList.value = payload?.items || [];
    configPage.total = payload?.total || 0;
  } catch (error) {
    console.error('获取监控配置列表失败:', error);
    ElMessage.error(error?.response?.data?.message || '获取监控配置列表失败');
  } finally {
    tableLoading.value = false;
  }
};

const buildSignalQuery = () => ({
  page: signalPage.pageNo,
  page_size: signalPage.pageSize,
  config_id: signalSearchForm.config_id || undefined,
  group_id: signalSearchForm.group_id || undefined,
  signal_type: signalSearchForm.signal_type || undefined,
  stock_code: signalSearchForm.stock_code || undefined,
  stock_name: signalSearchForm.stock_name || undefined,
  start_date: Array.isArray(signalSearchForm.date_range)
    ? signalSearchForm.date_range[0] || undefined
    : undefined,
  end_date: Array.isArray(signalSearchForm.date_range)
    ? signalSearchForm.date_range[1] || undefined
    : undefined,
});

const fetchSignalAnalytics = async () => {
  try {
    signalAnalyticsLoading.value = true;

    const baseQuery = buildSignalQuery();
    const allItems = [];
    let total = 0;
    let page = 1;

    do {
      const response = await getGroupMonitorSignals({
        ...baseQuery,
        page,
        page_size: SIGNAL_ANALYTICS_PAGE_SIZE,
      });
      const payload = getPayload(response) || {};
      const items = payload?.items || [];
      total = payload?.total || 0;
      allItems.push(...items);

      if (
        !items.length ||
        items.length < SIGNAL_ANALYTICS_PAGE_SIZE ||
        allItems.length >= SIGNAL_ANALYTICS_MAX_RECORDS
      ) {
        break;
      }
      page += 1;
    } while (allItems.length < total);

    signalAnalyticsRows.value = allItems.slice(0, SIGNAL_ANALYTICS_MAX_RECORDS);
    signalAnalyticsMeta.loaded = signalAnalyticsRows.value.length;
    signalAnalyticsMeta.total = total;
    signalAnalyticsMeta.truncated = total > signalAnalyticsRows.value.length;
  } catch (error) {
    console.error('获取监控信号统计失败:', error);
    signalAnalyticsRows.value = [];
    signalAnalyticsMeta.loaded = 0;
    signalAnalyticsMeta.total = 0;
    signalAnalyticsMeta.truncated = false;
    ElMessage.error(error?.response?.data?.message || '获取监控信号统计失败');
  } finally {
    signalAnalyticsLoading.value = false;
  }
};

const fetchSignals = async () => {
  try {
    signalLoading.value = true;
    const response = await getGroupMonitorSignals(buildSignalQuery());
    const payload = getPayload(response);
    signalList.value = payload?.items || [];
    signalPage.total = payload?.total || 0;
  } catch (error) {
    console.error('获取监控信号列表失败:', error);
    ElMessage.error(error?.response?.data?.message || '获取监控信号列表失败');
  } finally {
    signalLoading.value = false;
  }
};

const handleTabChange = async (tab) => {
  if (tab === 'signals' && !signalList.value.length) {
    await fetchSignals();
  }

  if (tab === 'analytics' && !signalAnalyticsRows.value.length) {
    await fetchSignalAnalytics();
  }
};

const handleConfigSearch = () => {
  configPage.pageNo = 1;
  fetchConfigs();
};

const handleConfigReset = () => {
  configSearchForm.keyword = '';
  configSearchForm.is_enabled = undefined;
  configPage.pageNo = 1;
  fetchConfigs();
};

const handleConfigSizeChange = () => {
  configPage.pageNo = 1;
  fetchConfigs();
};

const handleSignalSearch = () => {
  signalPage.pageNo = 1;
  fetchSignals();
  fetchSignalAnalytics();
};

const handleSignalReset = () => {
  signalSearchForm.config_id = undefined;
  signalSearchForm.group_id = undefined;
  signalSearchForm.signal_type = '';
  signalSearchForm.stock_code = '';
  signalSearchForm.stock_name = '';
  signalSearchForm.date_range = [];
  signalPage.pageNo = 1;
  fetchSignals();
  fetchSignalAnalytics();
};

const handleSignalSizeChange = () => {
  signalPage.pageNo = 1;
  fetchSignals();
};

const handleCreate = () => {
  dialogMode.value = 'create';
  dialogForm.value = createEmptyForm();
  dialogVisible.value = true;
};

const handleEdit = async (row) => {
  try {
    dialogMode.value = 'edit';
    dialogSubmitting.value = true;
    const response = await getGroupMonitorConfigDetail(row.id);
    dialogForm.value = { ...createEmptyForm(), ...getPayload(response) };
    dialogVisible.value = true;
  } catch (error) {
    console.error('获取监控配置详情失败:', error);
    ElMessage.error(error?.response?.data?.message || '获取监控配置详情失败');
  } finally {
    dialogSubmitting.value = false;
  }
};

const refreshConfigRelatedData = async () => {
  await Promise.all([fetchConfigs(), fetchConfigOptions()]);
};

const handleSubmit = async (payload) => {
  try {
    dialogSubmitting.value = true;
    if (dialogMode.value === 'edit' && dialogForm.value.id) {
      await updateGroupMonitorConfig(dialogForm.value.id, payload);
      ElMessage.success('更新监控配置成功');
    } else {
      await createGroupMonitorConfig(payload);
      ElMessage.success('创建监控配置成功');
    }
    dialogVisible.value = false;
    await refreshConfigRelatedData();
  } catch (error) {
    console.error('保存监控配置失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '保存监控配置失败'
    );
  } finally {
    dialogSubmitting.value = false;
  }
};

const handleDelete = async (row) => {
  try {
    await deleteGroupMonitorConfig(row.id);
    ElMessage.success('删除监控配置成功');
    if (configList.value.length === 1 && configPage.pageNo > 1) {
      configPage.pageNo -= 1;
    }
    await refreshConfigRelatedData();
    if (activeTab.value === 'signals') {
      await fetchSignals();
    }
  } catch (error) {
    console.error('删除监控配置失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '删除监控配置失败'
    );
  }
};

const handleToggleStatus = async (row, value) => {
  const previous = row.is_enabled;
  row.is_enabled = value;
  try {
    await toggleGroupMonitorConfigStatus(row.id, value);
    ElMessage.success(value ? '已启用监控配置' : '已停用监控配置');
    await refreshConfigRelatedData();
  } catch (error) {
    row.is_enabled = previous;
    console.error('切换监控配置状态失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '切换监控配置状态失败'
    );
  }
};

const handleRun = async (row) => {
  try {
    const response = await runGroupMonitorConfig(row.id);
    const payload = getPayload(response) || {};
    ElMessageBox.alert(
      `扫描分组：${payload.scanned_groups ?? 0} 个<br/>扫描股票：${payload.scanned_stocks ?? 0} 只<br/>命中信号：${payload.hit_signals ?? 0} 条<br/>发送 webhook：${payload.sent_webhooks ?? 0} 次<br/>限流跳过：${payload.skipped_by_limit ?? 0} 次<br/>耗时：${payload.cost_ms ?? 0} ms`,
      `${row.name} 执行完成`,
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '知道了',
      }
    );
    await Promise.all([
      refreshConfigRelatedData(),
      fetchSignals(),
      fetchSignalAnalytics(),
    ]);
  } catch (error) {
    console.error('手动执行监控配置失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '手动执行监控配置失败'
    );
  }
};

const handleViewConfigStocks = async (row) => {
  try {
    configStockLoading.value = true;
    resetConfigStockSearchParams();
    configStockPage.pageNo = 1;
    configStockPage.pageSize = 50;
    const response = await getGroupMonitorConfigDetail(row.id);
    currentConfigStockMeta.value = {
      ...createEmptyForm(),
      ...getPayload(response),
    };
    configStocksVisible.value = true;
    await fetchConfigStocks();
  } catch (error) {
    console.error('获取监控配置股票失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '获取监控配置股票失败'
    );
  } finally {
    configStockLoading.value = false;
  }
};

const handleViewSignals = async (row) => {
  activeTab.value = 'signals';
  signalSearchForm.config_id = row.id;
  signalPage.pageNo = 1;
  await Promise.all([fetchSignals(), fetchSignalAnalytics()]);
};

const openRouteInNewTab = (location) => {
  const resolvedRoute = router.resolve(location);
  window.open(resolvedRoute.href, '_blank', 'noopener');
};

const handleEditByConfigId = async (configId) => {
  if (!configId) {
    ElMessage.warning('当前信号缺少关联配置');
    return;
  }

  openRouteInNewTab({
    path: '/stock-pool/buy-signal',
    query: {
      tab: 'configs',
      configId: String(configId),
    },
  });
};

const openGroupInNewTab = (groupId) => {
  if (groupId === null || groupId === undefined || groupId === '') {
    ElMessage.warning('当前信号缺少关联分组');
    return;
  }

  openRouteInNewTab({
    path: '/stock-pool/self-selected',
    query: {
      groupId: String(groupId),
    },
  });
};

const handleGroupClick = (row) => {
  openGroupInNewTab(row?.group_id);
};

const handleInitialRouteAction = async () => {
  const tab = Array.isArray(route.query?.tab)
    ? route.query.tab[0]
    : route.query?.tab;
  const configId = Array.isArray(route.query?.configId)
    ? route.query.configId[0]
    : route.query?.configId;

  if (tab === 'configs') {
    activeTab.value = 'configs';
  }

  if (!configId) {
    return;
  }

  await handleEdit({ id: configId });
};

const handleConfigStockSearch = async (searchParams = {}) => {
  configStockSearchParams.stock_code = searchParams.stock_code || '';
  configStockSearchParams.stock_name = searchParams.stock_name || '';
  configStockSearchParams.exchange_code = searchParams.exchange_code || '';
  configStockSearchParams.snapshot_date = searchParams.snapshot_date || '';
  configStockPage.pageNo = 1;
  await fetchConfigStocks();
};

const handleConfigStockPageChange = (pageNo) => {
  configStockPage.pageNo = pageNo;
};

const handleConfigStockPageSizeChange = (pageSize) => {
  configStockPage.pageSize = pageSize;
  configStockPage.pageNo = 1;
};

const handleViewSignalDetail = async (row) => {
  try {
    signalDetailLoading.value = true;
    signalDetailVisible.value = true;
    const response = await getGroupMonitorSignalDetail(row.id);
    signalDetail.value = getPayload(response);
  } catch (error) {
    console.error('获取监控信号详情失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '获取监控信号详情失败'
    );
    signalDetailVisible.value = false;
  } finally {
    signalDetailLoading.value = false;
  }
};

const handleStockCodeClick = (row) => {
  const numberCode = row?.stock_code?.replace(/[^0-9]/g, '') || '';
  if (!numberCode) {
    ElMessage.warning('当前股票缺少有效代码');
    return;
  }
  window.open(`https://finance.baidu.com/stock/ab-${numberCode}`, '_blank');
};

const handleDeleteSignal = async (row) => {
  try {
    await deleteGroupMonitorSignal(row.id);
    ElMessage.success('删除监控信号成功');

    if (signalList.value.length === 1 && signalPage.pageNo > 1) {
      signalPage.pageNo -= 1;
    }

    if (signalDetail.value?.id === row.id) {
      signalDetail.value = null;
      signalDetailVisible.value = false;
    }

    await Promise.all([fetchSignals(), fetchSignalAnalytics()]);
  } catch (error) {
    console.error('删除监控信号失败:', error);
    ElMessage.error(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        '删除监控信号失败'
    );
  }
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  return Number(value).toFixed(2);
};

const formatPercent = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  return `${Number(value).toFixed(2)}%`;
};

const formatChangeRange = (row) => {
  const minText =
    row.min_change_pct !== null && row.min_change_pct !== undefined
      ? `${formatNumber(row.min_change_pct)}%`
      : '--';
  const maxText =
    row.max_change_pct !== null && row.max_change_pct !== undefined
      ? `${formatNumber(row.max_change_pct)}%`
      : '--';
  return `${minText} ~ ${maxText}`;
};

const formatTimeRanges = (ranges) => {
  if (!Array.isArray(ranges) || !ranges.length) return '--';
  return ranges.join(' / ');
};

const getSignalTypeLabel = (value) => {
  const map = {
    buy_alert: '提醒买入',
    rise_alert: '提醒上涨',
    sell_alert: '提醒卖出',
  };
  return map[value] || value || '--';
};

const getSignalTagType = (value) => {
  const map = {
    buy_alert: 'success',
    rise_alert: 'warning',
    sell_alert: 'danger',
  };
  return map[value] || 'info';
};

onMounted(async () => {
  await Promise.all([
    fetchGroups(),
    fetchSignalAnalytics(),
    fetchConfigOptions(),
    fetchConfigs(),
  ]);
  await handleInitialRouteAction();
});
</script>

<style scoped lang="less">
.buy-signal-monitor-page {
  min-height: calc(100vh - 130px);
  padding: 20px;
  background: #f5f7fa;
}

.page-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.summary-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.summary-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 8px;
}

.summary-label-help,
.signal-help-label {
  cursor: help;
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}

:deep(.strength-definition-tooltip) {
  max-width: 420px;
  white-space: pre-line;
  line-height: 1.7;
}

.summary-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.summary-value-compact {
  font-size: 20px;
  line-height: 1.4;
}

.summary-value-compact :deep(.el-button) {
  font-size: inherit;
  font-weight: 600;
  padding: 0;
}

.summary-value.enabled {
  color: #67c23a;
}
.summary-value.signal {
  color: #e6a23c;
}
.summary-value.webhook {
  color: #409eff;
}

.summary-subtext {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-wrap {
  flex-wrap: wrap;
}

.toolbar-input {
  width: 220px;
}
.toolbar-select {
  width: 140px;
}
.toolbar-select-wide {
  width: 180px;
}
.toolbar-date-range {
  width: 280px;
}

.signal-list-header {
  margin-bottom: 12px;
  font-size: 13px;
}

.signal-dashboard {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff 0%, #f5f7fa 100%);
  border: 1px solid #e4ecf5;
}

.signal-dashboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.signal-dashboard-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.signal-dashboard-subtitle {
  margin-top: 4px;
  font-size: 13px;
}

.signal-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.signal-summary-card {
  padding: 14px 16px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e8eef5;
}

.signal-summary-card-hoverable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.signal-summary-card-hoverable:hover {
  border-color: #c6e2ff;
  box-shadow: 0 8px 18px rgba(64, 158, 255, 0.08);
}

.signal-summary-label {
  font-size: 13px;
  color: #909399;
}

.signal-summary-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.signal-summary-subtext {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
}

.signal-summary-stock {
  color: #409eff;
}

.signal-summary-config {
  color: #67c23a;
}

.signal-summary-group {
  color: #9b59b6;
}

.signal-summary-rise {
  color: #f56c6c;
}

.signal-summary-fall {
  color: #909399;
}

.signal-summary-fluid {
  color: #e6a23c;
}

.signal-panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.signal-panel {
  padding: 14px 16px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e8eef5;
}

.signal-panel-title {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.signal-highlight-list,
.signal-extreme-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.signal-highlight-item,
.signal-extreme-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.signal-highlight-label,
.signal-extreme-label {
  min-width: 72px;
  color: #909399;
  font-size: 13px;
}

.signal-highlight-content,
.signal-extreme-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #303133;
  text-align: right;
}

.signal-rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f2f5;
}

.signal-rank-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.signal-rank-index {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #eef5ff;
  color: #409eff;
  font-size: 12px;
  font-weight: 600;
}

.signal-rank-main {
  flex: 1;
  min-width: 0;
}

.signal-rank-meta {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
}

.signal-rank-value {
  min-width: 76px;
  text-align: right;
  font-size: 16px;
  font-weight: 600;
  color: #f56c6c;
}

.signal-dashboard-empty {
  padding: 20px 0 4px;
  text-align: center;
}

:deep(.signal-summary-popover) {
  max-width: 420px;
}

.signal-summary-popover-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.signal-summary-popover-subtitle {
  margin-top: 4px;
  margin-bottom: 10px;
  font-size: 12px;
}

.signal-summary-popover-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.signal-summary-popover-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f2f5;
}

.signal-summary-popover-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.signal-summary-popover-main {
  min-width: 0;
  flex: 1;
}

.signal-summary-popover-name {
  color: #303133;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}

.signal-summary-popover-meta {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
}

.group-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.text-muted {
  color: #909399;
}

.stock-link-text,
.stock-link-code {
  cursor: pointer;
}

.stock-link-text {
  color: #409eff;
}

.stock-link-code:hover,
.stock-link-text:hover {
  text-decoration: underline;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.config-stock-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-stock-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.config-stock-summary-main {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #303133;
}

.signal-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label,
.detail-block-title {
  color: #909399;
  font-size: 13px;
}

.detail-block {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
}

.detail-block-content {
  margin-top: 8px;
  line-height: 1.7;
  color: #303133;
}

.json-block {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: #303133;
  font-size: 12px;
}

@media (max-width: 1400px) {
  .summary-row,
  .signal-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1200px) {
  .summary-row,
  .detail-grid,
  .signal-summary-grid,
  .signal-panel-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-row {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left {
    flex-wrap: wrap;
  }

  .signal-dashboard-header,
  .signal-highlight-item,
  .signal-extreme-item,
  .signal-highlight-content,
  .signal-extreme-content {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .signal-rank-value {
    min-width: auto;
  }
}
</style>
