import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, TrendingDown, Gift, Wallet, Percent, Loader2, ShoppingCart } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useCycleProgress } from '@/hooks/useCycleProgress';
import { useCreditsModals } from '@/contexts/CreditsModalContext';
import { CreditMetricCard } from '@/components/credits/CreditMetricCard';
import { CreditCompositionChart } from '@/components/credits/CreditCompositionChart';
import { CycleProgressBar } from '@/components/credits/CycleProgressBar';
import { PurchaseHistoryTable } from '@/components/credits/PurchaseHistoryTable';
import { UsageByFeatureChart } from '@/components/credits/UsageByFeatureChart';
import { PlanInfoCard } from '@/components/credits/PlanInfoCard';

export default function Credits() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { balance, isLoading: creditsLoading } = useCredits();
  const { totalConsumed, totalMonthly, percentUsed } = useCycleProgress();
  const { showBuyCredits } = useCreditsModals();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const getUsageVariant = (): 'success' | 'warning' | 'danger' => {
    if (percentUsed > 80) return 'danger';
    if (percentUsed > 50) return 'warning';
    return 'success';
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Coins className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Meus Créditos</h1>
              <p className="text-xs text-muted-foreground">Acompanhe seu consumo e saldo</p>
            </div>
          </div>
          <Button onClick={showBuyCredits} className="gap-2 rounded-xl">
            <ShoppingCart className="w-4 h-4" />
            Adquirir Créditos
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-6 pb-24 md:pb-6">
        <div className="max-w-[1600px] mx-auto">
          {creditsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <CreditMetricCard title="Total Mensal" value={totalMonthly} icon={<Coins className="w-5 h-5" />} />
                <CreditMetricCard title="Consumo Atual" value={totalConsumed} icon={<TrendingDown className="w-5 h-5" />} variant={getUsageVariant()} />
                <CreditMetricCard title="Créditos Extra" value={balance.bonus} subtitle="Não expiram" icon={<Gift className="w-5 h-5" />} />
                <CreditMetricCard title="Restantes" value={balance.total} icon={<Wallet className="w-5 h-5" />} variant={balance.total === 0 ? 'danger' : 'default'} />
                <CreditMetricCard title="% de Uso" value={`${percentUsed}%`} icon={<Percent className="w-5 h-5" />} variant={getUsageVariant()} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                <PlanInfoCard />
                <CreditCompositionChart />
                <CycleProgressBar />
                <UsageByFeatureChart />
              </div>
              <PurchaseHistoryTable />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
