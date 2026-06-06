'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useWsStore } from '@/stores/ws.store';
import { useQueryClient } from '@tanstack/react-query';

// Polls /api/algo/feed every 5 seconds instead of maintaining a persistent
// Socket.io connection, which is incompatible with Netlify's serverless model.
// The cursor tracks the last-seen event so only new events are fetched.
export function useWebSocket() {
  const { accessToken } = useAuthStore();
  const { setConnected, addTrade, addSignal, setLastEpoch } = useWsStore();
  const queryClient = useQueryClient();
  const cursorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setConnected(false);
      return;
    }

    setConnected(true);

    const poll = async () => {
      try {
        const url = cursorRef.current
          ? `/api/algo/feed?since=${encodeURIComponent(cursorRef.current)}`
          : '/api/algo/feed';

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) return;

        const { events, cursor } = (await res.json()) as {
          events: Array<{ type: string; data: unknown }>;
          cursor: string | null;
        };

        if (cursor) cursorRef.current = cursor;

        for (const ev of events) {
          if (ev.type === 'trade') addTrade(ev.data);
          else if (ev.type === 'signal') addSignal(ev.data);
          else if (ev.type === 'epoch') {
            setLastEpoch(ev.data);
            queryClient.invalidateQueries({ queryKey: ['portfolio'] });
          }
        }
      } catch {
        // Silently continue on network errors; connection stays "live" from
        // the user's perspective — the terminal just stops updating.
      }
    };

    poll();
    const id = setInterval(poll, 5000);

    return () => {
      clearInterval(id);
      setConnected(false);
    };
  }, [accessToken, setConnected, addTrade, addSignal, setLastEpoch, queryClient]);
}
