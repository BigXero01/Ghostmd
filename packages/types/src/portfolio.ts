export interface Portfolio {
  id: string;
  userId: string;
  balance: string;
  totalDeposited: string;
  totalEarnings: string;
  lastCompounded: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSnapshot {
  id: string;
  portfolioId: string;
  balance: string;
  snapshotAt: string;
}

export interface PortfolioProjection {
  day: number;
  balance: number;
  earnings: number;
  date: string;
}
