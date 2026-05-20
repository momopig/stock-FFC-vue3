import qs from 'qs';

import request from '../common';


const API_PREFIX = '/stock-api/api/log-management';


export async function getLogManagementOverview() {
  return await request.get(`${API_PREFIX}/overview`);
}


export async function getLogManagementTables() {
  return await request.get(`${API_PREFIX}/tables`);
}


export async function getLogTableLogs(tableName, params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${API_PREFIX}/tables/${encodeURIComponent(tableName)}/logs${query ? `?${query}` : ''}`);
}


export async function updateLogTableProfile(tableName, data) {
  return await request.put(`${API_PREFIX}/tables/${encodeURIComponent(tableName)}/profile`, data);
}


export async function runManualLogCleanup(data) {
  return await request.post(`${API_PREFIX}/cleanup`, data);
}


export async function runAutoLogCleanup() {
  return await request.post(`${API_PREFIX}/auto-cleanup/run`);
}


export async function getLogCleanupRecords(params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${API_PREFIX}/cleanup-records${query ? `?${query}` : ''}`);
}
