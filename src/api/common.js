import axios from 'axios';
import { ElMessage } from 'element-plus';
import { getLocal } from '@/utils/storage';
import { getToken, removeToken } from '@/utils/auth';
import { UserStore } from '@/state/user';
axios.defaults.withCredentials = true;

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
    if (!res?.payload && res?.success === undefined) {
      return {
        success: true,
        payload: res,
      };
    }
    // 对响应数据做点什么
    return res;
  },
  (error) => {
    const responseData = error?.response?.data || {};
    const statusCode = Number(error?.response?.status || 0);
    const detail = responseData?.detail;
    const payloadMessage =
      responseData?.message ||
      responseData?.error_msg ||
      responseData?.errorMsg;
    const normalizedMessage =
      (typeof detail === 'string' && detail) ||
      payloadMessage ||
      error?.message ||
      '请求失败';

    if (statusCode === 401 || statusCode === 403) {
      clearFrontendLoginState();
    }

    error.message = normalizedMessage;
    return Promise.reject(error);
  }
);

export default request;
