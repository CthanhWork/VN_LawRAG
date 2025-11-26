import { callService } from '../configs/gateway';

export const getMyPosts = async ({ page = 0, size = 10 } = {}) => {
  const response = await callService('social', {
    method: 'get',
    url: '/api/social/posts/mine',
    params: { page, size },
  });
  return response.data;
};

export const getFeed = async ({ page = 0, size = 10 } = {}) => {
  const response = await callService('social', {
    method: 'get',
    url: '/api/social/posts/feed',
    params: { page, size },
  });
  return response.data;
};

export const createPost = async ({ content, visibility = 'PUBLIC', files = [] }) => {
  const formData = new FormData();
  formData.append('content', content || '');
  formData.append('visibility', visibility);
  files.forEach((file) => formData.append('files', file));

  const response = await callService('social', {
    method: 'post',
    url: '/api/social/posts',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getUserPosts = async (userId, { page = 0, size = 10 } = {}) => {
  const response = await callService('social', {
    method: 'get',
    url: `/api/social/posts/users/${userId}/posts`,
    params: { page, size },
  });
  return response.data;
};

export const likePost = async (postId) => {
  const response = await callService('social', {
    method: 'post',
    url: `/api/social/posts/${postId}/like`,
  });
  return response.data;
};

export const unlikePost = async (postId) => {
  const response = await callService('social', {
    method: 'delete',
    url: `/api/social/posts/${postId}/like`,
  });
  return response.data;
};

const postService = { getMyPosts, getUserPosts, getFeed, likePost, unlikePost };

export default postService;
