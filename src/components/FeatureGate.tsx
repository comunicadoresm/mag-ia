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

  // Any user with credits can access AI features (basic with trial, or bonus credits)
  if (allowWithCredits && balance.total > 0) {
    const creditFeatures: FeatureFlag[] = ['script_ai_write', 'script_ai_adjust', 'ai_chat', 'ai_generation'];
    if (creditFeatures.includes(feature)) {
      return <>{children}</>;
    }
  }

  // Show fallback or nothing
  return fallback ? <>{fallback}</> : null;
}
