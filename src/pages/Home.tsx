import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Bot, UserCircle, ChevronRight,
  CheckCircle2, Circle, FileText,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MagneticOnboarding } from '@/components/onboarding/MagneticOnboarding';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Greeting phrases ─────────────────────────────────────────
const greetings = [
  'Preparado para criar Conteúdos Magnéticos? 🧲',
  'Seu público tá esperando. Bora?',
  'Mais um dia pra dominar o magnetismo.',
  'Conteúdo bom não se cria sozinho. Bora juntos?',
  'Hoje é dia de conteúdo magnético.',
];

// ─── Status config ────────────────────────────────────────────
const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  idea:      { label: 'Ideia',        dot: '#FAFC59', bg: 'rgba(250,252,89,0.12)',  text: '#FAFC59' },
  scripting: { label: 'Roteirizando', dot: '#F97316', bg: 'rgba(249,115,22,0.12)',  text: '#F97316' },
  recording: { label: 'Gravando',     dot: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  text: '#3B82F6' },
  editing:   { label: 'Editando',     dot: '#A855F7', bg: 'rgba(168,85,247,0.12)',  text: '#A855F7' },
  posted:    { label: 'Publicado',    dot: '#22C55E', bg: 'rgba(34,197,94,0.12)',   text: '#22C55E' },
};


// ─── QuickActionCard ──────────────────────────────────────────
function QuickActionCard({
  icon: Icon,
  label,
  sub,
  accent,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  sub?: string;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'min-w-[110px] flex-shrink-0 p-4 rounded-2xl border transition-all duration-200 text-left',
        'hover:scale-[1.02] active:scale-[0.98]',
        accent
          ? 'bg-primary/10 border-primary/30 hover:bg-primary/15'
          : 'bg-muted/40 border-border/50 hover:bg-muted/70 hover:border-border'
      )}
    >
      <Icon className={cn('w-5 h-5', accent ? 'text-primary' : 'text-muted-foreground')} />
      <p className="text-sm font-medium text-foreground mt-3 leading-tight">{label}</p>
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
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5"
        >
          {action} <ChevronRight className="w-3.5 h-3.5" />
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
      className="min-w-[260px] max-w-[300px] flex-shrink-0 p-4 rounded-2xl bg-muted/40 border border-border/50 hover:bg-muted/70 hover:border-border transition-all duration-200 cursor-pointer snap-start"
    >
      <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
        {script.title || 'Sem título'}
      </h3>
      <div className="mt-3">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: st.bg, color: st.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
          {st.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{relative}</p>
      <p className="text-xs text-primary font-medium mt-3">Continuar →</p>
    </div>
  );
}

// ─── EmptyScripts ─────────────────────────────────────────────
function EmptyScripts({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="p-6 rounded-2xl border border-dashed border-border/50 flex flex-col items-center text-center">
      <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm font-medium text-foreground mb-1">Nenhum roteiro ainda</p>
      <p className="text-xs text-muted-foreground mb-4">
        Crie seu primeiro conteúdo magnético.
      </p>
      <Button onClick={onCreate} size="sm" className="rounded-full text-xs h-8 px-4">
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
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50">
        <div className="grid grid-cols-3 gap-4 mb-4">
          {steps.map((step) => (
            <div key={step.label} className="flex flex-col items-center text-center">
              <CheckCircle2 className="w-4 h-4 text-success mb-1.5" />
              <p className="text-xs font-medium text-foreground">{step.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{step.sub}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onView}
          className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Ver detalhes →
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {completedCount === 0 ? 'Configure sua Identidade Magnética' : 'Complete sua Identidade Magnética'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount === 0
              ? 'A IA precisa te conhecer pra criar conteúdo no seu jeito.'
              : 'Falta pouco pra IA entender SEU jeito de criar conteúdo.'}
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-1 flex-1 min-w-0">
            {step.done
              ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              : <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
            <p className="text-[11px] text-muted-foreground truncate">{step.label}</p>
          </div>
        ))}
      </div>

      <div className="h-1.5 rounded-full bg-border/50 mb-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completedCount / 3) * 100}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground mb-3">{completedCount} de 3 etapas concluídas</p>

      <Button onClick={onComplete} size="sm" className="w-full rounded-xl h-8 text-xs">
        {completedCount === 0 ? 'Começar configuração' : 'Continuar configuração'}
      </Button>
    </div>
  );
}

// ─── Main Home ────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { balance, isLoading: creditsLoading } = useCredits();

  const [scripts, setScripts] = useState<any[]>([]);
  const [identity, setIdentity] = useState({ voiceDna: false, narrative: false, formatProfile: false });
  const [agentCount, setAgentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOnboardingManual, setShowOnboardingManual] = useState(false);

  // Show mandatory setup modal every time until identity is fully configured
  // sessionStorage only prevents re-showing within same tab session (skip button)
  const hasCompletedSetup = profile?.has_completed_setup ?? false;
  const skippedThisTab = sessionStorage.getItem('setup_skipped_this_session') === '1';
  const showSetupModal = !loading && !!profile && !hasCompletedSetup && !skippedThisTab;

  const greeting = useMemo(() => greetings[Math.floor(Math.random() * greetings.length)], []);

  const totalCredits = balance.total;
  const pendingScripts = scripts.length;

  const contextualSummary = useMemo(() => {
    if (creditsLoading) return '';
    const parts: string[] = [];
    if (pendingScripts > 0) parts.push(`${pendingScripts} roteiros pendentes`);
    if (totalCredits > 0) parts.push(`${totalCredits} créditos disponíveis`);
    if (parts.length > 0) return `Você tem ${parts.join(' e ')}.`;
    if (totalCredits === 0) return 'Seus créditos acabaram. Recarregue para continuar criando.';
    return 'Tudo pronto pra começar.';
  }, [pendingScripts, totalCredits, creditsLoading]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [scriptsRes, voiceRes, narrativeRes, formatRes, agentsRes] = await Promise.all([
          supabase.from('user_scripts').select('id, title, status, updated_at').eq('user_id', user.id).neq('status', 'posted').order('updated_at', { ascending: false }).limit(5),
          supabase.from('voice_profiles').select('is_calibrated').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_narratives').select('is_completed').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_format_profile').select('id').eq('user_id', user.id).maybeSingle(),
          supabase.from('agents_public').select('id', { count: 'exact', head: true }),
        ]);
        setScripts(scriptsRes.data || []);
        setIdentity({
          voiceDna: !!voiceRes.data?.is_calibrated,
          narrative: !!narrativeRes.data?.is_completed,
          formatProfile: !!formatRes.data,
        });
        setAgentCount(agentsRes.count || 0);
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
      {/* ── Onboarding wizard ── */}
      <MagneticOnboarding
        open={showSetupModal || showOnboardingManual}
        onClose={() => setShowOnboardingManual(false)}
      />

      {/* ── Content (mesmo padrão do Kanban) ── */}
      <div className="flex-1 overflow-auto px-4 py-6 pb-24 md:pb-6">
        <div className="max-w-[800px] mx-auto space-y-6 animate-fade-in">

          {/* ── Seção 1: Welcome Hero ─────────── */}
          <section>
            <h1 className="text-2xl font-light text-foreground tracking-tight">
              Simboraa, {firstName}! 🧲
            </h1>
            <p className="text-base text-muted-foreground mt-1">{greeting}</p>
            {!loading && contextualSummary && (
              <p className="text-sm text-muted-foreground mt-1">{contextualSummary}</p>
            )}
          </section>

          {/* ── Seção 2: Quick Actions ─────────── */}
          <section>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-thin snap-x snap-mandatory">
              <QuickActionCard
                icon={Sparkles}
                label="Novo Roteiro"
                sub="3 créditos"
                accent
                onClick={() => navigate('/kanban')}
              />
              <QuickActionCard
                icon={Bot}
                label="Meus Agentes"
                sub={`${agentCount} agentes`}
                onClick={() => navigate('/agents')}
              />
              <QuickActionCard
                icon={UserCircle}
                label="Meu Perfil"
                sub="Identidade"
                onClick={() => navigate('/profile')}
              />
            </div>
          </section>

          {/* ── Seção 3: Próximos Conteúdos ───── */}
          <section>
            <SectionHeader
              title="Próximos conteúdos"
              action="Ver todos"
              onAction={() => navigate('/kanban')}
            />
            {loading ? (
              <div className="flex gap-3 -mx-4 px-4 overflow-x-hidden">
                {[1, 2].map((i) => (
                  <div key={i} className="min-w-[260px] h-28 rounded-2xl bg-muted/40 animate-pulse flex-shrink-0" />
                ))}
              </div>
            ) : scripts.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-thin snap-x snap-mandatory">
                {scripts.map((script) => (
                  <ScriptCard key={script.id} script={script} onClick={() => navigate('/kanban')} />
                ))}
              </div>
            ) : (
              <EmptyScripts onCreate={() => navigate('/kanban')} />
            )}
          </section>

          {/* ── Seção 4: Identidade Magnética ─── */}
          <section>
            <SectionHeader title="Sua Identidade Magnética" />
            {loading ? (
              <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
            ) : (
              <IdentityCard
                voiceDna={identity.voiceDna}
                narrative={identity.narrative}
                formatProfile={identity.formatProfile}
                onComplete={() => setShowOnboardingManual(true)}
                onView={() => navigate('/profile')}
              />
            )}
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
