import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Bot, Users, LayoutGrid, Settings2, BarChart3, Coins, Settings, 
  ArrowLeft, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

// Admin section components (lazy-ish via dynamic imports would be ideal, but keeping simple)
import AdminAgentsSection from '@/components/admin/AdminAgentsSection';
import { ScriptOptionsManagement } from '@/components/admin/ScriptOptionsManagement';
import UserManagement from '@/components/admin/UserManagement';
import { AdminCreditsOverview } from '@/components/admin/AdminCreditsOverview';
import { AdminUserCredits } from '@/components/admin/AdminUserCredits';
import { AdminUpsellPlans } from '@/components/admin/AdminUpsellPlans';
import { AdminMetricsDashboard } from '@/components/admin/AdminMetricsDashboard';
import { AdminPlanTypes } from '@/components/admin/AdminPlanTypes';
import { AdminCreditPackages } from '@/components/admin/AdminCreditPackages';
import { Crown, Package } from 'lucide-react';

const ADMIN_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, group: 'Geral' },
  { id: 'agents', label: 'Agentes', icon: Bot, group: 'Conteúdo' },
  { id: 'templates', label: 'Templates', icon: LayoutGrid, group: 'Conteúdo' },
  { id: 'options', label: 'Opções de Roteiro', icon: Settings2, group: 'Conteúdo' },
  { id: 'users', label: 'Usuários', icon: Users, group: 'Gestão' },
  { id: 'plan-types', label: 'Planos Principais', icon: Crown, group: 'Créditos' },
  { id: 'credit-packages', label: 'Pacotes de Créditos', icon: Package, group: 'Créditos' },
  { id: 'credits-overview', label: 'Visão Geral', icon: Coins, group: 'Créditos' },
  { id: 'credits-users', label: 'Por Usuário', icon: Coins, group: 'Créditos' },
  { id: 'plans', label: 'Upsell (legado)', icon: Settings, group: 'Créditos' },
];

const GROUPS = ['Geral', 'Conteúdo', 'Gestão', 'Créditos'];

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('section') || 'dashboard';
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (!user) return;

    const checkAdmin = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!data) {
        navigate('/home');
        return;
      }
      setIsAdmin(true);
      setLoading(false);
    };
    checkAdmin();
  }, [user, authLoading, navigate]);

  const handleSectionChange = (sectionId: string) => {
    setSearchParams({ section: sectionId });
    setMobileMenuOpen(false);
  };

  if (authLoading || loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const currentSection = ADMIN_SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 bg-secondary border-r border-border flex flex-col transition-transform duration-200 md:translate-x-0 md:static",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Logo size="sm" />
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {GROUPS.map((group) => {
            const items = ADMIN_SECTIONS.filter(s => s.group === group);
            return (
              <div key={group} className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">
                  {group}
                </p>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5",
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => navigate('/home')}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao app
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="border-b border-border bg-secondary/50 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <LayoutGrid className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {currentSection && <currentSection.icon className="w-5 h-5 text-primary" />}
            <h1 className="text-lg font-bold text-foreground">
              {currentSection?.label || 'Admin'}
            </h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-6xl">
          {activeSection === 'dashboard' && <AdminMetricsDashboard />}
          {activeSection === 'agents' && <AdminAgentsSection />}
          {activeSection === 'templates' && <AdminAgentsSection section="templates" />}
          {activeSection === 'options' && <ScriptOptionsManagement />}
          {activeSection === 'users' && <UserManagement />}
          {activeSection === 'plan-types' && <AdminPlanTypes />}
          {activeSection === 'credit-packages' && <AdminCreditPackages />}
          {activeSection === 'credits-overview' && <AdminCreditsOverview />}
          {activeSection === 'credits-users' && <AdminUserCredits />}
          {activeSection === 'plans' && <AdminUpsellPlans />}
        </main>
      </div>
    </div>
  );
}
