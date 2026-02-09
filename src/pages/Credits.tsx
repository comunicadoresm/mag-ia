import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, TrendingDown, Gift, Wallet, Percent, Loader2, ShoppingCart } from 'lucide-react';
import { MainSidebar } from '@/components/MainSidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Logo } from '@/components/Logo';
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
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const getUsageVariant = (): 'success' | 'warning' | 'danger' => {
    if (percentUsed > 80) return 'danger';
    if (percentUsed > 50) return 'warning';
    return 'success';
  };

  return (
    <div className="min-h-screen bg-background">
      <MainSidebar />

      <main className="md:ml-64 pb-24 md:pb-8">
        {/* Mobile Header */}
        <header className="md:hidden p-4 border-b border-border flex items-center justify-between">
          <Logo size="sm" />
          <button onClick={() => navigate('/profile')} className="text-sm text-primary font-medium">
            Voltar
          </button>
        </header>

        <div className="p-4 md:p-6 max-w-4xl">
          {/* Page Title + CTA */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Meus Créditos</h1>
              <p className="text-sm text-muted-foreground">Acompanhe seu consumo e saldo</p>
            </div>
            <Button onClick={showBuyCredits} className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Adquirir Créditos
            </Button>
          </div>

          {creditsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in">
              {/* Row 1: Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <CreditMetricCard
                  title="Total Mensal"
                  value={totalMonthly}
                  icon={<Coins className="w-5 h-5" />}
                />
                <CreditMetricCard
                  title="Consumo Atual"
                  value={totalConsumed}
                  icon={<TrendingDown className="w-5 h-5" />}
                  variant={getUsageVariant()}
                />
                <CreditMetricCard
                  title="Créditos Extra"
                  value={balance.bonus}
                  subtitle="Não expiram"
                  icon={<Gift className="w-5 h-5" />}
                />
                <CreditMetricCard
                  title="Restantes"
                  value={balance.total}
                  icon={<Wallet className="w-5 h-5" />}
                  variant={balance.total === 0 ? 'danger' : 'default'}
                />
                <CreditMetricCard
                  title="% de Uso"
                  value={`${percentUsed}%`}
                  icon={<Percent className="w-5 h-5" />}
                  variant={getUsageVariant()}
                />
              </div>

              {/* Row 2: Detail Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                <PlanInfoCard />
                <CreditCompositionChart />
                <CycleProgressBar />
                <UsageByFeatureChart />
              </div>

              {/* Row 3: History (full width) */}
              <PurchaseHistoryTable />
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
