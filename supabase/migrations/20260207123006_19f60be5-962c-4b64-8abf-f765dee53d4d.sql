
-- =============================================
-- ÉPICO 1: Sistema de Créditos (Foundation)
-- =============================================

-- 1. Alterar tabela profiles com campos de plano
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'none' CHECK (plan_type IN ('none', 'basic', 'magnetic')),
  ADD COLUMN IF NOT EXISTS plan_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ac_tags TEXT[],
  ADD COLUMN IF NOT EXISTS last_ac_verification TIMESTAMPTZ;

-- 2. Tabela user_credits (carteira principal)
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_credits INTEGER DEFAULT 0,
  subscription_credits INTEGER DEFAULT 0,
  bonus_credits INTEGER DEFAULT 0,
  cycle_start_date TIMESTAMPTZ,
  cycle_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON public.user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all credits"
  ON public.user_credits FOR ALL
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Allow insert for the handle_new_user trigger or edge functions
CREATE POLICY "System can insert credits"
  ON public.user_credits FOR INSERT
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Tabela credit_transactions (log de movimentações)
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('consumption', 'plan_renewal', 'subscription_renewal', 'bonus_purchase', 'admin_adjustment')),
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_credit_tx_user ON public.credit_transactions(user_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.credit_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Tabela credit_subscriptions (assinaturas mensais extras)
CREATE TABLE public.credit_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('plus_20', 'plus_50', 'plus_100')),
  credits_per_month INTEGER NOT NULL,
  price_brl DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused')),
  next_renewal_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.credit_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
  ON public.credit_subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Tabela credit_purchases (compras avulsas)
CREATE TABLE public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  package TEXT NOT NULL CHECK (package IN ('avulso_10', 'avulso_25', 'avulso_40')),
  credits INTEGER NOT NULL,
  price_brl DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all purchases"
  ON public.credit_purchases FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Trigger para updated_at em user_credits
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Trigger para updated_at em credit_subscriptions
CREATE TRIGGER update_credit_subscriptions_updated_at
  BEFORE UPDATE ON public.credit_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Adicionar campos de billing na tabela agents
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'per_generation' CHECK (billing_type IN ('per_messages', 'per_generation')),
  ADD COLUMN IF NOT EXISTS credit_cost INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS message_package_size INTEGER DEFAULT 5;

-- 9. Habilitar realtime para user_credits (para badge ao vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits;
