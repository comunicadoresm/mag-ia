import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCredits } from '@/hooks/useCredits';
import { AlertTriangle } from 'lucide-react';

export function CreditCompositionChart() {
  const { balance, cycleEndDate } = useCredits();
  const total = balance.plan + balance.subscription + balance.bonus;

  // Check plan_credits expiration
  let planExpireDays: number | null = null;
  if (cycleEndDate) {
    const diff = Math.ceil((new Date(cycleEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    planExpireDays = diff > 0 ? diff : 0;
  }

  const segments = [
    { label: 'Créditos do plano', value: balance.plan, color: 'bg-primary' },
    { label: 'Créditos de assinatura', value: balance.subscription, color: 'bg-success' },
    { label: 'Créditos avulsos', value: balance.bonus, color: 'bg-[hsl(270,60%,60%)]' },
  ];

  return (
    <Card className="card-cm">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Composição do Saldo</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Stacked bar */}
        <div className="h-4 rounded-full overflow-hidden bg-muted flex">
          {segments.map((seg) =>
            seg.value > 0 ? (
              <div
                key={seg.label}
                className={`${seg.color} h-full transition-all`}
                style={{ width: `${total > 0 ? (seg.value / total) * 100 : 0}%` }}
              />
            ) : null
          )}
        </div>

        {/* Legend */}
        <div className="space-y-1.5">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
                <span className="text-muted-foreground">{seg.label}</span>
              </div>
              <span className="font-medium text-foreground">{seg.value}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between text-xs border-t border-border pt-2">
          <span className="font-medium text-foreground">Total</span>
          <span className="font-bold text-foreground">{total}</span>
        </div>

        {/* Low balance alert */}
        {total > 0 && total <= 5 && (
          <div className="flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Saldo baixo — considere comprar mais créditos</span>
          </div>
        )}

        {/* Expiration indicator for plan credits */}
        {balance.plan > 0 && planExpireDays !== null && planExpireDays <= 7 && (
          <p className="text-xs text-warning">
            Créditos do plano expiram em {planExpireDays} {planExpireDays === 1 ? 'dia' : 'dias'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
