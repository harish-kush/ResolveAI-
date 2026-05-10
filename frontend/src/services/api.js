import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('token', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.token}`;
          return api(error.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  invite: (data) => api.post('/auth/invite', data)
};

export const orgAPI = {
  get: () => api.get('/organization'),
  update: (data) => api.put('/organization', data),
  getMembers: () => api.get('/organization/members'),
  updateMember: (id, data) => api.put(`/organization/members/${id}`, data),
  removeMember: (id) => api.delete(`/organization/members/${id}`)
};

export const ticketAPI = {
  getAll: (params) => api.get('/tickets', { params }),
  getOne: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  addNote: (id, data) => api.post(`/tickets/${id}/notes`, data),
  getAISummary: (id) => api.get(`/tickets/${id}/ai-summary`),
  getStats: () => api.get('/tickets/stats')
};

export const chatAPI = {
  getConversations: (params) => api.get('/chat', { params }),
  getMessages: (id) => api.get(`/chat/${id}/messages`),
  sendMessage: (id, data) => api.post(`/chat/${id}/messages`, data),
  takeOver: (id) => api.post(`/chat/${id}/takeover`)
};

export const widgetAPI = {
  start: (data) => api.post('/widget/start', data),
  sendMessage: (data) => api.post('/widget/message', data),
  contactForm: (data) => api.post('/widget/contact', data)
};

export const trainingAPI = {
  getAll: (params) => api.get('/training', { params }),
  add: (data) => api.post('/training', data),
  update: (id, data) => api.put(`/training/${id}`, data),
  delete: (id) => api.delete(`/training/${id}`),
  crawl: (data) => api.post('/training/crawl', data),
  test: (data) => api.post('/training/test', data)
};

export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  detailed: (params) => api.get('/analytics/detailed', { params })
};

export default api;
