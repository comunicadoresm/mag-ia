import React from 'react';
import type { FeatureFlag } from '@/types/credits';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';
import { useCredits } from '@/hooks/useCredits';

interface FeatureGateProps {
  feature: FeatureFlag;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  /** If true, allows basic plan users with remaining credits */
  allowWithCredits?: boolean;
}

export function FeatureGate({ feature, fallback, children, allowWithCredits = true }: FeatureGateProps) {
  const { hasFeature, planType } = usePlanPermissions();
  const { balance } = useCredits();

  // Magnetic plan always has access
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Basic plan with trial credits for AI features
  if (allowWithCredits && planType === 'basic' && balance.total > 0) {
    const trialFeatures: FeatureFlag[] = ['script_ai_write', 'script_ai_adjust', 'ai_chat', 'ai_generation'];
    if (trialFeatures.includes(feature)) {
      return <>{children}</>;
    }
  }

  // Show fallback or nothing
  return fallback ? <>{fallback}</> : null;
}
