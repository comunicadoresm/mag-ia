import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreditHistory } from '@/hooks/useCreditHistory';
import { supabase } from '@/integrations/supabase/client';

const SOURCE_LABELS: Record<string, string> = {
  script_generation: 'Geração de roteiros',
  script_adjustment: 'Ajustes de roteiros',
  chat_messages: 'Chat com agentes',
};

export function UsageByFeatureChart() {
  const { transactions } = useCreditHistory(100);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  // Filter consumption only, exclude admin_adjustment
  const consumptionTxs = transactions.filter(t => t.type === 'consumption' && t.source !== 'admin_adjustment');

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

  // Group by source (feature)
  const usageBySource: Record<string, number> = {};
  consumptionTxs.forEach(t => {
    const key = t.source || 'other';
    usageBySource[key] = (usageBySource[key] || 0) + Math.abs(t.amount);
  });

  // Group by agent
  const usageByAgent: Record<string, number> = {};
  consumptionTxs.forEach(t => {
    const agentId = (t.metadata as any)?.agent_id;
    if (agentId) {
      usageByAgent[agentId] = (usageByAgent[agentId] || 0) + Math.abs(t.amount);
    }
  });

  const totalConsumed = consumptionTxs.reduce((s, t) => s + Math.abs(t.amount), 0);

  const sourceEntries = Object.entries(usageBySource).sort((a, b) => b[1] - a[1]);
  const agentEntries = Object.entries(usageByAgent).sort((a, b) => b[1] - a[1]);

  const sourceColors = ['bg-primary', 'bg-success', 'bg-warning', 'bg-destructive'];
  const agentColors = ['bg-[hsl(270,60%,60%)]', 'bg-[hsl(200,70%,50%)]', 'bg-primary', 'bg-success', 'bg-warning'];

  if (totalConsumed === 0) {
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
      <CardContent className="p-4 pt-0 space-y-4">
        {/* By feature/source */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Por tipo de ação</p>
          {sourceEntries.map(([source, value], i) => {
            const pct = totalConsumed > 0 ? Math.round((value / totalConsumed) * 100) : 0;
            const label = SOURCE_LABELS[source] || source;
            return (
              <div key={source} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground truncate">{label}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">{value} créd. ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${sourceColors[i % sourceColors.length]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* By agent */}
        {agentEntries.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground font-medium">Por agente</p>
            {agentEntries.slice(0, 5).map(([agentId, value], i) => {
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
                      className={`h-full rounded-full transition-all ${agentColors[i % agentColors.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
