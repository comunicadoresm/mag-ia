import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Crown, Star, UserX, CreditCard, ShoppingCart, TrendingUp } from 'lucide-react';
import { CreditMetricCard } from '@/components/credits/CreditMetricCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface MonthOption {
  label: string;
  value: string; // YYYY-MM
  start: string;
  end: string;
}

function getMonthOptions(count = 12): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const value = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 1).toISOString();
    options.push({ label, value, start, end });
  }
  return options;
}

const PLAN_COLORS: Record<string, string> = {
  magnetic: 'hsl(var(--primary))',
  basic: '#3b82f6',
  none: 'hsl(var(--muted-foreground))',
};

const PLAN_LABELS: Record<string, string> = {
  magnetic: 'Magnético',
  basic: 'Básico',
  none: 'Nenhum',
};

export function AdminMetricsDashboard() {
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [loading, setLoading] = useState(true);

  const [planCounts, setPlanCounts] = useState<Record<string, number>>({ none: 0, basic: 0, magnetic: 0 });
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [purchaseCredits, setPurchaseCredits] = useState(0);
  const [subscriptionRevenue, setSubscriptionRevenue] = useState(0);
  const [purchaseRevenue, setPurchaseRevenue] = useState(0);
  const [subscriptionTiers, setSubscriptionTiers] = useState<{ name: string; count: number }[]>([]);
  const [purchasePackages, setPurchasePackages] = useState<{ name: string; count: number; credits: number }[]>([]);

  const selected = monthOptions.find(m => m.value === selectedMonth)!;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Members per plan (current snapshot)
        const { data: profiles } = await supabase.from('profiles').select('plan_type');
        const counts: Record<string, number> = { none: 0, basic: 0, magnetic: 0 };
        (profiles || []).forEach(p => {
          const plan = p.plan_type || 'none';
          counts[plan] = (counts[plan] || 0) + 1;
        });
        setPlanCounts(counts);

        // 2. Active subscriptions created in the selected month
        const { data: subs } = await supabase
          .from('credit_subscriptions')
          .select('tier, price_brl')
          .gte('created_at', selected.start)
          .lt('created_at', selected.end);

        const subsArr = subs || [];
        setSubscriptionCount(subsArr.length);
        setSubscriptionRevenue(subsArr.reduce((s, sub) => s + Number(sub.price_brl), 0));

        const tierMap: Record<string, number> = {};
        subsArr.forEach(s => { tierMap[s.tier] = (tierMap[s.tier] || 0) + 1; });
        setSubscriptionTiers(Object.entries(tierMap).map(([name, count]) => ({ name, count })));

        // 3. Purchases in the selected month
        const { data: purchases } = await supabase
          .from('credit_purchases')
          .select('package, credits, price_brl, payment_status')
          .eq('payment_status', 'completed')
          .gte('created_at', selected.start)
          .lt('created_at', selected.end);

        const purchArr = purchases || [];
        setPurchaseCount(purchArr.length);
        setPurchaseCredits(purchArr.reduce((s, p) => s + p.credits, 0));
        setPurchaseRevenue(purchArr.reduce((s, p) => s + Number(p.price_brl), 0));

        const pkgMap: Record<string, { count: number; credits: number }> = {};
        purchArr.forEach(p => {
          if (!pkgMap[p.package]) pkgMap[p.package] = { count: 0, credits: 0 };
          pkgMap[p.package].count++;
          pkgMap[p.package].credits += p.credits;
        });
        setPurchasePackages(Object.entries(pkgMap).map(([name, v]) => ({ name, ...v })));
      } catch (err) {
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  const totalMembers = Object.values(planCounts).reduce((a, b) => a + b, 0);
  const planPieData = Object.entries(planCounts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: PLAN_LABELS[key] || key, value, fill: PLAN_COLORS[key] || '#888' }));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Painel de Acompanhamento</h2>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => (
              <SelectItem key={m.value} value={m.value} className="capitalize">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CreditMetricCard title="Total de Membros" value={totalMembers} icon={<Users className="w-5 h-5" />} />
        <CreditMetricCard title="Magnético" value={planCounts.magnetic || 0} icon={<Crown className="w-5 h-5" />} />
        <CreditMetricCard title="Básico" value={planCounts.basic || 0} icon={<Star className="w-5 h-5" />} />
        <CreditMetricCard title="Sem Plano" value={planCounts.none || 0} icon={<UserX className="w-5 h-5" />} />
      </div>

      {/* Plan distribution pie chart + revenue cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição de Planos</h3>
          {planPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={planPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {planPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Assinaturas de Créditos (mês)
            </h3>
            <div className="text-2xl font-bold text-foreground">{subscriptionCount}</div>
            <p className="text-xs text-muted-foreground">
              Receita: R$ {subscriptionRevenue.toFixed(2)}
            </p>
            {subscriptionTiers.length > 0 && (
              <div className="mt-3 space-y-1">
                {subscriptionTiers.map(t => (
                  <div key={t.name} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.name}</span>
                    <span className="font-medium text-foreground">{t.count} assinatura(s)</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Compras Avulsas (mês)
            </h3>
            <div className="text-2xl font-bold text-foreground">{purchaseCount}</div>
            <p className="text-xs text-muted-foreground">
              {purchaseCredits} créditos · R$ {purchaseRevenue.toFixed(2)}
            </p>
            {purchasePackages.length > 0 && (
              <div className="mt-3 space-y-1">
                {purchasePackages.map(p => (
                  <div key={p.name} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="font-medium text-foreground">{p.count}x ({p.credits} cred.)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
