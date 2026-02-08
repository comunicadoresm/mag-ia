import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Users, Coins, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { AdminCreditsOverview } from '@/components/admin/AdminCreditsOverview';
import { AdminUserCredits } from '@/components/admin/AdminUserCredits';
import { AdminUpsellPlans } from '@/components/admin/AdminUpsellPlans';

export default function AdminCredits() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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

  if (authLoading || loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/agents')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Logo size="sm" />
        <h1 className="text-lg font-bold text-foreground">Admin — Créditos</h1>
      </header>

      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Por Usuário
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <Settings className="w-4 h-4" />
              Planos & Upsell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminCreditsOverview />
          </TabsContent>

          <TabsContent value="users">
            <AdminUserCredits />
          </TabsContent>

          <TabsContent value="plans">
            <AdminUpsellPlans />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
