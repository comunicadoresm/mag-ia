import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, ShoppingCart, Crown, Loader2 } from 'lucide-react';
import { useHotmartCheckout } from '@/hooks/useHotmartCheckout';
import { useUpsellPlans } from '@/hooks/useUpsellPlans';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';

interface UpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuyCredits?: () => void;
}

export function UpsellModal({ open, onOpenChange, onBuyCredits }: UpsellModalProps) {
  const { openCheckout } = useHotmartCheckout();
  const { magnetic, loading } = useUpsellPlans();
  const { planType } = usePlanPermissions();

  const isMagnetic = planType === 'magnetic';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Seus créditos acabaram!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isMagnetic
              ? 'Compre mais créditos para continuar usando a IA'
              : 'Faça upgrade para o plano Magnético e libere a IA completa'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3 mt-4">
            {/* For BASIC users: show only magnetic upgrade */}
            {!isMagnetic && magnetic && (
              <div className="card-cm p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{magnetic.name}</h4>
                    <p className="text-xs text-muted-foreground">{magnetic.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">
                      R${Number(magnetic.price_brl).toFixed(0).replace('.', ',')}
                    </span>
                    <span className="text-xs text-muted-foreground">{magnetic.price_label}</span>
                  </div>
                </div>
                {magnetic.features.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1 ml-13">
                    {magnetic.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-primary" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  className="w-full btn-cm-primary"
                  onClick={() => openCheckout(magnetic.hotmart_url)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {magnetic.button_text}
                </Button>
              </div>
            )}

            {/* For MAGNETIC users: show buy credits option */}
            {isMagnetic && (
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
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onBuyCredits?.();
                    }}
                  >
                    Ver opções
                  </Button>
                </div>
              </div>
            )}

            {/* For BASIC users: NO credit purchase option, only magnetic upgrade */}
            {!isMagnetic && (
              <p className="text-xs text-center text-muted-foreground px-4">
                Faça upgrade para o plano Magnético para ter acesso a créditos mensais e pacotes avulsos.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
