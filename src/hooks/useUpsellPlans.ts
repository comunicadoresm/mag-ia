import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UpsellPlanData {
  id: string;
  type: string;
  name: string;
  description: string | null;
  credits: number;
  credits_label: string | null;
  price_brl: number;
  price_label: string | null;
  per_credit_label: string | null;
  hotmart_url: string;
  button_text: string;
  badge_text: string | null;
  features: string[];
  display_order: number;
  is_active: boolean;
}

export function useUpsellPlans() {
  const [plans, setPlans] = useState<UpsellPlanData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('upsell_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (!error && data) {
        setPlans(data.map(p => ({
          ...p,
          features: Array.isArray(p.features) ? p.features as string[] : [],
        })));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const magnetic = plans.find(p => p.type === 'magnetic') || null;
  const subscriptions = plans.filter(p => p.type === 'subscription');
  const packages = plans.filter(p => p.type === 'package');

  return { plans, magnetic, subscriptions, packages, loading };
}
