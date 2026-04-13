import request from '../common';
import qs from 'qs';

export const getGroupMonitorConfigs = async (params = {}) => {
  const queryString = qs.stringify(params);
  const res = await request.get(
    `/stock-api/api/group-monitors/configs${queryString ? `?${queryString}` : ''}`
  );
  return res;
};

export const getGroupMonitorConfigDetail = async (configId) => {
  const res = await request.get(
    `/stock-api/api/group-monitors/configs/${configId}`
  );
  return res;
};

export const createGroupMonitorConfig = async (data) => {
  const res = await request.post(`/stock-api/api/group-monitors/configs`, data);
  return res;
};

export const updateGroupMonitorConfig = async (configId, data) => {
  const res = await request.patch(
    `/stock-api/api/group-monitors/configs/${configId}`,
    data
  );
  return res;
};

export const deleteGroupMonitorConfig = async (configId) => {
  const res = await request.delete(
    `/stock-api/api/group-monitors/configs/${configId}`
  );
  return res;
};

export const toggleGroupMonitorConfigStatus = async (configId, is_enabled) => {
  const res = await request.patch(
    `/stock-api/api/group-monitors/configs/${configId}/status`,
    {
      is_enabled,
    }
  );
  return res;
};

export const runGroupMonitorConfig = async (configId) => {
  const res = await request.post(
    `/stock-api/api/group-monitors/configs/${configId}/run`
  );
  return res;
};

export const getGroupMonitorOverview = async () => {
  const res = await request.get(`/stock-api/api/group-monitors/overview`);
  return res;
};

export const getGroupMonitorSignals = async (params = {}) => {
  const queryString = qs.stringify(params);
  const res = await request.get(
    `/stock-api/api/group-monitors/signals${queryString ? `?${queryString}` : ''}`
  );
  return res;
};

export const getGroupMonitorSignalDetail = async (signalId) => {
  const res = await request.get(
    `/stock-api/api/group-monitors/signals/${signalId}`
  );
  return res;
};

export const deleteGroupMonitorSignal = async (signalId) => {
  const res = await request.delete(
    `/stock-api/api/group-monitors/signals/${signalId}`
  );
  return res;
};
