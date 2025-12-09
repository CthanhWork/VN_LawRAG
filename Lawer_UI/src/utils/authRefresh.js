import axios from 'axios';
import { serviceBaseUrls } from '../configs/serviceMap';

// Use gateway to avoid double-prefix (/social/api/social/...)
const refreshBase = serviceBaseUrls.gateway || '';

export const refreshToken = async () => {
  const refreshTokenValue = localStorage.getItem('refreshToken');
  if (!refreshTokenValue) {
    throw new Error('Missing refresh token');
  }
  const response = await axios.post(
    `${refreshBase.replace(/\/$/, '')}/api/social/auth/refresh-token`,
    { refreshToken: refreshTokenValue },
    { withCredentials: true },
  );
  return response.data;
};

export default refreshToken;
