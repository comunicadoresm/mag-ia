import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';
import { supabase } from '@/integrations/supabase/client';
import { User, Mic, FileText, BookOpen } from 'lucide-react';
import { BasicInfoFlow } from './BasicInfoFlow';
import { VoiceDNASetup } from './VoiceDNASetup';
import { FormatQuizSetup } from './FormatQuizSetup';
import { NarrativeSetup } from './NarrativeSetup';
import { FirstScriptFlow } from './FirstScriptFlow';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import logoSymbol from '@/assets/logo-symbol.png';

const STEPS = [
  { key: 'basic_info', label: 'Perfil', icon: User },
  { key: 'voice_dna', label: 'DNA de Voz', icon: Mic },
  { key: 'format_quiz', label: 'Formato', icon: FileText },
  { key: 'narrative', label: 'Narrativa', icon: BookOpen },
];

export type OnboardingStep = 'basic_info' | 'voice_dna' | 'format_quiz' | 'narrative' | 'first_script' | 'completed';

interface MagneticOnboardingProps {
  onboardingStep: string;
}

export function MagneticOnboarding({ onboardingStep }: MagneticOnboardingProps) {
  const { user, refreshProfile } = useAuth();
  const { planType } = usePlanPermissions();
  const [currentStep, setCurrentStep] = useState(onboardingStep);
  const [isAnimating, setIsAnimating] = useState(false);

  const isMagnetic = ['magnetic', 'magnetic_pro', 'magnetico', 'magnetico_pro'].includes(planType);

  if (!isMagnetic || currentStep === 'completed') return null;

  const goToStep = async (nextStep: string) => {
    if (!user) return;
    setIsAnimating(true);

    await supabase
      .from('profiles')
      .update({ onboarding_step: nextStep } as any)
      .eq('id', user.id);

    setTimeout(() => {
      setCurrentStep(nextStep);
      setIsAnimating(false);
    }, 300);

    await refreshProfile();
  };

  // ===== FIRST SCRIPT (fullscreen separada, sem header de progresso) =====
  if (currentStep === 'first_script') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <main className="flex-1 overflow-auto">
          <div className="max-w-lg mx-auto px-4 py-6">
            <FirstScriptFlow
              onComplete={() => goToStep('completed')}
              onSkip={() => goToStep('completed')}
            />
          </div>
        </main>
      </div>
    );
  }

  // ===== VOICE DNA, FORMAT QUIZ, NARRATIVE — delegate to existing Dialog components =====
  if (currentStep === 'voice_dna') {
    return (
      <VoiceDNASetup
        open={true}
        onComplete={() => goToStep('format_quiz')}
        onSkip={() => goToStep('format_quiz')}
      />
    );
  }

  if (currentStep === 'format_quiz') {
    return (
      <FormatQuizSetup
        open={true}
        onComplete={() => goToStep('narrative')}
        onSkip={() => goToStep('narrative')}
      />
    );
  }

  if (currentStep === 'narrative') {
    return (
      <NarrativeSetup
        open={true}
        onComplete={() => goToStep('first_script')}
        onSkip={() => goToStep('first_script')}
      />
    );
  }

  // ===== BASIC INFO — now as a Dialog/popup like the other steps =====
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <Dialog open={true}>
      <DialogContent
        className={cn(
          'max-w-md [&>button.absolute]:hidden transition-opacity duration-300',
          isAnimating ? 'opacity-0' : 'opacity-100'
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Logo CM no topo da modal */}
        <div className="flex items-center justify-center mb-2">
          <img src={logoSymbol} alt="Comunicadores Magnéticos" className="w-8 h-8 object-contain" />
        </div>

        {/* Progress bar — same style as other steps */}
        <div className="flex items-center gap-1.5 mb-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn(
                  'w-full h-1 rounded-full transition-all duration-300',
                  i < currentIndex ? 'bg-primary' :
                  i === currentIndex ? 'bg-primary/50' : 'bg-muted'
                )} />
                <span className={cn(
                  'text-[10px] font-medium hidden sm:block',
                  i === currentIndex ? 'text-primary' : 'text-muted-foreground/60'
                )}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-2">
          <BasicInfoFlow onComplete={() => goToStep('voice_dna')} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
