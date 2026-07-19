import request from '../common';


const API_PREFIX = '/stock-api/api/kline-sources';


// 获取 K 线数据源配置和影响接口清单。
export async function getKlineSourceSettings() {
  return await request.get(`${API_PREFIX}/settings`);
}


// 切换当前生效的 K 线数据源。
export async function updateKlineSourceSettings(sourceKey) {
  return await request.put(`${API_PREFIX}/settings`, {
    source_key: sourceKey,
  });
}


// 保存 QMT 数据源连接配置。
export async function updateKlineSourceConnections(sourceKey, connectionSettings) {
  return await request.put(`${API_PREFIX}/settings/connections`, {
    source_key: sourceKey,
    connection_settings: connectionSettings,
  });
}


// 测试 QMT 数据源连接配置是否可达且能获取示例行情。
export async function testKlineSourceConnections(sourceKey, connectionSettings) {
  return await request.post(`${API_PREFIX}/settings/connections/test`, {
    source_key: sourceKey,
    connection_settings: connectionSettings,
  });
}


// 检测当前已保存的 QMT Agent 与客户端连通性，并刷新数据源状态。
export async function checkKlineSourceClientConnection(sourceKey) {
  return await request.post(`${API_PREFIX}/settings/connections/check`, {
    source_key: sourceKey,
  });
}


// 批量检测全部数据源客户端连通性，并刷新数据源状态。
export async function checkAllKlineSourceClientConnections(sourceKeys = []) {
  return await request.post(`${API_PREFIX}/settings/connections/check-all`, {
    source_keys: Array.isArray(sourceKeys) ? sourceKeys : [],
  });
}
