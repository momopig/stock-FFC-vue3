import request from '../common';

// common 没有 baseURL，必须显式包含部署前缀；不改共享请求配置。
const root = (accountId) => `/stock-api/api/sim-trading/accounts/${encodeURIComponent(accountId)}/profit-analysis`;

// 共享拦截器不会抛出业务失败；在此统一拒绝，防止失败结果被当作有效账本。
async function payloadOf(promise) {
  const response = await promise;
  if (response?.success === false || (response?.status && response.status !== 'success')) {
    throw new Error(response.message || '盈亏账本请求失败');
  }
  if (response?.payload == null) throw new Error('服务未返回有效账本数据');
  return response.payload;
}

// 所有读取均为只读操作；超时仅表示网络状态未知，不代表后台任务失败。
export const getProfitLedgerData = (id, params) => payloadOf(request.get(`${root(id)}/data`, { params, timeout: 20000 }));
export const getProfitLedgerHealth = (id) => payloadOf(request.get(`${root(id)}/health`, { timeout: 20000 }));
export const getProfitLedgerTask = (id, taskId) => payloadOf(request.get(`${root(id)}/tasks/${encodeURIComponent(taskId)}`, { timeout: 15000 }));

// 写入均由显式用户操作触发；不自动重试任何 POST 或 PUT。
export const previewProfitRepair = (id, body) => payloadOf(request.post(`${root(id)}/repair-preview`, body, { timeout: 30000 }));
export const createProfitRepair = (id, body) => payloadOf(request.post(`${root(id)}/repairs`, body, { timeout: 30000 }));
export const putProfitOpening = (id, body) => payloadOf(request.put(`${root(id)}/opening`, body, { timeout: 30000 }));
export const captureProfitFacts = (id) => payloadOf(request.post(`${root(id)}/capture`, undefined, { timeout: 30000 }));
// 人工确认由服务保存后重新采集；禁止客户端直接伪造 COMPLETE 或 SEALED。
export const confirmProfitCashCoverage = (id, body) => payloadOf(request.post(`${root(id)}/cash-coverage`, body, { timeout: 30000 }));