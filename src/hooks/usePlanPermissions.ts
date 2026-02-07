import { useMemo, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { PlanType, FeatureFlag } from '@/types/credits';

const FEATURE_ACCESS: Record<FeatureFlag, PlanType[]> = {
  ai_generation: ['magnetic'],
  ai_chat: ['magnetic'],
  agents_page: ['magnetic'],
  chat_history: ['magnetic'],
  script_ai_write: ['basic', 'magnetic'], // basic has trial credits
  script_ai_adjust: ['basic', 'magnetic'], // basic has trial credits
};

export function usePlanPermissions() {
  const { profile } = useAuth();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const planType = useMemo<PlanType>(() => {
    return (profile as any)?.plan_type || 'none';
  }, [profile]);

  const hasFeature = useCallback((feature: FeatureFlag): boolean => {
    const allowedPlans = FEATURE_ACCESS[feature];
    if (!allowedPlans) return false;
    return allowedPlans.includes(planType);
  }, [planType]);

  const showUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(true);
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(false);
  }, []);

  return {
    planType,
    hasFeature,
    upgradeModalOpen,
    showUpgradeModal,
    hideUpgradeModal,
  };
}
