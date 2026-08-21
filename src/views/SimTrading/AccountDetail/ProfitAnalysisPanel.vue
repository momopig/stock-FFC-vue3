<template>
  <div class="profit-analysis-panel">
    <el-tabs v-model="activePanelTab">
      <el-tab-pane label="盈亏概览" name="overview" lazy>
        <div class="profit-toolbar">
          <el-tabs
            v-model="overviewRangeType"
            class="profit-range-tabs"
            @tab-change="handleOverviewRangeChange"
          >
            <el-tab-pane
              v-for="item in OVERVIEW_RANGE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :name="item.value"
              lazy
            />
          </el-tabs>
          <div class="profit-toolbar__actions">
            <el-date-picker
              v-if="overviewRangeType === 'custom'"
              v-model="overviewCustomDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="handleCustomRangeChange"
            />
            <el-button :loading="overviewLoading" @click="refreshOverview"
              >刷新概览</el-button
            >
          </div>
        </div>

        <div v-loading="overviewLoading" class="profit-content-shell">
          <div class="profit-summary-grid">
            <div class="profit-summary-card emphasize-card">
              <span>{{ overviewRangeLabel }}收益额</span>
              <strong :class="profitClass(overviewSummary.profit_amount)">{{
                formatMoney(overviewSummary.profit_amount)
              }}</strong>
              <small>{{ rangeDescriptionText }}</small>
            </div>
            <div class="profit-summary-card">
              <span>{{ overviewRangeLabel }}收益率</span>
              <strong :class="profitClass(overviewSummary.profit_amount)">{{
                formatPercent(overviewSummary.profit_rate)
              }}</strong>
              <small>按期间基准资产或净入金估算</small>
            </div>
            <div class="profit-summary-card">
              <span>期末总资产</span>
              <strong>{{
                formatMoney(overviewSummary.current_total_asset)
              }}</strong>
              <small>现金 + 持仓市值</small>
            </div>
            <div class="profit-summary-card">
              <span>期间净入金</span>
              <strong>{{
                formatMoney(overviewSummary.net_capital_input)
              }}</strong>
              <small>入金 - 出金</small>
            </div>
            <div class="profit-summary-card">
              <span>期末持仓市值</span>
              <strong>{{ formatMoney(overviewSummary.market_value) }}</strong>
              <small>按有效结束日估值</small>
            </div>
            <div class="profit-summary-card">
              <span>胜负天数</span>
              <strong>{{
                `${overviewSummary.positive_days || 0} / ${overviewSummary.negative_days || 0}`
              }}</strong>
              <small>盈利天 / 亏损天</small>
            </div>
          </div>

          <div class="overview-content-tabs">
            <el-tabs v-model="activeOverviewContentTab">
              <el-tab-pane label="股票收益排行榜" name="ranking" />
              <el-tab-pane label="股票每日盈亏列表" name="daily-stocks" lazy />
              <el-tab-pane
                label="账号每日盈亏列表"
                name="daily-accounts"
                lazy
              />
              <el-tab-pane label="资产轨迹" name="curve" lazy />
            </el-tabs>
          </div>

          <div
            v-if="activeOverviewContentTab === 'curve'"
            class="profit-module-grid"
          >
            <section class="profit-card curve-card">
              <div class="profit-card__header">
                <div>
                  <h3>资产轨迹</h3>
                  <p>展示 {{ overviewRangeLabel }}内账号总资产的变化轨迹。</p>
                </div>
                <div class="curve-header-metrics">
                  <span>有效区间：{{ effectiveDateRangeText }}</span>
                </div>
              </div>

              <div v-if="curveCoordinates.length" class="curve-shell">
                <div class="curve-y-axis">
                  <span
                    v-for="item in curveAxisLabels"
                    :key="`axis-${item.label}`"
                    >{{ item.label }}</span
                  >
                </div>
                <div class="curve-canvas-shell curve-panel">
                  <svg
                    viewBox="0 0 720 220"
                    preserveAspectRatio="none"
                    class="curve-svg"
                  >
                    <defs>
                      <linearGradient
                        id="profitCurveFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stop-color="#0f766e"
                          stop-opacity="0.28"
                        />
                        <stop
                          offset="100%"
                          stop-color="#0f766e"
                          stop-opacity="0.04"
                        />
                      </linearGradient>
                    </defs>
                    <path :d="curveAreaPath" fill="url(#profitCurveFill)" />
                    <path :d="curveLinePath" class="curve-line" />
                  </svg>
                  <div class="curve-interaction-layer">
                    <el-tooltip
                      v-for="item in curveCoordinates"
                      :key="`tooltip-${item.date}`"
                      placement="top"
                      effect="light"
                    >
                      <template #content>
                        <div class="curve-tooltip">
                          <div class="curve-tooltip__title">
                            {{ item.date }}
                          </div>
                          <div>
                            {{
                              `当日盈亏：${formatMoney(item.day_profit_amount)}`
                            }}
                          </div>
                          <div>
                            {{
                              `当日收益率：${formatPercent(item.day_profit_rate)}`
                            }}
                          </div>
                          <div>{{ getCurveReasonText(item) }}</div>
                          <div v-if="getTradeEventText(item.date)">
                            {{ `关联交易：${getTradeEventText(item.date)}` }}
                          </div>
                          <div v-if="getCashFlowEventText(item.date)">
                            {{ `资金变动：${getCashFlowEventText(item.date)}` }}
                          </div>
                        </div>
                      </template>
                      <button
                        type="button"
                        class="curve-marker"
                        :style="getCurveMarkerStyle(item)"
                        :aria-label="`${item.date} 资产轨迹节点`"
                      />
                    </el-tooltip>
                  </div>
                  <div class="curve-x-axis">
                    <span>{{ curveStartLabel }}</span>
                    <span>{{ curveEndLabel }}</span>
                  </div>
                </div>
              </div>
              <el-empty
                v-else
                :description="curveEmptyDescription"
                :image-size="90"
              />
            </section>
          </div>

          <div
            v-else-if="activeOverviewContentTab === 'ranking'"
            class="profit-module-grid ranking-only-grid"
          >
            <section class="profit-card ranking-card">
              <div class="profit-card__header">
                <div>
                  <h3>股票收益排行榜</h3>
                  <p>按当前时间级别统计股票盈亏贡献，便于快速复盘。</p>
                </div>
              </div>

              <el-table
                class="stock-ranking-table"
                :data="rankingTableData"
                border
                :empty-text="rankingEmptyText"
              >
                <el-table-column
                  prop="stock_name"
                  label="股票名称"
                  min-width="140"
                >
                  <template #default="scope">
                    <div class="ranking-name-cell">
                      <button
                        type="button"
                        class="ranking-link-button"
                        @click="openBaiduStockPage(scope.row)"
                      >
                        <span>{{ formatRankingStockName(scope.row) }}</span>
                      </button>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="stock_code" label="代码" width="120" />
                <el-table-column
                  prop="profit_amount"
                  label="股票盈亏"
                  width="140"
                  sortable
                >
                  <template #default="scope">
                    <span :class="profitClass(scope.row.profit_amount)">{{
                      formatMoney(scope.row.profit_amount)
                    }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="profit_rate"
                  label="收益率"
                  width="120"
                  sortable
                >
                  <template #default="scope">
                    <span :class="profitClass(scope.row.profit_amount)">{{
                      formatPercent(scope.row.profit_rate)
                    }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="持仓日期区间" min-width="210">
                  <template #default="scope">{{
                    formatHoldingDateRange(scope.row)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="holding_days"
                  label="持仓天数"
                  width="120"
                  sortable
                >
                  <template #default="scope">{{
                    formatHoldingDays(scope.row.holding_days)
                  }}</template>
                </el-table-column>
                <el-table-column label="操作" width="180" fixed="right">
                  <template #default="scope">
                    <el-space>
                      <el-button
                        link
                        type="primary"
                        @click="openHistoryTradesPage(scope.row)"
                      >
                        历史成交
                      </el-button>
                      <el-button link @click="openBaiduStockPage(scope.row)">
                        百度查股
                      </el-button>
                    </el-space>
                  </template>
                </el-table-column>
              </el-table>
            </section>
          </div>

          <div
            v-else-if="activeOverviewContentTab === 'daily-stocks'"
            class="profit-module-grid daily-only-grid"
          >
            <section
              class="profit-card daily-stocks-card"
              v-loading="dailyStocksLoading"
            >
              <div class="profit-card__header">
                <div>
                  <h3>股票每日盈亏列表</h3>
                  <p>
                    按日展示个股持仓、盈亏、手续费与清仓记录（可切换展示）。
                  </p>
                </div>
                <div class="daily-stocks-actions">
                  <div class="daily-stocks-toggle-actions">
                    <el-checkbox
                      v-model="dailyStocksIncludeClosed"
                      @change="refreshDailyStocks"
                    >
                      展示已清仓个股
                    </el-checkbox>
                    <el-button @click="refreshDailyStocks">刷新明细</el-button>
                  </div>
                  <div class="daily-stocks-filter-actions">
                    <el-date-picker
                      v-model="dailyStocksFilters.trade_date"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="日期"
                      clearable
                    />
                    <el-input
                      v-model="dailyStocksFilters.stock_name"
                      placeholder="股票名称"
                      clearable
                    />
                    <el-input
                      v-model="dailyStocksFilters.stock_code"
                      placeholder="股票代码"
                      clearable
                    />
                    <el-input-number
                      v-model="dailyStocksFilters.holding_days"
                      :min="0"
                      :precision="0"
                      placeholder="持仓天数"
                      controls-position="right"
                    />
                    <el-button type="primary" @click="applyDailyStocksFilters"
                      >查询</el-button
                    >
                    <el-button @click="resetDailyStocksFilters">重置</el-button>
                  </div>
                </div>
              </div>

              <el-table
                :data="dailyStocks.items"
                border
                :empty-text="dailyStocksTableEmptyText"
              >
                <el-table-column
                  prop="trade_date"
                  label="日期"
                  width="120"
                  sortable
                  :filters="dailyStockDateColumnFilters"
                  :filter-method="filterDailyStockTradeDate"
                  column-key="trade_date"
                />
                <el-table-column
                  prop="stock_name"
                  label="股票名称"
                  min-width="130"
                  :filters="dailyStockNameColumnFilters"
                  :filter-method="filterDailyStockName"
                  column-key="stock_name"
                />
                <el-table-column
                  prop="stock_code"
                  label="股票代码"
                  width="120"
                />
                <el-table-column
                  prop="hold_quantity"
                  label="持仓数量"
                  width="110"
                  sortable
                />
                <el-table-column
                  prop="avg_cost_price"
                  label="持仓成本"
                  width="120"
                  sortable
                >
                  <template #default="scope">{{
                    formatMoney(scope.row.avg_cost_price)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="close_price"
                  label="收盘价"
                  width="110"
                  sortable
                >
                  <template #default="scope">{{
                    formatMoney(scope.row.close_price)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="day_profit_amount"
                  label="当日盈亏"
                  width="150"
                  sortable
                >
                  <template #default="scope">
                    <div class="dual-line-cell">
                      <span :class="profitClass(scope.row.day_profit_amount)">{{
                        formatMoney(scope.row.day_profit_amount)
                      }}</span>
                      <span :class="profitClass(scope.row.day_profit_amount)">{{
                        formatPercent(scope.row.day_profit_rate)
                      }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="holding_days"
                  label="持仓天数"
                  width="110"
                  sortable
                >
                  <template #default="scope">{{
                    formatHoldingDays(scope.row.holding_days)
                  }}</template>
                </el-table-column>
                <el-table-column label="持仓日期区间" min-width="210">
                  <template #default="scope">{{
                    formatHoldingDateRange(scope.row)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="position_ratio"
                  label="持仓占比"
                  width="110"
                  sortable
                >
                  <template #default="scope">{{
                    formatPercent(scope.row.position_ratio)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="loss_to_asset_ratio"
                  label="浮亏占总资产"
                  width="130"
                  sortable
                >
                  <template #default="scope">
                    <span
                      :class="
                        profitClass(-Number(scope.row.loss_to_asset_ratio || 0))
                      "
                      >{{ formatPercent(scope.row.loss_to_asset_ratio) }}</span
                    >
                  </template>
                </el-table-column>
                <el-table-column
                  prop="daily_fee"
                  label="当日手续费"
                  width="120"
                  sortable
                >
                  <template #default="scope">{{
                    formatMoney(scope.row.daily_fee)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="market_value"
                  label="持仓市值"
                  width="130"
                  sortable
                >
                  <template #default="scope">{{
                    formatMoney(scope.row.market_value)
                  }}</template>
                </el-table-column>
                <el-table-column
                  v-if="canOperateDailyStocks"
                  label="操作"
                  width="170"
                  fixed="right"
                >
                  <template #default="scope">
                    <el-button
                      v-if="isSuperAdmin || canUpdateDailyStock"
                      link
                      type="primary"
                      @click="openDailyStockEditDialog(scope.row)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      v-if="isSuperAdmin || canDeleteDailyStock"
                      link
                      type="danger"
                      @click="deleteDailyStockSnapshot(scope.row)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div class="daily-stocks-footer">
                <span class="daily-stocks-empty-tip">{{
                  dailyStocksEmptyDescription
                }}</span>
                <el-pagination
                  background
                  layout="total, prev, pager, next, sizes"
                  :total="Number(dailyStocks.total || 0)"
                  :current-page="dailyStocks.page"
                  :page-size="dailyStocks.page_size"
                  :page-sizes="[20, 50, 100, 200]"
                  @current-change="handleDailyStocksPageChange"
                  @size-change="handleDailyStocksPageSizeChange"
                />
              </div>
            </section>
          </div>

          <div v-else class="profit-module-grid daily-only-grid">
            <section
              class="profit-card daily-stocks-card"
              v-loading="dailyAccountsLoading"
            >
              <div class="profit-card__header">
                <div>
                  <h3>账号每日盈亏列表</h3>
                  <p>
                    按日展示账户快照核心字段：资产、净入金、已实现与未实现盈亏。
                  </p>
                </div>
                <div class="daily-stocks-actions">
                  <el-button @click="refreshDailyAccounts">刷新明细</el-button>
                </div>
              </div>

              <el-table
                :data="dailyAccounts.items"
                border
                :empty-text="dailyAccountsTableEmptyText"
              >
                <el-table-column
                  prop="trade_date"
                  label="日期"
                  width="120"
                  sortable
                />
                <el-table-column
                  prop="cash_balance"
                  label="现金余额"
                  width="140"
                  sortable
                >
                  <template #default="scope">{{
                    formatMoney(scope.row.cash_balance)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="market_value_total"
                  label="持仓市值"
                  width="140"
                  sortable
                >
                  <template #default="scope">{{
                    formatMoney(scope.row.market_value_total)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="total_asset"
                  label="总资产"
                  width="140"
                  sortable
                >
                  <template #default="scope">{{
                    formatMoney(scope.row.total_asset)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="daily_net_capital_in"
                  label="当日净入金"
                  width="140"
                  sortable
                >
                  <template #default="scope">{{
                    formatMoney(scope.row.daily_net_capital_in)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="cum_net_capital"
                  label="累计净入金"
                  width="140"
                  sortable
                >
                  <template #default="scope">{{
                    formatMoney(scope.row.cum_net_capital)
                  }}</template>
                </el-table-column>
                <el-table-column
                  prop="daily_realized_profit"
                  label="当日已实现盈亏"
                  width="160"
                  sortable
                >
                  <template #default="scope">
                    <span
                      :class="profitClass(scope.row.daily_realized_profit)"
                      >{{ formatMoney(scope.row.daily_realized_profit) }}</span
                    >
                  </template>
                </el-table-column>
                <el-table-column
                  prop="daily_unrealized_change"
                  label="当日浮盈浮亏变化"
                  width="170"
                  sortable
                >
                  <template #default="scope">
                    <span
                      :class="profitClass(scope.row.daily_unrealized_change)"
                      >{{
                        formatMoney(scope.row.daily_unrealized_change)
                      }}</span
                    >
                  </template>
                </el-table-column>
                <el-table-column
                  prop="daily_total_profit"
                  label="当日总盈亏"
                  width="140"
                  sortable
                >
                  <template #default="scope">
                    <div class="dual-line-cell">
                      <span
                        :class="profitClass(scope.row.daily_total_profit)"
                        >{{ formatMoney(scope.row.daily_total_profit) }}</span
                      >
                      <span
                        :class="profitClass(scope.row.daily_total_profit)"
                        >{{ formatPercent(scope.row.daily_profit_rate) }}</span
                      >
                    </div>
                  </template>
                </el-table-column>
                <el-table-column
                  v-if="canOperateDailyAccounts"
                  label="操作"
                  width="170"
                  fixed="right"
                >
                  <template #default="scope">
                    <el-button
                      v-if="isSuperAdmin || canUpdateDailyAccount"
                      link
                      type="primary"
                      @click="openDailyAccountEditDialog(scope.row)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      v-if="isSuperAdmin || canDeleteDailyAccount"
                      link
                      type="danger"
                      @click="deleteDailyAccountSnapshot(scope.row)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div class="daily-stocks-footer">
                <span class="daily-stocks-empty-tip">{{
                  dailyAccountsEmptyDescription
                }}</span>
                <el-pagination
                  background
                  layout="total, prev, pager, next, sizes"
                  :total="Number(dailyAccounts.total || 0)"
                  :current-page="dailyAccounts.page"
                  :page-size="dailyAccounts.page_size"
                  :page-sizes="[20, 50, 100, 200]"
                  @current-change="handleDailyAccountsPageChange"
                  @size-change="handleDailyAccountsPageSizeChange"
                />
              </div>
            </section>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="盈亏日历" name="calendar" lazy>
        <div class="profit-toolbar calendar-toolbar">
          <el-tabs
            v-model="calendarType"
            class="profit-range-tabs"
            @tab-change="handleCalendarTypeChange"
          >
            <el-tab-pane label="月" name="month" lazy />
            <el-tab-pane label="年" name="year" lazy />
          </el-tabs>
          <div class="profit-toolbar__actions">
            <el-button @click="navigateCalendar('prev')"
              >上一{{ calendarType === 'month' ? '月' : '年' }}</el-button
            >
            <div class="calendar-title">{{ calendarData.title || '--' }}</div>
            <el-button @click="navigateCalendar('next')"
              >下一{{ calendarType === 'month' ? '月' : '年' }}</el-button
            >
          </div>
        </div>

        <div v-loading="calendarLoading" class="profit-content-shell">
          <div class="calendar-summary-bar">
            <span>{{ calendarTotalLabel }}</span>
            <strong :class="profitClass(calendarTotalProfit)"
              >{{ formatMoney(calendarTotalProfit) }}元</strong
            >
          </div>
          <div v-if="calendarType === 'month'" class="calendar-month-shell">
            <div class="calendar-week-header">
              <span v-for="item in WEEKDAY_HEADERS" :key="item">{{
                item
              }}</span>
            </div>
            <div class="calendar-grid month-grid">
              <el-tooltip
                v-for="(item, index) in monthCalendarCells"
                :key="item.blank ? `blank-${index}` : item.date"
                placement="top"
                effect="light"
                :disabled="item.blank"
              >
                <template #content>
                  <div class="calendar-tooltip">
                    <div class="curve-tooltip__title">
                      {{ item.date || '--' }}
                    </div>
                    <div class="calendar-tooltip__section-title">
                      股票盈亏构成
                    </div>
                    <div
                      v-if="getCalendarStockRankings(item).length"
                      class="calendar-breakdown-table-wrap"
                    >
                      <table
                        class="calendar-breakdown-table calendar-breakdown-table--five-columns"
                      >
                        <thead>
                          <tr>
                            <th>股票名称</th>
                            <th>盈亏金额</th>
                            <th>盈亏率</th>
                            <th>持仓天数</th>
                            <th>持仓日期区间</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="ranking in getCalendarStockRankings(item)"
                            :key="`${item.date}-${ranking.stock_code}`"
                          >
                            <td>
                              <div class="calendar-breakdown-name">
                                {{ formatRankingStockName(ranking) }}
                              </div>
                              <div class="calendar-breakdown-code">
                                {{ ranking.stock_code }}
                              </div>
                            </td>
                            <td>
                              <span
                                :class="profitClass(ranking.profit_amount)"
                                >{{ formatMoney(ranking.profit_amount) }}</span
                              >
                            </td>
                            <td>
                              <span
                                :class="profitClass(ranking.profit_amount)"
                                >{{ formatPercent(ranking.profit_rate) }}</span
                              >
                            </td>
                            <td>
                              {{ formatHoldingDays(ranking.holding_days) }}
                            </td>
                            <td class="calendar-breakdown-range">
                              {{ formatHoldingDateRange(ranking) }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div v-else class="calendar-breakdown-empty">
                      暂无股票盈亏构成明细
                    </div>
                  </div>
                </template>
                <div class="calendar-cell" :class="getCalendarCellClass(item)">
                  <template v-if="!item.blank">
                    <div class="calendar-cell__date">
                      {{ formatDayNumber(item.date) }}
                    </div>
                    <div class="calendar-cell__profit">
                      {{ formatNullableMoney(item.profit_amount) }}
                    </div>
                    <div class="calendar-cell__rate">
                      {{ formatNullablePercent(item.profit_rate) }}
                    </div>
                  </template>
                </div>
              </el-tooltip>
            </div>
          </div>

          <div v-else class="calendar-grid year-grid">
            <el-tooltip
              v-for="item in calendarYearItems"
              :key="item.month"
              placement="top"
              effect="light"
            >
              <template #content>
                <div class="calendar-tooltip">
                  <div class="curve-tooltip__title">
                    {{ `${Number(item.month)}月` }}
                  </div>
                  <div class="calendar-tooltip__section-title">
                    股票盈亏构成
                  </div>
                  <div
                    v-if="getCalendarStockRankings(item).length"
                    class="calendar-breakdown-table-wrap"
                  >
                    <table
                      class="calendar-breakdown-table calendar-breakdown-table--five-columns"
                    >
                      <thead>
                        <tr>
                          <th>股票名称</th>
                          <th>盈亏金额</th>
                          <th>盈亏率</th>
                          <th>持仓天数</th>
                          <th>持仓日期区间</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="ranking in getCalendarStockRankings(item)"
                          :key="`${item.month}-${ranking.stock_code}`"
                        >
                          <td>
                            <div class="calendar-breakdown-name">
                              {{ formatRankingStockName(ranking) }}
                            </div>
                            <div class="calendar-breakdown-code">
                              {{ ranking.stock_code }}
                            </div>
                          </td>
                          <td>
                            <span :class="profitClass(ranking.profit_amount)">{{
                              formatMoney(ranking.profit_amount)
                            }}</span>
                          </td>
                          <td>
                            <span :class="profitClass(ranking.profit_amount)">{{
                              formatPercent(ranking.profit_rate)
                            }}</span>
                          </td>
                          <td>{{ formatHoldingDays(ranking.holding_days) }}</td>
                          <td class="calendar-breakdown-range">
                            {{ formatHoldingDateRange(ranking) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else class="calendar-breakdown-empty">
                    暂无股票盈亏构成明细
                  </div>
                </div>
              </template>
              <div
                class="calendar-year-card"
                :class="profitClass(item.profit_amount)"
              >
                <div class="calendar-year-card__month">
                  {{ `${Number(item.month)}月` }}
                </div>
                <strong>{{ formatMoney(item.profit_amount) }}</strong>
                <span>{{ formatPercent(item.profit_rate) }}</span>
                <small>{{
                  `盈利天 ${item.positive_days || 0} / 亏损天 ${item.negative_days || 0}`
                }}</small>
              </div>
            </el-tooltip>
          </div>
        </div>
      </el-tab-pane>
      <!-- // v-if="isSuperAdmin" -->
      <el-tab-pane label="手动补全盈亏数据" name="rebuild" lazy>
        <div
          class="profit-content-shell rebuild-shell"
          v-loading="rebuildLoading"
        >
          <el-tabs v-model="activeRebuildTab">
            <el-tab-pane label="指定日期生成" name="by-date" lazy>
              <el-form label-width="120px" class="rebuild-form">
                <el-form-item label="补全模式">
                  <el-radio-group v-model="rebuildMode">
                    <el-radio label="single">单日</el-radio>
                    <el-radio label="multiple">多日</el-radio>
                    <el-radio label="range">连续区间</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item v-if="rebuildMode === 'single'" label="选择日期">
                  <el-date-picker
                    v-model="rebuildSingleDate"
                    type="date"
                    value-format="YYYY-MM-DD"
                    placeholder="选择交易日"
                  />
                </el-form-item>
                <el-form-item
                  v-else-if="rebuildMode === 'multiple'"
                  label="选择日期"
                >
                  <el-date-picker
                    v-model="rebuildMultiDates"
                    type="dates"
                    value-format="YYYY-MM-DD"
                    placeholder="可多选交易日"
                  />
                </el-form-item>
                <el-form-item v-else label="日期区间">
                  <el-date-picker
                    v-model="rebuildDateRange"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button
                    type="primary"
                    :loading="rebuildLoading"
                    @click="submitRebuildByDate"
                    >开始生成</el-button
                  >
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="全量生成每日盈亏记录" name="all" lazy>
              <el-alert
                title="将根据历史成交与资金流水全量重算快照，耗时可能较长；清仓股票将完整保留费用与已实现盈亏。"
                type="warning"
                :closable="false"
                show-icon
              />
              <el-button
                style="margin-top: 12px"
                type="danger"
                :loading="rebuildLoading || rebuildTaskRunning"
                :disabled="rebuildTaskRunning"
                @click="submitRebuildAll"
              >
                全量生成每日盈亏记录
              </el-button>
              <el-button
                style="margin-top: 12px; margin-left: 8px"
                :loading="rebuildRefreshing"
                :disabled="!rebuildTask.task_id"
                @click="refreshRebuildTaskProgress"
              >
                刷新进度
              </el-button>
            </el-tab-pane>
          </el-tabs>

          <div v-if="rebuildTask.task_id" class="rebuild-task-panel">
            <div class="rebuild-task-summary">
              <span>任务ID：{{ rebuildTask.task_id }}</span>
              <span>状态：{{ rebuildTask.status || '--' }}</span>
              <span
                >进度：{{ rebuildTask.processed_dates || 0 }} /
                {{ rebuildTask.total_dates || 0 }}</span
              >
              <span>成功：{{ rebuildTask.success_dates || 0 }}</span>
              <span>失败：{{ rebuildTask.failed_dates || 0 }}</span>
            </div>
            <div class="rebuild-phase-title">阶段1：股票每日盈亏统计</div>
            <el-table
              :data="rebuildTaskStockItems"
              border
              size="small"
              empty-text="暂无股票阶段明细"
            >
              <el-table-column prop="trade_date" label="日期" width="130" />
              <el-table-column prop="status" label="状态" width="100" />
              <el-table-column
                prop="message"
                label="结果说明"
                min-width="280"
              />
              <el-table-column label="操作" width="120">
                <template #default="scope">
                  <el-button
                    v-if="scope.row.status === 'failed'"
                    link
                    type="primary"
                    @click="retryRebuildForDate(scope.row.trade_date)"
                    >重试</el-button
                  >
                </template>
              </el-table-column>
            </el-table>

            <div class="rebuild-phase-title">阶段2：账号每日盈亏统计</div>
            <el-table
              :data="rebuildTaskAccountItems"
              border
              size="small"
              empty-text="暂无账号阶段明细"
            >
              <el-table-column prop="trade_date" label="日期" width="130" />
              <el-table-column prop="status" label="状态" width="100" />
              <el-table-column
                prop="message"
                label="结果说明"
                min-width="400"
              />
            </el-table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="dailyStockEditDialogVisible"
      title="编辑股票每日盈亏记录"
      width="680px"
    >
      <el-form label-width="130px">
        <el-form-item label="持仓成本">
          <el-input-number
            v-model="dailyStockEditForm.avg_cost_price"
            :min="0"
            :precision="6"
            :step="0.000001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="收盘价">
          <el-input-number
            v-model="dailyStockEditForm.close_price"
            :min="0"
            :precision="6"
            :step="0.000001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="持仓数量">
          <el-input-number
            v-model="dailyStockEditForm.hold_quantity"
            :min="0"
            :precision="0"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="当日手续费">
          <el-input-number
            v-model="dailyStockEditForm.daily_fee"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="当日盈亏">
          <el-input-number
            v-model="dailyStockEditForm.day_profit_amount"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="当日收益率">
          <el-input-number
            v-model="dailyStockEditForm.day_profit_rate"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="是否清仓">
          <el-switch v-model="dailyStockEditForm.is_closed" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dailyStockEditDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="dailyStockEditSubmitting"
          @click="submitDailyStockEdit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dailyAccountEditDialogVisible"
      title="编辑账号每日盈亏记录"
      width="680px"
    >
      <el-form label-width="150px">
        <el-form-item label="现金余额">
          <el-input-number
            v-model="dailyAccountEditForm.cash_balance"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="持仓市值">
          <el-input-number
            v-model="dailyAccountEditForm.market_value_total"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="总资产">
          <el-input-number
            v-model="dailyAccountEditForm.total_asset"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="当日净入金">
          <el-input-number
            v-model="dailyAccountEditForm.daily_net_capital_in"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="累计净入金">
          <el-input-number
            v-model="dailyAccountEditForm.cum_net_capital"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="当日已实现盈亏">
          <el-input-number
            v-model="dailyAccountEditForm.daily_realized_profit"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="当日浮盈浮亏变化">
          <el-input-number
            v-model="dailyAccountEditForm.daily_unrealized_change"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="当日总盈亏">
          <el-input-number
            v-model="dailyAccountEditForm.daily_total_profit"
            :precision="4"
            :step="0.0001"
            controls-position="right"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dailyAccountEditDialogVisible = false"
          >取消</el-button
        >
        <el-button
          type="primary"
          :loading="dailyAccountEditSubmitting"
          @click="submitDailyAccountEdit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  getProfitRebuildTaskProgress,
  getSimTradingProfitAnalysisDailyAccounts,
  getSimTradingProfitAnalysisDailyStocks,
  getSimTradingProfitAnalysisCalendar,
  getSimTradingProfitAnalysisOverview,
  updateSimTradingProfitDailyStockSnapshot,
  deleteSimTradingProfitDailyStockSnapshot,
  updateSimTradingProfitDailyAccountSnapshot,
  deleteSimTradingProfitDailyAccountSnapshot,
  rebuildAccountProfitSnapshot,
} from '@/api/modules/simTrading';

const emit = defineEmits(['view-history-trades']);

const props = defineProps({
  accountId: {
    type: [Number, String],
    required: true,
  },
  trades: {
    type: Array,
    default: () => [],
  },
  cashFlows: {
    type: Array,
    default: () => [],
  },
  isSuperAdmin: {
    type: Boolean,
    default: false,
  },
  canUpdateDailyStock: {
    type: Boolean,
    default: false,
  },
  canDeleteDailyStock: {
    type: Boolean,
    default: false,
  },
  canUpdateDailyAccount: {
    type: Boolean,
    default: false,
  },
  canDeleteDailyAccount: {
    type: Boolean,
    default: false,
  },
});

const OVERVIEW_RANGE_OPTIONS = [
  { label: '本月', value: 'month' },
  { label: '本年', value: 'year' },
  { label: '开户至今', value: 'all' },
  { label: '自定义日期', value: 'custom' },
];
const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];

const activePanelTab = ref('overview');
const activeOverviewContentTab = ref('curve');
const activeRebuildTab = ref('by-date');
const overviewRangeType = ref('month');
const overviewCustomDateRange = ref([]);
const overviewLoading = ref(false);
const calendarType = ref('month');
const calendarLoading = ref(false);
const dailyStocksLoading = ref(false);
const dailyAccountsLoading = ref(false);
const rebuildLoading = ref(false);
const rebuildRefreshing = ref(false);
const rebuildMode = ref('single');
const rebuildSingleDate = ref('');
const rebuildMultiDates = ref([]);
const rebuildDateRange = ref([]);
const overviewCache = new Map();
const calendarCache = new Map();
let rebuildTaskTimer = null;
const rankingFallbackLoading = ref(false);
const rankingFallbackItems = ref([]);

const overviewData = reactive({
  range: null,
  summary: {},
  asset_curve: [],
  stock_rankings: [],
});

const calendarData = reactive({
  title: '',
  anchor_date: '',
  prev_anchor_date: '',
  next_anchor_date: '',
  items: [],
});

const dailyStocks = reactive({
  total: 0,
  page: 1,
  page_size: 50,
  items: [],
});

const dailyStocksFilters = reactive({
  stock_name: '',
  stock_code: '',
  trade_date: '',
  holding_days: null,
});

const dailyAccounts = reactive({
  total: 0,
  page: 1,
  page_size: 50,
  items: [],
});

const rebuildTask = reactive({
  task_id: '',
  account_id: 0,
  status: '',
  rebuild_mode: '',
  total_dates: 0,
  processed_dates: 0,
  success_dates: 0,
  failed_dates: 0,
  message: '',
  items: [],
  stock_items: [],
  account_items: [],
});

const dailyStocksIncludeClosed = ref(false);
const dailyStockEditDialogVisible = ref(false);
const dailyStockEditSubmitting = ref(false);
const dailyStockEditTargetId = ref(0);
const dailyStockEditForm = reactive({
  avg_cost_price: 0,
  close_price: 0,
  hold_quantity: 0,
  daily_fee: 0,
  day_profit_amount: 0,
  day_profit_rate: 0,
  is_closed: false,
});
const dailyAccountEditDialogVisible = ref(false);
const dailyAccountEditSubmitting = ref(false);
const dailyAccountEditTargetId = ref(0);
const dailyAccountEditForm = reactive({
  cash_balance: 0,
  market_value_total: 0,
  total_asset: 0,
  daily_net_capital_in: 0,
  cum_net_capital: 0,
  daily_realized_profit: 0,
  daily_unrealized_change: 0,
  daily_total_profit: 0,
});
const isSuperAdmin = computed(() => Boolean(props.isSuperAdmin));
const canOperateDailyStocks = computed(
  () =>
    isSuperAdmin.value ||
    Boolean(props.canUpdateDailyStock) ||
    Boolean(props.canDeleteDailyStock)
);
const canOperateDailyAccounts = computed(
  () =>
    isSuperAdmin.value ||
    Boolean(props.canUpdateDailyAccount) ||
    Boolean(props.canDeleteDailyAccount)
);
const rebuildTaskRunning = computed(() => {
  const status = String(rebuildTask.status || '').toLowerCase();
  return status === 'pending' || status === 'running';
});
const rebuildTaskStockItems = computed(() => {
  if (
    Array.isArray(rebuildTask.stock_items) &&
    rebuildTask.stock_items.length
  ) {
    return rebuildTask.stock_items;
  }
  const allItems = Array.isArray(rebuildTask.items) ? rebuildTask.items : [];
  const phaseItems = allItems.filter(
    (item) => String(item?.phase || '').toLowerCase() === 'stock'
  );
  if (phaseItems.length) {
    return phaseItems;
  }
  return allItems.map((item) => ({
    ...item,
    phase: 'stock',
    message: String(item?.message || '股票每日盈亏统计完成'),
  }));
});
const rebuildTaskAccountItems = computed(() => {
  if (
    Array.isArray(rebuildTask.account_items) &&
    rebuildTask.account_items.length
  ) {
    return rebuildTask.account_items;
  }
  const allItems = Array.isArray(rebuildTask.items) ? rebuildTask.items : [];
  const phaseItems = allItems.filter(
    (item) => String(item?.phase || '').toLowerCase() === 'account'
  );
  if (phaseItems.length) {
    return phaseItems;
  }
  return allItems.map((item) => ({
    ...item,
    phase: 'account',
    message:
      item?.status === 'success'
        ? '账号每日盈亏统计完成'
        : '账号每日盈亏统计失败（股票阶段失败）',
  }));
});

const overviewSummary = computed(() => overviewData.summary || {});
const rankingTableData = computed(() => {
  const overviewRankings = Array.isArray(overviewData.stock_rankings)
    ? overviewData.stock_rankings
    : [];
  if (overviewRankings.length) {
    return overviewRankings;
  }
  return Array.isArray(rankingFallbackItems.value)
    ? rankingFallbackItems.value
    : [];
});
const overviewRangeLabel = computed(
  () => overviewData.range?.display_label || '当前区间'
);
const rangeDescriptionText = computed(() => {
  const range = overviewData.range || {};
  if (!range.start_date || !range.effective_end_date) {
    return '暂无有效数据';
  }
  return `${range.start_date} 至 ${range.effective_end_date}`;
});
const effectiveDateRangeText = computed(() => {
  const range = overviewData.range || {};
  if (!range.start_date || !range.effective_end_date) {
    return '--';
  }
  return `${range.start_date} ~ ${range.effective_end_date}`;
});

const curveCoordinates = computed(() => {
  const points = Array.isArray(overviewData.asset_curve)
    ? overviewData.asset_curve
    : [];
  if (!points.length) {
    return [];
  }
  const values = points.map((item) => Number(item.total_asset || 0));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || Math.max(maxValue, 1);
  return points.map((item, index) => {
    const x =
      points.length === 1 ? 360 : 24 + (672 * index) / (points.length - 1);
    const y = 184 - ((Number(item.total_asset || 0) - minValue) / span) * 148;
    return {
      x,
      y,
      date: item.date,
      totalAsset: Number(item.total_asset || 0),
    };
  });
});
const curveLinePath = computed(() => {
  if (!curveCoordinates.value.length) {
    return '';
  }
  return curveCoordinates.value
    .map((item, index) => `${index === 0 ? 'M' : 'L'} ${item.x} ${item.y}`)
    .join(' ');
});
const curveAreaPath = computed(() => {
  if (!curveCoordinates.value.length) {
    return '';
  }
  const first = curveCoordinates.value[0];
  const last = curveCoordinates.value[curveCoordinates.value.length - 1];
  return `${curveLinePath.value} L ${last.x} 196 L ${first.x} 196 Z`;
});
const curveAxisLabels = computed(() => {
  const points = curveCoordinates.value;
  if (!points.length) {
    return [];
  }
  const values = points.map((item) => item.totalAsset);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const middleValue = (minValue + maxValue) / 2;
  return [
    { label: formatMoney(maxValue) },
    { label: formatMoney(middleValue) },
    { label: formatMoney(minValue) },
  ];
});
const curveStartLabel = computed(
  () => overviewData.asset_curve?.[0]?.date || '--'
);
const curveEndLabel = computed(
  () =>
    overviewData.asset_curve?.[overviewData.asset_curve.length - 1]?.date ||
    '--'
);

const monthCalendarCells = computed(() => {
  if (calendarType.value !== 'month') {
    return [];
  }
  const items = Array.isArray(calendarData.items) ? calendarData.items : [];
  if (!items.length) {
    return [];
  }
  const firstDay = new Date(`${items[0].date}T00:00:00`);
  const leadingBlankCount = (firstDay.getDay() + 6) % 7;
  const blanks = Array.from({ length: leadingBlankCount }, () => ({
    blank: true,
  }));
  return [...blanks, ...items.map((item) => ({ ...item, blank: false }))];
});
const calendarYearItems = computed(() =>
  Array.isArray(calendarData.items) ? calendarData.items : []
);
const calendarTotalProfit = computed(() => {
  const items = Array.isArray(calendarData.items) ? calendarData.items : [];
  return items.reduce((sum, item) => sum + Number(item?.profit_amount || 0), 0);
});
const calendarTotalLabel = computed(
  () => `${calendarData.title || '--'}总收益：`
);
const hasAnyTradeOrCashFlow = computed(() => {
  const tradeCount = Array.isArray(props.trades) ? props.trades.length : 0;
  const cashFlowCount = Array.isArray(props.cashFlows)
    ? props.cashFlows.length
    : 0;
  return tradeCount > 0 || cashFlowCount > 0;
});
const snapshotMissingHint =
  '当日盈亏快照未生成，请前往「手动补全盈亏数据」面板重建快照';
const curveEmptyDescription = computed(() => {
  return hasAnyTradeOrCashFlow.value ? snapshotMissingHint : '暂无盈亏数据';
});
const rankingEmptyText = computed(() => {
  if (rankingFallbackLoading.value) {
    return '正在根据明细动态聚合排行榜...';
  }
  return hasAnyTradeOrCashFlow.value ? snapshotMissingHint : '暂无盈亏数据';
});
const dailyStocksTableEmptyText = computed(() => {
  return hasAnyTradeOrCashFlow.value ? snapshotMissingHint : '暂无盈亏数据';
});
const dailyAccountsTableEmptyText = computed(() => {
  return hasAnyTradeOrCashFlow.value ? snapshotMissingHint : '暂无盈亏数据';
});
const dailyStocksEmptyDescription = computed(() => {
  if (Number(dailyStocks.total || 0) > 0) {
    return '';
  }
  if (!hasAnyTradeOrCashFlow.value) {
    return '暂无盈亏数据';
  }
  return dailyStocksIncludeClosed.value
    ? '当前区间暂无盈亏明细（包含清仓记录）'
    : '当日盈亏快照未生成，或当前区间仅有清仓记录；可勾选“展示已清仓个股”或前往手动补全面板重建快照';
});
const dailyAccountsEmptyDescription = computed(() => {
  if (Number(dailyAccounts.total || 0) > 0) {
    return '';
  }
  return hasAnyTradeOrCashFlow.value
    ? '当前区间未生成账号快照，请前往手动补全面板重建快照'
    : '暂无盈亏数据';
});
const dailyStockDateColumnFilters = computed(() => {
  const uniqueValues = Array.from(
    new Set(
      (dailyStocks.items || [])
        .map((item) => String(item?.trade_date || '').trim())
        .filter(Boolean)
    )
  );
  return uniqueValues.map((value) => ({ text: value, value }));
});
const dailyStockNameColumnFilters = computed(() => {
  const uniqueValues = Array.from(
    new Set(
      (dailyStocks.items || [])
        .map((item) => String(item?.stock_name || '').trim())
        .filter(Boolean)
    )
  );
  return uniqueValues.map((value) => ({ text: value, value }));
});
const tradeEventsByDate = computed(() => {
  const map = new Map();
  for (const item of props.trades || []) {
    const dateText = toDateKey(item?.traded_time);
    if (!dateText) {
      continue;
    }
    const bucket = map.get(dateText) || [];
    bucket.push(
      `${getDirectionLabel(item?.direction)} ${formatTradeStockName(item?.stock_name, item?.stock_code)}`
    );
    map.set(dateText, bucket);
  }
  return map;
});
const cashFlowEventsByDate = computed(() => {
  const map = new Map();
  for (const item of props.cashFlows || []) {
    const dateText = toDateKey(item?.occurred_time);
    if (!dateText) {
      continue;
    }
    if (
      ![
        'DEPOSIT',
        'WITHDRAW',
        'DIVIDEND',
        'INTEREST',
        'BUY_SETTLE',
        'SELL_SETTLE',
        'FEE',
      ].includes(String(item?.flow_type || ''))
    ) {
      continue;
    }
    const bucket = map.get(dateText) || [];
    const amountText = `${getFlowTypeLabel(item?.flow_type)} ${formatMoney(item?.amount)}元`;
    bucket.push(amountText);
    map.set(dateText, bucket);
  }
  return map;
});

watch(
  () => props.accountId,
  async (value) => {
    if (!value) {
      return;
    }
    overviewCache.clear();
    calendarCache.clear();
    overviewRangeType.value = 'month';
    overviewCustomDateRange.value = [];
    calendarType.value = 'month';
    activeOverviewContentTab.value = 'curve';
    dailyStocks.page = 1;
    dailyStocks.page_size = 50;
    dailyStocks.items = [];
    dailyStocks.total = 0;
    dailyStocksFilters.stock_name = '';
    dailyStocksFilters.stock_code = '';
    dailyStocksFilters.trade_date = '';
    dailyStocksFilters.holding_days = null;
    rankingFallbackItems.value = [];
    rankingFallbackLoading.value = false;
    dailyAccounts.page = 1;
    dailyAccounts.page_size = 50;
    dailyAccounts.items = [];
    dailyAccounts.total = 0;
    dailyStocksIncludeClosed.value = false;
    resetRebuildTask();
    await Promise.all([loadOverview(), loadCalendar()]);
  },
  { immediate: true }
);

watch(
  () =>
    JSON.stringify({
      trades: (props.trades || []).map((item) => [
        item?.id,
        item?.traded_time,
        item?.fill_quantity,
        item?.net_amount,
      ]),
      cashFlows: (props.cashFlows || []).map((item) => [
        item?.id,
        item?.occurred_time,
        item?.amount,
        item?.flow_type,
      ]),
    }),
  async () => {
    if (!props.accountId) {
      return;
    }
    overviewCache.clear();
    calendarCache.clear();
    await Promise.all([
      loadOverview({ force: true }),
      loadCalendar({ force: true }),
    ]);
    if (activeOverviewContentTab.value === 'daily-stocks') {
      await loadDailyStocks({ force: true });
    } else if (activeOverviewContentTab.value === 'daily-accounts') {
      await loadDailyAccounts({ force: true });
    }
  }
);

watch(
  () => activeOverviewContentTab.value,
  async (value) => {
    if (value === 'ranking') {
      await ensureRankingFallback();
    } else if (value === 'daily-stocks') {
      await loadDailyStocks();
    } else if (value === 'daily-accounts') {
      await loadDailyAccounts();
    }
  }
);

function buildRankingFallbackFromDailyStocks(items = []) {
  const rankingMap = new Map();
  for (const row of items) {
    const stockCode = String(row?.stock_code || '').trim();
    const exchangeCode = String(row?.exchange_code || '').trim();
    if (!stockCode || !exchangeCode) {
      continue;
    }
    const key = `${stockCode}|${exchangeCode}`;
    const tradeDateText = String(row?.trade_date || '').trim();
    const rankingItem = rankingMap.get(key) || {
      stock_code: stockCode,
      stock_name: String(row?.stock_name || '').trim() || stockCode,
      exchange_code: exchangeCode,
      profit_amount: 0,
      profit_rate: 0,
      holding_days: 0,
      first_open_date: row?.first_open_date || null,
      close_date: row?.close_date || null,
      start_market_value: 0,
      end_market_value: 0,
      buy_amount: 0,
      sell_amount: 0,
      end_quantity: 0,
      _latest_trade_date: '',
    };

    rankingItem.profit_amount += Number(row?.day_profit_amount || 0);
    rankingItem.buy_amount += Number(row?.daily_buy_amount || 0);
    rankingItem.sell_amount += Number(row?.daily_sell_amount || 0);
    rankingItem.holding_days = Math.max(
      Number(rankingItem.holding_days || 0),
      Number(row?.holding_days || 0)
    );
    if (!rankingItem.first_open_date && row?.first_open_date) {
      rankingItem.first_open_date = row.first_open_date;
    }
    if (row?.close_date) {
      rankingItem.close_date = row.close_date;
    }
    if (tradeDateText >= String(rankingItem._latest_trade_date || '')) {
      rankingItem._latest_trade_date = tradeDateText;
      rankingItem.end_market_value = Number(row?.market_value || 0);
      rankingItem.end_quantity = Number(row?.hold_quantity || 0);
    }
    rankingMap.set(key, rankingItem);
  }

  return Array.from(rankingMap.values())
    .map((item) => {
      const denominator = Number(item.buy_amount || 0);
      return {
        ...item,
        profit_rate:
          denominator > 0 ? Number(item.profit_amount || 0) / denominator : 0,
      };
    })
    .sort(
      (a, b) =>
        Number(b?.profit_amount || 0) - Number(a?.profit_amount || 0) ||
        Number(b?.profit_rate || 0) - Number(a?.profit_rate || 0)
    )
    .map(({ _latest_trade_date, ...rest }) => rest);
}

async function ensureRankingFallback() {
  const overviewRankings = Array.isArray(overviewData.stock_rankings)
    ? overviewData.stock_rankings
    : [];
  if (overviewRankings.length || !props.accountId) {
    rankingFallbackItems.value = [];
    return;
  }
  rankingFallbackLoading.value = true;
  try {
    const pageSize = 500;
    const params = {
      range_type: overviewRangeType.value,
      include_closed: true,
      page: 1,
      page_size: pageSize,
      _ts: Date.now(),
    };
    if (
      overviewRangeType.value === 'custom' &&
      Array.isArray(overviewCustomDateRange.value) &&
      overviewCustomDateRange.value.length === 2
    ) {
      params.start_date = overviewCustomDateRange.value[0];
      params.end_date = overviewCustomDateRange.value[1];
    }

    const firstRes = await getSimTradingProfitAnalysisDailyStocks(
      Number(props.accountId),
      params
    );
    const firstPayload = firstRes?.payload || {};
    const allItems = Array.isArray(firstPayload.items)
      ? [...firstPayload.items]
      : [];
    const total = Number(firstPayload.total || 0);
    const totalPages = Math.min(Math.ceil(total / pageSize), 20);

    for (let pageIndex = 2; pageIndex <= totalPages; pageIndex += 1) {
      const pageRes = await getSimTradingProfitAnalysisDailyStocks(
        Number(props.accountId),
        {
          ...params,
          page: pageIndex,
        }
      );
      const pageItems = Array.isArray(pageRes?.payload?.items)
        ? pageRes.payload.items
        : [];
      allItems.push(...pageItems);
    }

    rankingFallbackItems.value = buildRankingFallbackFromDailyStocks(allItems);
  } catch (error) {
    console.error(error);
    rankingFallbackItems.value = [];
  } finally {
    rankingFallbackLoading.value = false;
  }
}

async function loadOverview(options = {}) {
  if (!props.accountId) {
    return;
  }
  const { force = false } = options;
  const params = { range_type: overviewRangeType.value };
  if (
    overviewRangeType.value === 'custom' &&
    Array.isArray(overviewCustomDateRange.value) &&
    overviewCustomDateRange.value.length === 2
  ) {
    params.start_date = overviewCustomDateRange.value[0];
    params.end_date = overviewCustomDateRange.value[1];
  }
  const cacheKey = JSON.stringify({
    accountId: Number(props.accountId),
    ...params,
  });
  if (!force && overviewCache.has(cacheKey)) {
    Object.assign(overviewData, clonePayload(overviewCache.get(cacheKey)));
    await ensureRankingFallback();
    return;
  }
  overviewLoading.value = true;
  try {
    const res = await getSimTradingProfitAnalysisOverview(
      Number(props.accountId),
      params
    );
    const payload = res?.payload || {
      range: null,
      summary: {},
      asset_curve: [],
      stock_rankings: [],
    };
    overviewCache.set(cacheKey, clonePayload(payload));
    Object.assign(overviewData, payload);
    await ensureRankingFallback();
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '获取盈亏分析概览失败');
  } finally {
    overviewLoading.value = false;
  }
}

async function loadCalendar(options = {}) {
  if (!props.accountId) {
    return;
  }
  const { force = false } = options;
  calendarLoading.value = true;
  try {
    const anchorDate = calendarData.anchor_date || formatDateInput(new Date());
    const params = {
      calendar_type: calendarType.value,
      anchor_date: anchorDate,
    };
    const cacheKey = JSON.stringify({
      accountId: Number(props.accountId),
      ...params,
    });
    if (!force && calendarCache.has(cacheKey)) {
      Object.assign(calendarData, clonePayload(calendarCache.get(cacheKey)));
      return;
    }
    const res = await getSimTradingProfitAnalysisCalendar(
      Number(props.accountId),
      params
    );
    const payload = res?.payload || {
      title: '',
      anchor_date: '',
      prev_anchor_date: '',
      next_anchor_date: '',
      items: [],
    };
    calendarCache.set(cacheKey, clonePayload(payload));
    Object.assign(calendarData, payload);
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '获取盈亏分析日历失败');
  } finally {
    calendarLoading.value = false;
  }
}

function handleOverviewRangeChange(nextValue) {
  if (nextValue !== 'custom') {
    loadOverview();
    if (activeOverviewContentTab.value === 'daily-stocks') {
      loadDailyStocks({ force: true });
    }
  }
}

function handleCustomRangeChange() {
  if (
    overviewRangeType.value === 'custom' &&
    Array.isArray(overviewCustomDateRange.value) &&
    overviewCustomDateRange.value.length === 2
  ) {
    loadOverview();
    if (activeOverviewContentTab.value === 'daily-stocks') {
      loadDailyStocks({ force: true });
    }
  }
}

function handleCalendarTypeChange() {
  calendarData.anchor_date = formatDateInput(new Date());
  loadCalendar();
}

function navigateCalendar(direction) {
  calendarData.anchor_date =
    direction === 'prev'
      ? calendarData.prev_anchor_date
      : calendarData.next_anchor_date;
  loadCalendar();
}

function refreshOverview() {
  loadOverview({ force: true });
}

async function loadDailyStocks(options = {}) {
  if (!props.accountId) {
    return;
  }
  const { force = false } = options;
  dailyStocksLoading.value = true;
  try {
    const params = {
      range_type: overviewRangeType.value,
      include_closed: dailyStocksIncludeClosed.value,
      page: Number(dailyStocks.page || 1),
      page_size: Number(dailyStocks.page_size || 50),
    };
    const normalizedStockName = String(
      dailyStocksFilters.stock_name || ''
    ).trim();
    if (normalizedStockName) {
      params.stock_name = normalizedStockName;
    }
    const normalizedStockCode = String(
      dailyStocksFilters.stock_code || ''
    ).trim();
    if (normalizedStockCode) {
      params.stock_code = normalizedStockCode;
    }
    if (dailyStocksFilters.trade_date) {
      params.trade_date = dailyStocksFilters.trade_date;
    }
    if (
      dailyStocksFilters.holding_days !== null &&
      dailyStocksFilters.holding_days !== undefined &&
      dailyStocksFilters.holding_days !== ''
    ) {
      params.holding_days = Number(dailyStocksFilters.holding_days);
    }
    if (
      overviewRangeType.value === 'custom' &&
      Array.isArray(overviewCustomDateRange.value) &&
      overviewCustomDateRange.value.length === 2
    ) {
      params.start_date = overviewCustomDateRange.value[0];
      params.end_date = overviewCustomDateRange.value[1];
    }
    if (force) {
      params._ts = Date.now();
    }
    const res = await getSimTradingProfitAnalysisDailyStocks(
      Number(props.accountId),
      params
    );
    const payload = res?.payload || {
      total: 0,
      page: Number(params.page || 1),
      page_size: Number(params.page_size || 50),
      items: [],
    };
    dailyStocks.total = Number(payload.total || 0);
    dailyStocks.page = Number(payload.page || 1);
    dailyStocks.page_size = Number(payload.page_size || 50);
    dailyStocks.items = Array.isArray(payload.items) ? payload.items : [];
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '获取股票每日盈亏明细失败');
  } finally {
    dailyStocksLoading.value = false;
  }
}

async function loadDailyAccounts(options = {}) {
  if (!props.accountId) {
    return;
  }
  const { force = false } = options;
  dailyAccountsLoading.value = true;
  try {
    const params = {
      range_type: overviewRangeType.value,
      page: Number(dailyAccounts.page || 1),
      page_size: Number(dailyAccounts.page_size || 50),
    };
    if (
      overviewRangeType.value === 'custom' &&
      Array.isArray(overviewCustomDateRange.value) &&
      overviewCustomDateRange.value.length === 2
    ) {
      params.start_date = overviewCustomDateRange.value[0];
      params.end_date = overviewCustomDateRange.value[1];
    }
    if (force) {
      params._ts = Date.now();
    }
    const res = await getSimTradingProfitAnalysisDailyAccounts(
      Number(props.accountId),
      params
    );
    const payload = res?.payload || {
      total: 0,
      page: Number(params.page || 1),
      page_size: Number(params.page_size || 50),
      items: [],
    };
    dailyAccounts.total = Number(payload.total || 0);
    dailyAccounts.page = Number(payload.page || 1);
    dailyAccounts.page_size = Number(payload.page_size || 50);
    dailyAccounts.items = Array.isArray(payload.items) ? payload.items : [];
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '获取账号每日盈亏明细失败');
  } finally {
    dailyAccountsLoading.value = false;
  }
}

function refreshDailyStocks() {
  dailyStocks.page = 1;
  loadDailyStocks({ force: true });
}

function applyDailyStocksFilters() {
  dailyStocks.page = 1;
  loadDailyStocks({ force: true });
}

function resetDailyStocksFilters() {
  dailyStocksFilters.stock_name = '';
  dailyStocksFilters.stock_code = '';
  dailyStocksFilters.trade_date = '';
  dailyStocksFilters.holding_days = null;
  dailyStocks.page = 1;
  loadDailyStocks({ force: true });
}

function filterDailyStockTradeDate(value, row) {
  return String(row?.trade_date || '') === String(value || '');
}

function filterDailyStockName(value, row) {
  return String(row?.stock_name || '').trim() === String(value || '').trim();
}

function refreshDailyAccounts() {
  dailyAccounts.page = 1;
  loadDailyAccounts({ force: true });
}

function openDailyStockEditDialog(row) {
  if (!(isSuperAdmin.value || props.canUpdateDailyStock)) {
    return;
  }
  dailyStockEditTargetId.value = Number(row?.id || 0);
  dailyStockEditForm.avg_cost_price = Number(row?.avg_cost_price || 0);
  dailyStockEditForm.close_price = Number(row?.close_price || 0);
  dailyStockEditForm.hold_quantity = Number(row?.hold_quantity || 0);
  dailyStockEditForm.daily_fee = Number(row?.daily_fee || 0);
  dailyStockEditForm.day_profit_amount = Number(row?.day_profit_amount || 0);
  dailyStockEditForm.day_profit_rate = Number(row?.day_profit_rate || 0);
  dailyStockEditForm.is_closed = Boolean(row?.is_closed);
  dailyStockEditDialogVisible.value = true;
}

async function submitDailyStockEdit() {
  if (!props.accountId || !dailyStockEditTargetId.value) {
    return;
  }
  dailyStockEditSubmitting.value = true;
  try {
    await updateSimTradingProfitDailyStockSnapshot(
      Number(props.accountId),
      Number(dailyStockEditTargetId.value),
      {
        avg_cost_price: Number(dailyStockEditForm.avg_cost_price || 0),
        close_price: Number(dailyStockEditForm.close_price || 0),
        hold_quantity: Number(dailyStockEditForm.hold_quantity || 0),
        daily_fee: Number(dailyStockEditForm.daily_fee || 0),
        day_profit_amount: Number(dailyStockEditForm.day_profit_amount || 0),
        day_profit_rate: Number(dailyStockEditForm.day_profit_rate || 0),
        is_closed: Boolean(dailyStockEditForm.is_closed),
      }
    );
    dailyStockEditDialogVisible.value = false;
    ElMessage.success('股票每日盈亏记录已更新');
    await loadDailyStocks({ force: true });
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '更新股票每日盈亏记录失败');
  } finally {
    dailyStockEditSubmitting.value = false;
  }
}

async function deleteDailyStockSnapshot(row) {
  if (!(isSuperAdmin.value || props.canDeleteDailyStock)) {
    return;
  }
  const snapshotId = Number(row?.id || 0);
  if (!props.accountId || !snapshotId) {
    ElMessage.warning('记录ID无效，无法删除');
    return;
  }
  try {
    await ElMessageBox.confirm(
      '确认删除该股票每日盈亏记录吗？删除后不可恢复。',
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      }
    );
    await deleteSimTradingProfitDailyStockSnapshot(
      Number(props.accountId),
      snapshotId
    );
    ElMessage.success('股票每日盈亏记录已删除');
    await loadDailyStocks({ force: true });
  } catch (error) {
    if (String(error || '').includes('cancel')) {
      return;
    }
    console.error(error);
    ElMessage.error(error?.message || '删除股票每日盈亏记录失败');
  }
}

function openDailyAccountEditDialog(row) {
  if (!(isSuperAdmin.value || props.canUpdateDailyAccount)) {
    return;
  }
  dailyAccountEditTargetId.value = Number(row?.id || 0);
  dailyAccountEditForm.cash_balance = Number(row?.cash_balance || 0);
  dailyAccountEditForm.market_value_total = Number(
    row?.market_value_total || 0
  );
  dailyAccountEditForm.total_asset = Number(row?.total_asset || 0);
  dailyAccountEditForm.daily_net_capital_in = Number(
    row?.daily_net_capital_in || 0
  );
  dailyAccountEditForm.cum_net_capital = Number(row?.cum_net_capital || 0);
  dailyAccountEditForm.daily_realized_profit = Number(
    row?.daily_realized_profit || 0
  );
  dailyAccountEditForm.daily_unrealized_change = Number(
    row?.daily_unrealized_change || 0
  );
  dailyAccountEditForm.daily_total_profit = Number(
    row?.daily_total_profit || 0
  );
  dailyAccountEditDialogVisible.value = true;
}

async function submitDailyAccountEdit() {
  if (!props.accountId || !dailyAccountEditTargetId.value) {
    return;
  }
  dailyAccountEditSubmitting.value = true;
  try {
    await updateSimTradingProfitDailyAccountSnapshot(
      Number(props.accountId),
      Number(dailyAccountEditTargetId.value),
      {
        cash_balance: Number(dailyAccountEditForm.cash_balance || 0),
        market_value_total: Number(
          dailyAccountEditForm.market_value_total || 0
        ),
        total_asset: Number(dailyAccountEditForm.total_asset || 0),
        daily_net_capital_in: Number(
          dailyAccountEditForm.daily_net_capital_in || 0
        ),
        cum_net_capital: Number(dailyAccountEditForm.cum_net_capital || 0),
        daily_realized_profit: Number(
          dailyAccountEditForm.daily_realized_profit || 0
        ),
        daily_unrealized_change: Number(
          dailyAccountEditForm.daily_unrealized_change || 0
        ),
        daily_total_profit: Number(
          dailyAccountEditForm.daily_total_profit || 0
        ),
      }
    );
    dailyAccountEditDialogVisible.value = false;
    ElMessage.success('账号每日盈亏记录已更新');
    await loadDailyAccounts({ force: true });
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '更新账号每日盈亏记录失败');
  } finally {
    dailyAccountEditSubmitting.value = false;
  }
}

async function deleteDailyAccountSnapshot(row) {
  if (!(isSuperAdmin.value || props.canDeleteDailyAccount)) {
    return;
  }
  const snapshotId = Number(row?.id || 0);
  if (!props.accountId || !snapshotId) {
    ElMessage.warning('记录ID无效，无法删除');
    return;
  }
  try {
    await ElMessageBox.confirm(
      '确认删除该账号每日盈亏记录吗？删除后不可恢复。',
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      }
    );
    await deleteSimTradingProfitDailyAccountSnapshot(
      Number(props.accountId),
      snapshotId
    );
    ElMessage.success('账号每日盈亏记录已删除');
    await loadDailyAccounts({ force: true });
  } catch (error) {
    if (String(error || '').includes('cancel')) {
      return;
    }
    console.error(error);
    ElMessage.error(error?.message || '删除账号每日盈亏记录失败');
  }
}

function handleDailyStocksPageChange(page) {
  dailyStocks.page = Number(page || 1);
  loadDailyStocks();
}

function handleDailyStocksPageSizeChange(pageSize) {
  dailyStocks.page_size = Number(pageSize || 50);
  dailyStocks.page = 1;
  loadDailyStocks();
}

function handleDailyAccountsPageChange(page) {
  dailyAccounts.page = Number(page || 1);
  loadDailyAccounts();
}

function handleDailyAccountsPageSizeChange(pageSize) {
  dailyAccounts.page_size = Number(pageSize || 50);
  dailyAccounts.page = 1;
  loadDailyAccounts();
}

function buildRebuildPayload(mode, dates = {}) {
  if (mode === 'all') {
    return { rebuild_mode: 'all' };
  }
  if (mode === 'range') {
    return {
      rebuild_mode: 'range',
      start_date: dates.start_date,
      end_date: dates.end_date,
    };
  }
  if (mode === 'multiple') {
    return {
      rebuild_mode: 'multiple',
      trade_dates: dates.trade_dates || [],
    };
  }
  return {
    rebuild_mode: 'single',
    trade_date: dates.trade_date,
  };
}

function resetRebuildTask() {
  rebuildTask.task_id = '';
  rebuildTask.account_id = 0;
  rebuildTask.status = '';
  rebuildTask.rebuild_mode = '';
  rebuildTask.total_dates = 0;
  rebuildTask.processed_dates = 0;
  rebuildTask.success_dates = 0;
  rebuildTask.failed_dates = 0;
  rebuildTask.message = '';
  rebuildTask.items = [];
  rebuildTask.stock_items = [];
  rebuildTask.account_items = [];
  if (rebuildTaskTimer) {
    clearTimeout(rebuildTaskTimer);
    rebuildTaskTimer = null;
  }
}

async function pullRebuildTaskProgress(taskId) {
  if (!props.accountId || !taskId) {
    return;
  }
  const res = await getProfitRebuildTaskProgress(
    Number(props.accountId),
    String(taskId)
  );
  const payload = res?.payload || {};
  rebuildTask.task_id = String(payload.task_id || '');
  rebuildTask.account_id = Number(payload.account_id || 0);
  rebuildTask.status = String(payload.status || '');
  rebuildTask.rebuild_mode = String(payload.rebuild_mode || '');
  rebuildTask.total_dates = Number(payload.total_dates || 0);
  rebuildTask.processed_dates = Number(payload.processed_dates || 0);
  rebuildTask.success_dates = Number(payload.success_dates || 0);
  rebuildTask.failed_dates = Number(payload.failed_dates || 0);
  rebuildTask.message = String(payload.message || '');
  rebuildTask.items = Array.isArray(payload.items) ? payload.items : [];
  rebuildTask.stock_items = Array.isArray(payload.stock_items)
    ? payload.stock_items
    : [];
  rebuildTask.account_items = Array.isArray(payload.account_items)
    ? payload.account_items
    : [];
}

function stopRebuildTaskPolling() {
  if (rebuildTaskTimer) {
    clearTimeout(rebuildTaskTimer);
    rebuildTaskTimer = null;
  }
}

function startRebuildTaskPolling(taskId) {
  stopRebuildTaskPolling();
  const tick = async () => {
    try {
      await pullRebuildTaskProgress(taskId);
      if (rebuildTaskRunning.value) {
        rebuildTaskTimer = setTimeout(tick, 1500);
      } else {
        rebuildTaskTimer = null;
      }
    } catch (error) {
      console.error(error);
      rebuildTaskTimer = setTimeout(tick, 3000);
    }
  };
  rebuildTaskTimer = setTimeout(tick, 1500);
}

async function refreshRebuildTaskProgress() {
  if (!rebuildTask.task_id || !props.accountId) {
    return;
  }
  rebuildRefreshing.value = true;
  try {
    await pullRebuildTaskProgress(rebuildTask.task_id);
    if (rebuildTaskRunning.value) {
      startRebuildTaskPolling(rebuildTask.task_id);
    }
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '刷新任务进度失败');
  } finally {
    rebuildRefreshing.value = false;
  }
}

async function submitRebuild(payload) {
  if (!props.accountId) {
    return;
  }
  if (rebuildTaskRunning.value) {
    ElMessage.warning('当前已有重建任务进行中，请稍后再试');
    return;
  }
  rebuildLoading.value = true;
  try {
    const res = await rebuildAccountProfitSnapshot(
      Number(props.accountId),
      payload
    );
    const taskPayload = res?.payload || {};
    const taskId = String(taskPayload.task_id || '');
    if (!taskId) {
      ElMessage.warning('重建任务已提交，但未返回任务ID');
      return;
    }
    await pullRebuildTaskProgress(taskId);
    await refreshOverview();
    await loadCalendar({ force: true });
    if (activeOverviewContentTab.value === 'daily-stocks') {
      await loadDailyStocks({ force: true });
    }
    if (rebuildTaskRunning.value) {
      startRebuildTaskPolling(taskId);
    }
    ElMessage.success('盈亏快照重建任务已执行');
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '提交重建任务失败');
  } finally {
    rebuildLoading.value = false;
  }
}

async function submitRebuildByDate() {
  if (rebuildMode.value === 'single') {
    if (!rebuildSingleDate.value) {
      ElMessage.warning('请选择重建日期');
      return;
    }
    await submitRebuild(
      buildRebuildPayload('single', { trade_date: rebuildSingleDate.value })
    );
    return;
  }
  if (rebuildMode.value === 'multiple') {
    if (
      !Array.isArray(rebuildMultiDates.value) ||
      !rebuildMultiDates.value.length
    ) {
      ElMessage.warning('请至少选择一个日期');
      return;
    }
    await submitRebuild(
      buildRebuildPayload('multiple', { trade_dates: rebuildMultiDates.value })
    );
    return;
  }
  if (
    !Array.isArray(rebuildDateRange.value) ||
    rebuildDateRange.value.length !== 2
  ) {
    ElMessage.warning('请选择完整日期区间');
    return;
  }
  await submitRebuild(
    buildRebuildPayload('range', {
      start_date: rebuildDateRange.value[0],
      end_date: rebuildDateRange.value[1],
    })
  );
}

async function submitRebuildAll() {
  await submitRebuild(buildRebuildPayload('all'));
}

async function retryRebuildForDate(tradeDate) {
  if (!tradeDate) {
    return;
  }
  await submitRebuild(buildRebuildPayload('single', { trade_date: tradeDate }));
}

function formatMoney(value) {
  const numberValue = Number(value || 0);
  return numberValue.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value) {
  const numberValue = Number(value || 0);
  return `${(numberValue * 100).toFixed(2)}%`;
}

function formatNullableMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  return formatMoney(value);
}

function formatNullablePercent(value) {
  if (value === null || value === undefined || value === '') {
    return '--';
  }
  return formatPercent(value);
}

function profitClass(value) {
  const numberValue = Number(value || 0);
  if (numberValue > 0) return 'profit-up';
  if (numberValue < 0) return 'profit-down';
  return '';
}

function clonePayload(payload) {
  if (typeof structuredClone === 'function') {
    return structuredClone(payload);
  }
  return JSON.parse(JSON.stringify(payload));
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(String(value).trim().replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(value) {
  const date = normalizeDate(value);
  if (!date) {
    return '';
  }
  return formatDateInput(date);
}

function formatTradeStockName(stockName, stockCode) {
  const text = String(stockName || '').trim();
  if (text && !looksLikeStockCode(text)) {
    return text;
  }
  return String(stockCode || '').trim() || '--';
}

function formatRankingStockName(row) {
  return formatTradeStockName(row?.stock_name, row?.stock_code);
}

function normalizeStockDigits(stockCode) {
  return String(stockCode || '').replace(/[^0-9]/g, '');
}

function getBaiduStockUrl(row) {
  const digits = normalizeStockDigits(row?.stock_code);
  if (!digits) {
    return '';
  }
  return `https://finance.baidu.com/stock/ab-${digits}`;
}

function openBaiduStockPage(row) {
  const url = getBaiduStockUrl(row);
  if (!url) {
    ElMessage.warning('股票代码无效，无法跳转百度查股');
    return;
  }
  window.open(url, '_blank', 'noopener');
}

function openHistoryTradesPage(row) {
  emit('view-history-trades', {
    stock_code: row?.stock_code || '',
    stock_name: row?.stock_name || '',
  });
}

function looksLikeStockCode(value) {
  return /^[A-Z]{0,4}\.?\d{4,6}(\.[A-Z]{2,4})?$|^\d{4,6}(\.[A-Z]{2,4})?$/i.test(
    String(value || '').trim()
  );
}

function getDirectionLabel(direction) {
  return direction === 'BUY' ? '买入' : direction === 'SELL' ? '卖出' : '--';
}

function getFlowTypeLabel(flowType) {
  const map = {
    DEPOSIT: '入金',
    WITHDRAW: '出金',
    DIVIDEND: '股票分红',
    INTEREST: '账户利息',
    BUY_SETTLE: '买入结算',
    SELL_SETTLE: '卖出结算',
    FEE: '交易费用',
  };
  return map[flowType] || flowType || '--';
}

function getTradeEventText(dateText) {
  const items = tradeEventsByDate.value.get(String(dateText || '')) || [];
  return items.slice(0, 3).join('；');
}

function getCashFlowEventText(dateText) {
  const items = cashFlowEventsByDate.value.get(String(dateText || '')) || [];
  return items.slice(0, 3).join('；');
}

function getCurveReasonText(point) {
  const dayProfit = Number(point?.day_profit_amount || 0);
  if (getTradeEventText(point?.date) || getCashFlowEventText(point?.date)) {
    return dayProfit >= 0
      ? '当日波动主要受交易与资金变动共同影响'
      : '当日回撤主要受交易与资金变动共同影响';
  }
  if (dayProfit > 0) {
    return '当日上涨主要来自持仓浮盈扩张';
  }
  if (dayProfit < 0) {
    return '当日下跌主要来自持仓回撤';
  }
  return '当日资产基本持平';
}

function getCurveMarkerStyle(point) {
  return {
    left: `${(point.x / 720) * 100}%`,
    top: `${(point.y / 220) * 100}%`,
  };
}

function getCalendarStockRankings(item) {
  if (!Array.isArray(item?.stock_rankings)) {
    return [];
  }
  return item.stock_rankings;
}

function formatHoldingDays(value) {
  const numberValue = Number(value || 0);
  return `${Math.max(0, Math.trunc(numberValue))} 天`;
}

function formatHoldingDateRange(row) {
  const startDate = row?.first_open_date || '--';
  const endDate = row?.close_date || '--';
  return `${startDate} ~ ${endDate}`;
}

function formatDateInput(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarCellClass(item) {
  if (item.blank) {
    return 'is-blank';
  }
  return [
    item.is_trading_day ? 'is-trading' : 'is-rest',
    profitClass(item.profit_amount),
  ];
}

function formatDayNumber(value) {
  return Number(String(value).split('-').pop() || 0);
}
</script>

<style scoped>
.profit-analysis-panel {
  display: flex;
  flex-direction: column;
}

.profit-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.profit-range-tabs {
  flex: 1;
  min-width: 320px;
}

.profit-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.profit-content-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-content-tabs {
  margin-bottom: 4px;
}

.profit-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.profit-summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #dde7f0;
  background: #ffffff;
}

.profit-summary-card span {
  font-size: 13px;
  color: #60748a;
}

.profit-summary-card strong {
  font-size: 24px;
  color: #17324d;
}

.profit-summary-card small {
  color: #8a9aaa;
}

.emphasize-card {
  background: linear-gradient(135deg, #f6fbf9 0%, #eaf7f2 100%);
  border-color: #cae7da;
}

.profit-module-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 16px;
}

.ranking-only-grid,
.daily-only-grid {
  grid-template-columns: 1fr;
}

.profit-card {
  padding: 18px;
  border-radius: 18px;
  border: 1px solid #dde7f0;
  background: #ffffff;
}

.profit-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.profit-card__header h3 {
  margin: 0;
  font-size: 18px;
  color: #17324d;
}

.profit-card__header p {
  margin: 6px 0 0;
  color: #6f8194;
  line-height: 1.6;
}

.curve-header-metrics {
  font-size: 12px;
  color: #6f8194;
}

.curve-shell {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.curve-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 12px;
  color: #7b8794;
  padding: 12px 0;
}

.curve-canvas-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.curve-panel {
  position: relative;
}

.curve-svg {
  width: 100%;
  height: 220px;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #fefefe 100%);
  border: 1px solid #ecf2f8;
}

.curve-line {
  fill: none;
  stroke: #0f766e;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.curve-dot {
  fill: #0f766e;
  stroke: #ffffff;
  stroke-width: 2;
}

.curve-interaction-layer {
  position: absolute;
  inset: 0 0 22px 0;
}

.curve-marker {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  border-radius: 999px;
  background: #0f766e;
  transform: translate(-50%, -50%);
  box-shadow: 0 4px 14px rgba(15, 118, 110, 0.24);
  cursor: pointer;
}

.curve-tooltip,
.calendar-tooltip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  line-height: 1.6;
}

.daily-stocks-actions {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-direction: column;
}

.daily-stocks-toggle-actions,
.daily-stocks-filter-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.daily-stocks-filter-actions :deep(.el-input),
.daily-stocks-filter-actions :deep(.el-date-editor) {
  width: 160px;
}

.daily-stocks-filter-actions :deep(.el-input-number) {
  width: 130px;
}

.dual-line-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.daily-stocks-footer {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.daily-stocks-empty-tip {
  color: #6f8194;
  font-size: 12px;
}

.rebuild-shell {
  padding: 8px 0;
}

.rebuild-form {
  max-width: 680px;
}

.rebuild-task-panel {
  margin-top: 16px;
  border: 1px solid #dde7f0;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.rebuild-task-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  color: #425466;
  font-size: 13px;
}

.rebuild-phase-title {
  margin: 12px 0 8px;
  font-size: 13px;
  color: #2f4052;
  font-weight: 600;
}

.curve-tooltip {
  max-width: 320px;
}

.calendar-tooltip {
  max-width: 760px;
}

.calendar-tooltip__section-title {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #60748a;
}

.calendar-breakdown-table-wrap {
  max-height: 420px;
  overflow-y: auto;
  overflow-x: hidden;
}

.calendar-breakdown-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
}

.calendar-breakdown-table th,
.calendar-breakdown-table td {
  padding: 8px 10px;
  border: 1px solid #dbe5ef;
  vertical-align: top;
  text-align: left;
}

.calendar-breakdown-table thead th {
  background: #f4f8fb;
  color: #4f647a;
  font-weight: 700;
}

.calendar-breakdown-table--five-columns th:nth-child(1),
.calendar-breakdown-table--five-columns td:nth-child(1) {
  width: 24%;
}

.calendar-breakdown-table--five-columns th:nth-child(2),
.calendar-breakdown-table--five-columns td:nth-child(2),
.calendar-breakdown-table--five-columns th:nth-child(3),
.calendar-breakdown-table--five-columns td:nth-child(3),
.calendar-breakdown-table--five-columns th:nth-child(4),
.calendar-breakdown-table--five-columns td:nth-child(4) {
  width: 14%;
}

.calendar-breakdown-table--five-columns th:nth-child(5),
.calendar-breakdown-table--five-columns td:nth-child(5) {
  width: 34%;
}

.calendar-breakdown-name {
  font-weight: 700;
  color: #17324d;
}

.calendar-breakdown-code {
  font-size: 11px;
  color: #7b8794;
}

.calendar-breakdown-range {
  word-break: break-word;
  line-height: 1.5;
}

.calendar-breakdown-empty {
  font-size: 12px;
  color: #7b8794;
}

.ranking-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.curve-tooltip__title {
  font-weight: 700;
  color: #17324d;
}

.curve-x-axis {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #7b8794;
}

.calendar-toolbar {
  align-items: center;
}

.calendar-title {
  min-width: 112px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #17324d;
}

.calendar-month-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calendar-summary-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid #e5ecf3;
  background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
}

.calendar-summary-bar span {
  font-size: 16px;
  color: #60748a;
}

.calendar-summary-bar strong {
  font-size: 24px;
}

.calendar-week-header,
.calendar-grid.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.calendar-week-header span {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #6f8194;
}

.calendar-cell {
  min-height: 130px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calendar-cell.is-blank {
  visibility: hidden;
}

.calendar-cell.is-rest {
  background: #f8fafc;
}

.calendar-cell__date {
  font-size: 18px;
  font-weight: 600;
  color: #17324d;
}

.calendar-cell__profit {
  font-size: 15px;
  font-weight: 700;
}

.calendar-cell__rate {
  font-size: 11px;
  color: #6f8194;
}

.calendar-grid.year-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.calendar-year-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #dde7f0;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calendar-year-card__month {
  font-size: 18px;
  font-weight: 700;
  color: #60748a;
}

.calendar-year-card strong {
  font-size: 18px;
  color: #17324d;
}

.calendar-year-card span,
.calendar-year-card small {
  font-size: 12px;
  color: #6f8194;
}

.stock-ranking-table :deep(.el-table__header-wrapper th .cell) {
  white-space: nowrap;
}

.ranking-link-button {
  padding: 0;
  border: none;
  background: transparent;
  color: #0f6b8f;
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.ranking-link-button:hover {
  color: #0a4f69;
  text-decoration: underline;
}

.profit-up {
  color: #cf3f3f !important;
}

.profit-down {
  color: #1f8a5b !important;
}

@media (max-width: 1080px) {
  .profit-module-grid {
    grid-template-columns: 1fr;
  }

  .curve-shell {
    grid-template-columns: 1fr;
  }

  .curve-y-axis {
    flex-direction: row;
    justify-content: space-between;
    padding: 0;
  }
}

@media (max-width: 768px) {
  .calendar-week-header,
  .calendar-grid.month-grid {
    gap: 8px;
  }

  .calendar-cell {
    min-height: 110px;
    padding: 10px;
  }

  .calendar-cell__date {
    font-size: 16px;
  }

  .calendar-cell__profit {
    font-size: 14px;
  }

  .daily-stocks-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .daily-stocks-filter-actions {
    width: 100%;
  }
}
</style>
