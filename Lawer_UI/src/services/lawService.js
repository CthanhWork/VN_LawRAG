import { callService } from '../configs/gateway';

export const searchLaw = async (query) => {
  const response = await callService('law', {
    method: 'get',
    url: '/laws/search',
    params: { q: query },
  });
  return response.data;
};

export const getLawDetail = async (id) => {
  const response = await callService('law', {
    method: 'get',
    url: `/laws/${id}`,
  });
  return response.data;
};

const lawService = { searchLaw, getLawDetail };

export default lawService;
