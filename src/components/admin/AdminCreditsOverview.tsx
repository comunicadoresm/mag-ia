import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingDown, Users, Coins, AlertTriangle } from 'lucide-react';
import { CreditMetricCard } from '@/components/credits/CreditMetricCard';

interface OverviewData {
  totalConsumedToday: number;
  totalConsumedWeek: number;
  totalConsumedMonth: number;
  usersWithZero: number;
  topUsers: { email: string; consumed: number }[];
}

export function AdminCreditsOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Fetch consumption transactions
        const { data: txs } = await supabase
          .from('credit_transactions')
          .select('user_id, amount, created_at')
          .eq('type', 'consumption')
          .gte('created_at', monthStart)
          .order('created_at', { ascending: false });

        const allTxs = txs || [];
        const todayTxs = allTxs.filter(t => t.created_at! >= todayStart);
        const weekTxs = allTxs.filter(t => t.created_at! >= weekStart);

        const sum = (arr: typeof allTxs) => arr.reduce((s, t) => s + Math.abs(t.amount), 0);

        // Users with zero credits
        const { data: credits } = await supabase.from('user_credits').select('user_id, plan_credits, subscription_credits, bonus_credits');
        const zeroUsers = (credits || []).filter(c => (c.plan_credits || 0) + (c.subscription_credits || 0) + (c.bonus_credits || 0) === 0);

        // Top users by consumption
        const userConsumption: Record<string, number> = {};
        allTxs.forEach(t => {
          userConsumption[t.user_id] = (userConsumption[t.user_id] || 0) + Math.abs(t.amount);
        });

        const topUserIds = Object.entries(userConsumption)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10);

        let topUsers: { email: string; consumed: number }[] = [];
        if (topUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', topUserIds.map(([id]) => id));

          const profileMap = new Map((profiles || []).map(p => [p.id, p.email]));
          topUsers = topUserIds.map(([id, consumed]) => ({
            email: profileMap.get(id) || id,
            consumed,
          }));
        }

        setData({
          totalConsumedToday: sum(todayTxs),
          totalConsumedWeek: sum(weekTxs),
          totalConsumedMonth: sum(allTxs),
          usersWithZero: zeroUsers.length,
          topUsers,
        });
      } catch (err) {
        console.error('Error fetching overview:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CreditMetricCard title="Consumo Hoje" value={data.totalConsumedToday} icon={<TrendingDown className="w-5 h-5" />} />
        <CreditMetricCard title="Consumo Semana" value={data.totalConsumedWeek} icon={<TrendingDown className="w-5 h-5" />} />
        <CreditMetricCard title="Consumo Mês" value={data.totalConsumedMonth} icon={<Coins className="w-5 h-5" />} />
        <CreditMetricCard title="Sem Créditos" value={data.usersWithZero} icon={<AlertTriangle className="w-5 h-5" />} variant={data.usersWithZero > 0 ? 'warning' : 'default'} />
      </div>

      {/* Top users */}
      <div className="card-cm p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Top 10 — Maior consumo (mês)
        </h3>
        {data.topUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum consumo registrado este mês.</p>
        ) : (
          <div className="space-y-2">
            {data.topUsers.map((u, i) => (
              <div key={u.email} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <span className="text-foreground truncate max-w-[200px]">{u.email}</span>
                </div>
                <span className="font-mono font-medium text-foreground">{u.consumed} créditos</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
