import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const verifyEmail = (token) => api.post('/auth/verify', { token });

// Shaders
export const getShaders = (params) => api.get('/shaders', { params });
export const getShader = (id) => api.get(`/shaders/${id}`);
export const createShader = (data) => api.post('/shaders', data);
export const updateShader = (id, data) => api.put(`/shaders/${id}`, data);
export const deleteShader = (id) => api.delete(`/shaders/${id}`);
export const setShaderActive = (id, is_active) => api.patch(`/shaders/${id}/active`, { is_active });
export const likeShader = (id) => api.post(`/shaders/${id}/like`);

// Comments
export const getComments = (shaderId) => api.get(`/shaders/${shaderId}/comments`);
export const addComment = (shaderId, content) => api.post(`/shaders/${shaderId}/comments`, { content });
export const deleteComment = (shaderId, commentId) => api.delete(`/shaders/${shaderId}/comments/${commentId}`);

// Admin
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = () => api.get('/admin/users');
export const getAdminShaders = () => api.get('/admin/shaders');
export const setUserRole = (id, role) => api.patch(`/admin/users/${id}/role`, { role });
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
export const adminSetShaderActive = (id, is_active) => api.patch(`/admin/shaders/${id}/active`, { is_active });
export const adminDeleteShader = (id) => api.delete(`/admin/shaders/${id}`);

// GraphQL
export const gql = async (query, variables = {}) => {
  const res = await axios.post('/graphql', { query, variables }, { withCredentials: true });
  if (res.data.errors) throw new Error(res.data.errors[0].message);
  return res.data.data;
};

export default api;
