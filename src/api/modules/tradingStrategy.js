import qs from 'qs';

import request from '../common';


const API_PREFIX = '/stock-api/api/sim-trading/strategies';


export async function getTradingStrategies(params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${API_PREFIX}${query ? `?${query}` : ''}`);
}


export async function createTradingStrategy(data) {
  return await request.post(API_PREFIX, data);
}


export async function getTradingStrategyDetail(strategyId) {
  return await request.get(`${API_PREFIX}/${strategyId}`);
}


export async function updateTradingStrategy(strategyId, data) {
  return await request.put(`${API_PREFIX}/${strategyId}`, data);
}


export async function deleteTradingStrategy(strategyId) {
  return await request.delete(`${API_PREFIX}/${strategyId}`);
}


export async function enableTradingStrategy(strategyId) {
  return await request.post(`${API_PREFIX}/${strategyId}/enable`);
}


export async function disableTradingStrategy(strategyId) {
  return await request.post(`${API_PREFIX}/${strategyId}/disable`);
}


export async function validateTradingStrategy(strategyId, ruleConfigJson) {
  return await request.post(`${API_PREFIX}/${strategyId}/validate-config`, ruleConfigJson ?? null);
}


export async function getTradingStrategyUsageSummary(strategyId) {
  return await request.get(`${API_PREFIX}/${strategyId}/usage-summary`);
}


export async function getTradingStrategyUsageBindings(strategyId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${API_PREFIX}/${strategyId}/usage-bindings${query ? `?${query}` : ''}`);
}
