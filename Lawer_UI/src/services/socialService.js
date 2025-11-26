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

const socialService = { updateProfile, changePassword };

export default socialService;
