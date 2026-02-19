import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, MessageCircle, Sparkles, CheckCircle2, Star } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PlanOption {
  id: string;
  name: string;
  description: string | null;
  upsell_price_label: string | null;
  upsell_hotmart_url: string | null;
  upsell_button_text: string | null;
  upsell_badge_text: string | null;
  upsell_features: string[] | null;
  initial_credits: number | null;
  monthly_credits: number | null;
  has_monthly_renewal: boolean | null;
  display_order: number | null;
  color: string | null;
  icon: string | null;
}

export default function AccessDenied() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('plan_types')
        .select('id, name, description, upsell_price_label, upsell_hotmart_url, upsell_button_text, upsell_badge_text, upsell_features, initial_credits, monthly_credits, has_monthly_renewal, display_order, color, icon')
        .eq('is_active', true)
        .eq('show_as_upsell', true)
        .order('display_order', { ascending: true });

      if (data) {
        setPlans(data.map(p => ({
          ...p,
          upsell_features: Array.isArray(p.upsell_features) ? p.upsell_features as string[] : [],
        })));
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const handleSupport = () => {
    window.open('https://wa.me/5511999999999?text=Olá! Preciso de ajuda para acessar o Magnetic.IA.', '_blank');
  };

  const handlePlanCheckout = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-6 py-12">
      <div className="w-full max-w-xl space-y-10 animate-fade-in">

        {/* Header */}
        <div className="text-center space-y-6">
          <Logo size="lg" className="justify-center" />

          <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Acesso não autorizado</h1>
            <p className="text-muted-foreground">
              Você ainda não possui acesso à plataforma Magnetic.IA.
            </p>
            <p className="text-sm text-muted-foreground">
              Se você já é aluno, entre em contato com o suporte.
            </p>
          </div>
        </div>

        {/* Plans */}
        {!loading && plans.length > 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Adquira seu acesso</p>
              <h2 className="text-xl font-bold text-foreground">Escolha seu plano</h2>
            </div>

            <div className={cn('grid gap-4', plans.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
              {plans.map((plan, index) => {
                const isFeatured = index === plans.length - 1 && plans.length > 1;
                const features = plan.upsell_features ?? [];

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative rounded-2xl border p-5 flex flex-col gap-4 transition-all',
                      isFeatured
                        ? 'border-primary/50 bg-primary/5 shadow-lg'
                        : 'border-border bg-muted/30'
                    )}
                  >
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
                      {plan.description && (
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      )}
                    </div>

                    {plan.upsell_price_label && (
                      <p className="text-2xl font-bold text-foreground">{plan.upsell_price_label}</p>
                    )}

                    {features.length > 0 && (
                      <ul className="space-y-1.5 flex-1">
                        {features.map((feat: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            {feat}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      onClick={() => plan.upsell_hotmart_url && handlePlanCheckout(plan.upsell_hotmart_url)}
                      disabled={!plan.upsell_hotmart_url}
                      className={cn(
                        'w-full gap-2 font-semibold',
                        isFeatured
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                      )}
                    >
                      <Sparkles className="w-4 h-4" />
                      {plan.upsell_button_text || 'Quero este plano'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Secondary actions */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            className="w-full h-12 gap-2 border-border text-foreground hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4" />
            Já sou aluno — tentar outro email
          </Button>

          <Button
            variant="ghost"
            onClick={handleSupport}
            className="w-full h-12 gap-2 text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com suporte
          </Button>
        </div>

      </div>
    </div>
  );
}
