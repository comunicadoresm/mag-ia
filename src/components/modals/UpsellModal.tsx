import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, ShoppingCart, Crown } from 'lucide-react';
import { useHotmartCheckout } from '@/hooks/useHotmartCheckout';

interface UpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuyCredits?: () => void;
}

// Hotmart checkout URL for the Magnetic plan
const HOTMART_MAGNETIC_URL = 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon';

export function UpsellModal({ open, onOpenChange, onBuyCredits }: UpsellModalProps) {
  const { openCheckout } = useHotmartCheckout();

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
            Escolha uma opção para continuar usando a IA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* Option 1: Upgrade to Magnetic */}
          <div className="card-cm p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">Plano Magnético</h4>
                <p className="text-xs text-muted-foreground">IA completa + 30 créditos/mês</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-primary">R$197</span>
                <span className="text-xs text-muted-foreground">/ano</span>
              </div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-13">
              <li className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-primary" />
                Agentes de IA ilimitados
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-primary" />
                30 créditos que renovam todo mês
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-primary" />
                Histórico completo de conversas
              </li>
            </ul>
            <Button
              className="w-full btn-cm-primary"
              onClick={() => openCheckout(HOTMART_MAGNETIC_URL)}
            >
              <Crown className="w-4 h-4 mr-2" />
              Fazer Upgrade — R$197/ano
            </Button>
          </div>

          {/* Option 2: Buy credits */}
          <div className="card-cm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Créditos Avulsos</h4>
                  <p className="text-xs text-muted-foreground">A partir de R$19,90</p>
                </div>
              </div>
              <Button
                variant="outline"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
