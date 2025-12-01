import axios from 'axios';
import { ElMessage } from 'element-plus';
import { getLocal } from '@/utils/storage';
import { getToken } from '@/utils/auth';
axios.defaults.withCredentials = true;
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
    const res = response.data;
    const errorMsg = res.error_msg || res.errorMsg;
    if (res.error_code === 401 || res.error_code === 403) {
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
    // 对响应数据做点什么
    return res;
  },
  (error) => {
    // 对响应错误做点什么
    return Promise.reject(error);
  }
);

export default request;
