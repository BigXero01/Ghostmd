'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => { const { data } = await api.get('/portfolio'); return data; },
    refetchInterval: 30000,
  });
}

export function usePortfolioHistory() {
  return useQuery({
    queryKey: ['portfolio', 'history'],
    queryFn: async () => { const { data } = await api.get('/portfolio/history'); return data; },
  });
}

export function usePortfolioProjections() {
  return useQuery({
    queryKey: ['portfolio', 'projections'],
    queryFn: async () => { const { data } = await api.get('/portfolio/projections'); return data; },
  });
}
