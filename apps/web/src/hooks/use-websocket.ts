'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { useWsStore } from '@/stores/ws.store';
import { useQueryClient } from '@tanstack/react-query';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();
  const { setConnected, addTrade, addSignal, setLastEpoch } = useWsStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(
      `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}/algo`,
      { auth: { token: accessToken }, transports: ['websocket'] },
    );

    socketRef.current = socket;
    socket.on('connect', () => { setConnected(true); socket.emit('subscribe_feed'); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('trade_executed', addTrade);
    socket.on('signal_detected', addSignal);
    socket.on('epoch_complete', setLastEpoch);
    socket.on('portfolio_update', () => queryClient.invalidateQueries({ queryKey: ['portfolio'] }));

    return () => { socket.disconnect(); };
  }, [accessToken, setConnected, addTrade, addSignal, setLastEpoch, queryClient]);

  return socketRef.current;
}
