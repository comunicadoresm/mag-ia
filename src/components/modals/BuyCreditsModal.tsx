import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Coins, Star, Zap, Check } from 'lucide-react';
import { useHotmartCheckout } from '@/hooks/useHotmartCheckout';

interface BuyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasActiveSubscription?: boolean;
}

// TODO: Replace with real Hotmart URLs for each product
const subscriptions = [
  { tier: 'plus_20', credits: 20, price: 27, perCredit: '1,35', popular: false, hotmartUrl: 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon' },
  { tier: 'plus_50', credits: 50, price: 47, perCredit: '0,94', popular: true, hotmartUrl: 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon' },
  { tier: 'plus_100', credits: 100, price: 77, perCredit: '0,77', popular: false, hotmartUrl: 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon' },
];

const packages = [
  { id: 'avulso_10', credits: 10, price: 19.9, perCredit: '1,99', popular: false, hotmartUrl: 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon' },
  { id: 'avulso_25', credits: 25, price: 39.9, perCredit: '1,60', popular: true, hotmartUrl: 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon' },
  { id: 'avulso_40', credits: 40, price: 59.9, perCredit: '1,50', popular: false, hotmartUrl: 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon' },
];

export function BuyCreditsModal({ open, onOpenChange, hasActiveSubscription }: BuyCreditsModalProps) {
  const [selectedTab, setSelectedTab] = useState('subscriptions');
  const { openCheckout } = useHotmartCheckout();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Coins className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Comprar Créditos
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Escolha a melhor opção para você
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="subscriptions">Assinaturas Mensais</TabsTrigger>
            <TabsTrigger value="packages">Pacotes Avulsos</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-3 mt-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.tier}
                className={`card-cm p-4 relative ${sub.popular ? 'border-primary/60' : ''}`}
              >
                {sub.popular && (
                  <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px]">
                    <Star className="w-3 h-3 mr-1" /> Mais popular
                  </Badge>
                )}
                {sub.tier === 'plus_100' && (
                  <Badge variant="outline" className="absolute -top-2.5 right-4 border-primary text-primary text-[10px]">
                    Melhor custo
                  </Badge>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        +{sub.credits} créditos<span className="text-muted-foreground font-normal">/mês</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">R${sub.perCredit}/crédito</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">R${sub.price}</div>
                    <div className="text-xs text-muted-foreground">/mês</div>
                  </div>
                </div>
                <Button
                  className="w-full mt-3 btn-cm-primary"
                  variant={sub.popular ? 'default' : 'outline'}
                  onClick={() => openCheckout(sub.hotmartUrl)}
                >
                  {hasActiveSubscription ? 'Fazer Upgrade' : 'Assinar'}
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="packages" className="space-y-3 mt-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`card-cm p-4 relative ${pkg.popular ? 'border-primary/60' : ''}`}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px]">
                    <Star className="w-3 h-3 mr-1" /> Mais vendido
                  </Badge>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <Coins className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">+{pkg.credits} créditos</h4>
                      <p className="text-xs text-muted-foreground">R${pkg.perCredit}/crédito • Não expiram</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">
                      R${pkg.price.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-xs text-muted-foreground">único</div>
                  </div>
                </div>
                <Button
                  className="w-full mt-3"
                  variant={pkg.popular ? 'default' : 'outline'}
                  onClick={() => openCheckout(pkg.hotmartUrl)}
                >
                  Comprar
                </Button>
              </div>
            ))}

            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 px-1">
              <Check className="w-3.5 h-3.5 text-primary" />
              Créditos avulsos nunca expiram
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
