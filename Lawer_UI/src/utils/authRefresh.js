import axios from 'axios';
import { serviceBaseUrls } from '../configs/serviceMap';

const authBase = serviceBaseUrls.auth || serviceBaseUrls.gateway;

export const refreshToken = async () => {
  const response = await axios.post(
    `${authBase}/api/social/auth/refresh`,
    {},
    {
      withCredentials: true,
    },
  );
  return response.data;
};

export default refreshToken;
