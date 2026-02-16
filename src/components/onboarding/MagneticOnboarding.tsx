import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';
import { supabase } from '@/integrations/supabase/client';
import { VoiceDNASetup } from './VoiceDNASetup';
import { FormatQuizSetup } from './FormatQuizSetup';
import { NarrativeSetup } from './NarrativeSetup';

interface MagneticOnboardingProps {
  onboardingStep: string;
}

export function MagneticOnboarding({ onboardingStep }: MagneticOnboardingProps) {
  const { user, refreshProfile } = useAuth();
  const { planType } = usePlanPermissions();
  const [currentStep, setCurrentStep] = useState(onboardingStep);

  // Only show for magnetic plans
  const isMagnetic = planType === 'magnetic' || planType === 'magnetic_pro' || planType === 'magnetico' || planType === 'magnetico_pro';
  
  if (!isMagnetic || currentStep === 'completed' || currentStep === 'basic_info') return null;

  const updateStep = async (nextStep: string) => {
    if (!user) return;
    await supabase.from('profiles').update({ onboarding_step: nextStep } as any).eq('id', user.id);
    setCurrentStep(nextStep);
    await refreshProfile();
  };

  // Voice DNA step
  if (currentStep === 'voice_dna') {
    return (
      <VoiceDNASetup
        open
        onComplete={() => updateStep('format_quiz')}
        onSkip={() => updateStep('format_quiz')}
      />
    );
  }

  // Format Quiz step
  if (currentStep === 'format_quiz') {
    return (
      <FormatQuizSetup
        open
        onComplete={() => updateStep('narrative')}
        onSkip={() => updateStep('narrative')}
      />
    );
  }

  // Narrative step
  if (currentStep === 'narrative') {
    return (
      <NarrativeSetup
        open
        onComplete={() => updateStep('completed')}
        onSkip={() => updateStep('completed')}
      />
    );
  }

  return null;
}
