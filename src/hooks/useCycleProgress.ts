import { useMemo } from 'react';
import { useCredits } from './useCredits';
import { useCreditHistory } from './useCreditHistory';

export function useCycleProgress() {
  const { balance } = useCredits();
  const { transactions } = useCreditHistory(100);

  return useMemo(() => {
    // Calculate consumption in current cycle
    const consumptionTxs = transactions.filter(t => t.type === 'consumption');
    const totalConsumed = consumptionTxs.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalMonthly = balance.plan + balance.subscription + totalConsumed;
    const percentUsed = totalMonthly > 0 ? Math.round((totalConsumed / totalMonthly) * 100) : 0;

    // Usage by feature
    const usageByFeature = consumptionTxs.reduce<Record<string, number>>((acc, t) => {
      const key = t.source || 'other';
      acc[key] = (acc[key] || 0) + Math.abs(t.amount);
      return acc;
    }, {});

    // Projection
    const firstTx = consumptionTxs[consumptionTxs.length - 1];
    let projectedDaysLeft: number | null = null;
    if (firstTx && totalConsumed > 0) {
      const daysSinceFirst = Math.max(1, (Date.now() - new Date(firstTx.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const dailyRate = totalConsumed / daysSinceFirst;
      projectedDaysLeft = dailyRate > 0 ? Math.round(balance.total / dailyRate) : null;
    }

    return {
      totalConsumed,
      totalMonthly,
      percentUsed,
      usageByFeature,
      projectedDaysLeft,
      remaining: balance.total,
    };
  }, [balance, transactions]);
}
