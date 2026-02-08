import React from 'react';
import { AlertTriangle, Coins, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/hooks/useCredits';
import { useCycleProgress } from '@/hooks/useCycleProgress';

interface CreditAlertProps {
  onBuyCredits?: () => void;
  className?: string;
}

export function CreditAlert({ onBuyCredits, className = '' }: CreditAlertProps) {
  const { balance } = useCredits();
  const { percentUsed, projectedDaysLeft } = useCycleProgress();

  if (balance.total > 5 && percentUsed < 80) return null;

  const isZero = balance.total === 0;
  const isLow = balance.total > 0 && balance.total <= 5;
  const isProjectedLow = projectedDaysLeft !== null && projectedDaysLeft <= 3;

  if (!isZero && !isLow && !isProjectedLow) return null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        isZero
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : 'bg-warning/10 border-warning/30 text-warning'
      } ${className}`}
    >
      {isZero ? (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      ) : isProjectedLow ? (
        <TrendingDown className="w-4 h-4 shrink-0" />
      ) : (
        <Coins className="w-4 h-4 shrink-0" />
      )}
      <span className="text-sm flex-1">
        {isZero
          ? 'Seus créditos acabaram!'
          : isLow
            ? `Você tem apenas ${balance.total} crédito${balance.total > 1 ? 's' : ''} restante${balance.total > 1 ? 's' : ''}`
            : `No ritmo atual, seus créditos acabam em ${projectedDaysLeft} dias`}
      </span>
      {onBuyCredits && (
        <Button size="sm" variant={isZero ? 'destructive' : 'outline'} onClick={onBuyCredits}>
          Comprar
        </Button>
      )}
    </div>
  );
}
