import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCredits } from '@/hooks/useCredits';

export function CreditCompositionChart() {
  const { balance } = useCredits();
  const total = balance.plan + balance.subscription + balance.bonus;

  const segments = [
    { label: 'Plano Base', value: balance.plan, color: 'bg-primary' },
    { label: 'Assinatura Extra', value: balance.subscription, color: 'bg-success' },
    { label: 'Pacote Avulso', value: balance.bonus, color: 'bg-[hsl(270,60%,60%)]' },
  ];

  return (
    <Card className="card-cm">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Composição do Limite</CardTitle>
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
      </CardContent>
    </Card>
  );
}
