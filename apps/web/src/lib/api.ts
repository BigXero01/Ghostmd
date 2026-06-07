import axios from 'axios';

// Use relative paths so the same code works locally (Next.js dev server)
// and on Netlify (Route Handlers served from the same origin).
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});
