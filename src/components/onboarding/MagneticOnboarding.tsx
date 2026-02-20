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

export function MagneticOnboarding({ onboardingStep }: MagneticOnboardingProps) {
  const { user, refreshProfile } = useAuth();
  const { planType } = usePlanPermissions();
  const [currentStep, setCurrentStep] = useState<string>(onboardingStep);
  const [suggestion, setSuggestion] = useState<ScriptSuggestion | null>(null);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [generating, setGenerating] = useState(false);

  const isMagnetic = ['magnetic', 'magnetic_pro', 'magnetico', 'magnetico_pro'].includes(planType);

  // Called when processing animation finishes — fetch suggestion from API
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
      // Skip to completed
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'completed', has_completed_setup: true } as any)
          .eq('id', user.id);
        await refreshProfile();
        setCurrentStep('completed');
      }
    }
  }, [user, refreshProfile]);

  if (!isMagnetic || currentStep === 'completed') return null;

  const goToStep = async (nextStep: string) => {
    if (!user) return;

    // 'processing' is transient — don't save to DB
    if (nextStep !== 'processing') {
      await supabase
        .from('profiles')
        .update({ onboarding_step: nextStep } as any)
        .eq('id', user.id);
      await refreshProfile();
    }

    setCurrentStep(nextStep);
  };

  const handleSkipAll = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ onboarding_step: 'completed', has_completed_setup: true } as any)
      .eq('id', user.id);
    await refreshProfile();
    setCurrentStep('completed');
    toast.info('Você pode configurar tudo depois em Perfil > Identidade Magnética.');
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
    await supabase
      .from('profiles')
      .update({ has_completed_setup: true } as any)
      .eq('id', user!.id);
    window.location.href = '/kanban';
  };

  const handleGoToHome = async () => {
    await goToStep('completed');
    await supabase
      .from('profiles')
      .update({ has_completed_setup: true } as any)
      .eq('id', user!.id);
  };

  // ═══ TELA 1: BOAS-VINDAS ═══
  if (currentStep === 'basic_info') {
    return (
      <div className="fixed inset-0 z-50">
        <WelcomeStep onNext={() => goToStep('voice_dna')} />
      </div>
    );
  }

  // ═══ TELA 2: VOICE DNA ═══
  if (currentStep === 'voice_dna') {
    return (
      <VoiceDNASetup
        open={true}
        onComplete={() => goToStep('format_quiz')}
        onSkip={() => goToStep('format_quiz')}
      />
    );
  }

  // ═══ TELA 3: FORMAT QUIZ ═══
  if (currentStep === 'format_quiz') {
    return (
      <FormatQuizSetup
        open={true}
        onComplete={() => goToStep('narrative')}
        onSkip={() => goToStep('narrative')}
      />
    );
  }

  // ═══ TELA 4: NARRATIVA ═══
  if (currentStep === 'narrative') {
    return (
      <NarrativeSetup
        open={true}
        onComplete={() => goToStep('processing')}
        onSkip={() => goToStep('processing')}
      />
    );
  }

  // ═══ TELA 5: PROCESSING ═══
  if (currentStep === 'processing') {
    return (
      <div className="fixed inset-0 z-50">
        <ProcessingStep onComplete={handleProcessingComplete} />
      </div>
    );
  }

  // ═══ TELA 6: SUGGESTION ═══
  if (currentStep === 'first_script' && suggestion) {
    return (
      <div className="fixed inset-0 z-50">
        <FirstScriptSuggestion
          suggestion={suggestion}
          onGenerate={handleGenerate}
          onSkip={handleGoToHome}
          generating={generating}
        />
      </div>
    );
  }

  // ═══ TELA 7: SCRIPT RESULT ═══
  if (currentStep === 'script_result' && generatedScript) {
    return (
      <div className="fixed inset-0 z-50 overflow-auto" style={{ background: '#0a0a0a' }}>
        <FirstScriptResult
          script={generatedScript}
          suggestion={suggestion}
          onGoToKanban={handleGoToKanban}
          onGoToHome={handleGoToHome}
        />
      </div>
    );
  }

  return null;
}
