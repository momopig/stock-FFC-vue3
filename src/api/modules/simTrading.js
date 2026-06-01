import qs from 'qs';

import request from '../common';

const API_PREFIX = '/stock-api/api/sim-trading';

export async function getSimTradingAccounts() {
  return await request.get(`${API_PREFIX}/accounts`);
}

export async function createSimTradingAccount(data) {
  return await request.post(`${API_PREFIX}/accounts`, data);
}

export async function updateSimTradingAccount(accountId, data) {
  return await request.patch(`${API_PREFIX}/accounts/${accountId}`, data);
}

export async function getSimTradingAccountDetail(accountId) {
  return await request.get(`${API_PREFIX}/accounts/${accountId}`);
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
    `${API_PREFIX}/accounts/${accountId}/cash-flows${query ? `?${query}` : ''}`
  );
}

export async function getSimTradingAccountActivity(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/activity${query ? `?${query}` : ''}`
  );
}

export async function getSimTradingProfitAnalysisOverview(
  accountId,
  params = {}
) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/profit-analysis/overview${query ? `?${query}` : ''}`
  );
}

export async function getSimTradingProfitAnalysisCalendar(
  accountId,
  params = {}
) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/accounts/${accountId}/profit-analysis/calendar${query ? `?${query}` : ''}`
  );
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
  return await request.get(
    `/stock-api/api/stock/search?query=${encodeURIComponent(search)}&only_a=${onlyA}&limit=20`
  );
}
