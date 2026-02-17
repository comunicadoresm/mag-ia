import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Mic, FileText, BookOpen, Check, Sparkles } from 'lucide-react';
import { VoiceDNAFlow } from './VoiceDNAFlow';
import { FormatQuizFlow } from './FormatQuizFlow';
import { NarrativeFlow } from './NarrativeFlow';
import { toast } from 'sonner';

interface MagneticOnboardingProps {
  onboardingStep: string;
}

const STEPS = [
  { key: 'voice_dna', label: 'DNA de Voz', icon: Mic, description: 'Seu jeito de falar' },
  { key: 'format_quiz', label: 'Formato', icon: FileText, description: 'Seu estilo de gravar' },
  { key: 'narrative', label: 'Narrativa', icon: BookOpen, description: 'Sua história' },
];

export function MagneticOnboarding({ onboardingStep }: MagneticOnboardingProps) {
  const { user, refreshProfile } = useAuth();
  const { planType } = usePlanPermissions();
  const [currentStep, setCurrentStep] = useState(onboardingStep);
  const [isAnimating, setIsAnimating] = useState(false);

  const isMagnetic = ['magnetic', 'magnetic_pro', 'magnetico', 'magnetico_pro'].includes(planType);

  if (!isMagnetic || currentStep === 'completed' || currentStep === 'basic_info') return null;

  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  const goToStep = async (nextStep: string) => {
    if (!user) return;
    setIsAnimating(true);

    await supabase
      .from('profiles')
      .update({ onboarding_step: nextStep })
      .eq('id', user.id);

    setTimeout(() => {
      setCurrentStep(nextStep);
      setIsAnimating(false);
    }, 300);

    await refreshProfile();
  };

  const handleSkipAll = async () => {
    await goToStep('completed');
    toast.info('Você pode configurar tudo depois em Perfil > Identidade Magnética.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* ===== HEADER COM PROGRESSO ===== */}
      <header className="border-b border-border/30 bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-foreground">
                Identidade Magnética
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Configurar depois
            </Button>
          </div>

          {/* Step indicators */}
          <div className="flex gap-2">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === currentIndex;
              const isDone = i < currentIndex;

              return (
                <div key={step.key} className="flex-1">
                  <div className={`
                    h-1.5 rounded-full transition-all duration-500
                    ${isDone ? 'bg-primary' : isActive ? 'bg-primary/50' : 'bg-muted/30'}
                  `} />
                  <div className={`
                    flex items-center gap-1.5 mt-1.5 transition-opacity
                    ${isActive ? 'opacity-100' : 'opacity-40'}
                  `}>
                    {isDone ? (
                      <Check className="w-3 h-3 text-primary" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                    <span className="text-[10px] font-medium truncate">
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ===== CONTEÚDO DO STEP ===== */}
      <main className={`
        flex-1 overflow-auto transition-opacity duration-300
        ${isAnimating ? 'opacity-0' : 'opacity-100'}
      `}>
        <div className="max-w-lg mx-auto px-4 py-6">
          {currentStep === 'voice_dna' && (
            <VoiceDNAFlow
              onComplete={() => goToStep('format_quiz')}
              onSkip={() => goToStep('format_quiz')}
            />
          )}

          {currentStep === 'format_quiz' && (
            <FormatQuizFlow
              onComplete={() => goToStep('narrative')}
              onSkip={() => goToStep('narrative')}
            />
          )}

          {currentStep === 'narrative' && (
            <NarrativeFlow
              onComplete={() => goToStep('completed')}
              onSkip={() => goToStep('completed')}
            />
          )}
        </div>
      </main>
    </div>
  );
}
