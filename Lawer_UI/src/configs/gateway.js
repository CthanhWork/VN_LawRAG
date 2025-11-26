import api from './axios';
import { serviceBaseUrls } from './serviceMap';

export const callService = (serviceKey, config) => {
  const baseURL = serviceBaseUrls[serviceKey] || serviceBaseUrls.gateway;
  return api.request({ baseURL, ...config });
};

export default callService;
