import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sparkles, User, Loader2, CheckCircle2,
  ChevronRight, Mic, LayoutGrid, BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VoiceDNASetup } from './VoiceDNASetup';
import { FormatQuizSetup } from './FormatQuizSetup';
import { NarrativeSetup } from './NarrativeSetup';
import { cn } from '@/lib/utils';

interface MagneticOnboardingProps {
  open: boolean;
}

type OnboardingStep = 'profile' | 'voice_dna' | 'format_quiz' | 'narrative' | 'done';

const STEPS = [
  { id: 'profile',      icon: User,       label: 'Perfil' },
  { id: 'voice_dna',   icon: Mic,        label: 'DNA de Voz' },
  { id: 'format_quiz', icon: LayoutGrid, label: 'Formato' },
  { id: 'narrative',   icon: BookOpen,   label: 'Narrativa' },
];

export function MagneticOnboarding({ open }: MagneticOnboardingProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<OnboardingStep>('profile');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  // ── Step 1: Save profile info ──────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user || !name.trim()) return;
    setSavingProfile(true);
    try {
      const cleanHandle = handle.trim().replace(/^@/, '');
      await supabase
        .from('profiles')
        .update({ name: name.trim() } as any)
        .eq('id', user.id);

      if (cleanHandle) {
        await supabase.from('user_metrics').upsert(
          { user_id: user.id, handle: cleanHandle },
          { onConflict: 'user_id' }
        );
      }

      await refreshProfile();
      setStep('voice_dna');
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Skip (closes modal but shows again next login) ──────────────────
  const handleSkipSession = async () => {
    if (user && name.trim()) {
      await supabase.from('profiles').update({ name: name.trim() } as any).eq('id', user.id);
      await refreshProfile();
    }
    // Store session flag so the modal doesn't reappear within THIS tab session only
    sessionStorage.setItem('setup_skipped_this_session', '1');
    await refreshProfile();
  };

  // ── Mark setup complete ─────────────────────────────────────────────
  const handleComplete = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ has_completed_setup: true } as any)
      .eq('id', user.id);
    await supabase.from('user_metrics').upsert(
      { user_id: user.id, initial_setup_done: true },
      { onConflict: 'user_id' }
    );
    await refreshProfile();
    setStep('done');
  };

  // ── Identity step handlers ──────────────────────────────────────────
  const handleVoiceDone = () => setStep('format_quiz');
  const handleFormatDone = () => setStep('narrative');
  const handleNarrativeDone = async () => { await handleComplete(); };
  const handleVoiceSkip = () => setStep('format_quiz');
  const handleFormatSkip = () => setStep('narrative');
  const handleNarrativeSkip = async () => { await handleComplete(); };

  // ── Done screen ─────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <Dialog open={open} modal>
        <DialogContent
          className="max-w-sm [&>button.absolute]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Identidade configurada! 🧲</h2>
            <p className="text-sm text-muted-foreground">
              Sua IA já sabe quem você é. Agora é só criar conteúdo magnético.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Começar a criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Delegate to existing modals ─────────────────────────────────────
  if (step === 'voice_dna') {
    return <VoiceDNASetup open={open} onComplete={handleVoiceDone} onSkip={handleVoiceSkip} />;
  }
  if (step === 'format_quiz') {
    return <FormatQuizSetup open={open} onComplete={handleFormatDone} onSkip={handleFormatSkip} />;
  }
  if (step === 'narrative') {
    return <NarrativeSetup open={open} onComplete={handleNarrativeDone} onSkip={handleNarrativeSkip} />;
  }

  // ── Step 1: Profile ─────────────────────────────────────────────────
  return (
    <Dialog open={open} modal>
      <DialogContent
        className="max-w-md [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                'w-full h-1 rounded-full transition-all duration-300',
                i < currentStepIndex ? 'bg-primary' :
                i === currentStepIndex ? 'bg-primary/50' : 'bg-muted'
              )} />
              <span className={cn(
                'text-[10px] font-medium hidden sm:block',
                i === currentStepIndex ? 'text-primary' : 'text-muted-foreground/60'
              )}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="text-center mt-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Bem-vindo à Magnetic.IA! 🧲</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            4 passos rápidos pra IA te conhecer de verdade.
          </p>
        </div>

        {/* Steps preview */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < currentStepIndex;
            const isActive = i === currentStepIndex;
            return (
              <div key={s.id} className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-xl text-center',
                isActive ? 'bg-primary/10 border border-primary/30' :
                isDone ? 'bg-muted/50' : 'bg-muted/20 opacity-50'
              )}>
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center',
                  isActive ? 'bg-primary/20' : 'bg-muted'
                )}>
                  {isDone
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    : <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  }
                </div>
                <p className={cn(
                  'text-[10px] font-medium leading-tight',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="setup-name" className="text-sm font-medium">
              Qual é o seu nome? <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="setup-name"
                placeholder="Ex: Maria Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleSaveProfile()}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="setup-handle" className="text-sm font-medium">
              Seu @ do Instagram
              <span className="text-xs text-muted-foreground font-normal ml-1">(opcional)</span>
            </Label>
            <div className="relative">
              {/* Instagram logo prefix */}
              <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3 pr-2.5 border-r border-border/50 pointer-events-none">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
                  <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.5" fill="none" />
                  <circle cx="17" cy="7" r="1" fill="white" />
                  <defs>
                    <linearGradient id="ig-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F58529" />
                      <stop offset="0.5" stopColor="#DD2A7B" />
                      <stop offset="1" stopColor="#8134AF" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="absolute left-11 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none">@</div>
              <Input
                id="setup-handle"
                placeholder="seuperfil"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/^@/, ''))}
                className="pl-[3.75rem]"
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleSaveProfile()}
              />
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={!name.trim() || savingProfile}
            className="w-full gap-2"
          >
            {savingProfile
              ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
              : <>Continuar <ChevronRight className="w-4 h-4" /></>
            }
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkipSession}
            disabled={savingProfile}
            className="w-full text-muted-foreground text-sm"
          >
            Preencher depois
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
