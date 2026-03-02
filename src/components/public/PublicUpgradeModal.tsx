import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, Star, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface PlanOption {
  id: string;
  name: string;
  description: string | null;
  upsell_price_label: string | null;
  upsell_hotmart_url: string | null;
  upsell_button_text: string | null;
  upsell_badge_text: string | null;
  upsell_features: string[] | null;
  icon: string | null;
}

interface PublicUpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function PublicUpgradeModal({ open, onClose }: PublicUpgradeModalProps) {
  const [plans, setPlans] = useState<PlanOption[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('plan_types')
      .select('id, name, description, upsell_price_label, upsell_hotmart_url, upsell_button_text, upsell_badge_text, upsell_features, icon')
      .eq('is_active', true)
      .eq('show_as_upsell', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) setPlans(data.map(p => ({ ...p, upsell_features: Array.isArray(p.upsell_features) ? p.upsell_features as string[] : [] })));
      });
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-card rounded-2xl border border-border p-6 space-y-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">Suas mensagens gratuitas acabaram!</h2>
            <p className="text-sm text-muted-foreground">Faça upgrade para continuar conversando com acesso ilimitado a todos os agentes.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {plans.length > 0 && (
          <div className="grid gap-4">
            {plans.map((plan, index) => {
              const isFeatured = index === plans.length - 1 && plans.length > 1;
              const features = plan.upsell_features ?? [];
              return (
                <div key={plan.id} className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-all ${isFeatured ? 'border-primary/50 bg-primary/5 shadow-lg' : 'border-border bg-muted/30'}`}>
                  {plan.upsell_badge_text && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground whitespace-nowrap">
                      {plan.upsell_badge_text}
                    </span>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {plan.icon && <span className="text-lg">{plan.icon}</span>}
                      {isFeatured && <Star className="w-4 h-4 text-primary fill-primary" />}
                      <h3 className="font-bold text-foreground text-base">{plan.name}</h3>
                    </div>
                    {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                  </div>
                  {plan.upsell_price_label && <p className="text-2xl font-bold text-foreground">{plan.upsell_price_label}</p>}
                  {features.length > 0 && (
                    <ul className="space-y-1.5 flex-1">
                      {features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    onClick={() => plan.upsell_hotmart_url && window.open(plan.upsell_hotmart_url, '_blank', 'noopener,noreferrer')}
                    disabled={!plan.upsell_hotmart_url}
                    className="w-full gap-2 font-semibold bg-primary text-primary-foreground hover:bg-primary/85 hover:scale-[1.03] hover:shadow-[0_0_20px_hsl(61_97%_67%/0.3)] active:scale-[0.98] transition-all duration-200"
                  >
                    <Sparkles className="w-4 h-4" />
                    {plan.upsell_button_text || 'Quero este plano'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Button variant="ghost" onClick={() => { window.location.href = 'https://wa.me/551340427391'; }} className="w-full h-10 gap-2 text-muted-foreground hover:text-foreground">
            <MessageCircle className="w-4 h-4" />
            Falar com suporte
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full h-10 text-muted-foreground">
            Voltar amanhã
          </Button>
        </div>
      </div>
    </div>
  );
}
