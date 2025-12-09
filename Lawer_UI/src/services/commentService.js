import { callService } from '../configs/gateway';

export const getComments = async (postId, { page = 0, size = 10 } = {}) => {
  const response = await callService('social', {
    method: 'get',
    url: `/api/social/posts/${postId}/comments`,
    params: { page, size },
  });
  return response.data;
};

export const addComment = async (postId, content) => {
  const response = await callService('social', {
    method: 'post',
    url: `/api/social/posts/${postId}/comments`,
    data: { content },
  });
  return response.data;
};

const commentService = { getComments, addComment };

export default commentService;
