'use client';

import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

// Ensures the browser has an active session for free, open access.
// If no session exists (first visit, or after one was cleared), a fresh guest
// vault is provisioned silently. Concurrent callers share a single request.
let inflight: Promise<void> | null = null;

export async function ensureGuestSession(force = false): Promise<void> {
  const state = useAuthStore.getState();
  if (!force && state.accessToken && state.user) return;

  if (force) state.logout();

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data } = await axios.post('/api/auth/guest');
      useAuthStore.getState().setAuth(data.user, data.accessToken, data.refreshToken);
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
