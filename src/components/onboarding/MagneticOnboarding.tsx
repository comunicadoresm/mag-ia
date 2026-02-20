import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';
import { supabase } from '@/integrations/supabase/client';
import { WelcomeStep } from './WelcomeStep';
import { VoiceDNASetup } from './VoiceDNASetup';
import { FormatQuizSetup } from './FormatQuizSetup';
import { NarrativeSetup } from './NarrativeSetup';
import { ProcessingStep } from './ProcessingStep';
import { FirstScriptSuggestion } from './FirstScriptSuggestion';
import { FirstScriptResult } from './FirstScriptResult';
import { toast } from 'sonner';

interface MagneticOnboardingProps {
  onboardingStep: string;
  onClose?: () => void;
}

export type OnboardingStep = 'basic_info' | 'voice_dna' | 'format_quiz' | 'narrative' | 'processing' | 'first_script' | 'completed';

interface ScriptSuggestion {
  title: string;
  style: string;
  style_label: string;
  format: string;
  duration: string;
  justification: string;
}

interface GeneratedScript {
  title: string;
  style: string;
  script_content: {
    inicio: { title: string; sections: { id: string; label: string; content: string }[] };
    desenvolvimento: { title: string; sections: { id: string; label: string; content: string }[] };
    final: { title: string; sections: { id: string; label: string; content: string }[] };
  };
}

// Wrapper de popup reutilizável
function OnboardingPopup({ children, scrollable = false }: { children: React.ReactNode; scrollable?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div
        className={`relative w-full max-w-md rounded-3xl shadow-2xl ${scrollable ? 'max-h-[88vh] flex flex-col overflow-hidden' : ''}`}
        style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {scrollable ? (
          <div className="overflow-y-auto flex-1">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function MagneticOnboarding({ onboardingStep, onClose }: MagneticOnboardingProps) {
  const { user, refreshProfile } = useAuth();
  const { planType } = usePlanPermissions();
  const [currentStep, setCurrentStep] = useState<string>(onboardingStep);
  const [suggestion, setSuggestion] = useState<ScriptSuggestion | null>(null);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [generating, setGenerating] = useState(false);

  const isMagnetic = ['magnetic', 'magnetic_pro', 'magnetico', 'magnetico_pro'].includes(planType);

  const handleProcessingComplete = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('generate-first-script', {
        body: { user_id: user.id, action: 'suggest' },
      });
      if (error) throw error;
      setSuggestion(data.suggestion);
      setCurrentStep('first_script');
    } catch (err) {
      console.error('Suggest error:', err);
      toast.error('Erro ao gerar sugestão. Você pode criar seu primeiro roteiro no Kanban.');
      if (user) {
        await supabase.from('profiles').update({ onboarding_step: 'completed', has_completed_setup: true } as any).eq('id', user.id);
        await refreshProfile();
        setCurrentStep('completed');
      }
    }
  }, [user, refreshProfile]);

  // Se veio de fora (onClose existe), o "completed" deve fechar sem alterar perfil
  if (!isMagnetic && !onClose) return null;
  if (currentStep === 'completed') {
    if (onClose) onClose();
    return null;
  }

  const goToStep = async (nextStep: string) => {
    if (!user) return;
    if (nextStep === 'completed') {
      if (onClose) { onClose(); return; }
    }
    if (nextStep !== 'processing') {
      await supabase.from('profiles').update({ onboarding_step: nextStep } as any).eq('id', user.id);
      await refreshProfile();
    }
    setCurrentStep(nextStep);
  };

  const handleGenerate = async () => {
    if (!user || !suggestion) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-first-script', {
        body: { user_id: user.id, action: 'generate', suggestion },
      });
      if (error) throw error;
      setGeneratedScript(data.script);
      setCurrentStep('script_result');
    } catch (err) {
      console.error('Generate error:', err);
      toast.error('Erro ao gerar roteiro. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGoToKanban = async () => {
    await goToStep('completed');
    await supabase.from('profiles').update({ has_completed_setup: true } as any).eq('id', user!.id);
    window.location.href = '/kanban';
  };

  const handleGoToHome = async () => {
    await goToStep('completed');
    await supabase.from('profiles').update({ has_completed_setup: true } as any).eq('id', user!.id);
  };

  if (currentStep === 'basic_info') {
    return (
      <OnboardingPopup>
        <WelcomeStep onNext={() => goToStep('voice_dna')} />
      </OnboardingPopup>
    );
  }

  if (currentStep === 'voice_dna') {
    const onDone = onClose ? onClose : () => goToStep('format_quiz');
    return (
      <OnboardingPopup scrollable>
        <VoiceDNASetup open={true} onComplete={onDone} onSkip={onDone} />
      </OnboardingPopup>
    );
  }

  if (currentStep === 'format_quiz') {
    const onDone = onClose ? onClose : () => goToStep('narrative');
    return (
      <OnboardingPopup scrollable>
        <FormatQuizSetup open={true} onComplete={onDone} onSkip={onDone} />
      </OnboardingPopup>
    );
  }

  if (currentStep === 'narrative') {
    const onDone = onClose ? onClose : () => goToStep('processing');
    return (
      <OnboardingPopup scrollable>
        <NarrativeSetup open={true} onComplete={onDone} onSkip={onDone} />
      </OnboardingPopup>
    );
  }

  if (currentStep === 'processing') {
    return (
      <OnboardingPopup>
        <ProcessingStep onComplete={handleProcessingComplete} />
      </OnboardingPopup>
    );
  }

  if (currentStep === 'first_script' && suggestion) {
    return (
      <OnboardingPopup scrollable>
        <FirstScriptSuggestion suggestion={suggestion} onGenerate={handleGenerate} onSkip={handleGoToHome} generating={generating} />
      </OnboardingPopup>
    );
  }

  if (currentStep === 'script_result' && generatedScript) {
    return (
      <OnboardingPopup scrollable>
        <FirstScriptResult script={generatedScript} suggestion={suggestion} onGoToKanban={handleGoToKanban} onGoToHome={handleGoToHome} />
      </OnboardingPopup>
    );
  }

  return null;
}
