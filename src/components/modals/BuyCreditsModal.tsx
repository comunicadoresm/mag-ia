import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Coins, Star, Zap, Check, Loader2 } from 'lucide-react';
import { useHotmartCheckout } from '@/hooks/useHotmartCheckout';
import { useUpsellPlans } from '@/hooks/useUpsellPlans';

interface BuyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasActiveSubscription?: boolean;
}

export function BuyCreditsModal({ open, onOpenChange, hasActiveSubscription }: BuyCreditsModalProps) {
  const [selectedTab, setSelectedTab] = useState('subscriptions');
  const { openCheckout } = useHotmartCheckout();
  const { subscriptions, packages, loading } = useUpsellPlans();

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

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="subscriptions">Assinaturas Mensais</TabsTrigger>
              <TabsTrigger value="packages">Pacotes Avulsos</TabsTrigger>
            </TabsList>

            <TabsContent value="subscriptions" className="space-y-3 mt-4">
              {subscriptions.map((sub, idx) => (
                <div
                  key={sub.id}
                  className={`card-cm p-4 relative ${sub.badge_text ? 'border-primary/60' : ''}`}
                >
                  {sub.badge_text && (
                    <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px]">
                      <Star className="w-3 h-3 mr-1" /> {sub.badge_text}
                    </Badge>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {sub.name}
                          {sub.credits_label && <span className="text-muted-foreground font-normal">{sub.credits_label}</span>}
                        </h4>
                        {sub.per_credit_label && (
                          <p className="text-xs text-muted-foreground">{sub.per_credit_label}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        R${Number(sub.price_brl).toFixed(0)}
                      </div>
                      {sub.price_label && (
                        <div className="text-xs text-muted-foreground">{sub.price_label}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full mt-3 btn-cm-primary"
                    variant={sub.badge_text ? 'default' : 'outline'}
                    onClick={() => openCheckout(sub.hotmart_url)}
                  >
                    {hasActiveSubscription ? 'Fazer Upgrade' : sub.button_text}
                  </Button>
                </div>
              ))}
              {subscriptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma assinatura disponível.</p>
              )}
            </TabsContent>

            <TabsContent value="packages" className="space-y-3 mt-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`card-cm p-4 relative ${pkg.badge_text ? 'border-primary/60' : ''}`}
                >
                  {pkg.badge_text && (
                    <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px]">
                      <Star className="w-3 h-3 mr-1" /> {pkg.badge_text}
                    </Badge>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                        <Coins className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{pkg.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {pkg.per_credit_label && `${pkg.per_credit_label} • `}Não expiram
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        R${Number(pkg.price_brl).toFixed(2).replace('.', ',')}
                      </div>
                      {pkg.price_label && (
                        <div className="text-xs text-muted-foreground">{pkg.price_label}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full mt-3"
                    variant={pkg.badge_text ? 'default' : 'outline'}
                    onClick={() => openCheckout(pkg.hotmart_url)}
                  >
                    {pkg.button_text}
                  </Button>
                </div>
              ))}
              {packages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum pacote disponível.</p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 px-1">
                <Check className="w-3.5 h-3.5 text-primary" />
                Créditos avulsos nunca expiram
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
