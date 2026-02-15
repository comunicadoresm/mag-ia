import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureFlag } from '@/types/credits';

export type DynamicPlanType = {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  can_buy_extra_credits: boolean;
  has_monthly_renewal: boolean;
  show_as_upsell: boolean;
  color: string;
};

export function usePlanPermissions() {
  const { profile } = useAuth();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [userPlan, setUserPlan] = useState<DynamicPlanType | null>(null);
  const [allPlans, setAllPlans] = useState<DynamicPlanType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanData = async () => {
      // Fetch all plans
      const { data: plans } = await supabase
        .from('plan_types')
        .select('id, slug, name, display_order, can_buy_extra_credits, has_monthly_renewal, show_as_upsell, color')
        .eq('is_active', true)
        .order('display_order');

      if (plans) setAllPlans(plans as DynamicPlanType[]);

      // Get user's plan_type_id from profile
      const planTypeId = (profile as any)?.plan_type_id;
      const planSlug = profile?.plan_type;

      let currentPlan: DynamicPlanType | null = null;
      if (planTypeId && plans) {
        currentPlan = plans.find(p => p.id === planTypeId) || null;
      }
      // Fallback to slug match
      if (!currentPlan && planSlug && plans) {
        currentPlan = plans.find(p => p.slug === planSlug) || null;
      }
      setUserPlan(currentPlan);

      // Fetch features for user's plan
      if (currentPlan) {
        const { data: feats } = await supabase
          .from('plan_features')
          .select('feature_slug')
          .eq('plan_type_id', currentPlan.id)
          .eq('is_enabled', true);
        if (feats) setFeatures(feats.map(f => f.feature_slug));
      } else {
        setFeatures([]);
      }
      setLoading(false);
    };
    fetchPlanData();
  }, [profile]);

  const planType = useMemo(() => {
    return userPlan?.slug || (profile?.plan_type as string) || 'none';
  }, [userPlan, profile]);

  const hasFeature = useCallback((feature: FeatureFlag): boolean => {
    return features.includes(feature);
  }, [features]);

  const canBuyCredits = useMemo(() => userPlan?.can_buy_extra_credits ?? false, [userPlan]);
  const hasMonthlyRenewal = useMemo(() => userPlan?.has_monthly_renewal ?? false, [userPlan]);

  // Plans that can be shown as upsell (higher than current)
  const upsellPlans = useMemo(() => {
    const currentOrder = userPlan?.display_order ?? 0;
    return allPlans.filter(p => p.show_as_upsell && p.display_order > currentOrder);
  }, [allPlans, userPlan]);

  const showUpgradeModal = useCallback(() => setUpgradeModalOpen(true), []);
  const hideUpgradeModal = useCallback(() => setUpgradeModalOpen(false), []);

  return {
    planType,
    userPlan,
    allPlans,
    hasFeature,
    canBuyCredits,
    hasMonthlyRenewal,
    upsellPlans,
    upgradeModalOpen,
    showUpgradeModal,
    hideUpgradeModal,
    loading,
  };
}
