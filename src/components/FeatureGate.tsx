import React from 'react';
import type { FeatureFlag } from '@/types/credits';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';
import { useCredits } from '@/hooks/useCredits';
import { useCreditsModals } from '@/contexts/CreditsModalContext';

interface FeatureGateProps {
  feature: FeatureFlag;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  /** If true, allows basic plan users with remaining credits */
  allowWithCredits?: boolean;
}

export function FeatureGate({ feature, fallback, children, allowWithCredits = true }: FeatureGateProps) {
  const { hasFeature } = usePlanPermissions();
  const { balance } = useCredits();
  const { showUpsell } = useCreditsModals();

  const hasAccess = hasFeature(feature) || (allowWithCredits && balance.total > 0);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show everything but intercept click with upgrade modal
  return (
    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); showUpsell(); }} className="cursor-pointer">
      {children}
    </div>
  );
}
