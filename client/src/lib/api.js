import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zyntra_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('zyntra_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Clothing
export const clothingAPI = {
  upload: (formData) =>
    api.post('/clothing', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll: (params) => api.get('/clothing', { params }),
  getOne: (id) => api.get(`/clothing/${id}`),
  update: (id, data) => api.put(`/clothing/${id}`, data),
  delete: (id) => api.delete(`/clothing/${id}`),
  getSimilar: (id) => api.get(`/clothing/${id}/similar`),
};

// Outfits
export const outfitAPI = {
  create: (data) => api.post('/outfits', data),
  getAll: () => api.get('/outfits'),
  delete: (id) => api.delete(`/outfits/${id}`),
};

// Recommendations
export const recommendAPI = {
  get: (params) => api.get('/recommend', { params }),
  getStylistCritique: (data) => api.post('/recommend/stylist-critique', data),
};

// Image Search (Zyntra Web Finder)
export const imageSearchAPI = {
  search: (q, category) => api.get('/imagesearch', { params: { q, category } }),
};

export default api;
