<template>
  <div class="detail-page" v-loading="pageLoading">
    <div class="detail-header">
      <div>
        <h2>模拟交易工作台</h2>
        <p>围绕单账户完成持仓查看、买卖委托、撤单、转账和成交查询。</p>
      </div>
      <el-button @click="goAccountList">返回账号管理</el-button>
    </div>

    <el-empty v-if="!accounts.length && !pageLoading" description="暂无模拟交易账户，请先创建账户" />

    <template v-else>
      <el-tabs v-model="activeAccountId" type="card" @tab-change="handleAccountChange">
        <el-tab-pane
          v-for="account in accounts"
          :key="String(account.id)"
          :label="account.account_name"
          :name="String(account.id)"
        />
      </el-tabs>

      <div v-if="currentAccount" class="overview-grid">
        <div class="overview-card">
          <span>创建日期</span>
          <strong>{{ formatDateTime(currentAccount.created_time) }}</strong>
        </div>
        <div class="overview-card">
          <span>当前总资产</span>
          <strong>{{ formatMoney(summary.current_total_asset) }}</strong>
        </div>
        <div class="overview-card">
          <span>可用资金</span>
          <strong>{{ formatMoney(summary.available_cash) }}</strong>
        </div>
        <div class="overview-card">
          <span>冻结资金</span>
          <strong>{{ formatMoney(summary.frozen_cash) }}</strong>
        </div>
        <div class="overview-card">
          <span>持仓市值</span>
          <strong>{{ formatMoney(summary.position_market_value) }}</strong>
        </div>
        <div class="overview-card">
          <span>历史盈亏</span>
          <strong :class="profitClass(summary.historical_pnl_amount)">{{ `${formatMoney(summary.historical_pnl_amount)} ${formatPercent(summary.historical_pnl_rate)}` }}</strong>
        </div>
        <div class="overview-card">
          <span>持仓盈亏</span>
          <strong :class="profitClass(summary.position_pnl_amount)">{{ formatMoney(summary.position_pnl_amount) }}</strong>
        </div>
        <div class="overview-card">
          <span>仓位比例</span>
          <strong>{{ formatPercent(summary.position_ratio) }}</strong>
        </div>
      </div>

      <div v-if="currentAccount" class="trade-mode-card">
        <div class="trade-mode-card__content">
          <div>
            <h3>交易模式</h3>
            <p>{{ currentTradeModeDescription }}</p>
          </div>
          <div class="trade-mode-card__switch">
            <span class="trade-mode-card__label">{{ currentTradeModeLabel }}</span>
            <el-switch
              :model-value="isDebugModeEnabled"
              :loading="debugModeSwitchLoading"
              inline-prompt
              active-text="调试"
              inactive-text="正常"
              @change="handleDebugModeSwitch"
            />
          </div>
        </div>
      </div>

      <div v-if="accountRiskOverview.enabled" class="account-risk-overview-card">
        <div class="account-risk-overview-header">
          <div>
            <h3>账号风控概览</h3>
            <p>当前账号已绑定 EXEC_ACCOUNT_RISK_BASE，以下关键参数会同时约束手动交易与自动化策略。</p>
          </div>
        </div>
        <div class="account-risk-overview-sections">
          <section class="account-risk-overview-section">
            <div class="account-risk-overview-section__header">
              <h4>风控边界</h4>
              <p>这些是账号风控策略本身设定的边界参数，决定下面那些余量是如何计算出来的。</p>
            </div>
            <div class="account-risk-overview-grid">
              <div v-for="item in accountRiskOverview.boundaryItems" :key="item.label" class="account-risk-overview-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </section>

          <section class="account-risk-overview-section">
            <div class="account-risk-overview-section__header">
              <h4>当前可操作余量</h4>
              <p>把当前还能不能开仓、还能用多少预算，以及买入卖出做T是否可执行，放到更靠近下方操作区的位置。</p>
            </div>
            <div class="account-risk-permission-list">
              <div
                v-for="item in accountRiskOverview.permissionItems"
                :key="item.label"
                class="account-risk-permission-chip"
                :class="item.allowed ? 'is-allowed' : 'is-blocked'"
              >
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
            <div class="account-risk-overview-grid">
              <div v-for="item in accountRiskOverview.capacityItems" :key="item.label" class="account-risk-overview-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small v-if="item.description" class="account-risk-overview-item__desc">{{ item.description }}</small>
              </div>
            </div>
            <div v-if="accountRiskOverview.warnings.length" class="account-risk-warning-list">
              <div v-for="warning in accountRiskOverview.warnings" :key="warning" class="account-risk-warning-item">
                {{ warning }}
              </div>
            </div>
          </section>
        </div>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="持仓" name="position">
          <PositionTable
            :items="positions"
            :show-total-quantity="true"
            :show-sellable-quantity="true"
            :show-frozen-quantity="true"
            :show-position-ratio="true"
            :show-holding-days="true"
            :show-holding-date-range="true"
            :show-actions="true"
            :show-edit-action="true"
            :show-sell-action="true"
            :show-trade-action="true"
            action-mode="main"
            :action-column-width="200"
            @edit="openEditPositionDialog"
            @sell="(row) => presetOrder('SELL', row)"
            @trade="viewTradeHistory"
          />
        </el-tab-pane>

        <el-tab-pane label="自动化策略" name="strategy">
          <StrategyPanel v-if="currentAccount" :account-id="activeAccountId" :account-total-asset="summary.current_total_asset" />
        </el-tab-pane>

        <el-tab-pane label="买入" name="buy">
          <div class="order-tab-grid">
            <div class="form-panel">
              <el-form :model="buyForm" label-width="100px">
                <el-form-item label="股票搜索" :error="buyValidation.stock">
                  <div class="stock-search-row">
                    <el-select
                      v-model="selectedBuyStock"
                      value-key="key"
                      filterable
                      remote
                      reserve-keyword
                      placeholder="查询（名称/代码/拼音）"
                      :remote-method="searchBuyStocks"
                      :loading="stockSearchLoading"
                      class="full-width"
                      @change="(stock) => applyStockSelection(stock, buyForm)"
                    >
                      <el-option
                        v-for="stock in stockSearchOptions"
                        :key="stock.key"
                        :label="stock.label"
                        :value="stock"
                      />
                    </el-select>
                    <el-button @click="refreshSelectedStock(selectedBuyStock, buyForm, 'buy')">刷新</el-button>
                  </div>
                </el-form-item>
                <el-form-item label="股票代码">
                  <el-input v-model="buyForm.stock_code" disabled placeholder="自动回填" />
                </el-form-item>
                <el-form-item label="股票名称">
                  <el-input v-model="buyForm.stock_name" disabled placeholder="自动回填" />
                </el-form-item>
                <el-form-item label="交易所">
                  <el-input :model-value="getExchangeLabel(buyForm.exchange_code)" disabled placeholder="自动回填" />
                </el-form-item>
                <el-form-item label="当前价格">
                  <el-input :model-value="formatMoney(getSelectedStockPrice(buyForm))" disabled placeholder="自动回填" />
                </el-form-item>
                <el-alert :title="currentTradeModeFormHint" type="info" :closable="false" show-icon class="trade-mode-alert" />
                <el-form-item label="委托类型">
                  <el-radio-group v-model="buyForm.order_type">
                    <el-radio-button label="MARKET">市价</el-radio-button>
                    <el-radio-button label="LIMIT">限价</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="委托价格" :error="buyValidation.orderPrice">
                  <el-input-number v-model="buyForm.order_price" :disabled="buyForm.order_type === 'MARKET'" :precision="2" :min="0" class="full-width" />
                </el-form-item>
                <el-form-item label="数量" :error="buyValidation.quantity">
                  <el-input-number v-model="buyForm.order_quantity" :min="getBuyOrderQuantityMin()" :step="getOrderQuantityStep(buyForm.exchange_code)" class="full-width" />
                  <div
                    v-if="buyRiskSummary.enabled"
                    class="quantity-helper-text"
                    :class="{ 'is-disabled': !canApplyBuyRiskMaxQuantity() }"
                    @click="applyBuyRiskMaxQuantity"
                    :title="canApplyBuyRiskMaxQuantity() ? '点击后自动填入数量' : '请先选择股票并确认可用买入价格'"
                  >
                    最多可买 {{ buyRiskSummary.maxBuyQuantity }} 股，点击填入
                  </div>
                </el-form-item>
                <el-form-item label="快捷仓位">
                  <div class="quick-ratio-row">
                    <el-button
                      v-for="item in ORDER_QUICK_OPTIONS"
                      :key="`buy_${item.value}`"
                      size="small"
                      plain
                      :disabled="!canUseQuickRatio('BUY', buyForm, item.value)"
                      @click="applyQuickRatio('BUY', item.value)"
                    >
                      {{ item.label }}
                    </el-button>
                    <span class="quick-ratio-hint">按当前可用资金估算可买数量</span>
                  </div>
                </el-form-item>
                <el-form-item label="交易原因">
                  <el-input v-model="buyForm.trade_reason" type="textarea" :rows="3" />
                </el-form-item>
                <div class="order-estimate-card">
                  <div class="order-estimate-item">
                    <span>预计成交金额</span>
                    <strong>{{ formatMoney(buyEstimate.amount) }}</strong>
                  </div>
                  <div class="order-estimate-item">
                    <span>预计手续费</span>
                    <strong>{{ formatMoney(buyEstimate.fee) }}</strong>
                  </div>
                  <div class="order-estimate-item">
                    <span>预计冻结资金</span>
                    <strong>{{ formatMoney(buyEstimate.frozenCash) }}</strong>
                  </div>
                  <div class="order-estimate-item">
                    <span>当前可用资金</span>
                    <strong :class="buyEstimate.insufficient ? 'profit-down' : ''">{{ formatMoney(summary.available_cash) }}</strong>
                  </div>
                </div>
                <div v-if="buyRiskSummary.enabled" class="risk-limit-card">
                  <div class="risk-limit-title">买入参考</div>
                  <div class="risk-limit-grid">
                    <div class="risk-limit-item">
                      <span>风控单份分块金额</span>
                      <strong>{{ formatMoney(buyRiskSummary.slotAmount) }} 元</strong>
                    </div>
                  </div>
                </div>
                <div v-if="buyValidation.form" class="form-error-text">{{ buyValidation.form }}</div>
                <el-form-item>
                  <el-button type="primary" :loading="actionLoading" :disabled="!canSubmitBuyOrder" @click="submitOrder('BUY')">提交买入委托</el-button>
                </el-form-item>
              </el-form>
            </div>

            <div class="quick-position-card">
              <div class="quick-position-header">
                <h3>当前持股列表</h3>
                <span>点击“选中买入”可快速带入股票搜索</span>
              </div>
              <PositionTable
                :items="buyQuickPositions"
                empty-text="当前无持仓，可直接搜索股票下单"
                :max-height="520"
                name-label="股票名称"
                total-quantity-label="总持仓"
                :show-total-quantity="true"
                :show-sellable-quantity="true"
                :show-frozen-quantity="true"
                :show-position-ratio="true"
                :show-actions="true"
                action-mode="buy"
                :action-column-width="120"
                @buy-select="(row) => quickSelectPosition('BUY', row)"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="卖出" name="sell">
          <div class="order-tab-grid">
            <div class="form-panel">
              <el-form :model="sellForm" label-width="100px">
                <el-form-item label="股票搜索" :error="sellValidation.stock">
                  <div class="stock-search-row">
                    <el-select
                      v-model="selectedSellStock"
                      value-key="key"
                      filterable
                      remote
                      reserve-keyword
                      placeholder="查询（名称/代码/拼音）"
                      :remote-method="searchSellStocks"
                      :loading="stockSearchLoading"
                      class="full-width"
                      @change="(stock) => applyStockSelection(stock, sellForm)"
                    >
                      <el-option
                        v-for="stock in stockSearchOptions"
                        :key="stock.key"
                        :label="stock.label"
                        :value="stock"
                      />
                    </el-select>
                    <el-button @click="refreshSelectedStock(selectedSellStock, sellForm, 'sell')">刷新</el-button>
                  </div>
                </el-form-item>
                <el-form-item label="股票代码">
                  <el-input v-model="sellForm.stock_code" disabled placeholder="自动回填" />
                </el-form-item>
                <el-form-item label="股票名称">
                  <el-input v-model="sellForm.stock_name" disabled placeholder="自动回填" />
                </el-form-item>
                <el-form-item label="交易所">
                  <el-input :model-value="getExchangeLabel(sellForm.exchange_code)" disabled placeholder="自动回填" />
                </el-form-item>
                <el-form-item label="当前价格">
                  <el-input :model-value="formatMoney(getSelectedStockPrice(sellForm))" disabled placeholder="自动回填" />
                </el-form-item>
                <el-alert :title="currentTradeModeFormHint" type="info" :closable="false" show-icon class="trade-mode-alert" />
                <el-form-item label="委托类型">
                  <el-radio-group v-model="sellForm.order_type">
                    <el-radio-button label="MARKET">市价</el-radio-button>
                    <el-radio-button label="LIMIT">限价</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="委托价格" :error="sellValidation.orderPrice">
                  <el-input-number v-model="sellForm.order_price" :disabled="sellForm.order_type === 'MARKET'" :precision="2" :min="0" class="full-width" />
                </el-form-item>
                <el-form-item label="数量" :error="sellValidation.quantity">
                  <el-input-number v-model="sellForm.order_quantity" :min="getMinOrderQuantity(sellForm.exchange_code)" :step="getOrderQuantityStep(sellForm.exchange_code)" class="full-width" />
                </el-form-item>
                <el-form-item label="快捷仓位">
                  <div class="quick-ratio-row">
                    <el-button
                      v-for="item in ORDER_QUICK_OPTIONS"
                      :key="`sell_${item.value}`"
                      size="small"
                      plain
                      :disabled="!canUseQuickRatio('SELL', sellForm, item.value)"
                      @click="applyQuickRatio('SELL', item.value)"
                    >
                      {{ item.label }}
                    </el-button>
                    <span class="quick-ratio-hint">按当前可卖数量估算委托股数</span>
                  </div>
                </el-form-item>
                <el-form-item label="交易原因">
                  <el-input v-model="sellForm.trade_reason" type="textarea" :rows="3" />
                </el-form-item>
                <div class="order-estimate-card">
                  <div class="order-estimate-item">
                    <span>预计成交金额</span>
                    <strong>{{ formatMoney(sellEstimate.amount) }}</strong>
                  </div>
                  <div class="order-estimate-item">
                    <span>预计手续费</span>
                    <strong>{{ formatMoney(sellEstimate.fee) }}</strong>
                  </div>
                  <div class="order-estimate-item">
                    <span>预计到账金额</span>
                    <strong>{{ formatMoney(sellEstimate.netAmount) }}</strong>
                  </div>
                  <div class="order-estimate-item">
                    <span>当前可卖数量</span>
                    <strong :class="sellEstimate.insufficient ? 'profit-down' : ''">{{ sellEstimate.sellableQuantity }}</strong>
                  </div>
                </div>
                <div v-if="sellRiskSummary.enabled" class="risk-limit-card">
                  <div class="risk-limit-title">账号风控卖出参考</div>
                  <div class="risk-limit-grid">
                    <div class="risk-limit-item">
                      <span>当前市场环境</span>
                      <strong>{{ sellRiskSummary.marketRegimeLabel }}</strong>
                    </div>
                    <div class="risk-limit-item">
                      <span>浮亏阈值比例</span>
                      <strong>{{ sellRiskSummary.maxFloatingLossPercentText }}</strong>
                    </div>
                    <div class="risk-limit-item">
                      <span>浮亏阈值金额</span>
                      <strong>{{ formatMoney(sellRiskSummary.maxFloatingLossAmount) }}</strong>
                    </div>
                    <div class="risk-limit-item">
                      <span>当前可卖股数</span>
                      <strong>{{ sellRiskSummary.sellableQuantity }}</strong>
                    </div>
                  </div>
                  <div class="risk-limit-note">
                    {{ sellRiskSummary.note }}
                  </div>
                </div>
                <div v-if="sellValidation.form" class="form-error-text">{{ sellValidation.form }}</div>
                <el-form-item>
                  <el-button type="primary" :loading="actionLoading" :disabled="!canSubmitSellOrder" @click="submitOrder('SELL')">提交卖出委托</el-button>
                </el-form-item>
              </el-form>
            </div>

            <div class="quick-position-card">
              <div class="quick-position-header">
                <h3>当前持股列表</h3>
                <span>点击“选中卖出”可快速带入股票搜索</span>
              </div>
              <PositionTable
                :items="sellQuickPositions"
                empty-text="暂无可卖持仓"
                :max-height="520"
                name-label="股票名称"
                total-quantity-label="总持仓"
                sellable-quantity-label="可卖数量"
                :show-total-quantity="true"
                :show-sellable-quantity="true"
                :show-frozen-quantity="true"
                :show-position-ratio="true"
                :show-actions="true"
                action-mode="sell"
                :action-column-width="120"
                @sell-select="(row) => quickSelectPosition('SELL', row)"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="撤单" name="cancel">
          <div class="tab-toolbar">
            <el-space>
              <el-button @click="loadOrders(true)">刷新未完成委托</el-button>
              <el-button type="danger" plain :disabled="!selectedOpenOrderIds.length" @click="batchCancel">批量撤单</el-button>
            </el-space>
          </div>
          <el-table :data="openOrders" border @selection-change="handleOpenOrderSelection">
            <el-table-column type="selection" width="50" />
            <el-table-column prop="stock_name" label="股票名称" min-width="140" />
            <el-table-column prop="stock_code" label="代码" width="120" />
            <el-table-column label="方向" width="90">
              <template #default="scope">{{ getDirectionLabel(scope.row.direction) }}</template>
            </el-table-column>
            <el-table-column label="类型" width="90">
              <template #default="scope">{{ getOrderTypeLabel(scope.row.order_type) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag :type="getOrderStatusTagType(scope.row.order_status)" effect="light">{{ getOrderStatusLabel(scope.row.order_status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="order_quantity" label="委托数量" width="100" />
            <el-table-column prop="filled_quantity" label="已成交" width="100" />
            <el-table-column label="委托价" width="110">
              <template #default="scope">{{ formatMoney(scope.row.order_price) }}</template>
            </el-table-column>
            <el-table-column label="委托时间" min-width="180">
              <template #default="scope">{{ formatDateTime(scope.row.placed_time) }}</template>
            </el-table-column>
            <el-table-column label="交易原因" min-width="260">
              <template #default="scope">
                <div class="trade-reason-text" :title="formatTradeReason(scope.row.trade_reason)">
                  <template v-if="formatTradeReasonItems(scope.row.trade_reason).length">
                    <div
                      v-for="(item, index) in formatTradeReasonItems(scope.row.trade_reason)"
                      :key="`${scope.row.id || scope.row.order_no || scope.row.trade_no || 'reason'}-${index}`"
                      class="trade-reason-item"
                    >
                      <span v-if="item.label" class="trade-reason-label">{{ item.label }}</span>
                      <span class="trade-reason-value">{{ item.value }}</span>
                    </div>
                  </template>
                  <span v-else>--</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="交易前持仓快照" width="140">
              <template #default="scope">
                <el-popover v-if="scope.row.pre_trade_position_snapshot_json" placement="left" :width="520" trigger="click">
                  <pre class="snapshot-pre">{{ formatSnapshotJson(scope.row.pre_trade_position_snapshot_json) }}</pre>
                  <template #reference>
                    <el-button link type="primary">查看快照</el-button>
                  </template>
                </el-popover>
                <span v-else class="muted-placeholder">--</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="scope">
                <el-button link type="danger" @click="cancelOne(scope.row)">撤单</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="转账" name="transfer">
          <div class="transfer-grid">
            <div class="form-panel">
              <h3>入金</h3>
              <el-form :model="depositForm" label-width="100px">
                <el-form-item label="金额">
                  <el-input-number v-model="depositForm.amount" :min="0" :precision="2" class="full-width" />
                </el-form-item>
                <el-form-item label="原因">
                  <el-input v-model="depositForm.reason" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" :loading="actionLoading" @click="submitTransfer('deposit')">确认入金</el-button>
                </el-form-item>
              </el-form>
            </div>
            <div class="form-panel">
              <h3>出金</h3>
              <el-form :model="withdrawForm" label-width="100px">
                <el-form-item label="金额">
                  <el-input-number v-model="withdrawForm.amount" :min="0" :precision="2" class="full-width" />
                </el-form-item>
                <el-form-item label="原因">
                  <el-input v-model="withdrawForm.reason" />
                </el-form-item>
                <el-form-item>
                  <el-button type="warning" :loading="actionLoading" @click="submitTransfer('withdraw')">确认出金</el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>

          <el-table :data="pagedTransferCashFlows" border>
            <el-table-column prop="stock_name" label="股票名称" min-width="140" />
            <el-table-column prop="stock_code" label="代码" width="120" />
            <el-table-column label="类型" width="140">
              <template #default="scope">{{ getFlowTypeLabel(scope.row.flow_type) }}</template>
            </el-table-column>
            <el-table-column label="方向" width="100">
              <template #default="scope">{{ getFlowDirectionLabel(scope.row.direction) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="140">
              <template #default="scope">{{ formatMoney(scope.row.amount) }}</template>
            </el-table-column>
            <el-table-column label="币种" width="130">
              <template #default="scope">{{ getCurrencyLabel(scope.row.currency) }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" min-width="180" />
            <el-table-column label="时间" min-width="180">
              <template #default="scope">{{ formatDateTime(scope.row.occurred_time) }}</template>
            </el-table-column>
          </el-table>
          <div class="table-pagination">
            <el-pagination
              v-model:current-page="transferCashFlowPagination.page"
              v-model:page-size="transferCashFlowPagination.pageSize"
              background
              layout="total, sizes, prev, pager, next"
              :page-sizes="[10, 20, 50, 100]"
              :total="cashFlows.length"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="查询" name="query">
          <div class="query-shell">
            <div class="query-toolbar">
              <el-input
                v-model="queryForm.keyword"
                clearable
                placeholder="股票代码 / 名称"
                class="toolbar-input"
                @keyup.enter="applyQueryFilters"
              />
              <el-select v-model="queryForm.direction" clearable placeholder="方向" class="toolbar-select">
                <el-option label="买入" value="BUY" />
                <el-option label="卖出" value="SELL" />
              </el-select>
              <el-select
                v-if="activeQueryTab !== 'cash-flows'"
                v-model="queryForm.orderStatus"
                clearable
                placeholder="委托状态"
                class="toolbar-select"
              >
                <el-option label="已创建" value="CREATED" />
                <el-option label="等待成交" value="PENDING_MATCH" />
                <el-option label="部分成交" value="PART_FILLED" />
                <el-option label="全部成交" value="FILLED" />
                <el-option label="已撤单" value="CANCELED" />
                <el-option label="已拒绝" value="REJECTED" />
              </el-select>
              <el-select
                v-else
                v-model="queryForm.flowType"
                clearable
                placeholder="流水类型"
                class="toolbar-select"
              >
                <el-option label="入金" value="DEPOSIT" />
                <el-option label="出金" value="WITHDRAW" />
                <el-option label="冻结" value="FREEZE" />
                <el-option label="解冻" value="UNFREEZE" />
                <el-option label="买入结算" value="BUY_SETTLE" />
                <el-option label="卖出结算" value="SELL_SETTLE" />
                <el-option label="交易费用" value="FEE" />
              </el-select>
              <el-date-picker
                v-model="queryForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                class="toolbar-date-range"
              />
              <el-button type="primary" @click="applyQueryFilters">搜索</el-button>
              <el-button @click="resetQueryFilters">重置</el-button>
            </div>

            <el-tabs v-model="activeQueryTab" class="query-inner-tabs">
              <el-tab-pane label="当日委托" name="today-orders">
                <el-table :data="pagedTodayOrders" border>
                  <el-table-column prop="stock_name" label="股票名称" min-width="140" />
                  <el-table-column prop="stock_code" label="代码" width="120" />
                  <el-table-column label="方向" width="90">
                    <template #default="scope">{{ getDirectionLabel(scope.row.direction) }}</template>
                  </el-table-column>
                  <el-table-column label="状态" width="120">
                    <template #default="scope">
                      <el-tag :type="getOrderStatusTagType(scope.row.order_status)" effect="light">{{ getOrderStatusLabel(scope.row.order_status) }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="order_quantity" label="委托数量" width="100" />
                  <el-table-column label="已成交金额" width="140">
                    <template #default="scope">{{ formatMoney(scope.row.filled_amount) }}</template>
                  </el-table-column>
                  <el-table-column label="交易原因" min-width="280">
                    <template #default="scope">
                      <div class="trade-reason-text" :title="formatTradeReason(scope.row.trade_reason)">
                        <template v-if="formatTradeReasonItems(scope.row.trade_reason).length">
                          <div
                            v-for="(item, index) in formatTradeReasonItems(scope.row.trade_reason)"
                            :key="`${scope.row.id || scope.row.order_no || scope.row.trade_no || 'reason'}-${index}`"
                            class="trade-reason-item"
                          >
                            <span v-if="item.label" class="trade-reason-label">{{ item.label }}</span>
                            <span class="trade-reason-value">{{ item.value }}</span>
                          </div>
                        </template>
                        <span v-else>--</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="交易前持仓快照" width="140">
                    <template #default="scope">
                      <el-popover v-if="scope.row.pre_trade_position_snapshot_json" placement="left" :width="520" trigger="click">
                        <pre class="snapshot-pre">{{ formatSnapshotJson(scope.row.pre_trade_position_snapshot_json) }}</pre>
                        <template #reference>
                          <el-button link type="primary">查看快照</el-button>
                        </template>
                      </el-popover>
                      <span v-else class="muted-placeholder">--</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="委托时间" min-width="180">
                    <template #default="scope">{{ formatDateTime(scope.row.placed_time) }}</template>
                  </el-table-column>
                </el-table>
                <div class="table-pagination">
                  <el-pagination
                    v-model:current-page="queryPagination['today-orders'].page"
                    v-model:page-size="queryPagination['today-orders'].pageSize"
                    background
                    layout="total, sizes, prev, pager, next"
                    :page-sizes="[10, 20, 50, 100]"
                    :total="filteredTodayOrders.length"
                  />
                </div>
              </el-tab-pane>

              <el-tab-pane label="当日成交" name="today-trades">
                <el-table :data="pagedTodayTrades" border>
                  <el-table-column prop="stock_name" label="股票名称" min-width="140" />
                  <el-table-column prop="stock_code" label="代码" width="120" />
                  <el-table-column label="方向" width="90">
                    <template #default="scope">{{ getDirectionLabel(scope.row.direction) }}</template>
                  </el-table-column>
                  <el-table-column prop="fill_quantity" label="成交数量" width="100" />
                  <el-table-column label="成交价" width="120">
                    <template #default="scope">{{ formatMoney(scope.row.fill_price) }}</template>
                  </el-table-column>
                  <el-table-column label="成交金额" width="140">
                    <template #default="scope">{{ formatMoney(scope.row.net_amount) }}</template>
                  </el-table-column>
                  <el-table-column label="交易原因" min-width="280">
                    <template #default="scope">
                      <div class="trade-reason-text" :title="formatTradeReason(scope.row.trade_reason)">
                        <template v-if="formatTradeReasonItems(scope.row.trade_reason).length">
                          <div
                            v-for="(item, index) in formatTradeReasonItems(scope.row.trade_reason)"
                            :key="`${scope.row.id || scope.row.order_no || scope.row.trade_no || 'reason'}-${index}`"
                            class="trade-reason-item"
                          >
                            <span v-if="item.label" class="trade-reason-label">{{ item.label }}</span>
                            <span class="trade-reason-value">{{ item.value }}</span>
                          </div>
                        </template>
                        <span v-else>--</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="交易前持仓快照" width="140">
                    <template #default="scope">
                      <el-popover v-if="scope.row.pre_trade_position_snapshot_json" placement="left" :width="520" trigger="click">
                        <pre class="snapshot-pre">{{ formatSnapshotJson(scope.row.pre_trade_position_snapshot_json) }}</pre>
                        <template #reference>
                          <el-button link type="primary">查看快照</el-button>
                        </template>
                      </el-popover>
                      <span v-else class="muted-placeholder">--</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="成交时间" min-width="180">
                    <template #default="scope">{{ formatDateTime(scope.row.traded_time) }}</template>
                  </el-table-column>
                </el-table>
                <div class="table-pagination">
                  <el-pagination
                    v-model:current-page="queryPagination['today-trades'].page"
                    v-model:page-size="queryPagination['today-trades'].pageSize"
                    background
                    layout="total, sizes, prev, pager, next"
                    :page-sizes="[10, 20, 50, 100]"
                    :total="filteredTodayTrades.length"
                  />
                </div>
              </el-tab-pane>

              <el-tab-pane label="历史委托" name="history-orders">
                <el-table :data="pagedHistoryOrders" border>
                  <el-table-column prop="stock_name" label="股票名称" min-width="140" />
                  <el-table-column prop="stock_code" label="代码" width="120" />
                  <el-table-column label="方向" width="90">
                    <template #default="scope">{{ getDirectionLabel(scope.row.direction) }}</template>
                  </el-table-column>
                  <el-table-column label="状态" width="120">
                    <template #default="scope">
                      <el-tag :type="getOrderStatusTagType(scope.row.order_status)" effect="light">{{ getOrderStatusLabel(scope.row.order_status) }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="order_quantity" label="委托数量" width="100" />
                  <el-table-column label="已成交金额" width="140">
                    <template #default="scope">{{ formatMoney(scope.row.filled_amount) }}</template>
                  </el-table-column>
                  <el-table-column label="交易原因" min-width="280">
                    <template #default="scope">
                      <div class="trade-reason-text" :title="formatTradeReason(scope.row.trade_reason)">
                        <template v-if="formatTradeReasonItems(scope.row.trade_reason).length">
                          <div
                            v-for="(item, index) in formatTradeReasonItems(scope.row.trade_reason)"
                            :key="`${scope.row.id || scope.row.order_no || scope.row.trade_no || 'reason'}-${index}`"
                            class="trade-reason-item"
                          >
                            <span v-if="item.label" class="trade-reason-label">{{ item.label }}</span>
                            <span class="trade-reason-value">{{ item.value }}</span>
                          </div>
                        </template>
                        <span v-else>--</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="交易前持仓快照" width="140">
                    <template #default="scope">
                      <el-popover v-if="scope.row.pre_trade_position_snapshot_json" placement="left" :width="520" trigger="click">
                        <pre class="snapshot-pre">{{ formatSnapshotJson(scope.row.pre_trade_position_snapshot_json) }}</pre>
                        <template #reference>
                          <el-button link type="primary">查看快照</el-button>
                        </template>
                      </el-popover>
                      <span v-else class="muted-placeholder">--</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="委托时间" min-width="180">
                    <template #default="scope">{{ formatDateTime(scope.row.placed_time) }}</template>
                  </el-table-column>
                </el-table>
                <div class="table-pagination">
                  <el-pagination
                    v-model:current-page="queryPagination['history-orders'].page"
                    v-model:page-size="queryPagination['history-orders'].pageSize"
                    background
                    layout="total, sizes, prev, pager, next"
                    :page-sizes="[10, 20, 50, 100]"
                    :total="filteredHistoryOrders.length"
                  />
                </div>
              </el-tab-pane>

              <el-tab-pane label="历史成交" name="history-trades">
                <el-table :data="pagedHistoryTrades" border>
                  <el-table-column prop="stock_name" label="股票名称" min-width="140" />
                  <el-table-column prop="stock_code" label="代码" width="120" />
                  <el-table-column label="方向" width="90">
                    <template #default="scope">{{ getDirectionLabel(scope.row.direction) }}</template>
                  </el-table-column>
                  <el-table-column prop="fill_quantity" label="成交数量" width="100" />
                  <el-table-column label="成交价" width="120">
                    <template #default="scope">{{ formatMoney(scope.row.fill_price) }}</template>
                  </el-table-column>
                  <el-table-column label="成交金额" width="140">
                    <template #default="scope">{{ formatMoney(scope.row.net_amount) }}</template>
                  </el-table-column>
                  <el-table-column label="交易原因" min-width="280">
                    <template #default="scope">
                      <div class="trade-reason-text" :title="formatTradeReason(scope.row.trade_reason)">
                        <template v-if="formatTradeReasonItems(scope.row.trade_reason).length">
                          <div
                            v-for="(item, index) in formatTradeReasonItems(scope.row.trade_reason)"
                            :key="`${scope.row.id || scope.row.order_no || scope.row.trade_no || 'reason'}-${index}`"
                            class="trade-reason-item"
                          >
                            <span v-if="item.label" class="trade-reason-label">{{ item.label }}</span>
                            <span class="trade-reason-value">{{ item.value }}</span>
                          </div>
                        </template>
                        <span v-else>--</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="交易前持仓快照" width="140">
                    <template #default="scope">
                      <el-popover v-if="scope.row.pre_trade_position_snapshot_json" placement="left" :width="520" trigger="click">
                        <pre class="snapshot-pre">{{ formatSnapshotJson(scope.row.pre_trade_position_snapshot_json) }}</pre>
                        <template #reference>
                          <el-button link type="primary">查看快照</el-button>
                        </template>
                      </el-popover>
                      <span v-else class="muted-placeholder">--</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="成交时间" min-width="180">
                    <template #default="scope">{{ formatDateTime(scope.row.traded_time) }}</template>
                  </el-table-column>
                </el-table>
                <div class="table-pagination">
                  <el-pagination
                    v-model:current-page="queryPagination['history-trades'].page"
                    v-model:page-size="queryPagination['history-trades'].pageSize"
                    background
                    layout="total, sizes, prev, pager, next"
                    :page-sizes="[10, 20, 50, 100]"
                    :total="filteredHistoryTrades.length"
                  />
                </div>
              </el-tab-pane>

              <el-tab-pane label="资金流水" name="cash-flows">
                <el-table :data="pagedQueryCashFlows" border>
                  <el-table-column prop="stock_name" label="股票名称" min-width="140" />
                  <el-table-column prop="stock_code" label="代码" width="120" />
                  <el-table-column label="类型" width="140">
                    <template #default="scope">{{ getFlowTypeLabel(scope.row.flow_type) }}</template>
                  </el-table-column>
                  <el-table-column label="方向" width="100">
                    <template #default="scope">{{ getFlowDirectionLabel(scope.row.direction) }}</template>
                  </el-table-column>
                  <el-table-column label="金额" width="140">
                    <template #default="scope">{{ formatMoney(scope.row.amount) }}</template>
                  </el-table-column>
                  <el-table-column label="币种" width="130">
                    <template #default="scope">{{ getCurrencyLabel(scope.row.currency) }}</template>
                  </el-table-column>
                  <el-table-column prop="reason" label="原因" min-width="180" />
                  <el-table-column label="时间" min-width="180">
                    <template #default="scope">{{ formatDateTime(scope.row.occurred_time) }}</template>
                  </el-table-column>
                </el-table>
                <div class="table-pagination">
                  <el-pagination
                    v-model:current-page="queryPagination['cash-flows'].page"
                    v-model:page-size="queryPagination['cash-flows'].pageSize"
                    background
                    layout="total, sizes, prev, pager, next"
                    :page-sizes="[10, 20, 50, 100]"
                    :total="filteredCashFlows.length"
                  />
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-tab-pane>

        <el-tab-pane label="盈亏分析" name="profit-analysis">
          <ProfitAnalysisPanel v-if="currentAccount" :account-id="activeAccountId" :trades="trades" :cash-flows="cashFlows" />
        </el-tab-pane>
      </el-tabs>

      <el-dialog v-model="positionEditVisible" title="编辑持仓" width="460px">
        <el-form :model="positionEditForm" label-width="110px">
          <el-form-item label="股票名称">
            <el-input :model-value="editingPosition?.stock_name || '--'" disabled />
          </el-form-item>
          <el-form-item label="股票代码">
            <el-input :model-value="editingPosition?.stock_code || '--'" disabled />
          </el-form-item>
          <el-form-item label="总持仓">
            <el-input :model-value="editingPosition?.total_quantity || 0" disabled />
          </el-form-item>
          <el-form-item label="成本价">
            <el-input-number v-model="positionEditForm.avg_cost_price" :min="0" :precision="6" :step="0.01" class="full-width" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="positionEditVisible = false">取消</el-button>
          <el-button type="primary" :loading="positionEditSubmitting" @click="submitPositionEdit">保存</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import PositionTable from './PositionTable.vue';
import ProfitAnalysisPanel from './ProfitAnalysisPanel.vue';
import StrategyPanel from './StrategyPanel.vue';

import {
  cancelSimTradingOrder,
  createSimTradingOrder,
  depositSimTradingAccount,
  getSimTradingAccountDetail,
  getSimTradingAccounts,
  getSimTradingCashFlows,
  getSimTradingOrders,
  updateSimTradingAccount,
  updateSimTradingPosition,
  getSimTradingTrades,
  searchSimTradingStocks,
  withdrawSimTradingAccount,
} from '@/api/modules/simTrading';
import { getAccountStrategyBindings } from '@/api/modules/simTradingStrategy';


const route = useRoute();
const router = useRouter();

const pageLoading = ref(false);
const actionLoading = ref(false);
const accounts = ref([]);
const activeAccountId = ref('');
const activeTab = ref('position');
const detailPayload = ref(null);
const accountStrategyBindings = ref([]);
const openOrders = ref([]);
const allOrders = ref([]);
const trades = ref([]);
const cashFlows = ref([]);
const activeQueryTab = ref('today-orders');
const selectedOpenOrderIds = ref([]);
const stockSearchLoading = ref(false);
const stockSearchOptions = ref([]);
const selectedBuyStock = ref(null);
const selectedSellStock = ref(null);
const positionEditVisible = ref(false);
const positionEditSubmitting = ref(false);
const editingPosition = ref(null);
const debugModeSwitchLoading = ref(false);
const AUTO_REFRESH_INTERVAL_MS = 15000;
let autoRefreshTimer = null;
let silentRefreshRunning = false;
const queryForm = reactive({
  keyword: '',
  direction: '',
  orderStatus: '',
  flowType: '',
  dateRange: [],
});
const queryFilters = reactive({
  keyword: '',
  direction: '',
  orderStatus: '',
  flowType: '',
  dateRange: [],
});

const EXCHANGE_MAP = {
  SH: 'SH',
  SZ: 'SZ',
  HK: 'HK',
  US: 'US',
  SSE: 'SH',
  SZSE: 'SZ',
};

const ORDER_QUICK_OPTIONS = [
  { label: '全仓', value: 1 },
  { label: '1/2', value: 0.5 },
  { label: '1/3', value: 1 / 3 },
  { label: '1/4', value: 0.25 },
  { label: '1/5', value: 0.2 },
];

const VALID_ACCOUNT_DETAIL_TABS = ['position', 'strategy', 'buy', 'sell', 'order', 'trade', 'transfer', 'query', 'profit-analysis'];

const buyForm = reactive({
  stock_code: '',
  stock_name: '',
  exchange_code: 'SH',
  order_type: 'MARKET',
  order_price: 0,
  order_quantity: 100,
  trade_reason: '',
});

const sellForm = reactive({
  stock_code: '',
  stock_name: '',
  exchange_code: 'SH',
  order_type: 'MARKET',
  order_price: 0,
  order_quantity: 100,
  trade_reason: '',
});

const depositForm = reactive({ amount: 10000, reason: '' });
const withdrawForm = reactive({ amount: 1000, reason: '' });
const positionEditForm = reactive({ avg_cost_price: 0 });

const currentAccount = computed(() =>
  accounts.value.find((item) => String(item.id) === String(activeAccountId.value)) || null
);
const currentDetailAccount = computed(() => detailPayload.value?.account || null);
const isDebugModeEnabled = computed(() => Boolean(currentDetailAccount.value?.debug_mode ?? currentAccount.value?.debug_mode ?? false));
const currentTradeModeLabel = computed(() => (isDebugModeEnabled.value ? '调试模式' : '正常模式'));
const currentTradeModeDescription = computed(() => (
  isDebugModeEnabled.value
    ? '当前账号为调试模式：允许 T+0 交易，非交易时段若价格满足也可能直接撮合成交。'
    : '当前账号为正常模式：A 股按 T+1 交易，非交易时段委托仅挂单，待开盘后参与撮合。'
));
const currentTradeModeFormHint = computed(() => (
  isDebugModeEnabled.value
    ? '当前为调试模式：允许 T+0，非交易时段若价格满足也可能立即成交。'
    : '当前为正常模式：A 股按 T+1 执行，非交易时段只挂单不成交，今日新买入 A 股不可卖出。'
));

const summary = computed(() => detailPayload.value?.summary || {});
const positions = computed(() => detailPayload.value?.positions || []);
const buyQuickPositions = computed(() => positions.value);
const sellQuickPositions = computed(() => positions.value.filter((item) => Number(item.sellable_quantity || 0) > 0));
const todayOrders = computed(() => allOrders.value.filter((item) => isToday(item.placed_time)));
const historyOrders = computed(() => allOrders.value.filter((item) => !isToday(item.placed_time)));
const todayTrades = computed(() => trades.value.filter((item) => isToday(item.traded_time)));
const historyTrades = computed(() => trades.value.filter((item) => !isToday(item.traded_time)));
const filteredTodayOrders = computed(() => filterOrders(todayOrders.value));
const filteredHistoryOrders = computed(() => filterOrders(historyOrders.value));
const filteredTodayTrades = computed(() => filterTrades(todayTrades.value));
const filteredHistoryTrades = computed(() => filterTrades(historyTrades.value));
const filteredCashFlows = computed(() => filterCashFlows(cashFlows.value));
const buyEstimate = computed(() => buildOrderEstimate('BUY', buyForm));
const sellEstimate = computed(() => buildOrderEstimate('SELL', sellForm));
const buyValidationState = computed(() => getOrderFormValidation('BUY', buyForm, buyEstimate.value));
const sellValidationState = computed(() => getOrderFormValidation('SELL', sellForm, sellEstimate.value));
const buyValidation = computed(() => getDisplayOrderValidation(buyForm, buyValidationState.value));
const sellValidation = computed(() => getDisplayOrderValidation(sellForm, sellValidationState.value));
const canSubmitBuyOrder = computed(() => !hasValidationErrors(buyValidationState.value) && !actionLoading.value);
const canSubmitSellOrder = computed(() => !hasValidationErrors(sellValidationState.value) && !actionLoading.value);
const activeAccountRiskBinding = computed(() => {
  return accountStrategyBindings.value.find((item) => item.enabled && item.strategy_category === 'ACCOUNT_RISK' && item.strategy?.strategy_code === 'EXEC_ACCOUNT_RISK_BASE') || null;
});
const accountRiskRuntimeConfig = computed(() => {
  const binding = activeAccountRiskBinding.value;
  if (!binding) {
    return null;
  }
  return mergeRiskConfig(binding.strategy?.rule_config_json || {}, binding.account_override_json || {});
});
const buyRiskSummary = computed(() => buildBuyRiskSummary());
const sellRiskSummary = computed(() => buildSellRiskSummary());
const accountRiskOverview = computed(() => buildAccountRiskOverview());
const queryPagination = reactive({
  'today-orders': { page: 1, pageSize: 10 },
  'today-trades': { page: 1, pageSize: 10 },
  'history-orders': { page: 1, pageSize: 10 },
  'history-trades': { page: 1, pageSize: 10 },
  'cash-flows': { page: 1, pageSize: 10 },
});
const transferCashFlowPagination = reactive({ page: 1, pageSize: 10 });
const pagedTodayOrders = computed(() => paginateList(filteredTodayOrders.value, queryPagination['today-orders']));
const pagedHistoryOrders = computed(() => paginateList(filteredHistoryOrders.value, queryPagination['history-orders']));
const pagedTodayTrades = computed(() => paginateList(filteredTodayTrades.value, queryPagination['today-trades']));
const pagedHistoryTrades = computed(() => paginateList(filteredHistoryTrades.value, queryPagination['history-trades']));
const pagedQueryCashFlows = computed(() => paginateList(filteredCashFlows.value, queryPagination['cash-flows']));
const pagedTransferCashFlows = computed(() => paginateList(cashFlows.value, transferCashFlowPagination));

function formatMoney(value) {
  const num = Number(value || 0);
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function formatTradeReason(value) {
  const text = String(value || '').trim();
  return text || '--';
}

function formatTradeReasonItems(value) {
  const text = String(value || '').trim();
  if (!text) {
    return [];
  }
  return text
    .split(/[\r\n]+|[；;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const matched = item.match(/^([^：:]+[：:])\s*(.*)$/);
      if (!matched) {
        return { label: '', value: item };
      }
      return {
        label: matched[1],
        value: matched[2] || '--',
      };
    });
}

function formatSnapshotJson(value) {
  if (!value) return '--';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeMarketRegimePayload(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'BEAR' || raw === '熊市') {
    return { key: 'bear', label: '熊市' };
  }
  if (raw === 'BULL' || raw === '牛市') {
    return { key: 'bull', label: '牛市' };
  }
  return { key: 'range', label: '震荡市' };
}

function decimalValue(value) {
  return Number(value || 0);
}

function padTimeNumber(value) {
  return String(value).padStart(2, '0');
}

function formatDateTime(value) {
  const date = normalizeDate(value);
  if (!date) return '--';
  const year = date.getFullYear();
  const month = padTimeNumber(date.getMonth() + 1);
  const day = padTimeNumber(date.getDate());
  const hours = padTimeNumber(date.getHours());
  const minutes = padTimeNumber(date.getMinutes());
  const seconds = padTimeNumber(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getCurrencyLabel(currency) {
  const map = {
    CNY: '人民币（CNY）',
    HKD: '港币（HKD）',
    USD: '美元（USD）',
  };
  return map[currency] || currency || '--';
}

function getExchangeLabel(exchange) {
  const map = {
    SH: '上交所（SH）',
    SZ: '深交所（SZ）',
    HK: '港交所（HK）',
    US: '美股（US）',
  };
  return map[exchange] || exchange || '--';
}

function isAShareExchange(exchange) {
  return ['SH', 'SZ', 'SSE', 'SZSE'].includes(String(exchange || '').toUpperCase());
}

function getOrderQuantityStep(exchange) {
  return isAShareExchange(exchange) ? 100 : 1;
}

function getMinOrderQuantity(exchange) {
  return isAShareExchange(exchange) ? 100 : 1;
}

function getBuyOrderQuantityMin() {
  return getMaxAllowedOrderQuantity('BUY', buyForm) <= 0 ? 0 : getMinOrderQuantity(buyForm.exchange_code);
}

function getNormalizedPresetQuantity(exchange, quantity) {
  const normalizedQuantity = Number(quantity || 0);
  if (!isAShareExchange(exchange)) {
    return normalizedQuantity > 0 ? normalizedQuantity : 1;
  }
  if (normalizedQuantity >= 100) {
    return Math.floor(normalizedQuantity / 100) * 100;
  }
  return 100;
}

function normalizeOrderQuantityForExchange(exchange, quantity) {
  const numericQuantity = Number(quantity || 0);
  if (!isAShareExchange(exchange)) {
    return numericQuantity > 0 ? Math.floor(numericQuantity) : 1;
  }
  if (numericQuantity <= 0) {
    return 100;
  }
  if (numericQuantity < 100) {
    return 100;
  }
  return Math.floor(numericQuantity / 100) * 100;
}

function isBuyZeroCashPlaceholder(form) {
  return form === buyForm
    && !!form.stock_code
    && Number(form.order_quantity || 0) === 0
    && getMaxAllowedOrderQuantity('BUY', form) <= 0;
}

function autoRepairOrderQuantity(form, label) {
  if (isBuyZeroCashPlaceholder(form)) {
    return;
  }
  const normalizedQuantity = normalizeOrderQuantityForExchange(form.exchange_code, form.order_quantity);
  if (Number(form.order_quantity) === normalizedQuantity) {
    return;
  }
  form.order_quantity = normalizedQuantity;
  if (isAShareExchange(form.exchange_code)) {
    ElMessage.info(`${label}数量已自动修正为 ${normalizedQuantity} 股`);
  }
}

function validateOrderQuantity(direction, form) {
  const quantity = Number(form.order_quantity || 0);
  if (!(quantity > 0)) {
    return '委托数量必须大于 0';
  }
  if (isAShareExchange(form.exchange_code)) {
    if (quantity < 100 || quantity % 100 !== 0) {
      return 'A股买入卖出数量最低为100股，且必须为100的整数倍';
    }
  }
  if (direction === 'SELL') {
    const position = findPositionByForm(form);
    const sellableQuantity = Number(position?.sellable_quantity || 0);
    if (sellableQuantity > 0 && quantity > sellableQuantity) {
      return `可卖数量不足：当前可卖 ${sellableQuantity}`;
    }
  }
  return '';
}

function getMaxAllowedOrderQuantity(direction, form) {
  if (direction === 'BUY') {
    return getAffordableQuantity(form, direction, summary.value?.available_cash);
  }
  const position = findPositionByForm(form);
  return Number(position?.sellable_quantity || 0);
}

function createEmptyValidation() {
  return {
    stock: '',
    orderPrice: '',
    quantity: '',
    form: '',
  };
}

function isOrderFormPristine(form) {
  return !form.stock_code
    && !form.stock_name
    && Number(form.order_price || 0) === 0
    && Number(form.order_quantity || 0) === 100
    && !String(form.trade_reason || '').trim();
}

function getDisplayOrderValidation(form, validation) {
  if (isOrderFormPristine(form) || isBuyZeroCashPlaceholder(form)) {
    return createEmptyValidation();
  }
  return validation;
}

function getOrderFormValidation(direction, form, estimate) {
  const validation = createEmptyValidation();

  if (!form.stock_code || !form.stock_name) {
    validation.stock = '请先搜索并选择股票';
  }

  if (form.order_type === 'LIMIT' && !(Number(form.order_price) > 0)) {
    validation.orderPrice = '限价单必须填写有效价格';
  }

  const quantityError = validateOrderQuantity(direction, form);
  if (quantityError) {
    validation.quantity = quantityError;
  }

  if (direction === 'BUY' && !validation.stock && !validation.orderPrice && !validation.quantity && estimate.insufficient) {
    const maxAllowedQuantity = getMaxAllowedOrderQuantity(direction, form);
    validation.quantity = maxAllowedQuantity > 0
      ? `数量超出当前可买上限，最多可买 ${maxAllowedQuantity} 股`
      : `当前可用资金不足，按现价与手续费估算暂时无法买入，最多可买 ${maxAllowedQuantity} 股`;
  }

  if (direction === 'SELL' && !validation.stock && !validation.orderPrice && !validation.quantity && estimate.insufficient) {
    validation.quantity = `数量超出当前可卖上限，最多可卖 ${estimate.sellableQuantity} 股`;
  }

  return validation;
}

function hasValidationErrors(validation) {
  return Boolean(validation.stock || validation.orderPrice || validation.quantity || validation.form);
}

function getDirectionLabel(direction) {
  const map = {
    BUY: '买入',
    SELL: '卖出',
  };
  return map[direction] || direction || '--';
}

function getOrderTypeLabel(orderType) {
  const map = {
    LIMIT: '限价',
    MARKET: '市价',
  };
  return map[orderType] || orderType || '--';
}

function getOrderStatusLabel(status) {
  const map = {
    PENDING_MATCH: '等待成交',
    PART_FILLED: '部分成交',
    FILLED: '全部成交',
    CANCELED: '已撤单',
    REJECTED: '已拒绝',
    CREATED: '已创建',
  };
  return map[status] || status || '--';
}

function getOrderStatusTagType(status) {
  const map = {
    PENDING_MATCH: 'warning',
    PART_FILLED: 'warning',
    FILLED: 'success',
    CANCELED: 'info',
    REJECTED: 'danger',
    CREATED: 'info',
  };
  return map[status] || 'info';
}

function getFlowTypeLabel(flowType) {
  const map = {
    DEPOSIT: '入金',
    WITHDRAW: '出金',
    FREEZE: '冻结',
    UNFREEZE: '解冻',
    BUY_SETTLE: '买入结算',
    SELL_SETTLE: '卖出结算',
    FEE: '交易费用',
  };
  return map[flowType] || flowType || '--';
}

function getFlowDirectionLabel(direction) {
  const map = {
    IN: '流入',
    OUT: '流出',
    FREEZE: '冻结',
    RELEASE: '释放',
  };
  return map[direction] || direction || '--';
}

function normalizeStockFromApi(stock) {
  const exchangeCode =
    EXCHANGE_MAP[stock?.exchange_code] ||
    EXCHANGE_MAP[stock?.exchange] ||
    stock?.exchange_code ||
    stock?.exchange ||
    '';
  return {
    ...stock,
    exchange_code: exchangeCode,
    code: stock?.code || stock?.stock_code || '',
    name: stock?.name || stock?.stock_name || '',
    initialPrice: Number(stock?.price) || 0,
  };
}

function getStockSearchItems(result) {
  return result?.payload?.items || [];
}

function getStockSearchErrorMessage(result) {
  if (result?.code === 429) {
    return result?.message || '股票搜索触发限制，请稍后重试';
  }
  return result?.message || '股票搜索失败，请稍后重试';
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  let normalized = typeof value === 'string' ? value.trim().replace(' ', 'T') : value;
  if (typeof normalized === 'string') {
    const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized);
    if (!hasTimezone && normalized.includes('T')) {
      normalized = `${normalized}Z`;
    }
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isToday(value) {
  const date = normalizeDate(value);
  if (!date) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function matchesKeyword(item) {
  if (!queryFilters.keyword) return true;
  const keyword = String(queryFilters.keyword).trim().toLowerCase();
  if (!keyword) return true;
  const stockCode = String(item.stock_code || '').toLowerCase();
  const stockName = String(item.stock_name || '').toLowerCase();
  return stockCode.includes(keyword) || stockName.includes(keyword);
}

function matchesDateRange(value) {
  if (!Array.isArray(queryFilters.dateRange) || queryFilters.dateRange.length !== 2) return true;
  const date = normalizeDate(value);
  if (!date) return false;
  const start = normalizeDate(`${queryFilters.dateRange[0]}T00:00:00`);
  const end = normalizeDate(`${queryFilters.dateRange[1]}T23:59:59`);
  if (!start || !end) return true;
  return date >= start && date <= end;
}

function filterOrders(list) {
  return list.filter((item) => {
    if (!matchesKeyword(item)) return false;
    if (queryFilters.direction && item.direction !== queryFilters.direction) return false;
    if (queryFilters.orderStatus && item.order_status !== queryFilters.orderStatus) return false;
    return matchesDateRange(item.placed_time);
  });
}

function filterTrades(list) {
  return list.filter((item) => {
    if (!matchesKeyword(item)) return false;
    if (queryFilters.direction && item.direction !== queryFilters.direction) return false;
    return matchesDateRange(item.traded_time);
  });
}

function filterCashFlows(list) {
  return list.filter((item) => {
    if (!matchesKeyword(item)) return false;
    if (queryFilters.flowType && item.flow_type !== queryFilters.flowType) return false;
    return matchesDateRange(item.occurred_time);
  });
}

function paginateList(list, pager) {
  const page = Number(pager?.page || 1);
  const pageSize = Number(pager?.pageSize || 10);
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
}

function resetAllQueryPages() {
  Object.values(queryPagination).forEach((pager) => {
    pager.page = 1;
  });
}

function applyQueryFilters() {
  queryFilters.keyword = queryForm.keyword;
  queryFilters.direction = queryForm.direction;
  queryFilters.orderStatus = queryForm.orderStatus;
  queryFilters.flowType = queryForm.flowType;
  queryFilters.dateRange = Array.isArray(queryForm.dateRange) ? [...queryForm.dateRange] : [];
  resetAllQueryPages();
}

function resetQueryFilters() {
  queryForm.keyword = '';
  queryForm.direction = '';
  queryForm.orderStatus = '';
  queryForm.flowType = '';
  queryForm.dateRange = [];
  queryFilters.keyword = '';
  queryFilters.direction = '';
  queryFilters.orderStatus = '';
  queryFilters.flowType = '';
  queryFilters.dateRange = [];
  resetAllQueryPages();
}

function profitClass(value) {
  const num = Number(value || 0);
  if (num > 0) return 'profit-up';
  if (num < 0) return 'profit-down';
  return '';
}

function calcEstimatedFee(amount, direction) {
  const normalizedAmount = decimalValue(amount);
  if (normalizedAmount <= 0) return 0;
  const commission = Math.max(normalizedAmount * 0.0003, 5);
  const stampDuty = direction === 'SELL' ? normalizedAmount * 0.001 : 0;
  return Number((commission + stampDuty).toFixed(4));
}

function findPositionByForm(form) {
  return positions.value.find((item) => item.stock_code === form.stock_code && item.exchange_code === form.exchange_code) || null;
}

function getSelectedStockPrice(form) {
  const selectedStock = form === buyForm ? selectedBuyStock.value : selectedSellStock.value;
  const selectedPrice = decimalValue(selectedStock?.initialPrice);
  if (selectedPrice > 0) return selectedPrice;
  const positionPrice = decimalValue(findPositionByForm(form)?.current_price);
  if (positionPrice > 0) return positionPrice;
  const formPrice = decimalValue(form.order_price);
  return formPrice > 0 ? formPrice : 0;
}

function getEffectiveExecutionPrice(direction, form) {
  const currentPrice = getSelectedStockPrice(form);
  const orderPrice = decimalValue(form.order_price);

  if (form.order_type === 'MARKET') {
    return currentPrice;
  }

  if (form.order_type === 'LIMIT') {
    if (direction === 'BUY' && currentPrice > 0 && orderPrice > 0 && currentPrice <= orderPrice) {
      return currentPrice;
    }
    if (direction === 'SELL' && currentPrice > 0 && orderPrice > 0 && currentPrice >= orderPrice) {
      return currentPrice;
    }
    return orderPrice;
  }

  return currentPrice || orderPrice;
}

function buildOrderEstimate(direction, form) {
  const quantity = Math.max(0, Number(form.order_quantity || 0));
  const marketPrice = decimalValue(getEffectiveExecutionPrice(direction, form));
  const amount = Number((marketPrice * quantity).toFixed(4));
  const fee = calcEstimatedFee(amount, direction);
  const availableCash = decimalValue(summary.value?.available_cash);
  const position = findPositionByForm(form);
  const sellableQuantity = Number(position?.sellable_quantity || 0);
  return {
    amount,
    fee,
    frozenCash: Number((amount + fee).toFixed(4)),
    netAmount: Number((amount - fee).toFixed(4)),
    insufficient: direction === 'BUY' ? amount + fee > availableCash : quantity > sellableQuantity,
    sellableQuantity,
  };
}

function calcFrozenAmount(price, quantity, direction) {
  const amount = Number((decimalValue(price) * Math.max(0, Number(quantity || 0))).toFixed(4));
  const fee = calcEstimatedFee(amount, direction);
  return Number((amount + fee).toFixed(4));
}

function getAffordableQuantity(form, direction, budget) {
  const normalizedBudget = decimalValue(budget);
  const price = decimalValue(getEffectiveExecutionPrice(direction, form));
  const step = getOrderQuantityStep(form.exchange_code);
  const minQuantity = getMinOrderQuantity(form.exchange_code);
  if (normalizedBudget <= 0 || price <= 0) {
    return 0;
  }
  const maxLots = Math.max(0, Math.floor(normalizedBudget / Math.max(price * step, 0.0001)));
  let left = 0;
  let right = maxLots;
  let bestLots = 0;
  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const quantity = middle * step;
    if (calcFrozenAmount(price, quantity, direction) <= normalizedBudget) {
      bestLots = middle;
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }
  const quantity = bestLots * step;
  return quantity >= minQuantity ? quantity : 0;
}

function mergeRiskConfig(base, override) {
  const baseRisk = base?.risk || {};
  const overrideRisk = override?.risk || {};
  return {
    risk: {
      ...baseRisk,
      ...overrideRisk,
      max_holdings_by_market: {
        ...(baseRisk.max_holdings_by_market || {}),
        ...(overrideRisk.max_holdings_by_market || {}),
      },
    },
  };
}

function normalizeRiskPercentValue(value) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }
  return numericValue > 0 && numericValue < 1 ? numericValue * 100 : numericValue;
}

function getActiveRiskPayload() {
  const config = accountRiskRuntimeConfig.value;
  if (!config) {
    return null;
  }
  const risk = config.risk || {};
  const marketRegime = normalizeMarketRegimePayload(risk.current_market_regime);
  const maxHoldingsByMarket = risk.max_holdings_by_market || {};
  return {
    marketRegime,
    maxHoldings: Number(maxHoldingsByMarket[marketRegime.key] ?? 0),
    bullMaxHoldings: Number(maxHoldingsByMarket.bull ?? 0),
    reservedTSlotCount: Number(risk.reserved_t_slot_count ?? 0),
    maxFloatingLossPercent: normalizeRiskPercentValue(risk.max_floating_loss_ratio),
  };
}

function buildAccountRiskOverview() {
  const riskPayload = getActiveRiskPayload();
  if (!riskPayload) {
    return { enabled: false };
  }
  const totalAsset = decimalValue(summary.value?.current_total_asset);
  const availableCash = decimalValue(summary.value?.available_cash);
  const currentHoldingCount = positions.value.length;
  const totalSlots = Math.max(riskPayload.bullMaxHoldings + riskPayload.reservedTSlotCount, 0);
  const slotAmount = totalSlots > 0 ? Number((totalAsset / totalSlots).toFixed(2)) : 0;
  const maxFloatingLossAmount = Number(((totalAsset * riskPayload.maxFloatingLossPercent) / 100).toFixed(2));
  const remainingOpenSlots = Math.max(riskPayload.maxHoldings - currentHoldingCount, 0);
  const triggeredRiskPositionCount = positions.value.filter((item) => {
    const pnlAmount = Number(item?.unrealized_pnl || 0);
    if (!(totalAsset > 0) || !(pnlAmount < 0)) {
      return false;
    }
    return Math.abs(pnlAmount) / totalAsset >= (riskPayload.maxFloatingLossPercent / 100);
  }).length;
  let riskState = 'PASSED';
  let riskStateLabel = '通过';
  let allowOpenPosition = true;
  let allowIntradayT = riskPayload.reservedTSlotCount > 0;
  const allowClosePosition = true;
  let terminateRemaining = false;
  const warnings = [];

  if (!allowIntradayT) {
    warnings.push('当前账号风控未预留做T分块，做T策略默认应保持关闭。');
  }
  if (triggeredRiskPositionCount > 0) {
    riskState = 'FORCE_CLOSE_TRIGGERED';
    riskStateLabel = '强制降风险';
    allowOpenPosition = false;
    allowIntradayT = false;
    terminateRemaining = true;
    warnings.push(`检测到 ${triggeredRiskPositionCount} 只持仓股票的浮亏占总资产比例超过阈值 ${riskPayload.maxFloatingLossPercent.toFixed(2)}%，账号进入强制降风险状态。`);
  } else if (remainingOpenSlots <= 0) {
    riskState = 'MAX_HOLDINGS_REACHED';
    riskStateLabel = '已达持仓上限';
    allowOpenPosition = false;
    warnings.push(`当前市场环境=${riskPayload.marketRegime.label}，股票最大持仓个数=${riskPayload.maxHoldings}，当前已持仓数=${currentHoldingCount}，已无可新增仓位名额。`);
  }

  const recommendedOpenBudget = Number((slotAmount > 0 ? slotAmount : availableCash).toFixed(2));
  return {
    enabled: true,
    marketRegimeLabel: riskPayload.marketRegime.label,
    maxFloatingLossPercentText: `${riskPayload.maxFloatingLossPercent.toFixed(2).replace(/\.00$/, '')}%`,
    warnings,
    capacityItems: [
      { label: '风控状态', value: riskStateLabel },
      {
        label: '剩余可新增股票数',
        value: `${remainingOpenSlots} 只`,
        description: '表示在当前风控上限下，还能再新增多少只不同股票，不是还能买多少股。',
      },
      {
        label: '本次开仓参考金额',
        value: `${formatMoney(recommendedOpenBudget)} 元`,
        description: '这是账号风控按当前总资产和分块规则推导出的本次开仓参考额度，不是固定配置项。',
      },
      { label: '触发强平预警持仓数', value: `${triggeredRiskPositionCount} 只` },
      { label: '后续策略是否应终止', value: terminateRemaining ? '是' : '否' },
    ],
    permissionItems: [
      { label: '建仓', value: allowOpenPosition ? '允许' : '拦截', allowed: allowOpenPosition },
      { label: '卖出', value: allowClosePosition ? '允许' : '拦截', allowed: allowClosePosition },
      { label: '做T', value: allowIntradayT ? '允许' : '关闭', allowed: allowIntradayT },
    ],
    boundaryItems: [
      { label: '当前市场环境', value: riskPayload.marketRegime.label },
      { label: '当前股票最大持仓个数', value: `${riskPayload.maxHoldings} 只` },
      { label: '牛市股票最大持仓个数(M)', value: `${riskPayload.bullMaxHoldings} 只` },
      { label: '做T预留分块数(N)', value: `${riskPayload.reservedTSlotCount} 份` },
      { label: '当前总分块数(M + N)', value: `${totalSlots} 份` },
      { label: '风控单份分块金额', value: `${formatMoney(slotAmount)} 元` },
      { label: '浮亏阈值比例', value: `${riskPayload.maxFloatingLossPercent.toFixed(2).replace(/\.00$/, '')}%` },
      { label: '浮亏阈值金额', value: `${formatMoney(maxFloatingLossAmount)} 元` },
    ],
  };
}

function buildBuyRiskSummary() {
  const riskPayload = getActiveRiskPayload();
  if (!riskPayload) {
    return { enabled: false };
  }
  const totalSlots = Math.max(riskPayload.bullMaxHoldings + riskPayload.reservedTSlotCount, 0);
  const currentHoldingCount = positions.value.length;
  const remainingOpenSlots = Math.max(riskPayload.maxHoldings - currentHoldingCount, 0);
  const totalAsset = decimalValue(summary.value?.current_total_asset);
  const slotAmount = totalSlots > 0 ? Number((totalAsset / totalSlots).toFixed(2)) : 0;
  const maxBuyQuantityByRisk = getAffordableQuantity(buyForm, 'BUY', slotAmount);
  const maxBuyQuantityByCash = getAffordableQuantity(buyForm, 'BUY', summary.value?.available_cash);
  const maxBuyQuantity = maxBuyQuantityByRisk > 0 && maxBuyQuantityByCash > 0
    ? Math.min(maxBuyQuantityByRisk, maxBuyQuantityByCash)
    : Math.max(maxBuyQuantityByRisk, maxBuyQuantityByCash);
  return {
    enabled: true,
    marketRegimeLabel: riskPayload.marketRegime.label,
    maxHoldings: riskPayload.maxHoldings,
    currentHoldingCount,
    remainingOpenSlots,
    slotAmount,
    maxBuyQuantity,
  };
}

function buildSellRiskSummary() {
  const riskPayload = getActiveRiskPayload();
  if (!riskPayload) {
    return { enabled: false };
  }
  const totalAsset = decimalValue(summary.value?.current_total_asset);
  const maxFloatingLossAmount = Number(((totalAsset * riskPayload.maxFloatingLossPercent) / 100).toFixed(2));
  return {
    enabled: true,
    marketRegimeLabel: riskPayload.marketRegime.label,
    maxFloatingLossPercentText: `${riskPayload.maxFloatingLossPercent.toFixed(2).replace(/\.00$/, '')}%`,
    maxFloatingLossAmount,
    sellableQuantity: getMaxAllowedOrderQuantity('SELL', sellForm),
    note: '卖出方向当前不做额外账号级数量拦截；主要参考当前可卖数量，以及个股浮亏超过阈值时系统可能触发风控清仓。',
  };
}

function getQuickRatioQuantity(direction, form, ratio) {
  const normalizedRatio = Number(ratio || 0);
  if (!(normalizedRatio > 0)) {
    return 0;
  }
  if (direction === 'BUY') {
    const budget = decimalValue(summary.value?.available_cash) * normalizedRatio;
    return getAffordableQuantity(form, direction, budget);
  }
  const position = findPositionByForm(form);
  const sellableQuantity = Number(position?.sellable_quantity || 0);
  if (!(sellableQuantity > 0)) {
    return 0;
  }
  const rawQuantity = normalizedRatio >= 1 ? sellableQuantity : Math.floor(sellableQuantity * normalizedRatio);
  return Math.min(getNormalizedPresetQuantity(form.exchange_code, rawQuantity), sellableQuantity);
}

function canUseQuickRatio(direction, form, ratio) {
  if (actionLoading.value) {
    return false;
  }
  if (!form.stock_code || !form.exchange_code) {
    return false;
  }
  return getQuickRatioQuantity(direction, form, ratio) > 0;
}

function applyQuickRatio(direction, ratio) {
  const targetForm = direction === 'BUY' ? buyForm : sellForm;
  const quantity = getQuickRatioQuantity(direction, targetForm, ratio);
  if (!(quantity > 0)) {
    ElMessage.info(direction === 'BUY' ? '请先选择股票并确认可用买入价格' : '请先选择可卖持仓');
    return;
  }
  targetForm.order_quantity = quantity;
}

function canApplyBuyRiskMaxQuantity() {
  return buyRiskSummary.value.enabled && Number(buyRiskSummary.value.maxBuyQuantity || 0) > 0;
}

function applyBuyRiskMaxQuantity() {
  if (!canApplyBuyRiskMaxQuantity()) {
    ElMessage.info('请先选择股票并确认可用买入价格');
    return;
  }
  buyForm.order_quantity = Number(buyRiskSummary.value.maxBuyQuantity || 0);
}

async function suggestStocks(query) {
  if (!query) {
    stockSearchOptions.value = [];
    return;
  }
  stockSearchLoading.value = true;
  try {
    const result = await searchSimTradingStocks(query, false);
    if (result?.success === false) {
      stockSearchOptions.value = [];
      ElMessage.error(getStockSearchErrorMessage(result));
      return;
    }
    stockSearchOptions.value = getStockSearchItems(result).map((stock) => {
      const normalized = normalizeStockFromApi(stock);
      return {
        ...normalized,
        label: `${normalized.name}：${normalized.exchange_code}${normalized.code}`,
        key: `${normalized.exchange_code}_${normalized.code}`,
      };
    });
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '股票搜索失败，请稍后重试');
    stockSearchOptions.value = [];
  } finally {
    stockSearchLoading.value = false;
  }
}

const searchBuyStocks = (query) => suggestStocks(query);
const searchSellStocks = (query) => suggestStocks(query);

function applyStockSelection(stock, targetForm, options = {}) {
  if (!stock) return;
  const { syncPrice = false } = options;
  targetForm.stock_code = `${stock.code}.${stock.exchange_code}`;
  targetForm.stock_name = stock.name || '';
  targetForm.exchange_code = stock.exchange_code || '';
  if (syncPrice || !Number(targetForm.order_price) || targetForm.order_type === 'MARKET') {
    targetForm.order_price = stock.initialPrice || 0;
  }
}

function refreshSelectedStock(selectedStock, targetForm, side) {
  if (!selectedStock?.name && !selectedStock?.code) {
    ElMessage.info('请先搜索并选择股票');
    return;
  }
  const query = selectedStock?.name || selectedStock?.code || '';
  suggestStocks(query).then(() => {
    if (!stockSearchOptions.value.length) return;
    const matched = stockSearchOptions.value.find((item) => item.key === selectedStock.key) || stockSearchOptions.value[0];
    applyStockSelection(matched, targetForm, { syncPrice: true });
    if (side === 'buy') {
      selectedBuyStock.value = matched;
    } else {
      selectedSellStock.value = matched;
    }
  });
}

function openEditPositionDialog(row) {
  editingPosition.value = row;
  positionEditForm.avg_cost_price = Number(row?.avg_cost_price || 0);
  positionEditVisible.value = true;
}

async function submitPositionEdit() {
  if (!activeAccountId.value || !editingPosition.value) {
    return;
  }
  if (!(Number(positionEditForm.avg_cost_price) >= 0)) {
    ElMessage.warning('成本价不能小于 0');
    return;
  }
  positionEditSubmitting.value = true;
  try {
    const res = await updateSimTradingPosition(Number(activeAccountId.value), editingPosition.value.id, {
      avg_cost_price: Number(positionEditForm.avg_cost_price),
    });
    if (!res?.success) {
      ElMessage.error(res?.message || '更新持仓失败');
      return;
    }
    ElMessage.success('持仓成本已更新');
    positionEditVisible.value = false;
    await loadAccountDetail();
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '更新持仓失败');
  } finally {
    positionEditSubmitting.value = false;
  }
}

function goAccountList() {
  router.push('/sim-trading/accounts');
}

function presetOrder(direction, row) {
  activeTab.value = direction === 'SELL' ? 'sell' : 'buy';
  const target = direction === 'SELL' ? sellForm : buyForm;
  target.stock_code = row.stock_code;
  target.stock_name = row.stock_name;
  target.exchange_code = row.exchange_code;
  target.order_type = 'MARKET';
  target.order_price = null;
  target.order_quantity = direction === 'SELL'
    ? getNormalizedPresetQuantity(row.exchange_code, row.sellable_quantity)
    : getMinOrderQuantity(row.exchange_code);
  const selected = {
    code: String(row.stock_code || '').split('.')[0] || row.stock_code,
    name: row.stock_name,
    exchange_code: row.exchange_code,
    key: `${row.exchange_code}_${String(row.stock_code || '').split('.')[0] || row.stock_code}`,
    label: `${row.stock_name}：${row.exchange_code}${String(row.stock_code || '').split('.')[0] || row.stock_code}`,
    initialPrice: Number(row.current_price || 0),
  };
  if (direction === 'SELL') {
    selectedSellStock.value = selected;
  } else {
    selectedBuyStock.value = selected;
  }
}

function quickSelectPosition(direction, row) {
  presetOrder(direction, row);
  ElMessage.success(direction === 'BUY' ? '已带入买入股票' : '已带入卖出股票');
}

function viewTradeHistory(row) {
  activeTab.value = 'query';
  activeQueryTab.value = 'today-trades';
  queryForm.keyword = row?.stock_code || row?.stock_name || '';
  applyQueryFilters();
}

function handleOpenOrderSelection(rows) {
  selectedOpenOrderIds.value = rows.map((item) => item.id);
}

async function cancelOne(row) {
  await doCancel([row.id]);
}

async function batchCancel() {
  await doCancel(selectedOpenOrderIds.value);
}

async function doCancel(orderIds) {
  if (!orderIds.length) return;
  actionLoading.value = true;
  try {
    for (const orderId of orderIds) {
      const res = await cancelSimTradingOrder(orderId);
      if (!res?.success) {
        throw new Error(res?.message || `订单 ${orderId} 撤单失败`);
      }
    }
    ElMessage.success('撤单成功');
    await refreshWorkspace();
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '撤单失败');
  } finally {
    actionLoading.value = false;
  }
}

async function submitOrder(direction) {
  const source = direction === 'BUY' ? buyForm : sellForm;
  const estimate = direction === 'BUY' ? buyEstimate.value : sellEstimate.value;
  const validation = direction === 'BUY' ? buyValidationState.value : sellValidationState.value;
  if (!currentAccount.value) return;
  if (hasValidationErrors(validation)) {
    return;
  }
  actionLoading.value = true;
  try {
    const res = await createSimTradingOrder({
      account_id: Number(activeAccountId.value),
      stock_code: source.stock_code,
      stock_name: source.stock_name,
      exchange_code: source.exchange_code,
      direction,
      order_type: source.order_type,
      order_quantity: Number(source.order_quantity),
      order_price: source.order_type === 'LIMIT' ? Number(source.order_price) : null,
      currency: currentAccount.value.base_currency || 'CNY',
      trade_reason: source.trade_reason,
      source_type: 'MANUAL',
    });
    if (res?.success) {
      ElMessage.success(`${direction === 'BUY' ? '买入' : '卖出'}委托已提交`);
      await refreshWorkspace();
      await nextTick();
      if (direction === 'BUY' && getMaxAllowedOrderQuantity('BUY', buyForm) <= 0) {
        buyForm.order_quantity = 0;
      }
    } else {
      await showOrderSubmitError(res?.message || '下单失败');
    }
  } catch (error) {
    console.error(error);
    await showOrderSubmitError(error?.message || '下单失败');
  } finally {
    actionLoading.value = false;
  }
}

function buildAccountRiskErrorHtml(message) {
  const text = String(message || '').trim();
  if (!text.includes('账号风控限制')) {
    return '';
  }

  const amountMatch = text.match(/单次手动买入金额\s*([0-9.]+)\s*超过单份额度\s*([0-9.]+)/);
  const totalSlotsMatch = text.match(/当前总分块数\(M\s*\+\s*N\)=([0-9]+)/);
  const maxHoldingMatch = text.match(/当前市场环境=([^，,]+)，(?:股票最大持仓个数|最大持股数)=([0-9]+)，(?:当前已持仓数|当前已持仓)\s*([0-9]+)/);

  const lines = ['<div style="line-height:1.8;">', '<div><strong>账号风控拦截，手动买入未提交。</strong></div>'];

  if (maxHoldingMatch) {
    lines.push(`<div>当前市场环境：${normalizeMarketRegimeLabel(maxHoldingMatch[1])}</div>`);
    lines.push(`<div>当前股票最大持仓个数：${maxHoldingMatch[2]}</div>`);
    lines.push(`<div>当前已持仓数：${maxHoldingMatch[3]}</div>`);
  }

  if (totalSlotsMatch) {
    lines.push(`<div>当前总分块数(M + N)：${totalSlotsMatch[1]}</div>`);
  }

  if (amountMatch) {
    lines.push(`<div>本次买入金额：${amountMatch[1]}</div>`);
    lines.push(`<div>单份额度上限：${amountMatch[2]}</div>`);
  }

  lines.push(`<div style="margin-top:8px;color:#606266;">原始原因：${text}</div>`);
  lines.push('</div>');
  return lines.join('');
}

function normalizeMarketRegimeLabel(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'BEAR' || raw === '熊市') {
    return '熊市';
  }
  if (raw === 'BULL' || raw === '牛市') {
    return '牛市';
  }
  return '震荡市';
}

async function showOrderSubmitError(message) {
  const accountRiskHtml = buildAccountRiskErrorHtml(message);
  if (accountRiskHtml) {
    await ElMessageBox.alert(accountRiskHtml, '下单失败', {
      type: 'warning',
      dangerouslyUseHTMLString: true,
      confirmButtonText: '知道了',
    });
    return;
  }
  ElMessage.error(message || '下单失败');
}

async function submitTransfer(action) {
  if (!currentAccount.value) return;
  const source = action === 'deposit' ? depositForm : withdrawForm;
  if (!(Number(source.amount) > 0)) {
    ElMessage.warning('金额必须大于 0');
    return;
  }
  actionLoading.value = true;
  try {
    const api = action === 'deposit' ? depositSimTradingAccount : withdrawSimTradingAccount;
    const res = await api(Number(activeAccountId.value), {
      amount: Number(source.amount),
      currency: currentAccount.value.base_currency || 'CNY',
      reason: source.reason,
    });
    if (res?.success) {
      ElMessage.success(action === 'deposit' ? '入金成功' : '出金成功');
      await refreshWorkspace();
    } else {
      ElMessage.error(res?.message || '转账失败');
    }
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '转账失败');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDebugModeSwitch(nextValue) {
  if (!currentAccount.value) return;
  const targetMode = nextValue ? '调试模式' : '正常模式';
  const confirmMessage = nextValue
    ? '开启调试模式后，当前账号允许 T+0 交易，且在非交易时段若价格满足也可能撮合成交。该模式仅用于调试验证，不代表真实交易规则。是否继续？'
    : '关闭调试模式后，当前账号将恢复正常模式：A 股按 T+1 交易，非交易时段委托仅挂单不成交。是否继续？';
  try {
    await ElMessageBox.confirm(confirmMessage, `切换为${targetMode}`, {
      confirmButtonText: '确认切换',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  debugModeSwitchLoading.value = true;
  try {
    const res = await updateSimTradingAccount(Number(activeAccountId.value), {
      debug_mode: Boolean(nextValue),
    });
    if (!res?.success) {
      throw new Error(res?.message || '切换交易模式失败');
    }
    ElMessage.success(`已切换为${targetMode}`);
    await refreshWorkspace();
  } catch (error) {
    console.error(error);
    ElMessage.error(error?.message || '切换交易模式失败');
  } finally {
    debugModeSwitchLoading.value = false;
  }
}

async function loadAccounts() {
  const res = await getSimTradingAccounts();
  if (!res?.success) {
    throw new Error(res?.message || '获取账户失败');
  }
  accounts.value = res.payload?.items || [];
  const routeAccountId = route.query.accountId ? String(route.query.accountId) : '';
  activeAccountId.value = routeAccountId || (accounts.value[0] ? String(accounts.value[0].id) : '');
}

async function loadAccountDetail() {
  if (!activeAccountId.value) {
    detailPayload.value = null;
    return;
  }
  const res = await getSimTradingAccountDetail(Number(activeAccountId.value));
  if (!res?.success) {
    throw new Error(res?.message || '获取账户详情失败');
  }
  detailPayload.value = res.payload;
}

async function loadAccountStrategyBindings() {
  if (!activeAccountId.value) {
    accountStrategyBindings.value = [];
    return;
  }
  const res = await getAccountStrategyBindings(Number(activeAccountId.value));
  if (res?.success) {
    accountStrategyBindings.value = res.payload?.items || [];
  }
}

async function loadOrders(onlyOpen = false) {
  if (!activeAccountId.value) return;
  const res = await getSimTradingOrders({
    account_id: Number(activeAccountId.value),
    page: 1,
    page_size: onlyOpen ? 100 : 200,
    only_open: onlyOpen ? true : null,
  });
  if (res?.success) {
    if (onlyOpen) {
      openOrders.value = res.payload?.items || [];
    } else {
      allOrders.value = res.payload?.items || [];
    }
  }
}

async function loadTrades() {
  if (!activeAccountId.value) return;
  const res = await getSimTradingTrades({ account_id: Number(activeAccountId.value), page: 1, page_size: 200 });
  if (res?.success) {
    trades.value = res.payload?.items || [];
  }
}

async function loadCashFlows() {
  if (!activeAccountId.value) return;
  const res = await getSimTradingCashFlows(Number(activeAccountId.value), { page: 1, page_size: 200 });
  if (res?.success) {
    cashFlows.value = res.payload?.items || [];
  }
}

async function refreshWorkspace(options = {}) {
  const { silent = false } = options;
  if (silent) {
    if (silentRefreshRunning || actionLoading.value || positionEditVisible.value || positionEditSubmitting.value) {
      return;
    }
    silentRefreshRunning = true;
  } else {
    pageLoading.value = true;
  }
  try {
    await Promise.all([
      loadAccounts(),
    ]);
    await Promise.all([
      loadAccountDetail(),
      loadAccountStrategyBindings(),
      loadOrders(true),
      loadOrders(false),
      loadTrades(),
      loadCashFlows(),
    ]);
  } catch (error) {
    console.error(error);
    if (!silent) {
      ElMessage.error(error?.message || '加载模拟交易页面失败');
    }
  } finally {
    if (silent) {
      silentRefreshRunning = false;
    } else {
      pageLoading.value = false;
    }
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshTimer = window.setInterval(() => {
    if (!activeAccountId.value || document.visibilityState !== 'visible') {
      return;
    }
    refreshWorkspace({ silent: true });
  }, AUTO_REFRESH_INTERVAL_MS);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    window.clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function handleAccountChange(value) {
  router.replace({
    path: '/sim-trading/account-detail',
    query: {
      ...route.query,
      accountId: value,
      tab: activeTab.value,
    },
  });
}

watch(activeTab, (value) => {
  const nextQuery = {
    ...route.query,
    accountId: activeAccountId.value,
    tab: value,
  };
  if (value !== 'transfer' && 'action' in nextQuery) {
    delete nextQuery.action;
  }
  router.replace({
    path: '/sim-trading/account-detail',
    query: nextQuery,
  });
});

watch(activeQueryTab, () => {
  queryForm.orderStatus = '';
  queryForm.flowType = '';
  queryFilters.orderStatus = '';
  queryFilters.flowType = '';
  resetAllQueryPages();
});

watch(
  () => [buyForm.order_quantity, buyForm.exchange_code],
  () => {
    autoRepairOrderQuantity(buyForm, '买入');
  }
);

watch(
  () => [sellForm.order_quantity, sellForm.exchange_code],
  () => {
    autoRepairOrderQuantity(sellForm, '卖出');
  }
);

watch(
  queryFilters,
  () => {
    resetAllQueryPages();
  },
  { deep: true }
);

watch(
  () => route.query,
  (query) => {
    const routeTab = query.tab ? String(query.tab) : '';
    if (routeTab && VALID_ACCOUNT_DETAIL_TABS.includes(routeTab)) {
      activeTab.value = routeTab;
      if (routeTab !== 'transfer' && query.action) {
        const nextQuery = { ...query };
        delete nextQuery.action;
        router.replace({
          path: '/sim-trading/account-detail',
          query: nextQuery,
        });
      }
      return;
    }
    if (query.action === 'deposit' || query.action === 'withdraw') {
      activeTab.value = 'transfer';
    }
  },
  { immediate: true }
);

watch(activeAccountId, async () => {
  if (activeAccountId.value) {
    await Promise.all([loadAccountDetail(), loadAccountStrategyBindings(), loadOrders(true), loadOrders(false), loadTrades(), loadCashFlows()]);
  }
});

onMounted(async () => {
  await refreshWorkspace();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.detail-page {
  padding: 24px;
  text-align: left;
  background: #f5f7fb;
  min-height: 100%;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-header h2 {
  margin: 0;
  font-size: 24px;
  color: #17324d;
}

.detail-header p {
  margin: 6px 0 0;
  color: #5e7186;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.overview-card {
  background: #ffffff;
  border: 1px solid #e7eef6;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.overview-card span {
  font-size: 13px;
  color: #60748a;
}

.overview-card strong {
  font-size: 24px;
  color: #17324d;
  line-height: 1.4;
}

.trade-mode-card {
  margin-bottom: 18px;
  padding: 18px 20px;
  border: 1px solid #cfe3fb;
  border-radius: 16px;
  background: linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%);
  box-shadow: 0 10px 28px rgba(40, 92, 154, 0.08);
}

.trade-mode-card__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.trade-mode-card__content h3 {
  margin: 0;
  font-size: 18px;
  color: #17324d;
}

.trade-mode-card__content p {
  margin: 6px 0 0;
  color: #58708a;
  line-height: 1.6;
}

.trade-mode-card__switch {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.trade-mode-card__label {
  font-size: 13px;
  color: #3e5872;
}

.trade-mode-alert {
  margin-bottom: 18px;
}

.trade-reason-text {
  display: block;
  width: 100%;
  white-space: normal;
  word-break: break-word;
  line-height: 1.5;
  color: #4b5f75;
}

.trade-reason-item {
  display: block;
}

.trade-reason-item + .trade-reason-item {
  margin-top: 4px;
}

.trade-reason-label {
  display: block;
  font-weight: 600;
  color: #304256;
}

.trade-reason-value {
  display: block;
  white-space: normal;
  word-break: break-word;
}

.snapshot-pre {
  margin: 0;
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.6;
  color: #304256;
}

.muted-placeholder {
  color: #98a5b3;
}

.quantity-helper-text {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #8a641f;
  cursor: pointer;
  user-select: none;
  text-decoration: underline;
  text-decoration-style: dashed;
  text-underline-offset: 2px;
  transition: color 0.2s ease;
}

.quantity-helper-text:hover {
  color: #6a4510;
}

.quantity-helper-text.is-disabled {
  color: #b8a27a;
  cursor: not-allowed;
  text-decoration: none;
}

.account-risk-overview-card {
  margin-bottom: 18px;
  padding: 18px 20px;
  border: 1px solid #f0d7a1;
  border-radius: 16px;
  background: linear-gradient(135deg, #fffaf0 0%, #fff4d8 100%);
  box-shadow: 0 10px 30px rgba(163, 104, 15, 0.08);
}

.account-risk-overview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.account-risk-overview-header h3 {
  margin: 0;
  font-size: 18px;
  color: #6a4510;
}

.account-risk-overview-header p {
  margin: 6px 0 0;
  color: #8a641f;
  font-size: 13px;
}

.account-risk-overview-sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.account-risk-overview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.account-risk-overview-section__header h4 {
  margin: 0;
  font-size: 15px;
  color: #6a4510;
}

.account-risk-overview-section__header p {
  margin: 4px 0 0;
  color: #8a641f;
  font-size: 12px;
}

.account-risk-permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.account-risk-permission-chip {
  min-width: 120px;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(205, 156, 73, 0.24);
  background: rgba(255, 255, 255, 0.78);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6a4510;
}

.account-risk-permission-chip strong {
  font-size: 14px;
}

.account-risk-permission-chip.is-allowed {
  border-color: rgba(51, 140, 96, 0.28);
  background: rgba(234, 247, 238, 0.95);
  color: #236745;
}

.account-risk-permission-chip.is-blocked {
  border-color: rgba(186, 85, 65, 0.26);
  background: rgba(255, 239, 234, 0.95);
  color: #9b3a26;
}

.account-risk-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.account-risk-overview-item {
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(205, 156, 73, 0.22);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.account-risk-overview-item span {
  font-size: 13px;
  color: #8a641f;
}

.account-risk-overview-item strong {
  font-size: 22px;
  color: #6a4510;
}

.account-risk-overview-item__desc {
  font-size: 12px;
  line-height: 1.5;
  color: #9b7a42;
}

.account-risk-warning-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account-risk-warning-item {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(186, 85, 65, 0.18);
  background: rgba(255, 244, 239, 0.92);
  color: #9b3a26;
  font-size: 13px;
  line-height: 1.6;
}

.form-panel {
  max-width: 560px;
  padding: 18px;
  border: 1px solid #e7eef6;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(24, 59, 86, 0.04);
}

.transfer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.order-tab-grid {
  display: grid;
  grid-template-columns: minmax(360px, 560px) minmax(320px, 1fr);
  gap: 16px;
  align-items: start;
}

.quick-position-card {
  background: #ffffff;
  border: 1px solid #e7eef6;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(24, 59, 86, 0.04);
}

.quick-position-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.quick-position-header h3 {
  margin: 0;
  font-size: 16px;
  color: #17324d;
}

.quick-position-header span {
  color: #60748a;
  font-size: 12px;
}

.order-estimate-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
  padding: 12px;
  border-radius: 12px;
  background: #f7fafc;
  border: 1px solid #e7eef6;
}

.order-estimate-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-estimate-item span {
  color: #60748a;
  font-size: 12px;
}

.order-estimate-item strong {
  color: #17324d;
  font-size: 16px;
}

.quick-ratio-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.quick-ratio-hint {
  color: #60748a;
  font-size: 12px;
}

:deep(.form-panel .el-form-item) {
  margin-bottom: 22px;
}

:deep(.form-panel .el-form-item.is-error) {
  margin-bottom: 30px;
}

:deep(.form-panel .el-form-item__error) {
  padding-top: 6px;
  line-height: 1.5;
}

.form-error-text {
  margin: 8px 0 18px;
  color: var(--el-color-danger);
  font-size: 12px;
  line-height: 1.5;
}

.full-width {
  width: 100%;
}

.tab-toolbar {
  margin-bottom: 12px;
}

.query-shell {
  background: #ffffff;
  border: 1px solid #e7eef6;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(24, 59, 86, 0.04);
}

.query-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-input {
  width: 220px;
}

.toolbar-select {
  width: 160px;
}

.toolbar-date-range {
  width: 240px;
}

.query-inner-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.profit-up {
  color: #cf3f3f;
}

.profit-down {
  color: #1f8a5b;
}

.stock-search-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

@media (max-width: 768px) {
  .order-tab-grid,
  .transfer-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-input,
  .toolbar-select,
  .toolbar-date-range {
    width: 100%;
  }

  .order-estimate-card {
    grid-template-columns: 1fr;
  }
}
</style>
