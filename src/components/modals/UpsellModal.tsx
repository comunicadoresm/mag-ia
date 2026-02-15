import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, ShoppingCart, Crown, Loader2 } from 'lucide-react';
import { useHotmartCheckout } from '@/hooks/useHotmartCheckout';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';
import { supabase } from '@/integrations/supabase/client';

interface UpsellPlanData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  upsell_price_label: string | null;
  upsell_badge_text: string | null;
  upsell_button_text: string;
  upsell_hotmart_url: string | null;
  upsell_features: string[];
  color: string;
  display_order: number;
}

interface UpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuyCredits?: () => void;
}

export function UpsellModal({ open, onOpenChange, onBuyCredits }: UpsellModalProps) {
  const { openCheckout } = useHotmartCheckout();
  const { upsellPlans, canBuyCredits, userPlan } = usePlanPermissions();
  const [plans, setPlans] = useState<UpsellPlanData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const fetchPlans = async () => {
      setLoading(true);
      const currentOrder = userPlan?.display_order ?? 0;
      const { data } = await supabase
        .from('plan_types')
        .select('id, slug, name, description, upsell_price_label, upsell_badge_text, upsell_button_text, upsell_hotmart_url, upsell_features, color, display_order')
        .eq('is_active', true)
        .eq('show_as_upsell', true)
        .gt('display_order', currentOrder)
        .order('display_order');
      if (data) setPlans(data.map(p => ({ ...p, upsell_features: Array.isArray(p.upsell_features) ? p.upsell_features as string[] : [] })));
      setLoading(false);
    };
    fetchPlans();
  }, [open, userPlan]);

  const isMaxPlan = plans.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {isMaxPlan ? 'Seus créditos acabaram!' : 'Faça upgrade do seu plano!'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isMaxPlan
              ? 'Compre mais créditos para continuar usando a IA'
              : 'Desbloqueie mais recursos e créditos'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3 mt-4">
            {/* Show upsell plans */}
            {plans.map(plan => (
              <div key={plan.id} className="card-cm p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${plan.color}20` }}>
                    <Crown className="w-5 h-5" style={{ color: plan.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{plan.name}</h4>
                      {plan.upsell_badge_text && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: plan.color }}>
                          {plan.upsell_badge_text}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                  {plan.upsell_price_label && (
                    <div className="text-right">
                      <span className="text-lg font-bold" style={{ color: plan.color }}>{plan.upsell_price_label}</span>
                    </div>
                  )}
                </div>
                {plan.upsell_features.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1 ml-13">
                    {plan.upsell_features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3" style={{ color: plan.color }} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  className="w-full btn-cm-primary"
                  onClick={() => plan.upsell_hotmart_url && openCheckout(plan.upsell_hotmart_url)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {plan.upsell_button_text}
                </Button>
              </div>
            ))}

            {/* Buy credits option */}
            {canBuyCredits && (
              <div className="card-cm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Comprar Créditos</h4>
                      <p className="text-xs text-muted-foreground">Pacotes avulsos ou assinatura mensal</p>
                    </div>
                  </div>
                  <Button variant="default" size="sm" onClick={() => { onOpenChange(false); onBuyCredits?.(); }}>
                    Ver opções
                  </Button>
                </div>
              </div>
            )}

            {!canBuyCredits && plans.length === 0 && (
              <p className="text-xs text-center text-muted-foreground px-4">
                Faça upgrade para ter acesso a créditos mensais e pacotes avulsos.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
