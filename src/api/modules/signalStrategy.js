import request from '../common';
import qs from 'qs';

export const getSignalStrategyTemplates = async (params = {}) => {
  const queryString = qs.stringify(params);
  return await request.get(
    `/stock-api/api/signal-strategies/templates${queryString ? `?${queryString}` : ''}`
  );
};

export const getSignalStrategyTemplate = async (templateCode) => {
  return await request.get(
    `/stock-api/api/signal-strategies/templates/${templateCode}`
  );
};

export const getSignalStrategyInstances = async (params = {}) => {
  const queryString = qs.stringify(params);
  return await request.get(
    `/stock-api/api/signal-strategies/instances${queryString ? `?${queryString}` : ''}`
  );
};

export const createSignalStrategyInstance = async (data) => {
  return await request.post('/stock-api/api/signal-strategies/instances', data);
};

export const getSignalStrategyInstance = async (instanceId) => {
  return await request.get(
    `/stock-api/api/signal-strategies/instances/${instanceId}`
  );
};

export const updateSignalStrategyInstance = async (instanceId, data) => {
  return await request.patch(
    `/stock-api/api/signal-strategies/instances/${instanceId}`,
    data
  );
};

export const deleteSignalStrategyInstance = async (instanceId) => {
  return await request.delete(
    `/stock-api/api/signal-strategies/instances/${instanceId}`
  );
};

export const toggleSignalStrategyInstance = async (instanceId, isEnabled) => {
  return await request.patch(
    `/stock-api/api/signal-strategies/instances/${instanceId}/enabled`,
    {
      is_enabled: isEnabled,
    }
  );
};

export const getSignalStrategyOptions = async (params = {}) => {
  const queryString = qs.stringify(params);
  return await request.get(
    `/stock-api/api/signal-strategies/instances/options${queryString ? `?${queryString}` : ''}`
  );
};

export const getSignalStrategySupportSnapshot = async (params = {}) => {
  const queryString = qs.stringify(params);
  return await request.get(
    `/stock-api/api/signal-strategies/support-snapshot${queryString ? `?${queryString}` : ''}`
  );
};

export const getSignalStrategyChipPrices = async (params = {}) => {
  const queryString = qs.stringify(params, { arrayFormat: 'repeat' });
  return await request.get(
    `/stock-api/api/signal-strategies/chip-prices${queryString ? `?${queryString}` : ''}`
  );
};

export const createSignalStrategyChipPrice = async (data) => {
  return await request.post(
    '/stock-api/api/signal-strategies/chip-prices',
    data
  );
};

export const updateSignalStrategyChipPrice = async (recordId, data) => {
  return await request.patch(
    `/stock-api/api/signal-strategies/chip-prices/${recordId}`,
    data
  );
};

export const deleteSignalStrategyChipPrice = async (recordId) => {
  return await request.delete(
    `/stock-api/api/signal-strategies/chip-prices/${recordId}`
  );
};

export const recomputeSignalStrategyChipPrices = async (data) => {
  return await request.post(
    '/stock-api/api/signal-strategies/chip-prices/recompute',
    data
  );
};

export const applySignalStrategyPhase2Defaults = async (instanceId) => {
  return await request.post(
    `/stock-api/api/signal-strategies/instances/${instanceId}/apply-phase2-defaults`
  );
};

export const backtestSignalStrategyInstance = async (instanceId, data) => {
  return await request.post(
    `/stock-api/api/signal-strategies/instances/${instanceId}/backtest`,
    data
  );
};
