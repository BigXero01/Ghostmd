import type { PortfolioProjection } from '@ghostmd/types';

const EPOCHS_PER_DAY = 4;
const EPOCH_ROI_RATE = 0.0025;

export function calculateProjections(
  initialBalance: number,
  days: number,
): PortfolioProjection[] {
  const projections: PortfolioProjection[] = [];
  let balance = initialBalance;
  const now = new Date();

  for (let day = 1; day <= days; day++) {
    for (let epoch = 0; epoch < EPOCHS_PER_DAY; epoch++) {
      balance *= 1 + EPOCH_ROI_RATE;
    }
    const date = new Date(now);
    date.setDate(now.getDate() + day);
    projections.push({
      day,
      balance: parseFloat(balance.toFixed(2)),
      earnings: parseFloat((balance - initialBalance).toFixed(2)),
      date: date.toISOString().split('T')[0],
    });
  }

  return projections;
}
