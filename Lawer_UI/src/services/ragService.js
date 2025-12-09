import { callService } from '../configs/gateway';

export const askQuestion = async ({ question, effectiveAt, k } = {}) => {
  const response = await callService('rag', {
    method: 'post',
    url: '/analyze',
    params: {
      ...(k ? { k } : {}),
      ...(effectiveAt ? { effectiveAt } : {}),
    },
    data: { question },
  });
  return response.data;
};

const ragService = { askQuestion };

export default ragService;
