// Credit system types
export type PlanType = 'none' | 'basic' | 'magnetic';

export type CreditAction = 'script_generation' | 'script_adjustment' | 'chat_messages';

export interface CreditBalance {
  plan: number;
  subscription: number;
  bonus: number;
  total: number;
}

export interface ConsumeResult {
  success: boolean;
  credits_consumed: number;
  balance: CreditBalance;
  error?: string;
  message?: string;
  required?: number;
}

export interface UserCredits {
  id: string;
  user_id: string;
  plan_credits: number;
  subscription_credits: number;
  bonus_credits: number;
  cycle_start_date: string | null;
  cycle_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type FeatureFlag =
  | 'ai_generation'
  | 'ai_chat'
  | 'agents_page'
  | 'chat_history'
  | 'script_ai_write'
  | 'script_ai_adjust';
