import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Users, DollarSign, Briefcase, Eye, Heart, MessageCircle,
  Bookmark, Share2, FileText, RefreshCw, Settings, Camera, AtSign,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BottomNavigation } from '@/components/BottomNavigation';
import { MainSidebar } from '@/components/MainSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Initial Setup Modal ─────────────────────────────────────
function InitialSetupModal({ open, onSubmit }: { open: boolean; onSubmit: (data: any) => void }) {
  const [form, setForm] = useState({
    display_name: '', handle: '', profile_photo_url: '',
    current_followers: 0, current_revenue: 0, current_clients: 0,
  });
  const [step, setStep] = useState(0);

  const handleSubmit = () => {
    onSubmit({
      ...form,
      initial_followers: form.current_followers,
      initial_revenue: form.current_revenue,
      initial_clients: form.current_clients,
      initial_views: 0,
    });
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 0 ? '👋 Bem-vindo! Configure seu perfil' : '📊 Seus números atuais'}
          </DialogTitle>
        </DialogHeader>

        {step === 0 ? (
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome de exibição</Label>
              <Input value={form.display_name} onChange={(e) => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder="Seu nome" />
            </div>
            <div>
              <Label>@ Arroba</Label>
              <Input value={form.handle} onChange={(e) => setForm(p => ({ ...p, handle: e.target.value }))} placeholder="@seuarroba" />
            </div>
            <div>
              <Label>URL da foto de perfil</Label>
              <Input value={form.profile_photo_url} onChange={(e) => setForm(p => ({ ...p, profile_photo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <DialogFooter>
              <Button onClick={() => setStep(1)} className="w-full">Próximo</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Informe seus números atuais para compararmos sua evolução.</p>
            <div>
              <Label>Seguidores atuais</Label>
              <Input type="number" value={form.current_followers} onChange={(e) => setForm(p => ({ ...p, current_followers: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Faturamento atual (R$)</Label>
              <Input type="number" value={form.current_revenue} onChange={(e) => setForm(p => ({ ...p, current_revenue: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Clientes atuais</Label>
              <Input type="number" value={form.current_clients} onChange={(e) => setForm(p => ({ ...p, current_clients: Number(e.target.value) }))} />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Voltar</Button>
              <Button onClick={handleSubmit}>Salvar e começar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Update Manual Metrics Modal ─────────────────────────────
function UpdateMetricsModal({
  open, onClose, currentValues, onSave,
}: {
  open: boolean; onClose: () => void;
  currentValues: { followers: number; revenue: number; clients: number };
  onSave: (data: { current_followers: number; current_revenue: number; current_clients: number }) => void;
}) {
  const [form, setForm] = useState(currentValues);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar métricas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Seguidores atuais</Label>
            <Input type="number" value={form.followers} onChange={(e) => setForm(p => ({ ...p, followers: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Faturamento atual (R$)</Label>
            <Input type="number" value={form.revenue} onChange={(e) => setForm(p => ({ ...p, revenue: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Clientes atuais</Label>
            <Input type="number" value={form.clients} onChange={(e) => setForm(p => ({ ...p, clients: Number(e.target.value) }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ current_followers: form.followers, current_revenue: form.revenue, current_clients: form.clients })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Metric Card ─────────────────────────────────────────────
function MetricCard({ title, value, icon, suffix }: { title: string; value: number | string; icon: React.ReactNode; suffix?: string }) {
  return (
    <Card className="card-cm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-lg font-bold text-foreground">
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
            {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Comparison Chart ─────────────────────────────────────────
function ComparisonChart({ data }: { data: { label: string; before: number; current: number }[] }) {
  const chartData = data.map(d => ({
    name: d.label,
    Antes: d.before,
    Atual: d.current,
  }));

  return (
    <Card className="card-cm">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">Antes vs Atual</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="Antes" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Home Dashboard ──────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { metrics, postAggregates, isLoading, refresh, initializeMetrics, updateManualMetrics } = useDashboardMetrics();
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  const needsSetup = !isLoading && !metrics?.initial_setup_done;

  const handleInitialSetup = async (data: any) => {
    const error = await initializeMetrics(data);
    if (error) toast.error('Erro ao salvar');
    else toast.success('Perfil configurado!');
  };

  const handleUpdateMetrics = async (data: { current_followers: number; current_revenue: number; current_clients: number }) => {
    const error = await updateManualMetrics(data);
    if (error) toast.error('Erro ao atualizar');
    else {
      toast.success('Métricas atualizadas!');
      setUpdateModalOpen(false);
    }
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const m = metrics;
  const pa = postAggregates;

  // Comparison chart data
  const comparisonData = m ? [
    { label: 'Seguidores', before: m.initial_followers, current: m.current_followers },
    { label: 'Clientes', before: m.initial_clients, current: m.current_clients },
    { label: 'Faturamento', before: Number(m.initial_revenue), current: Number(m.current_revenue) },
    { label: 'Visualizações', before: m.initial_views, current: pa.total_views },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <MainSidebar />
      <main className="md:ml-64 min-h-screen pb-24 md:pb-8">
        <header className="md:hidden p-4 border-b border-border">
          <Logo size="sm" />
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="p-4 md:p-6 max-w-5xl space-y-6 animate-fade-in">

            {/* ── Profile Header ─────────────────── */}
            <div className="card-cm p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary">
                  <AvatarImage src={m?.profile_photo_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {m?.display_name?.charAt(0) || profile?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-foreground truncate">
                    {m?.display_name || profile?.name || 'Usuário'}
                  </h1>
                  {m?.handle && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AtSign className="w-3.5 h-3.5" />
                      {m.handle}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-foreground">{(m?.current_followers || 0).toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground">Seguidores</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">R${Number(m?.current_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{(m?.current_clients || 0).toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground">Clientes</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setUpdateModalOpen(true)}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* ── Consolidated Metrics ────────────── */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Métricas Consolidadas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <MetricCard title="Posts Realizados" value={pa.total_posts} icon={<FileText className="w-5 h-5" />} />
                <MetricCard title="Novos Seguidores" value={pa.total_followers_from_posts} icon={<Users className="w-5 h-5" />} />
                <MetricCard title="Visualizações" value={pa.total_views} icon={<Eye className="w-5 h-5" />} />
                <MetricCard title="Curtidas" value={pa.total_likes} icon={<Heart className="w-5 h-5" />} />
                <MetricCard title="Comentários" value={pa.total_comments} icon={<MessageCircle className="w-5 h-5" />} />
                <MetricCard title="Salvos" value={pa.total_saves} icon={<Bookmark className="w-5 h-5" />} />
                <MetricCard title="Compartilhamentos" value={pa.total_shares} icon={<Share2 className="w-5 h-5" />} />
                <MetricCard title="Novos Clientes" value={m?.current_clients || 0} icon={<Briefcase className="w-5 h-5" />} />
                <MetricCard title="Faturamento" value={`R$${Number(m?.current_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<DollarSign className="w-5 h-5" />} />
              </div>
            </div>

            {/* ── Comparison Charts ───────────────── */}
            {m && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Antes vs Atual</h2>
                <ComparisonChart data={comparisonData} />
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNavigation />

      {/* Modals */}
      {needsSetup && <InitialSetupModal open onSubmit={handleInitialSetup} />}
      {updateModalOpen && m && (
        <UpdateMetricsModal
          open={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          currentValues={{
            followers: m.current_followers,
            revenue: Number(m.current_revenue),
            clients: m.current_clients,
          }}
          onSave={handleUpdateMetrics}
        />
      )}
    </div>
  );
}
