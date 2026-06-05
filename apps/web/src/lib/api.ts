import axios from 'axios';

// Defaults to the same-origin `/api` routes (served by Next.js route handlers
// on Netlify). Override with NEXT_PUBLIC_API_URL to point at an external API.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('ghostmd-auth');
      if (stored) {
        const token = JSON.parse(stored)?.state?.accessToken;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = localStorage.getItem('ghostmd-auth');
        const refreshToken = stored ? JSON.parse(stored)?.state?.refreshToken : null;
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/refresh`,
          { refreshToken },
        );
        const cur = localStorage.getItem('ghostmd-auth');
        if (cur) {
          const p = JSON.parse(cur);
          p.state.accessToken = data.accessToken;
          p.state.refreshToken = data.refreshToken;
          localStorage.setItem('ghostmd-auth', JSON.stringify(p));
        }
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('ghostmd-auth');
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  },
);
