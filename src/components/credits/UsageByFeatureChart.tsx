import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCycleProgress } from '@/hooks/useCycleProgress';

const featureLabels: Record<string, string> = {
  script_generation: 'Geração de Roteiro',
  script_adjustment: 'Ajuste de Roteiro',
  chat_messages: 'Chat com Agente',
};

const featureColors: Record<string, string> = {
  script_generation: 'bg-primary',
  script_adjustment: 'bg-warning',
  chat_messages: 'bg-success',
};

export function UsageByFeatureChart() {
  const { usageByFeature, totalConsumed } = useCycleProgress();

  const entries = Object.entries(usageByFeature).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <Card className="card-cm">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Uso por Funcionalidade</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum consumo registrado ainda.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-cm">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Uso por Funcionalidade</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {entries.map(([key, value]) => {
          const pct = totalConsumed > 0 ? Math.round((value / totalConsumed) * 100) : 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground">{featureLabels[key] || key}</span>
                <span className="text-muted-foreground">{value} créditos ({pct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${featureColors[key] || 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
