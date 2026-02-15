import React from 'react';
import type { FeatureFlag } from '@/types/credits';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';
import { useCredits } from '@/hooks/useCredits';
import { useCreditsModals } from '@/contexts/CreditsModalContext';

interface FeatureGateProps {
  feature: FeatureFlag;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  allowWithCredits?: boolean;
}

export function FeatureGate({ feature, fallback, children, allowWithCredits = true }: FeatureGateProps) {
  const { hasFeature, canBuyCredits, hasMonthlyRenewal } = usePlanPermissions();
  const { balance } = useCredits();
  const { showUpsell, showBuyCredits } = useCreditsModals();

  const featureEnabled = hasFeature(feature);
  const hasCredits = balance.total > 0;

  // Feature enabled + (has monthly renewal OR has credits)
  const hasAccess = featureEnabled && (hasMonthlyRenewal || hasCredits || !allowWithCredits);

  if (hasAccess || (featureEnabled && allowWithCredits && hasCredits)) {
    return <>{children}</>;
  }

  // Intercept click
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!featureEnabled) {
      // Feature not in plan → show upgrade
      showUpsell();
    } else if (!hasCredits) {
      // Feature in plan but no credits
      if (canBuyCredits) {
        showBuyCredits();
      } else {
        showUpsell();
      }
    }
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      {children}
    </div>
  );
}
