import { useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { FeatureFlag, DynamicPlan } from '@/types/credits';

export type { DynamicPlan as DynamicPlanType };

export function usePlanPermissions() {
  const { profile } = useAuth();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [userPlan, setUserPlan] = useState<DynamicPlan | null>(null);
  const [allPlans, setAllPlans] = useState<DynamicPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanData = async () => {
      setLoading(true);

      // Fetch ALL active plans from DB (dynamic — no hardcoded slugs)
      const { data: plans } = await supabase
        .from('plan_types')
        .select('id, slug, name, display_order, can_buy_extra_credits, has_monthly_renewal, show_as_upsell, color, initial_credits, monthly_credits')
        .eq('is_active', true)
        .order('display_order');

      if (plans) setAllPlans(plans as DynamicPlan[]);

      // Resolve user's current plan — prefer plan_type_id (UUID), fallback to plan_type (slug)
      const planTypeId = (profile as any)?.plan_type_id;
      const planSlug = (profile as any)?.plan_type;

      let currentPlan: DynamicPlan | null = null;

      if (planTypeId && plans) {
        currentPlan = plans.find(p => p.id === planTypeId) || null;
      }
      // Fallback: match by slug
      if (!currentPlan && planSlug && planSlug !== 'none' && plans) {
        currentPlan = plans.find(p => p.slug === planSlug) || null;
      }

      setUserPlan(currentPlan);

      // Fetch features enabled for the user's plan
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

  // planType is the slug string (dynamic, e.g. 'basic', 'magnetic', 'magnetic_pro', ...)
  // or 'none' if no plan assigned
  const planType = useMemo(() => {
    return userPlan?.slug || (profile as any)?.plan_type || 'none';
  }, [userPlan, profile]);

  const hasFeature = useCallback((feature: FeatureFlag): boolean => {
    return features.includes(feature);
  }, [features]);

  const canBuyCredits = useMemo(() => userPlan?.can_buy_extra_credits ?? false, [userPlan]);
  const hasMonthlyRenewal = useMemo(() => userPlan?.has_monthly_renewal ?? false, [userPlan]);

  // Plans shown as upsell options (higher display_order than current plan)
  const upsellPlans = useMemo(() => {
    const currentOrder = userPlan?.display_order ?? 0;
    return allPlans.filter(p => p.show_as_upsell && p.display_order > currentOrder);
  }, [allPlans, userPlan]);

  // Next immediate upsell plan (one level above current)
  const nextUpsellPlan = useMemo(() => {
    return upsellPlans.length > 0 ? upsellPlans[0] : null;
  }, [upsellPlans]);

  // Whether the user has any active plan (not 'none')
  const hasPlan = useMemo(() => !!userPlan, [userPlan]);

  // Whether the user is on the highest available plan
  const isTopPlan = useMemo(() => {
    if (!userPlan || allPlans.length === 0) return false;
    const maxOrder = Math.max(...allPlans.map(p => p.display_order));
    return userPlan.display_order >= maxOrder;
  }, [userPlan, allPlans]);

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
    nextUpsellPlan,
    hasPlan,
    isTopPlan,
    upgradeModalOpen,
    showUpgradeModal,
    hideUpgradeModal,
    loading,
  };
}
