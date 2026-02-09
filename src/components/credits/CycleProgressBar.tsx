import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCycleProgress } from '@/hooks/useCycleProgress';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';
import { CalendarClock } from 'lucide-react';

export function CycleProgressBar() {
  const { percentUsed, totalConsumed, totalMonthly, projectedDaysLeft, remaining } = useCycleProgress();
  const { cycleEndDate, planType } = useCredits();

  const getColor = () => {
    if (percentUsed > 80) return 'text-destructive';
    if (percentUsed > 50) return 'text-warning';
    return 'text-success';
  };

  // Calculate days until renewal
  const getDaysUntilRenewal = () => {
    if (!cycleEndDate) return null;
    const end = new Date(cycleEndDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysUntilRenewal = getDaysUntilRenewal();
  const isMagnetic = planType === 'magnetic';

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

        {/* Renewal info */}
        {daysUntilRenewal !== null && (
          <div className="flex items-center gap-2 pt-1 border-t border-border text-xs">
            <CalendarClock className="w-3.5 h-3.5 text-primary" />
            {isMagnetic ? (
              <span className="text-muted-foreground">
                Renovação em <span className="text-foreground font-medium">{daysUntilRenewal} {daysUntilRenewal === 1 ? 'dia' : 'dias'}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                {daysUntilRenewal > 0
                  ? <>Créditos trial expiram em <span className="text-foreground font-medium">{daysUntilRenewal} dias</span></>
                  : <span className="text-destructive font-medium">Créditos trial expirados</span>
                }
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
