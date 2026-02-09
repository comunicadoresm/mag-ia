import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreditHistory } from '@/hooks/useCreditHistory';
import { supabase } from '@/integrations/supabase/client';

export function UsageByFeatureChart() {
  const { transactions } = useCreditHistory(100);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  // Group consumption by agent_id from metadata
  const consumptionTxs = transactions.filter(t => t.type === 'consumption');

  // Collect unique agent IDs
  const agentIds = [...new Set(
    consumptionTxs
      .map(t => (t.metadata as any)?.agent_id)
      .filter(Boolean)
  )];

  useEffect(() => {
    if (agentIds.length === 0) return;
    const fetchAgentNames = async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, name')
        .in('id', agentIds);
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(a => { map[a.id] = a.name; });
        setAgentNames(map);
      }
    };
    fetchAgentNames();
  }, [agentIds.join(',')]);

  // Group by agent
  const usageByAgent: Record<string, number> = {};
  let unknownUsage = 0;

  consumptionTxs.forEach(t => {
    const agentId = (t.metadata as any)?.agent_id;
    if (agentId) {
      usageByAgent[agentId] = (usageByAgent[agentId] || 0) + Math.abs(t.amount);
    } else {
      unknownUsage += Math.abs(t.amount);
    }
  });

  const totalConsumed = consumptionTxs.reduce((s, t) => s + Math.abs(t.amount), 0);

  const entries = Object.entries(usageByAgent).sort((a, b) => b[1] - a[1]);

  const colors = [
    'bg-primary', 'bg-success', 'bg-warning', 'bg-[hsl(270,60%,60%)]', 
    'bg-[hsl(200,70%,50%)]', 'bg-destructive',
  ];

  if (entries.length === 0 && unknownUsage === 0) {
    return (
      <Card className="card-cm">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Uso por Agente</CardTitle>
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
        <CardTitle className="text-sm font-medium text-muted-foreground">Uso por Agente</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {entries.map(([agentId, value], i) => {
          const pct = totalConsumed > 0 ? Math.round((value / totalConsumed) * 100) : 0;
          const name = agentNames[agentId] || 'Carregando...';
          return (
            <div key={agentId} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground truncate">{name}</span>
                <span className="text-muted-foreground shrink-0 ml-2">{value} créd. ({pct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${colors[i % colors.length]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {unknownUsage > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-foreground">Outros</span>
              <span className="text-muted-foreground">
                {unknownUsage} créd. ({totalConsumed > 0 ? Math.round((unknownUsage / totalConsumed) * 100) : 0}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-muted-foreground/40 transition-all"
                style={{ width: `${totalConsumed > 0 ? Math.round((unknownUsage / totalConsumed) * 100) : 0}%` }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
