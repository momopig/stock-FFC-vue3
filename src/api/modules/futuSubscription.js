import qs from 'qs';

import request from '../common';


const API_PREFIX = '/stock-api/api/futu-subscriptions';


export async function getFutuSubscriptionOverview() {
  return await request.get(`${API_PREFIX}/overview`);
}


export async function getFutuSubscriptionList(params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${API_PREFIX}${query ? `?${query}` : ''}`);
}


export async function getFutuSubscriptionLogs(params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${API_PREFIX}/logs${query ? `?${query}` : ''}`);
}


export async function refreshFutuSubscriptionQuota() {
  return await request.post(`${API_PREFIX}/refresh-quota`);
}


export async function rebalanceFutuSubscriptions() {
  return await request.post(`${API_PREFIX}/rebalance`);
}


export async function ensureFutuSubscriptionTargets(data) {
  return await request.post(`${API_PREFIX}/ensure-targets`, data);
}


export async function unsubscribeFutuSubscriptions(data) {
  return await request.post(`${API_PREFIX}/unsubscribe-batch`, data);
}


export async function pinFutuSubscription(data) {
  return await request.post(`${API_PREFIX}/pin`, data);
}


export async function unpinFutuSubscription(stockCode, exchangeCode) {
  return await request.post(`${API_PREFIX}/${encodeURIComponent(stockCode)}/${encodeURIComponent(exchangeCode)}/unpin`);
}
