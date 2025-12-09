import { callService } from '../configs/gateway';

export const login = async (credentials) => {
  const response = await callService('auth', {
    method: 'post',
    url: '/api/social/auth/login',
    data: credentials,
  });
  const payload = response.data;
  const token = payload?.data?.token || payload?.token;
  const refresh = payload?.data?.refreshToken || payload?.refreshToken;
  if (token) {
    localStorage.setItem('accessToken', token);
  }
  if (refresh) {
    localStorage.setItem('refreshToken', refresh);
  }
  return payload;
};

export const logout = async () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  return { success: true };
};

export const getProfile = async () => {
  const response = await callService('auth', {
    method: 'get',
    url: '/api/social/auth/profile',
  });
  return response.data;
};

export const register = async (payload) => {
  const response = await callService('auth', {
    method: 'post',
    url: '/api/social/auth/register',
    data: payload,
  });
  return response.data;
};

export const verifyOtp = async ({ email, code }) => {
  const response = await callService('auth', {
    method: 'post',
    url: '/api/social/auth/verify-otp',
    data: { email, code },
  });
  return response.data;
};

export const resendOtp = async (email) => {
  const response = await callService('auth', {
    method: 'post',
    url: '/api/social/auth/resend-otp',
    data: { email },
  });
  return response.data;
};

export const requestForgotPassword = async (email) => {
  const response = await callService('auth', {
    method: 'post',
    url: '/api/social/auth/forgot-password',
    data: { email },
  });
  return response.data;
};

export const resetPassword = async ({ email, code, newPassword }) => {
  const response = await callService('auth', {
    method: 'post',
    url: '/api/social/auth/reset-password',
    data: { email, code, newPassword },
  });
  return response.data;
};

const authService = {
  login,
  logout,
  getProfile,
  register,
  verifyOtp,
  resendOtp,
  requestForgotPassword,
  resetPassword,
};

export default authService;
