import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Bot, BarChart3, UserCircle, Coins, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useCreditsModals } from '@/contexts/CreditsModalContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MagneticOnboarding } from '@/components/onboarding/MagneticOnboarding';

// ─── Relative Time Helper ────────────────────────────────
function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `Há ${diffMins} min`;
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ─── Status Config ───────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  idea: { label: 'Ideia', className: 'bg-purple-500/10 text-purple-400' },
  scripting: { label: 'Roteirizando', className: 'bg-yellow-500/10 text-yellow-400' },
  recording: { label: 'Gravando', className: 'bg-blue-500/10 text-blue-400' },
  editing: { label: 'Editando', className: 'bg-orange-500/10 text-orange-400' },
};

// ─── Motivational Greetings ──────────────────────────────
const GREETINGS = [
  "Bora criar conteúdo que conecta?",
  "Seu público tá esperando. Bora?",
  "Mais um dia pra dominar o feed.",
  "Conteúdo bom não se cria sozinho. Bora junto?",
  "Hoje é dia de conteúdo magnético.",
];

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════
export default function Home() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { balance, isLoading: creditsLoading } = useCredits();
  const { metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { showBuyCredits } = useCreditsModals();

  const [scripts, setScripts] = useState<any[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [identityStatus, setIdentityStatus] = useState<{
    voiceDna: boolean; formatQuiz: boolean; narrative: boolean;
  } | null>(null);

  const credits = balance?.total ?? 0;
  const displayName = profile?.name?.split(' ')[0] || 'Usuário';

  // ─── Fetch pending scripts (not posted), limit 5, recent first ───
  useEffect(() => {
    if (!user) return;
    const fetchScripts = async () => {
      try {
        const { data } = await supabase
          .from('user_scripts')
          .select('id, title, status, updated_at, theme')
          .eq('user_id', user.id)
          .neq('status', 'posted')
          .order('updated_at', { ascending: false })
          .limit(5);
        setScripts(data || []);
      } catch (err) {
        console.error('Error fetching scripts:', err);
      } finally {
        setScriptsLoading(false);
      }
    };
    fetchScripts();
  }, [user]);

  // ─── Fetch identity status (voice DNA, format, narrative) ───
  useEffect(() => {
    if (!user) return;
    const fetchIdentity = async () => {
      const [voiceRes, narrativeRes, formatRes] = await Promise.all([
        supabase.from('voice_profiles').select('is_calibrated').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_narratives').select('is_completed').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_format_profile').select('id').eq('user_id', user.id).maybeSingle(),
      ]);
      setIdentityStatus({
        voiceDna: !!voiceRes.data?.is_calibrated,
        formatQuiz: !!formatRes.data,
        narrative: !!narrativeRes.data?.is_completed,
      });
    };
    fetchIdentity();
  }, [user]);

  // ─── Random greeting (stable per render) ───
  const greeting = useMemo(
    () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)],
    []
  );

  // ─── Contextual summary ───
  const contextSummary = useMemo(() => {
    const parts: string[] = [];
    if (scripts.length > 0)
      parts.push(`${scripts.length} roteiro${scripts.length > 1 ? 's' : ''} pendente${scripts.length > 1 ? 's' : ''}`);
    if (credits > 0)
      parts.push(`${credits} crédito${credits > 1 ? 's' : ''} disponíve${credits > 1 ? 'is' : 'l'}`);
    if (parts.length > 0) return `Você tem ${parts.join(' e ')}.`;
    if (credits === 0) return 'Seus créditos acabaram. Recarregue para continuar criando.';
    return 'Tudo pronto pra começar.';
  }, [scripts.length, credits]);

  // ─── Loading state ───
  if (authLoading || !user) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
      </AppLayout>
    );
  }

  // ─── Identity progress calc ───
  const identityProgress = identityStatus
    ? (identityStatus.voiceDna ? 1 : 0) + (identityStatus.formatQuiz ? 1 : 0) + (identityStatus.narrative ? 1 : 0)
    : 0;
  const identityComplete = identityProgress === 3;

  return (
    <AppLayout>
      {/* ═══ TOP BAR ═══ */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/10">
        <div className="flex items-center justify-between px-5 h-14 max-w-3xl mx-auto">
          <p className="text-base font-semibold text-foreground tracking-tight">Magnetic.IA</p>
          <div className="flex items-center gap-3">
            {/* Credits Pill */}
            <button
              onClick={showBuyCredits}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                credits < 5
                  ? 'bg-destructive/10 text-destructive animate-pulse'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
            >
              <Coins className="w-3.5 h-3.5" />
              {creditsLoading ? '...' : credits}
            </button>
            {/* User Avatar */}
            <button onClick={() => navigate('/profile')} className="shrink-0">
              <Avatar className="w-8 h-8 border-2 border-border/20">
                <AvatarImage src={metrics?.profile_photo_url || ''} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto pb-24 md:pb-8">

        {/* ═══ WELCOME HERO ═══ */}
        <section className="px-5 pt-8 pb-2">
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Oi, {displayName}! 👋
          </h1>
          <p className="text-lg text-muted-foreground font-normal mt-1">{greeting}</p>
          <p className="text-sm text-muted-foreground mt-2">{contextSummary}</p>
        </section>

        {/* ═══ QUICK ACTIONS ═══ */}
        <section className="mt-6">
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
            {/* Novo Roteiro — accent CTA */}
            <button
              onClick={() => navigate('/kanban')}
              className="min-w-[120px] p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/15 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 text-left shrink-0"
            >
              <Sparkles className="w-7 h-7 text-primary" />
              <p className="text-sm font-medium text-foreground mt-3">Novo Roteiro</p>
              <p className="text-xs text-muted-foreground mt-0.5">3 créditos</p>
            </button>
            {/* Meus Agentes */}
            <button
              onClick={() => navigate('/agents')}
              className="min-w-[120px] p-4 rounded-2xl bg-muted/30 border border-border/30 hover:bg-muted/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 text-left shrink-0"
            >
              <Bot className="w-7 h-7 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground mt-3">Meus Agentes</p>
              <p className="text-xs text-muted-foreground mt-0.5">Conversar</p>
            </button>
            {/* Métricas */}
            <button
              onClick={() => navigate('/dashboard')}
              className="min-w-[120px] p-4 rounded-2xl bg-muted/30 border border-border/30 hover:bg-muted/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 text-left shrink-0"
            >
              <BarChart3 className="w-7 h-7 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground mt-3">Métricas</p>
              <p className="text-xs text-muted-foreground mt-0.5">Dashboard</p>
            </button>
            {/* Meu Perfil */}
            <button
              onClick={() => navigate('/profile')}
              className="min-w-[120px] p-4 rounded-2xl bg-muted/30 border border-border/30 hover:bg-muted/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 text-left shrink-0"
            >
              <UserCircle className="w-7 h-7 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground mt-3">Meu Perfil</p>
              <p className="text-xs text-muted-foreground mt-0.5">Identidade</p>
            </button>
          </div>
        </section>

        {/* ═══ PRÓXIMOS CONTEÚDOS ═══ */}
        <section className="mt-8">
          <div className="flex items-center justify-between px-5 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Próximos conteúdos</h2>
            <button
              onClick={() => navigate('/kanban')}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Ver todos →
            </button>
          </div>

          {scriptsLoading ? (
            <div className="flex gap-4 overflow-x-auto px-5 pb-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="min-w-[280px] h-40 rounded-2xl shrink-0" />
              ))}
            </div>
          ) : scripts.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto px-5 pb-4 snap-x snap-mandatory scrollbar-hide">
              {scripts.map((script) => {
                const status = STATUS_MAP[script.status] || STATUS_MAP.idea;
                return (
                  <div
                    key={script.id}
                    onClick={() => navigate('/kanban')}
                    className="min-w-[280px] max-w-[320px] p-5 rounded-2xl bg-muted/30 border border-border/30 hover:bg-muted/50 hover:border-border/50 transition-all duration-200 snap-start cursor-pointer shrink-0"
                  >
                    <h3 className="text-base font-medium text-foreground line-clamp-2">
                      {script.title || script.theme || 'Sem título'}
                    </h3>
                    <div className="mt-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                          status.className
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {getRelativeTime(script.updated_at)}
                    </p>
                    <p className="text-sm text-primary font-medium mt-4">Continuar →</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mx-5 p-8 rounded-2xl border border-dashed border-border/30 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-base font-medium text-foreground">Nenhum roteiro ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie seu primeiro conteúdo magnético e ele aparece aqui.
              </p>
              <button
                onClick={() => navigate('/kanban')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Criar primeiro roteiro
              </button>
            </div>
          )}
        </section>

        {/* ═══ PERFORMANCE RESUMIDA ═══ */}
        <section className="mt-8">
          <div className="flex items-center justify-between px-5 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Esta semana</h2>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Detalhes →
            </button>
          </div>
          <div className="mx-5">
            {metricsLoading ? (
              <Skeleton className="h-28 rounded-2xl" />
            ) : metrics &&
              (metrics.current_followers > 0 ||
                Number(metrics.current_revenue) > 0 ||
                metrics.current_clients > 0) ? (
              <div className="p-6 rounded-2xl bg-muted/30 border border-border/30">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-2xl font-semibold text-foreground tabular-nums">
                      {(metrics.current_followers || 0).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      seguidores
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground tabular-nums">
                      R$
                      {Number(metrics.current_revenue || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      faturamento
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground tabular-nums">
                      {(metrics.current_clients || 0).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                      clientes
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-muted/30 border border-border/30 text-center">
                <p className="text-sm text-muted-foreground">
                  Quando você registrar seus resultados, seus números aparecem aqui.
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="mt-3 text-sm text-primary font-medium hover:text-primary/80 transition-colors"
                >
                  Configurar métricas →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ═══ IDENTIDADE MAGNÉTICA ═══ */}
        <section className="mt-8 pb-24 md:pb-8">
          <div className="flex items-center justify-between px-5 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Sua Identidade</h2>
          </div>
          <div className="mx-5">
            {identityStatus === null ? (
              <Skeleton className="h-24 rounded-2xl" />
            ) : identityComplete ? (
              <div className="p-5 rounded-2xl bg-muted/30 border border-border/30">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <p className="text-xs text-muted-foreground">DNA de Voz</p>
                    <p className="text-xs font-medium text-foreground">Calibrado</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <p className="text-xs text-muted-foreground">Formato</p>
                    <p className="text-xs font-medium text-foreground">Definido</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <p className="text-xs text-muted-foreground">Narrativa</p>
                    <p className="text-xs font-medium text-foreground">Definida</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full mt-4 text-sm text-primary font-medium text-center hover:text-primary/80 transition-colors"
                >
                  Ver detalhes →
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/15">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-base font-medium text-foreground">
                      Complete sua Identidade Magnética
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Falta pouco pra IA entender SEU jeito de criar conteúdo.
                    </p>
                    <div className="mt-3">
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${(identityProgress / 3) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {identityProgress} de 3 etapas
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/profile')}
                      className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Continuar configuração
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Magnetic Onboarding overlay — manter funcionando */}
      {profile?.onboarding_step &&
        profile.onboarding_step !== 'completed' &&
        profile.has_completed_setup && (
          <MagneticOnboarding onboardingStep={profile.onboarding_step} />
        )}
    </AppLayout>
  );
}