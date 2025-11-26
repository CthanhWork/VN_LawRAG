import axios from 'axios';
import { refreshToken } from '../utils/authRefresh';
import { serviceBaseUrls } from './serviceMap';

const axiosInstance = axios.create({
  baseURL: serviceBaseUrls.gateway,
  timeout: 12000,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (err) {
    console.error('Failed to decode token', err);
    return true;
  }
};

axiosInstance.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('accessToken');

  if (!token) {
    return config;
  }

  if (!isTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  if (!isRefreshing) {
    isRefreshing = true;
    try {
      const data = await refreshToken();
      const newToken = data?.accessToken;
      if (!newToken) {
        throw new Error('Refresh token khong hop le');
      }
      localStorage.setItem('accessToken', newToken);
      processQueue(null, newToken);
      config.headers.Authorization = `Bearer ${newToken}`;
      return config;
    } catch (err) {
      processQueue(err, null);
      localStorage.removeItem('accessToken');
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  return new Promise((resolve, reject) => {
    failedQueue.push({
      resolve: (newToken) => {
        config.headers.Authorization = `Bearer ${newToken}`;
        resolve(config);
      },
      reject,
    });
  });
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const data = await refreshToken();
          const newToken = data?.accessToken;
          if (!newToken) {
            throw new Error('Refresh token khong hop le');
          }
          localStorage.setItem('accessToken', newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        } catch (err) {
          processQueue(err, null);
          localStorage.removeItem('accessToken');
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(axiosInstance(originalRequest));
          },
          reject,
        });
      });
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
