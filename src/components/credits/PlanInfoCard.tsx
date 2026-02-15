import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlanTypeInfo {
  name: string;
  color: string;
  has_monthly_renewal: boolean;
  monthly_credits: number;
  initial_credits: number;
  credits_expire_days: number | null;
}

interface ActiveSubscription {
  tier: string;
  credits_per_month: number;
  price_brl: number;
  status: string;
}

const TIER_LABELS: Record<string, string> = {
  plus_20: '+20 créditos/mês',
  plus_50: '+50 créditos/mês',
  plus_100: '+100 créditos/mês',
};

export function PlanInfoCard() {
  const { user, profile } = useAuth();
  const { planType, cycleEndDate } = useCredits();
  const [planInfo, setPlanInfo] = useState<PlanTypeInfo | null>(null);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch plan info from plan_types
      const planTypeId = (profile as any)?.plan_type_id;
      if (planTypeId) {
        const { data } = await supabase
          .from('plan_types')
          .select('name, color, has_monthly_renewal, monthly_credits, initial_credits, credits_expire_days')
          .eq('id', planTypeId)
          .single();
        if (data) setPlanInfo(data as PlanTypeInfo);
      } else if (planType) {
        const { data } = await supabase
          .from('plan_types')
          .select('name, color, has_monthly_renewal, monthly_credits, initial_credits, credits_expire_days')
          .eq('slug', planType)
          .single();
        if (data) setPlanInfo(data as PlanTypeInfo);
      }

      // Fetch subscriptions
      const { data: subs } = await supabase
        .from('credit_subscriptions')
        .select('tier, credits_per_month, price_brl, status')
        .eq('user_id', user.id)
        .eq('status', 'active');
      if (subs) setSubscriptions(subs as ActiveSubscription[]);
    };

    fetchData();
  }, [user, profile, planType]);

  const planName = planInfo?.name || (planType === 'magnetic' ? 'Magnético' : planType === 'basic' ? 'Básico' : 'Sem plano');
  const planColor = planInfo?.color || '#6366f1';
  const planIcon = planType === 'magnetic' ? <Crown className="w-4 h-4" /> : planType === 'basic' ? <Sparkles className="w-4 h-4" /> : <Package className="w-4 h-4" />;

  return (
    <Card className="card-cm">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Seu Plano</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Base plan */}
        <div className="flex items-center gap-2">
          <Badge
            className="gap-1.5 text-xs px-2.5 py-1"
            style={{ backgroundColor: planColor, color: '#fff' }}
          >
            {planIcon}
            {planName}
          </Badge>
        </div>

        {/* Plan details */}
        {profile?.plan_activated_at && (
          <p className="text-xs text-muted-foreground">
            Ativado em {format(new Date(profile.plan_activated_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
          </p>
        )}

        {/* Renewal / Expiration info */}
        {planInfo?.has_monthly_renewal && cycleEndDate && (
          <p className="text-xs text-muted-foreground">
            Próxima renovação: <span className="text-foreground font-medium">
              {format(new Date(cycleEndDate), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </p>
        )}

        {!planInfo?.has_monthly_renewal && planInfo?.credits_expire_days && (
          <p className="text-xs text-warning font-medium">
            Créditos trial — não renovam automaticamente
          </p>
        )}

        {/* Active subscriptions */}
        {subscriptions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Planos adicionais ativos</p>
            {subscriptions.map((sub, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-foreground">
                  {TIER_LABELS[sub.tier] || sub.tier}
                </span>
                <span className="text-xs text-muted-foreground">
                  R${sub.price_brl.toFixed(2).replace('.', ',')}/mês
                </span>
              </div>
            ))}
          </div>
        )}

        {subscriptions.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum plano adicional contratado</p>
        )}
      </CardContent>
    </Card>
  );
}
