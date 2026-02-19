import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Bot, BarChart3, UserCircle, Coins, ChevronRight,
  CheckCircle2, Circle, FileText,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MagneticOnboarding } from '@/components/onboarding/MagneticOnboarding';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Greeting phrases ────────────────────────────────────────
const greetings = [
  'Preparado para criar Conteúdos Magnéticos? 🧲',
  'Seu público tá esperando. Bora?',
  'Mais um dia pra dominar o magnetismo.',
  'Conteúdo bom não se cria sozinho. Bora juntos?',
  'Hoje é dia de conteúdo magnético.',
];

// ─── Status config ────────────────────────────────────────────
const statusConfig: Record<string, { label: string; className: string }> = {
  idea: { label: 'Ideia', className: 'bg-yellow-500/10 text-yellow-400' },
  scripting: { label: 'Roteirizando', className: 'bg-blue-500/10 text-blue-400' },
  recording: { label: 'Gravando', className: 'bg-purple-500/10 text-purple-400' },
  editing: { label: 'Editando', className: 'bg-orange-500/10 text-orange-400' },
  posted: { label: 'Publicado', className: 'bg-green-500/10 text-green-400' },
};

// ─── CreditsPill ──────────────────────────────────────────────
function CreditsPill({ credits, onClick }: { credits: number; onClick: () => void }) {
  const isLow = credits < 5;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
        isLow
          ? 'bg-red-500/10 text-red-400 animate-pulse-subtle'
          : 'bg-primary/10 text-primary hover:bg-primary/20'
      )}
    >
      <Coins className="w-3.5 h-3.5" />
      {credits}
    </button>
  );
}

// ─── QuickActionCard ──────────────────────────────────────────
function QuickActionCard({
  icon: Icon,
  label,
  sub,
  accent,
  onClick,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  sub?: string;
  accent?: boolean;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        'min-w-[120px] p-4 rounded-2xl border transition-all duration-200 text-left shrink-0',
        'hover:scale-[1.03] active:scale-[0.98] section-animate',
        accent
          ? 'bg-primary/10 border-primary/20 hover:bg-primary/15'
          : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12]'
      )}
    >
      <Icon className={cn('w-6 h-6', accent ? 'text-primary' : 'text-foreground/70')} />
      <p className="text-sm font-medium text-foreground mt-3">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </button>
  );
}

// ─── SectionHeader ────────────────────────────────────────────
function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 mb-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5"
        >
          {action} <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── ScriptCard ───────────────────────────────────────────────
function ScriptCard({
  script,
  onClick,
}: {
  script: { id: string; title: string; status: string; updated_at: string };
  onClick: () => void;
}) {
  const st = statusConfig[script.status] || statusConfig.idea;
  const relative = formatDistanceToNow(new Date(script.updated_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div
      onClick={onClick}
      className="min-w-[280px] max-w-[320px] p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200 snap-start cursor-pointer shrink-0"
    >
      <h3 className="text-base font-medium text-foreground line-clamp-2">
        {script.title || 'Sem título'}
      </h3>
      <div className="mt-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            st.className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {st.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{relative}</p>
      <p className="text-sm text-primary font-medium mt-4 hover:text-primary/80 transition-colors">
        Continuar →
      </p>
    </div>
  );
}

// ─── EmptyScripts ─────────────────────────────────────────────
function EmptyScripts({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mx-6 p-8 rounded-2xl border border-dashed border-white/10 flex flex-col items-center text-center">
      <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium text-foreground mb-1">Nenhum roteiro ainda</p>
      <p className="text-xs text-muted-foreground mb-4">
        Crie seu primeiro conteúdo magnético e ele aparece aqui.
      </p>
      <Button onClick={onCreate} size="sm" className="rounded-full">
        Criar primeiro roteiro
      </Button>
    </div>
  );
}

// ─── IdentityCard ─────────────────────────────────────────────
function IdentityCard({
  voiceDna,
  narrative,
  formatProfile,
  onComplete,
  onView,
}: {
  voiceDna: boolean;
  narrative: boolean;
  formatProfile: boolean;
  onComplete: () => void;
  onView: () => void;
}) {
  const steps = [
    { label: 'DNA de Voz', done: voiceDna, sub: voiceDna ? 'Calibrado' : 'Pendente' },
    { label: 'Formato', done: formatProfile, sub: formatProfile ? 'Definido' : 'Pendente' },
    { label: 'Narrativa', done: narrative, sub: narrative ? 'Definida' : 'Pendente' },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  const isComplete = completedCount === 3;

  if (isComplete) {
    return (
      <div className="mx-6 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
        <div className="grid grid-cols-3 gap-4 mb-4">
          {steps.map((step) => (
            <div key={step.label} className="flex flex-col items-center text-center">
              <CheckCircle2 className="w-5 h-5 text-green-400 mb-1.5" />
              <p className="text-xs font-medium text-foreground">{step.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{step.sub}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onView}
          className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Ver detalhes →
        </button>
      </div>
    );
  }

  return (
    <div className="mx-6 p-5 rounded-2xl bg-primary/5 border border-primary/15">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Complete sua Identidade Magnética
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Falta pouco pra IA entender SEU jeito de criar conteúdo. Bora finalizar?
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-1.5 flex-1">
            {step.done ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            )}
            <p className="text-[11px] text-muted-foreground truncate">{step.label}</p>
          </div>
        ))}
      </div>

      <div className="h-1.5 rounded-full bg-white/10 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completedCount / 3) * 100}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {completedCount} de 3 etapas concluídas
      </p>

      <Button onClick={onComplete} size="sm" className="w-full rounded-xl">
        Continuar configuração
      </Button>
    </div>
  );
}

// ─── MetricsSummary ───────────────────────────────────────────
function MetricsSummary({
  followers,
  revenue,
  clients,
  onDetails,
}: {
  followers: number;
  revenue: number;
  clients: number;
  onDetails: () => void;
}) {
  const hasData = followers > 0 || revenue > 0 || clients > 0;

  if (!hasData) {
    return (
      <div className="mx-6 p-6 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-center">
        <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma métrica ainda</p>
        <button
          onClick={onDetails}
          className="text-xs text-primary mt-2 hover:text-primary/80 transition-colors"
        >
          Configurar métricas →
        </button>
      </div>
    );
  }

  return (
    <div className="mx-6 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
      <div className="grid grid-cols-3 gap-6 mb-4">
        <div>
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {followers.toLocaleString('pt-BR')}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
            seguidores
          </p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground tabular-nums">
            {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
            faturamento
          </p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground tabular-nums">{clients}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
            clientes
          </p>
        </div>
      </div>
      <button
        onClick={onDetails}
        className="text-sm text-primary hover:text-primary/80 transition-colors"
      >
        Ver dashboard completo →
      </button>
    </div>
  );
}

// ─── Main Home ────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { balance, isLoading: creditsLoading } = useCredits();

  const [scripts, setScripts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [identity, setIdentity] = useState({
    voiceDna: false,
    narrative: false,
    formatProfile: false,
  });
  const [agentCount, setAgentCount] = useState(0);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Random greeting
  const greeting = useMemo(() => greetings[Math.floor(Math.random() * greetings.length)], []);

  // Contextual summary
  const pendingScripts = scripts.filter((s) => s.status !== 'posted').length;
  const totalCredits = balance.total;
  const contextualSummary = useMemo(() => {
    const parts: string[] = [];
    if (pendingScripts > 0) parts.push(`${pendingScripts} roteiros pendentes`);
    if (totalCredits > 0) parts.push(`${totalCredits} créditos disponíveis`);
    if (parts.length > 0) return `Você tem ${parts.join(' e ')}.`;
    if (totalCredits === 0 && !creditsLoading) return 'Seus créditos acabaram. Recarregue para continuar criando.';
    return 'Tudo pronto pra começar.';
  }, [pendingScripts, totalCredits, creditsLoading]);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [scriptsRes, metricsRes, voiceRes, narrativeRes, formatRes, agentsRes, photoRes] =
          await Promise.all([
            supabase
              .from('user_scripts')
              .select('id, title, status, updated_at')
              .eq('user_id', user.id)
              .neq('status', 'posted')
              .order('updated_at', { ascending: false })
              .limit(5),
            supabase
              .from('user_metrics')
              .select('current_followers, current_revenue, current_clients, profile_photo_url')
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase
              .from('voice_profiles')
              .select('is_calibrated')
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase
              .from('user_narratives')
              .select('is_completed')
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase
              .from('user_format_profile')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase.from('agents_public').select('id', { count: 'exact', head: true }),
            supabase
              .from('user_metrics')
              .select('profile_photo_url')
              .eq('user_id', user.id)
              .maybeSingle(),
          ]);

        setScripts(scriptsRes.data || []);
        setMetrics(metricsRes.data);
        setIdentity({
          voiceDna: !!voiceRes.data?.is_calibrated,
          narrative: !!narrativeRes.data?.is_completed,
          formatProfile: !!formatRes.data,
        });
        setAgentCount(agentsRes.count || 0);
        if (photoRes.data?.profile_photo_url) setPhotoUrl(photoRes.data.profile_photo_url);
      } catch (err) {
        console.error('Home fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user]);

  const firstName = profile?.name?.split(' ')[0] || 'você';

  return (
    <AppLayout>
      {/* Onboarding overlay */}
      {showOnboarding && (
        <MagneticOnboarding onboardingStep="voice_dna" />
      )}

      <div className="home-container flex-1 overflow-auto">
        {/* ── Top Bar ──────────────────────────────── */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-6 h-14">
            <p className="text-sm font-semibold text-foreground tracking-tight">Magnetic.IA</p>
            <div className="flex items-center gap-3">
              {!creditsLoading && (
                <CreditsPill
                  credits={totalCredits}
                  onClick={() => navigate('/profile/credits')}
                />
              )}
              <button onClick={() => navigate('/profile')}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={photoUrl} className="object-cover" />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                    {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto pb-24 md:pb-8">
          {/* ── Seção 1: Welcome Hero ─────────────── */}
          <section className="px-6 pt-8 pb-4 section-animate" style={{ animationDelay: '0ms' }}>
            <h1 className="text-3xl font-light text-foreground tracking-tight">
              Simboraa, {firstName}! 🧲
            </h1>
            <p className="text-lg text-muted-foreground font-normal mt-1">{greeting}</p>
            {!loading && (
              <p className="text-sm text-muted-foreground mt-2">{contextualSummary}</p>
            )}
          </section>

          {/* ── Seção 2: Quick Actions ─────────────── */}
          <section className="mt-4 section-animate" style={{ animationDelay: '100ms' }}>
            <div className="flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-thin snap-x snap-mandatory">
              <QuickActionCard
                icon={Sparkles}
                label="Novo Roteiro"
                sub="3 créditos"
                accent
                onClick={() => navigate('/kanban')}
                delay={0}
              />
              <QuickActionCard
                icon={Bot}
                label="Meus Agentes"
                sub={`${agentCount} agentes`}
                onClick={() => navigate('/agents')}
                delay={50}
              />
              <QuickActionCard
                icon={BarChart3}
                label="Métricas"
                sub="Dashboard"
                onClick={() => navigate('/dashboard')}
                delay={100}
              />
              <QuickActionCard
                icon={UserCircle}
                label="Meu Perfil"
                sub="Identidade"
                onClick={() => navigate('/profile')}
                delay={150}
              />
            </div>
          </section>

          {/* ── Seção 3: Próximos Conteúdos ────────── */}
          <section className="mt-8 section-animate" style={{ animationDelay: '200ms' }}>
            <SectionHeader
              title="Próximos conteúdos"
              action="Ver todos"
              onAction={() => navigate('/kanban')}
            />
            {loading ? (
              <div className="px-6 flex gap-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="min-w-[280px] h-36 rounded-2xl bg-white/[0.04] animate-pulse"
                  />
                ))}
              </div>
            ) : scripts.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x snap-mandatory scrollbar-thin">
                {scripts.map((script) => (
                  <ScriptCard
                    key={script.id}
                    script={script}
                    onClick={() => navigate('/kanban')}
                  />
                ))}
              </div>
            ) : (
              <EmptyScripts onCreate={() => navigate('/kanban')} />
            )}
          </section>

          {/* ── Seção 4: Performance Resumida ─────── */}
          <section className="mt-8 section-animate" style={{ animationDelay: '300ms' }}>
            <SectionHeader
              title="Esta semana"
              action="Detalhes"
              onAction={() => navigate('/dashboard')}
            />
            {loading ? (
              <div className="mx-6 h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
            ) : (
              <MetricsSummary
                followers={metrics?.current_followers || 0}
                revenue={metrics?.current_revenue || 0}
                clients={metrics?.current_clients || 0}
                onDetails={() => navigate('/dashboard')}
              />
            )}
          </section>

          {/* ── Seção 5: Identidade Magnética ─────── */}
          <section className="mt-8 section-animate" style={{ animationDelay: '400ms' }}>
            <SectionHeader title="Sua Identidade Magnética" />
            {loading ? (
              <div className="mx-6 h-36 rounded-2xl bg-white/[0.04] animate-pulse" />
            ) : (
              <IdentityCard
                voiceDna={identity.voiceDna}
                narrative={identity.narrative}
                formatProfile={identity.formatProfile}
                onComplete={() => setShowOnboarding(true)}
                onView={() => navigate('/profile')}
              />
            )}
          </section>
        </main>
      </div>
    </AppLayout>
  );
}
