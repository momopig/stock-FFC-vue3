import qs from 'qs';

import request from '../common';
import { buildStockSearchParams } from '@/utils/stockSearchSource';

const API_PREFIX = '/stock-api/api/sim-trading';
// 交易工作台首屏/切换账户的关键请求必须可超时返回，避免后端通道阻塞时前端长期loading。
const SIM_TRADING_PAGE_REQUEST_TIMEOUT_MS = 15000;
const SIM_TRADING_HOT_CACHE_TTL_MS = 3000;
const inFlightRequestMap = new Map();
const hotResponseCacheMap = new Map();

function withInFlightRequest(cacheKey, requestFactory) {
  if (inFlightRequestMap.has(cacheKey)) {
    return inFlightRequestMap.get(cacheKey);
  }
  const promise = Promise.resolve()
    .then(requestFactory)
    .finally(() => {
      inFlightRequestMap.delete(cacheKey);
    });
  inFlightRequestMap.set(cacheKey, promise);
  return promise;
}

function readHotCache(cacheKey) {
  const cached = hotResponseCacheMap.get(cacheKey);
  if (!cached) {
    return null;
  }
  if (Date.now() > Number(cached.expiresAt || 0)) {
    hotResponseCacheMap.delete(cacheKey);
    return null;
  }
  return cached.value;
}

function writeHotCache(cacheKey, value, ttlMs = SIM_TRADING_HOT_CACHE_TTL_MS) {
  hotResponseCacheMap.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function getSimTradingAccounts() {
  return await request.get(`${API_PREFIX}/accounts`, {
    timeout: SIM_TRADING_PAGE_REQUEST_TIMEOUT_MS,
  });
}

export async function createSimTradingAccount(data) {
  return await request.post(`${API_PREFIX}/accounts`, data);
}

export async function updateSimTradingAccount(accountId, data) {
  return await request.patch(`${API_PREFIX}/accounts/${accountId}`, data);
}

export async function reorderSimTradingAccounts(accountIds = []) {
  return await request.post(`${API_PREFIX}/accounts/reorder`, {
    account_ids: accountIds,
  });
}

export async function getSimTradingAccountDetail(accountId) {
  const cacheKey = `account-detail:${Number(accountId)}`;
  const cached = readHotCache(cacheKey);
  if (cached) {
    return cached;
  }
  return await withInFlightRequest(cacheKey, async () => {
    const result = await request.get(`${API_PREFIX}/accounts/${accountId}`, {
      timeout: SIM_TRADING_PAGE_REQUEST_TIMEOUT_MS,
    });
    writeHotCache(cacheKey, result);
    return result;
  });
}

export async function getSimTradingRuntimeHealth(accountId) {
  return await request.get(`${API_PREFIX}/accounts/${accountId}/runtime-health`);
}

export async function recoverSimTradingRuntime(accountId, data = {}) {
  return await request.post(`${API_PREFIX}/accounts/${accountId}/runtime-recover`, data);
}

export async function getSimTradingTradeExecutorConfig(accountId) {
  return await request.get(`${API_PREFIX}/accounts/${accountId}/trade-executor/config`);
}

export async function saveSimTradingTradeExecutorConfig(accountId, data) {
  return await request.post(`${API_PREFIX}/accounts/${accountId}/trade-executor/config`, data);
}

export async function resetSimTradingTradeExecutorConfig(accountId) {
  return await request.post(`${API_PREFIX}/accounts/${accountId}/trade-executor/reset-default`);
}

export async function copySimTradingTradeExecutorConfig(accountId, data) {
  return await request.post(`${API_PREFIX}/accounts/${accountId}/trade-executor/copy`, data);
}

export async function getSimTradingTradeExecutorLogs(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/trade-executor/logs${query ? `?${query}` : ''}`
  );
}

export async function getSimTradingTradeExecutorBatches(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/trade-executor/batches${query ? `?${query}` : ''}`
  );
}

export async function getSimTradingTradeExecutorBatchChildren(accountId, batchId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/trade-executor/batches/${batchId}/children${query ? `?${query}` : ''}`
  );
}

export async function syncSimTradingTradeExecutorBatchStatus(accountId, batchId, data = {}) {
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/trade-executor/batches/${batchId}/sync-status`,
    data
  );
}

export async function syncSimTradingTradeExecutorActiveBatches(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/trade-executor/sync-active-batches${query ? `?${query}` : ''}`
  );
}

export async function replaySimTradingTradeExecutorConfig(accountId, data = {}) {
  return await request.post(`${API_PREFIX}/accounts/${accountId}/trade-executor/replay`, data);
}

export async function generateSimTradingAccountChipPrices(accountId) {
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/chip-prices/generate`
  );
}

export async function depositSimTradingAccount(accountId, data) {
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/deposit`,
    data
  );
}

export async function withdrawSimTradingAccount(accountId, data) {
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/withdraw`,
    data
  );
}

export async function resetSimTradingAccount(accountId) {
  return await request.post(`${API_PREFIX}/accounts/${accountId}/reset`);
}

export async function deleteSimTradingAccount(accountId, data) {
  return await request.delete(`${API_PREFIX}/accounts/${accountId}`, {
    data,
  });
}

export async function getSimTradingCashFlows(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/cash-flows${query ? `?${query}` : ''}`,
    {
      timeout: SIM_TRADING_PAGE_REQUEST_TIMEOUT_MS,
    }
  );
}

export async function getSimTradingAccountActivity(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/activity${query ? `?${query}` : ''}`,
    {
      timeout: SIM_TRADING_PAGE_REQUEST_TIMEOUT_MS,
    }
  );
}

export async function getSimTradingProfitAnalysisOverview(
  accountId,
  params = {}
) {
  const query = qs.stringify(params, { skipNulls: true });
  const cacheKey = `profit-overview:${Number(accountId)}:${query}`;
  const cached = readHotCache(cacheKey);
  if (cached) {
    return cached;
  }
  return await withInFlightRequest(cacheKey, async () => {
    const result = await request.get(
      `${API_PREFIX}/accounts/${accountId}/profit-analysis/overview${query ? `?${query}` : ''}`,
      {
        timeout: SIM_TRADING_PAGE_REQUEST_TIMEOUT_MS,
      }
    );
    writeHotCache(cacheKey, result);
    return result;
  });
}

export async function getSimTradingProfitAnalysisCalendar(
  accountId,
  params = {}
) {
  const query = qs.stringify(params, { skipNulls: true });
  const cacheKey = `profit-calendar:${Number(accountId)}:${query}`;
  const cached = readHotCache(cacheKey);
  if (cached) {
    return cached;
  }
  return await withInFlightRequest(cacheKey, async () => {
    const result = await request.get(
      `${API_PREFIX}/accounts/${accountId}/profit-analysis/calendar${query ? `?${query}` : ''}`,
      {
        timeout: SIM_TRADING_PAGE_REQUEST_TIMEOUT_MS,
      }
    );
    writeHotCache(cacheKey, result);
    return result;
  });
}

export async function createSimTradingOrder(data) {
  return await request.post(`${API_PREFIX}/orders`, data);
}

export async function createSimTradingConditionOrder(data) {
  return await request.post(`${API_PREFIX}/condition-orders`, data);
}

export async function cancelSimTradingOrder(orderId) {
  return await request.post(`${API_PREFIX}/orders/${orderId}/cancel`);
}

export async function cancelSimTradingConditionOrder(
  conditionOrderId,
  params = {}
) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.post(
    `${API_PREFIX}/condition-orders/${conditionOrderId}/cancel${query ? `?${query}` : ''}`
  );
}

export async function getSimTradingOrders(params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${API_PREFIX}/orders${query ? `?${query}` : ''}`);
}

export async function getSimTradingConditionOrders(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/condition-orders${query ? `?${query}` : ''}`
  );
}

export async function getSimTradingOrderDetail(orderId) {
  return await request.get(`${API_PREFIX}/orders/${orderId}`);
}

export async function getSimTradingPositionList(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/positions${query ? `?${query}` : ''}`
  );
}

export async function getSimTradingPositionDetail(accountId, positionId) {
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/positions/${positionId}`
  );
}

export async function getSimTradingTPositionMonitorOverview(accountId) {
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/t-position-monitors/overview`
  );
}

export async function getSimTradingTPositionMonitors(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/t-position-monitors${query ? `?${query}` : ''}`
  );
}

export async function createSimTradingTPositionMonitor(accountId, data) {
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/t-position-monitors`,
    data
  );
}

export async function updateSimTradingTPositionMonitor(
  accountId,
  monitorId,
  data
) {
  return await request.patch(
    `${API_PREFIX}/accounts/${accountId}/t-position-monitors/${monitorId}`,
    data
  );
}

export async function pauseSimTradingTPositionMonitor(
  accountId,
  monitorId,
  data
) {
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/t-position-monitors/${monitorId}/pause`,
    data
  );
}

export async function resumeSimTradingTPositionMonitor(
  accountId,
  monitorId,
  data
) {
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/t-position-monitors/${monitorId}/resume`,
    data
  );
}

export async function manualCloseSimTradingTPositionMonitor(
  accountId,
  monitorId,
  data
) {
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/t-position-monitors/${monitorId}/manual-close`,
    data
  );
}

export async function getSimTradingTPositionMonitorLogs(
  accountId,
  params = {}
) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/t-position-monitor-logs${query ? `?${query}` : ''}`
  );
}

export async function scanSimTradingTPositionMonitors(accountId) {
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/t-position-monitors/scan`
  );
}

export async function syncSimTradingTPositionMonitors(accountId) {
  return await request.post(
    `${API_PREFIX}/accounts/${accountId}/t-position-monitors/sync`
  );
}

export async function updateSimTradingPosition(accountId, positionId, data) {
  return await request.patch(
    `${API_PREFIX}/accounts/${accountId}/positions/${positionId}`,
    data
  );
}

export async function getSimTradingTrades(params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${API_PREFIX}/trades${query ? `?${query}` : ''}`);
}

export async function searchSimTradingStocks(search, onlyA = false) {
  const query = qs.stringify(buildStockSearchParams(search, onlyA, 20));
  return await request.get(`/stock-api/api/stock/search?${query}`);
}
