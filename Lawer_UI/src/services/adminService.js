import api from '../configs/axios';
import { serviceBaseUrls } from '../configs/serviceMap';

const normalizeBase = (base) => (base || '').replace(/\/+$/, '');
const socialAdminBase =
  normalizeBase(serviceBaseUrls.socialAdmin || serviceBaseUrls.social || serviceBaseUrls.gateway);
const baseHasApi = /\/api$/i.test(socialAdminBase);
const adminPrefix = baseHasApi ? '/admin/social' : '/api/admin/social';
const buildUrl = (suffix) => `${adminPrefix}${suffix}`;

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

export const listUsers = async ({ status, keyword, page = 0, size = 20 } = {}) => {
  const response = await api.request({
    baseURL: socialAdminBase,
    method: 'get',
    url: buildUrl('/users'),
    params: cleanParams({ status, keyword, page, size }),
  });
  return response.data;
};

export const getUser = async (id) => {
  const response = await api.request({
    baseURL: socialAdminBase,
    method: 'get',
    url: buildUrl(`/users/${id}`),
  });
  return response.data;
};

export const updateUserStatus = async (id, status) => {
  const response = await api.request({
    baseURL: socialAdminBase,
    method: 'patch',
    url: buildUrl(`/users/${id}/status`),
    data: { status },
  });
  return response.data;
};

export const updateUserRoles = async (id, roles) => {
  const normalizedRoles = Array.isArray(roles) ? roles.join(',') : roles;
  const response = await api.request({
    baseURL: socialAdminBase,
    method: 'patch',
    url: buildUrl(`/users/${id}/roles`),
    data: { roles: normalizedRoles },
  });
  return response.data;
};

export const listPosts = async ({ authorId, visibility, page = 0, size = 20 } = {}) => {
  const response = await api.request({
    baseURL: socialAdminBase,
    method: 'get',
    url: buildUrl('/posts'),
    params: cleanParams({ authorId, visibility, page, size }),
  });
  return response.data;
};

export const getPost = async (postId) => {
  const response = await api.request({
    baseURL: socialAdminBase,
    method: 'get',
    url: buildUrl(`/posts/${postId}`),
  });
  return response.data;
};

export const updatePostVisibility = async (postId, visibility) => {
  const response = await api.request({
    baseURL: socialAdminBase,
    method: 'patch',
    url: buildUrl(`/posts/${postId}/visibility`),
    data: { visibility },
  });
  return response.data;
};

export const deletePost = async (postId) => {
  const response = await api.request({
    baseURL: socialAdminBase,
    method: 'delete',
    url: buildUrl(`/posts/${postId}`),
  });
  return response.data;
};

export const listComments = async (postId, { page = 0, size = 20 } = {}) => {
  const response = await api.request({
    baseURL: socialAdminBase,
    method: 'get',
    url: buildUrl(`/posts/${postId}/comments`),
    params: cleanParams({ page, size }),
  });
  return response.data;
};

export const deleteComment = async (postId, commentId) => {
  const response = await api.request({
    baseURL: socialAdminBase,
    method: 'delete',
    url: buildUrl(`/posts/${postId}/comments/${commentId}`),
  });
  return response.data;
};

const adminService = {
  listUsers,
  getUser,
  updateUserStatus,
  updateUserRoles,
  listPosts,
  getPost,
  updatePostVisibility,
  deletePost,
  listComments,
  deleteComment,
};

export default adminService;
