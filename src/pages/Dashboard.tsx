import React, { useState, useRef } from 'react';
import {
  DollarSign, Briefcase, Eye, Heart, MessageCircle,
  Bookmark, Share2, FileText, RefreshCw, AtSign, Camera, Loader2,
  Zap, TrendingUp, Activity
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadialBarChart, RadialBar, Cell
} from 'recharts';
import { MagneticOnboarding } from '@/components/onboarding/MagneticOnboarding';

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
  return <Input {...props} type="text" inputMode="numeric" value={display} onChange={handleChange} onFocus={() => { if (!value) setDisplay(''); }} />;
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
  return <Input {...props} type="text" inputMode="numeric" value={display} onChange={handleChange} onFocus={() => { if (!value) setDisplay(''); }} />;
}

// ─── Photo Upload Helper ─────────────────────────────────────
function usePhotoUpload(userId: string | undefined) {
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File): Promise<string | null> => {
    if (!userId) return null;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar foto');
      return null;
    } finally { setUploading(false); }
  };
  return { upload, uploading };
}

// ─── Initial Setup Modal ─────────────────────────────────────
function InitialSetupModal({ open, onSubmit, onSkip, userName, userId }: { open: boolean; onSubmit: (data: any) => void; onSkip: () => void; userName: string; userId: string }) {
  const [form, setForm] = useState({ name: userName || '', handle: '', profile_photo_url: '', current_followers: 0, current_revenue: 0, current_clients: 0 });
  const [step, setStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = usePhotoUpload(userId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) setForm(p => ({ ...p, profile_photo_url: url }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSubmit({ ...form, display_name: form.name, initial_followers: form.current_followers, initial_revenue: form.current_revenue, initial_clients: form.current_clients, initial_views: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onSkip(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border/50" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 p-6 pb-4 pr-12">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {step === 0 ? '👋 Bem-vindo! Configure seu perfil' : '📊 Seus números atuais'}
            </DialogTitle>
          </DialogHeader>
        </div>
        {step === 0 ? (
          <div className="space-y-4 px-6 pb-6 pt-2">
            <div className="flex flex-col items-center gap-2">
              <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
                <Avatar className="w-20 h-20 border-2 border-primary">
                  <AvatarImage src={form.profile_photo_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{(form.name || userName)?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 text-primary-foreground animate-spin" /> : <Camera className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground">Toque para enviar uma foto</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Seu nome completo" className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">@ do Instagram</Label>
              <Input value={form.handle} onChange={(e) => setForm(p => ({ ...p, handle: e.target.value }))} placeholder="@seuarroba" className="mt-1 bg-muted/30 border-border/30 rounded-xl" />
            </div>
            <Button onClick={() => { if (form.name.trim()) setStep(1); }} disabled={!form.name.trim()} className="w-full rounded-xl">Próximo</Button>
            <Button variant="ghost" onClick={onSkip} className="w-full rounded-xl text-muted-foreground">Configurar Depois</Button>
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
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1 rounded-xl">Voltar</Button>
                <Button onClick={handleSubmit} className="flex-1 rounded-xl">Salvar e começar</Button>
              </div>
              <Button variant="ghost" onClick={onSkip} className="w-full rounded-xl text-muted-foreground">Configurar Depois</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Update Manual Metrics Modal ─────────────────────────────
function UpdateMetricsModal({ open, onClose, currentValues, onSave }: {
  open: boolean; onClose: () => void;
  currentValues: { followers: number; revenue: number; clients: number };
  onSave: (data: { current_followers: number; current_revenue: number; current_clients: number }) => void;
}) {
  const [form, setForm] = useState(currentValues);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border/50">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 pb-4">
          <DialogHeader><DialogTitle className="text-lg font-bold text-foreground">📊 Atualizar métricas</DialogTitle></DialogHeader>
        </div>
        <div className="space-y-4 px-6 pb-2 pt-2">
          <div><Label className="text-sm text-muted-foreground">Seguidores atuais</Label><NumericInput value={form.followers} onChange={(v) => setForm(p => ({ ...p, followers: v }))} className="mt-1 bg-muted/30 border-border/30 rounded-xl" /></div>
          <div><Label className="text-sm text-muted-foreground">Faturamento atual</Label><CurrencyInput value={form.revenue} onChange={(v) => setForm(p => ({ ...p, revenue: v }))} className="mt-1 bg-muted/30 border-border/30 rounded-xl" /></div>
          <div><Label className="text-sm text-muted-foreground">Clientes atuais</Label><NumericInput value={form.clients} onChange={(v) => setForm(p => ({ ...p, clients: v }))} className="mt-1 bg-muted/30 border-border/30 rounded-xl" /></div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
          <Button onClick={() => onSave({ current_followers: form.followers, current_revenue: form.revenue, current_clients: form.clients })} className="flex-1 rounded-xl">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stat Badge ──────────────────────────────────────────────
function StatBadge({ value, positive }: { value: string; positive?: boolean }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${positive !== false ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>
      {value}
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl p-4 flex flex-col gap-2 hover:border-primary/30 transition-all duration-200">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-black text-foreground leading-none">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Radial Progress ─────────────────────────────────────────
function RadialProgress({ value, label, sub }: { value: number; label: string; sub: string }) {
  const data = [{ value, fill: 'hsl(var(--primary))' }];
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="relative w-28 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="68%" outerRadius="100%" data={data} startAngle={90} endAngle={90 - 360 * (value / 100)}>
            <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={8}>
              <Cell fill="hsl(var(--primary))" />
            </RadialBar>
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black text-foreground">{value}%</span>
        </div>
      </div>
      <p className="text-sm font-bold text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground text-center">{sub}</p>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>{p.name}: {p.value.toLocaleString('pt-BR')}</p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Main Dashboard ──────────────────────────────────────────
export default function Dashboard() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { metrics, postAggregates, isLoading, initializeMetrics, updateManualMetrics } = useDashboardMetrics();
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = usePhotoUpload(user?.id);

  const needsSetup = !isLoading && (!metrics?.initial_setup_done || profile?.has_completed_setup === false);
  const [showSetupModal, setShowSetupModal] = useState(true);

  const handleSkipSetup = () => {
    setShowSetupModal(false);
    toast.info("Você pode configurar seu perfil a qualquer momento no menu Perfil.");
  };

  const handleInitialSetup = async (data: any) => {
    const { name, current_followers, current_revenue, current_clients, ...metricsData } = data;
    const error = await initializeMetrics({ ...metricsData, current_followers, current_revenue, current_clients });
    if (error) {
      toast.error('Erro ao salvar');
    } else {
      if (user) {
        await supabase.from('profiles').update({
          name: name || data.display_name,
          has_completed_setup: true,
          onboarding_step: 'voice_dna',
        }).eq('id', user.id);
        await refreshProfile();
      }
      setShowSetupModal(false);
      toast.success('Perfil configurado!');
    }
  };

  const handleUpdateMetrics = async (data: { current_followers: number; current_revenue: number; current_clients: number }) => {
    const error = await updateManualMetrics(data);
    if (error) toast.error('Erro ao atualizar');
    else { toast.success('Métricas atualizadas!'); setUpdateModalOpen(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) { await updateManualMetrics({ profile_photo_url: url } as any); toast.success('Foto atualizada!'); }
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const m = metrics;
  const pa = postAggregates;
  const displayName = profile?.name || m?.display_name || 'Usuário';
  const totalFollowers = (m?.current_followers || 0) + pa.total_followers_from_posts;

  // Build engagement chart from post aggregates (weekly simulation)
  const engagementData = [
    { week: 'Sem 01', Engajamento: Math.round(pa.total_views * 0.18) },
    { week: 'Sem 02', Engajamento: Math.round(pa.total_views * 0.25) },
    { week: 'Sem 03', Engajamento: Math.round(pa.total_views * 0.35) },
    { week: 'Sem 04', Engajamento: pa.total_views },
  ];

  // Comparison bar data
  const comparisonData = m ? [
    { name: 'Seguidores', Antes: m.initial_followers, Atual: totalFollowers },
    { name: 'Clientes', Antes: m.initial_clients, Atual: m.current_clients },
    { name: 'Faturamento', Antes: Number(m.initial_revenue), Atual: Number(m.current_revenue) },
  ] : [];

  const followersGainPct = m && m.initial_followers > 0
    ? Math.round(((totalFollowers - m.initial_followers) / m.initial_followers) * 100)
    : 0;

  const totalEngagement = pa.total_likes + pa.total_comments + pa.total_saves + pa.total_shares;
  const engagementRate = pa.total_views > 0 ? ((totalEngagement / pa.total_views) * 100).toFixed(1) : '0.0';

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="flex items-center gap-4 px-4 md:px-6 py-4 max-w-[1600px] mx-auto">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Live Analytics</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-none">
              PERFORMANCE <span className="text-primary">ANALYTICS</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {m?.handle && (
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-xl">
                <AtSign className="w-3.5 h-3.5" />{m.handle}
              </div>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border/50 text-xs" onClick={() => setUpdateModalOpen(true)}>
              <RefreshCw className="w-3.5 h-3.5" />Atualizar
            </Button>
            <div className="relative cursor-pointer shrink-0" onClick={() => fileRef.current?.click()}>
              <Avatar className="w-9 h-9 border-2 border-primary/50">
                <AvatarImage src={m?.profile_photo_url || ''} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              {uploading && <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>}
              <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handlePhotoUpload} />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-6 pb-24 md:pb-8">
        {isLoading ? (
          <div className="max-w-[1600px] mx-auto space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-72 rounded-2xl md:col-span-2" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          </div>
        ) : (
          <div className="max-w-[1600px] mx-auto space-y-5 animate-fade-in">

            {/* ── ROW 1: Hero KPIs ────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Creative ROI Hero Card */}
              <div className="col-span-2 md:col-span-1 bg-card border border-border/40 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden hover:border-primary/40 transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <FileText className="w-6 h-6 text-primary" />
                  <StatBadge value={`+${pa.total_posts} posts`} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Conteúdo Criado</p>
                  <p className="text-4xl font-black text-foreground leading-none">{pa.total_posts}</p>
                  <p className="text-sm text-muted-foreground mt-1">roteiros <span className="text-primary font-bold">postados</span></p>
                </div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-primary/5 rounded-full" />
              </div>

              {/* Engagement area chart card */}
              <div className="col-span-2 md:col-span-3 bg-card border border-border/40 rounded-2xl p-5 hover:border-primary/30 transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Crescimento de Engajamento</p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl font-black text-foreground">{pa.total_views.toLocaleString('pt-BR')}</span>
                      <StatBadge value={`${engagementRate}% tx`} />
                    </div>
                  </div>
                  <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-1" />
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={engagementData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Engajamento" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#engGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── ROW 2: Radial + Comparison + Conversion ───────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Radial followers card */}
              <div className="bg-card border border-border/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-primary/30 transition-all duration-200">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold self-start">Seguidores Conquistados</p>
                <RadialProgress
                  value={Math.min(followersGainPct, 100)}
                  label={`+${pa.total_followers_from_posts.toLocaleString('pt-BR')}`}
                  sub="Seguidores via conteúdo"
                />
              </div>

              {/* Visual comparison card */}
              <div className="md:col-span-2 bg-card border border-border/40 rounded-2xl p-5 hover:border-primary/30 transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Comparativo: Antes vs Atual</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/50 inline-block" />Antes</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Atual</span>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} barGap={4} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Antes" fill="hsl(var(--muted-foreground) / 0.4)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── ROW 3: Bottom KPI Strip ────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard
                label="Velocidade de Conteúdo"
                value={`${pa.total_posts}x`}
                icon={Zap}
                sub="roteiros publicados"
              />
              <KpiCard
                label="Taxa de Engajamento"
                value={`${engagementRate}%`}
                icon={Activity}
                sub="curtidas + salvos + shares"
              />
              <KpiCard
                label="Faturamento Atual"
                value={`R$${Number(m?.current_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                icon={DollarSign}
                sub="receita registrada"
              />
              <KpiCard
                label="Clientes Ativos"
                value={m?.current_clients || 0}
                icon={Briefcase}
                sub="clientes na base"
              />
            </div>

            {/* ── ROW 4: Post Metrics Grid ───────────────────────── */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { label: 'Views', value: pa.total_views, icon: Eye },
                { label: 'Curtidas', value: pa.total_likes, icon: Heart },
                { label: 'Comentários', value: pa.total_comments, icon: MessageCircle },
                { label: 'Salvos', value: pa.total_saves, icon: Bookmark },
                { label: 'Shares', value: pa.total_shares, icon: Share2 },
              ].map((item) => (
                <div key={item.label} className="bg-card border border-border/40 rounded-2xl p-4 flex flex-col gap-1 hover:border-primary/30 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{item.label}</p>
                    <item.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xl font-black text-foreground">{item.value.toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>

            {/* ── Footer ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 pt-2 border-t border-border/20">
              <span>© 2026 MAGNETIC.IA — INTELIGÊNCIA EM CONTEÚDO</span>
              <span className="hidden sm:block">V2.0.0 — STABLE</span>
            </div>
          </div>
        )}
      </div>

      {needsSetup && showSetupModal && <InitialSetupModal open onSubmit={handleInitialSetup} onSkip={handleSkipSetup} userName={profile?.name || ''} userId={user.id} />}
      {updateModalOpen && m && (
        <UpdateMetricsModal open={updateModalOpen} onClose={() => setUpdateModalOpen(false)}
          currentValues={{ followers: m.current_followers, revenue: Number(m.current_revenue), clients: m.current_clients }}
          onSave={handleUpdateMetrics} />
      )}
      {profile?.onboarding_step && !needsSetup && (
        <MagneticOnboarding onboardingStep={profile.onboarding_step} />
      )}
    </AppLayout>
  );
}
