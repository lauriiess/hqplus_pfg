import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: BASE });

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — but always reject with a proper Error object
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hq_token');
      localStorage.removeItem('hq_user');
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    // Always reject with a real Error so catch blocks get err.message
    const message = err.response?.data?.message || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),
};

// ── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  superAdmin: () => api.get('/api/dashboard/super-admin'),
  facility: (clinicId) => api.get('/api/dashboard/facility', { params: { clinicId } }),
};

// ── Clinics ──────────────────────────────────────────────────────────────────
export const clinicsApi = {
  list: () => api.get('/api/clinics'),
  get: (id) => api.get(`/api/clinics/${id}`),
  create: (data) => api.post('/api/clinics', data),
  update: (id, data) => api.put(`/api/clinics/${id}`, data),
  delete: (id) => api.delete(`/api/clinics/${id}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/api/users'),
  get: (id) => api.get(`/api/users/${id}`),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  deactivate: (id) => api.delete(`/api/users/${id}`),
};

// ── Queue ─────────────────────────────────────────────────────────────────────
export const queueApi = {
  list: (params) => api.get('/api/queues', { params }),
  metrics: (clinicId) => api.get('/api/queues/metrics', { params: { clinicId } }),
  call: (id) => api.put(`/api/queues/${id}/call`),
  complete: (id) => api.put(`/api/queues/${id}/complete`),
  skip: (id) => api.put(`/api/queues/${id}/skip`),
  noShow: (id) => api.put(`/api/queues/${id}/no-show`),
  addWalkin: (data) => api.post('/api/queues/add-walkin', data),
};

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentsApi = {
  list: (params) => api.get('/api/appointments', { params }),
  today: (clinicId) => api.get('/api/appointments/today', { params: { clinicId } }),
  updateStatus: (id, status) => api.put(`/api/appointments/${id}/status`, { status }),
};

// ── Notifications ──────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => api.get('/api/notifications'),
};

export default api;
