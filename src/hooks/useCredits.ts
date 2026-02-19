import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CreditBalance, CreditAction, ConsumeResult } from '@/types/credits';

export function useCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreditBalance>({ plan: 0, subscription: 0, bonus: 0, total: 0 });
  const [cycleEndDate, setCycleEndDate] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [planTypeId, setPlanTypeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setBalance({ plan: 0, subscription: 0, bonus: 0, total: 0 });
      setIsLoading(false);
      return;
    }

    try {
      const [creditsRes, profileRes] = await Promise.all([
        supabase
          .from('user_credits')
          .select('plan_credits, subscription_credits, bonus_credits, cycle_end_date')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('plan_type, plan_type_id')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (creditsRes.error) {
        console.error('Error fetching credits:', creditsRes.error);
        return;
      }

      if (creditsRes.data) {
        const d = creditsRes.data;
        setBalance({
          plan: d.plan_credits ?? 0,
          subscription: d.subscription_credits ?? 0,
          bonus: d.bonus_credits ?? 0,
          total: (d.plan_credits ?? 0) + (d.subscription_credits ?? 0) + (d.bonus_credits ?? 0),
        });
        setCycleEndDate(d.cycle_end_date);
      }
      if (profileRes.data) {
        setPlanType(profileRes.data.plan_type);
        setPlanTypeId((profileRes.data as any).plan_type_id ?? null);
      }
    } catch (err) {
      console.error('Error in fetchBalance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Realtime subscription on user_credits
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-credits-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (data) {
            setBalance({
              plan: data.plan_credits ?? 0,
              subscription: data.subscription_credits ?? 0,
              bonus: data.bonus_credits ?? 0,
              total: (data.plan_credits ?? 0) + (data.subscription_credits ?? 0) + (data.bonus_credits ?? 0),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const consumeCredits = useCallback(async (
    action: CreditAction,
    metadata?: Record<string, any>
  ): Promise<ConsumeResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('consume-credits', {
        body: { action, metadata },
      });

      if (error) {
        return {
          success: false,
          credits_consumed: 0,
          balance,
          error: 'insufficient_credits',
          message: 'Seus créditos acabaram!',
        };
      }

      if (data?.balance) {
        setBalance(data.balance);
      }

      return data as ConsumeResult;
    } catch (err) {
      console.error('Error consuming credits:', err);
      return {
        success: false,
        credits_consumed: 0,
        balance,
        error: 'unknown',
        message: 'Erro ao consumir créditos',
      };
    }
  }, [balance]);

  // canUseAI: has any credits OR is on a plan with monthly renewal
  const canUseAI = balance.total > 0;

  return {
    balance,
    cycleEndDate,
    planType,
    planTypeId,
    canUseAI,
    isLoading,
    consumeCredits,
    refreshBalance: fetchBalance,
  };
}
