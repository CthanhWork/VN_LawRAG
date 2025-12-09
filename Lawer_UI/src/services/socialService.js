import { callService } from '../configs/gateway';

export const updateProfile = async (payload) => {
  const response = await callService('social', {
    method: 'patch',
    url: '/api/social/users/me',
    data: payload,
  });
  return response.data;
};

export const changePassword = async (payload) => {
  const response = await callService('social', {
    method: 'post',
    url: '/api/social/auth/change-password',
    data: payload,
  });
  return response.data;
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await callService('social', {
    method: 'post',
    url: '/api/social/users/me/avatar',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteAvatar = async () => {
  const response = await callService('social', {
    method: 'delete',
    url: '/api/social/users/me/avatar',
  });
  return response.data;
};

const socialService = { updateProfile, changePassword, uploadAvatar, deleteAvatar };

export default socialService;
