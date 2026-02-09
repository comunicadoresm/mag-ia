import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Users, DollarSign, Briefcase, Eye, Heart, MessageCircle,
  Bookmark, Share2, FileText, RefreshCw, AtSign,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BottomNavigation } from '@/components/BottomNavigation';
import { MainSidebar } from '@/components/MainSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Currency Input Helper ───────────────────────────────────
function CurrencyInput({ value, onChange, ...props }: { value: number; onChange: (v: number) => void } & Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  const [display, setDisplay] = useState(
    value ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    const num = parseInt(raw || '0', 10) / 100;
    setDisplay(num ? `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '');
    onChange(num);
  };

  const handleFocus = () => {
    if (!value) setDisplay('');
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
    />
  );
}

// ─── Number Input Helper ─────────────────────────────────────
function NumericInput({ value, onChange, ...props }: { value: number; onChange: (v: number) => void } & Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  const [display, setDisplay] = useState(value ? value.toLocaleString('pt-BR') : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = parseInt(raw || '0', 10);
    setDisplay(num ? num.toLocaleString('pt-BR') : '');
    onChange(num);
  };

  const handleFocus = () => {
    if (!value) setDisplay('');
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
    />
  );
}

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border/50" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {step === 0 ? '👋 Bem-vindo! Configure seu perfil' : '📊 Seus números atuais'}
            </DialogTitle>
          </DialogHeader>
        </div>

        {step === 0 ? (
          <div className="space-y-4 px-6 pb-6 pt-2">
            <div>
              <Label className="text-sm text-muted-foreground">Nome de exibição</Label>
              <Input value={form.display_name} onChange={(e) => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder="Seu nome" className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">@ do Instagram</Label>
              <Input value={form.handle} onChange={(e) => setForm(p => ({ ...p, handle: e.target.value }))} placeholder="@seuarroba" className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">URL da foto de perfil</Label>
              <Input value={form.profile_photo_url} onChange={(e) => setForm(p => ({ ...p, profile_photo_url: e.target.value }))} placeholder="https://..." className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
            </div>
            <Button onClick={() => setStep(1)} className="w-full rounded-xl">Próximo</Button>
          </div>
        ) : (
          <div className="space-y-4 px-6 pb-6 pt-2">
            <p className="text-sm text-muted-foreground">Informe seus números atuais para compararmos sua evolução.</p>
            <div>
              <Label className="text-sm text-muted-foreground">Seguidores atuais</Label>
              <NumericInput value={form.current_followers} onChange={(v) => setForm(p => ({ ...p, current_followers: v }))} placeholder="0" className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Faturamento atual</Label>
              <CurrencyInput value={form.current_revenue} onChange={(v) => setForm(p => ({ ...p, current_revenue: v }))} placeholder="R$ 0,00" className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Clientes atuais</Label>
              <NumericInput value={form.current_clients} onChange={(v) => setForm(p => ({ ...p, current_clients: v }))} placeholder="0" className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1 rounded-xl">Voltar</Button>
              <Button onClick={handleSubmit} className="flex-1 rounded-xl">Salvar e começar</Button>
            </div>
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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border/50">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">📊 Atualizar métricas</DialogTitle>
          </DialogHeader>
        </div>
        <div className="space-y-4 px-6 pb-2 pt-2">
          <div>
            <Label className="text-sm text-muted-foreground">Seguidores atuais</Label>
            <NumericInput value={form.followers} onChange={(v) => setForm(p => ({ ...p, followers: v }))} className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Faturamento atual</Label>
            <CurrencyInput value={form.revenue} onChange={(v) => setForm(p => ({ ...p, revenue: v }))} className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Clientes atuais</Label>
            <NumericInput value={form.clients} onChange={(v) => setForm(p => ({ ...p, clients: v }))} className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
          <Button onClick={() => onSave({ current_followers: form.followers, current_revenue: form.revenue, current_clients: form.clients })} className="flex-1 rounded-xl">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Metric Card ─────────────────────────────────────────────
function MetricCard({ title, value, icon, suffix }: { title: string; value: number | string; icon: React.ReactNode; suffix?: string }) {
  return (
    <div className="bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 rounded-2xl p-4 hover:border-primary/40 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{title}</p>
          <p className="text-base font-bold text-foreground leading-tight">
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
            {suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
      </div>
    </div>
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
    <div className="card-cm p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Antes vs Atual</h3>
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
                borderRadius: '12px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="Antes" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Atual" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
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

  // Update followers: base + posts followers
  const totalFollowers = (m?.current_followers || 0);

  const comparisonData = m ? [
    { label: 'Seguidores', before: m.initial_followers, current: totalFollowers },
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
          <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-5 animate-fade-in">

            {/* ── Profile Header ─────────────────── */}
            <div className="card-cm p-4 md:p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar className="w-14 h-14 border-2 border-primary shrink-0">
                  <AvatarImage src={m?.profile_photo_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                    {m?.display_name?.charAt(0) || profile?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-foreground truncate">
                    {m?.display_name || profile?.name || 'Usuário'}
                  </h1>
                  {m?.handle && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AtSign className="w-3.5 h-3.5" />
                      {m.handle}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-5 text-center">
                  <div>
                    <p className="text-lg font-bold text-foreground">{totalFollowers.toLocaleString('pt-BR')}</p>
                    <p className="text-[11px] text-muted-foreground">Seguidores</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">R${Number(m?.current_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[11px] text-muted-foreground">Faturamento</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{(m?.current_clients || 0).toLocaleString('pt-BR')}</p>
                    <p className="text-[11px] text-muted-foreground">Clientes</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border/50" onClick={() => setUpdateModalOpen(true)}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* ── Consolidated Metrics ────────────── */}
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">Métricas Consolidadas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <MetricCard title="Posts Realizados" value={pa.total_posts} icon={<FileText className="w-4 h-4" />} />
                <MetricCard title="Novos Seguidores" value={pa.total_followers_from_posts} icon={<Users className="w-4 h-4" />} />
                <MetricCard title="Visualizações" value={pa.total_views} icon={<Eye className="w-4 h-4" />} />
                <MetricCard title="Curtidas" value={pa.total_likes} icon={<Heart className="w-4 h-4" />} />
                <MetricCard title="Comentários" value={pa.total_comments} icon={<MessageCircle className="w-4 h-4" />} />
                <MetricCard title="Salvos" value={pa.total_saves} icon={<Bookmark className="w-4 h-4" />} />
                <MetricCard title="Compartilhamentos" value={pa.total_shares} icon={<Share2 className="w-4 h-4" />} />
                <MetricCard title="Novos Clientes" value={m?.current_clients || 0} icon={<Briefcase className="w-4 h-4" />} />
                <MetricCard title="Faturamento" value={`R$${Number(m?.current_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<DollarSign className="w-4 h-4" />} />
              </div>
            </div>

            {/* ── Comparison Charts ───────────────── */}
            {m && (
              <div>
                <h2 className="text-base font-semibold text-foreground mb-3">Antes vs Atual</h2>
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
