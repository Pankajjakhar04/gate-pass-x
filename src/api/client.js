import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('gate_pass_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gate_pass_token');
      window.dispatchEvent(new Event('gate-pass-unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default client;