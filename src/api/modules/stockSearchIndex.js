import request from '../common';
import qs from 'qs';

// 获取同步数据源列表。
export const getStockSearchIndexSources = async () =>
  request.get('/stock-api/api/stock-search-index/sources');

// 触发本地查找表同步。
export const syncStockSearchIndex = async (payload) =>
  request.post('/stock-api/api/stock-search-index/sync', payload);

// 查询同步任务详情。
export const getStockSearchIndexTask = async (taskId) =>
  request.get(`/stock-api/api/stock-search-index/tasks/${taskId}`);

// 查询同步日志。
export const getStockSearchIndexLogs = async (params = {}) => {
  const query = qs.stringify(params);
  return request.get(`/stock-api/api/stock-search-index/logs?${query}`);
};

// 查询本地查找表数据。
export const getStockSearchIndexItems = async (params = {}) => {
  const query = qs.stringify(params);
  return request.get(`/stock-api/api/stock-search-index/items?${query}`);
};

// 手工新增/更新单条索引。
export const upsertStockSearchIndexItem = async (payload) =>
  request.post('/stock-api/api/stock-search-index/items', payload);

// 删除单条索引。
export const deleteStockSearchIndexItem = async (fullCode) =>
  request.delete(`/stock-api/api/stock-search-index/items/${encodeURIComponent(fullCode)}`);

// 导出本地查找表。
export const exportStockSearchIndex = async (markets = []) => {
  const query = qs.stringify({ markets: markets.join(',') });
  return request.get(`/stock-api/api/stock-search-index/export?${query}`);
};
