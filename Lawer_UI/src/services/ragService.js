import { callService } from '../configs/gateway';

export const askQuestion = async (payload) => {
  const response = await callService('rag', {
    method: 'post',
    url: '/ask',
    data: payload,
  });
  return response.data;
};

const ragService = { askQuestion };

export default ragService;
