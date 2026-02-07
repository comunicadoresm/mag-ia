import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCycleProgress } from '@/hooks/useCycleProgress';
import { cn } from '@/lib/utils';

export function CycleProgressBar() {
  const { percentUsed, totalConsumed, totalMonthly, projectedDaysLeft, remaining } = useCycleProgress();

  const getColor = () => {
    if (percentUsed > 80) return 'text-destructive';
    if (percentUsed > 50) return 'text-warning';
    return 'text-success';
  };

  return (
    <Card className="card-cm">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Progresso do Ciclo</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex items-end justify-between">
          <span className={cn('text-2xl font-bold', getColor())}>{percentUsed}%</span>
          <span className="text-xs text-muted-foreground">
            {totalConsumed} / {totalMonthly} usados
          </span>
        </div>

        <Progress value={percentUsed} className="h-2" />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{remaining} créditos restantes</span>
          {projectedDaysLeft !== null && (
            <span>
              Projeção: ~{projectedDaysLeft} {projectedDaysLeft === 1 ? 'dia' : 'dias'}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
