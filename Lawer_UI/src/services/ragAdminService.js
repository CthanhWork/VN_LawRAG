import { callService } from '../configs/gateway';

export const reindex = async () => {
  const response = await callService('rag', {
    method: 'post',
    url: '/admin/reindex',
  });
  return response.data;
};

export const getStatus = async () => {
  const response = await callService('rag', {
    method: 'get',
    url: '/admin/status',
  });
  return response.data;
};

export const reloadPatterns = async () => {
  const response = await callService('rag', {
    method: 'post',
    url: '/admin/reload_patterns',
  });
  return response.data;
};

const ragAdminService = { reindex, getStatus, reloadPatterns };

export default ragAdminService;
