import qs from 'qs';

import request from '../common';


const SIM_PREFIX = '/stock-api/api/sim-trading';
const STRATEGY_BINDING_REQUEST_TIMEOUT_MS = 15000;
const STRATEGY_BINDING_CACHE_TTL_MS = 5000;
const strategyBindingInFlightMap = new Map();
const strategyBindingCacheMap = new Map();

function withInFlightRequest(cacheKey, requestFactory) {
  if (strategyBindingInFlightMap.has(cacheKey)) {
    return strategyBindingInFlightMap.get(cacheKey);
  }
  const promise = Promise.resolve()
    .then(requestFactory)
    .finally(() => {
      strategyBindingInFlightMap.delete(cacheKey);
    });
  strategyBindingInFlightMap.set(cacheKey, promise);
  return promise;
}

function readCache(cacheKey) {
  const cached = strategyBindingCacheMap.get(cacheKey);
  if (!cached) {
    return null;
  }
  if (Date.now() > Number(cached.expiresAt || 0)) {
    strategyBindingCacheMap.delete(cacheKey);
    return null;
  }
  return cached.value;
}

function writeCache(cacheKey, value, ttlMs = STRATEGY_BINDING_CACHE_TTL_MS) {
  strategyBindingCacheMap.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function invalidateAccountBindingCache(accountId) {
  strategyBindingCacheMap.delete(`strategy-bindings:${Number(accountId)}`);
}


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
  const cacheKey = `strategy-bindings:${Number(accountId)}`;
  const cached = readCache(cacheKey);
  if (cached) {
    return cached;
  }
  return await withInFlightRequest(cacheKey, async () => {
    const result = await request.get(
      `${SIM_PREFIX}/accounts/${accountId}/strategy-bindings`,
      {
        timeout: STRATEGY_BINDING_REQUEST_TIMEOUT_MS,
      }
    );
    writeCache(cacheKey, result);
    return result;
  });
}


export async function createAccountStrategyBinding(accountId, data) {
  const result = await request.post(`${SIM_PREFIX}/accounts/${accountId}/strategy-bindings`, data);
  invalidateAccountBindingCache(accountId);
  return result;
}


export async function updateAccountStrategyBinding(accountId, bindingId, data) {
  const result = await request.patch(`${SIM_PREFIX}/accounts/${accountId}/strategy-bindings/${bindingId}`, data);
  invalidateAccountBindingCache(accountId);
  return result;
}


export async function deleteAccountStrategyBinding(accountId, bindingId) {
  const result = await request.delete(`${SIM_PREFIX}/accounts/${accountId}/strategy-bindings/${bindingId}`);
  invalidateAccountBindingCache(accountId);
  return result;
}


export async function reorderAccountStrategyBindings(accountId, items) {
  const result = await request.post(`${SIM_PREFIX}/accounts/${accountId}/strategy-bindings/reorder`, { items });
  invalidateAccountBindingCache(accountId);
  return result;
}


export async function getAccountStrategyLogs(accountId, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${SIM_PREFIX}/accounts/${accountId}/strategy-logs${query ? `?${query}` : ''}`);
}


export async function debugRunAccountStrategy(accountId) {
  return await request.post(`${SIM_PREFIX}/accounts/${accountId}/strategy-dispatch/debug-run`);
}
