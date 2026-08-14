import request from '../common';


const API_PREFIX = '/stock-api/api/system/profit-statistics';


export async function getProfitStatisticsSettings() {
  return await request.get(`${API_PREFIX}/settings`);
}


export async function updateProfitStatisticsSettings(markets = []) {
  return await request.put(`${API_PREFIX}/settings`, {
    markets: Array.isArray(markets) ? markets : [],
  });
}
