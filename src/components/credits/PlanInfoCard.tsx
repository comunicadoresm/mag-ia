import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';

interface ActiveSubscription {
  tier: string;
  credits_per_month: number;
  price_brl: number;
  status: string;
}

const PLAN_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  magnetic: { label: 'Magnético', color: 'bg-primary text-primary-foreground', icon: <Crown className="w-4 h-4" /> },
  basic: { label: 'Básico', color: 'bg-muted text-muted-foreground', icon: <Sparkles className="w-4 h-4" /> },
  none: { label: 'Sem plano', color: 'bg-muted text-muted-foreground', icon: <Package className="w-4 h-4" /> },
};

const TIER_LABELS: Record<string, string> = {
  plus_20: '+20 créditos/mês',
  plus_50: '+50 créditos/mês',
  plus_100: '+100 créditos/mês',
};

export function PlanInfoCard() {
  const { user } = useAuth();
  const { planType } = useCredits();
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('credit_subscriptions')
      .select('tier, credits_per_month, price_brl, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .then(({ data }) => {
        if (data) setSubscriptions(data as ActiveSubscription[]);
      });
  }, [user]);

  const plan = PLAN_LABELS[planType || 'none'] || PLAN_LABELS.none;

  return (
    <Card className="card-cm">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Seu Plano</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Base plan */}
        <div className="flex items-center gap-2">
          <Badge className={`${plan.color} gap-1.5 text-xs px-2.5 py-1`}>
            {plan.icon}
            {plan.label}
          </Badge>
        </div>

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
