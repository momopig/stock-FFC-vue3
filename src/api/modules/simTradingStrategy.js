import qs from 'qs';

import request from '../common';


const SIM_PREFIX = '/stock-api/api/sim-trading';


export async function getExecutionStrategies(params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${SIM_PREFIX}/strategies${query ? `?${query}` : ''}`);
}


export async function getAccountStrategySettings(accountId) {
  return await request.get(`${SIM_PREFIX}/accounts/${accountId}/strategy-settings`);
}


export async function toggleAccountStrategySettings(accountId, data) {
  return await request.post(`${SIM_PREFIX}/accounts/${accountId}/strategy-settings/toggle`, data);
}


export async function getAccountStrategyBindings(accountId) {
  return await request.get(`${SIM_PREFIX}/accounts/${accountId}/strategy-bindings`);
}


export async function createAccountStrategyBinding(accountId, data) {
  return await request.post(`${SIM_PREFIX}/accounts/${accountId}/strategy-bindings`, data);
}


export async function updateAccountStrategyBinding(accountId, bindingId, data) {
  return await request.patch(`${SIM_PREFIX}/accounts/${accountId}/strategy-bindings/${bindingId}`, data);
}


export async function deleteAccountStrategyBinding(accountId, bindingId) {
  return await request.delete(`${SIM_PREFIX}/accounts/${accountId}/strategy-bindings/${bindingId}`);
}


export async function reorderAccountStrategyBindings(accountId, items) {
  return await request.post(`${SIM_PREFIX}/accounts/${accountId}/strategy-bindings/reorder`, { items });
}


export async function getAccountStrategyLogs(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${SIM_PREFIX}/accounts/${accountId}/strategy-logs${query ? `?${query}` : ''}`);
}


export async function debugRunAccountStrategy(accountId) {
  return await request.post(`${SIM_PREFIX}/accounts/${accountId}/strategy-dispatch/debug-run`);
}
