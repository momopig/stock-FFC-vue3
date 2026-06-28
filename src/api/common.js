import axios from 'axios';
import { ElMessage } from 'element-plus';
import { getLocal } from '@/utils/storage';
import { getToken, removeToken } from '@/utils/auth';
import { UserStore } from '@/state/user';
axios.defaults.withCredentials = true;

const generateRequestId = () => {
  try {
    if (globalThis?.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch (error) {
    // Ignore and fallback to timestamp-based id.
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const clearFrontendLoginState = () => {
  try {
    UserStore().clearUserData();
  } catch (error) {
    // Pinia may not be ready during very early bootstrap; token/storage cleanup below is still required.
  }
  removeToken();
  localStorage.clear();
  sessionStorage.clear();
};

const request = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器
request.interceptors.request.use(
  (config) => {
    // 在发送请求之前，注入 Authorization 头
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    config.headers = config.headers || {};
    if (!config.headers['X-Request-ID']) {
      config.headers['X-Request-ID'] = generateRequestId();
    }
    return config;
  },
  (error) => {
    // 对请求错误做些什么
    return Promise.reject(error);
  }
);

// 添加响应拦截器
request.interceptors.response.use(
  (response) => {
    if (
      response?.config?.responseType === 'blob' ||
      response?.config?.responseType === 'arraybuffer'
    ) {
      return response;
    }

    const res = response.data;
    const unifiedStatus = typeof res?.status === 'string' ? res.status.toLowerCase() : undefined;
    const normalizedSuccess =
      typeof res?.success === 'boolean'
        ? res.success
        : (unifiedStatus ? unifiedStatus === 'success' : undefined);
    const errorMsg = res.error_msg || res.errorMsg;
    if (res.error_code === 401 || res.error_code === 403) {
      clearFrontendLoginState();
      ElMessage({
        message: '登录失效，请重新登录',
        type: 'error',
      });
      setTimeout(() => {
        window.location.href = `/login?next=${encodeURIComponent(window.location.href)}`;
      }, 1000);
    }
    if (errorMsg) {
      ElMessage({
        message: errorMsg,
        type: 'error',
      });
    }
    if (normalizedSuccess === false) {
      ElMessage({
        message: res?.message || errorMsg || '请求失败',
        type: 'error',
      });
    }

    if (!res?.payload && normalizedSuccess === undefined) {
      return {
        success: true,
        payload: res,
      };
    }
    if (normalizedSuccess !== undefined && typeof res?.success !== 'boolean') {
      return {
        ...res,
        success: normalizedSuccess,
      };
    }
    // 对响应数据做点什么
    return res;
  },
  (error) => {
    const responseData = error?.response?.data || {};
    const statusCode = Number(error?.response?.status || 0);
    const errorCode = String(error?.code || '').toUpperCase();
    const rawMessage = String(error?.message || '');
    const detail = responseData?.detail;
    const payloadMessage =
      responseData?.message ||
      responseData?.error_msg ||
      responseData?.errorMsg;
    let normalizedMessage =
      (typeof detail === 'string' && detail) ||
      payloadMessage ||
      rawMessage ||
      '请求失败';

    if (errorCode === 'ECONNABORTED') {
      normalizedMessage = '请求超时，请检查后端服务或网络连接';
    } else if (!statusCode && /network error/i.test(rawMessage)) {
      normalizedMessage = '网络连接失败，请确认后端服务已启动';
    }

    if (statusCode === 401 || statusCode === 403) {
      clearFrontendLoginState();
    }

    error.message = normalizedMessage;
    return Promise.reject(error);
  }
);

export default request;
