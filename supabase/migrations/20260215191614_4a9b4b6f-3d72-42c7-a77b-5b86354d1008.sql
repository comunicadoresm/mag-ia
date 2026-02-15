
-- PASSO 1.1: Criar tabela plan_types
CREATE TABLE public.plan_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  ac_tag TEXT NOT NULL,
  initial_credits INTEGER DEFAULT 0,
  credits_expire_days INTEGER,
  has_monthly_renewal BOOLEAN DEFAULT FALSE,
  monthly_credits INTEGER DEFAULT 0,
  can_buy_extra_credits BOOLEAN DEFAULT FALSE,
  show_as_upsell BOOLEAN DEFAULT FALSE,
  upsell_price_label TEXT,
  upsell_badge_text TEXT,
  upsell_button_text TEXT DEFAULT 'Fazer Upgrade',
  upsell_hotmart_url TEXT,
  upsell_features JSONB DEFAULT '[]',
  hotmart_product_id TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.plan_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plan types" ON public.plan_types FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage plan types" ON public.plan_types FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Dados iniciais
INSERT INTO public.plan_types (slug, name, description, display_order, ac_tag, initial_credits, credits_expire_days, has_monthly_renewal, monthly_credits, can_buy_extra_credits, show_as_upsell, upsell_price_label, upsell_badge_text, upsell_button_text, upsell_hotmart_url, upsell_features, color)
VALUES
  ('basic', 'Básico', 'Acesso ao Kanban e créditos trial de IA', 1, 'MAGNETIC-IA-BASICO', 10, 60, false, 0, false, false, NULL, NULL, 'Fazer Upgrade', NULL, '[]', '#6B7280'),
  ('magnetic', 'Magnético', 'IA completa com 30 créditos/mês', 2, 'MAGNETIC-IA-PRO', 30, NULL, true, 30, true, true, 'R$ 197/ano', 'MAIS POPULAR', 'Fazer Upgrade', '', '["Acesso a todos os agentes", "30 créditos/mês renováveis", "Histórico de conversas", "Compra de créditos extras"]', '#6366f1'),
  ('magnetic_pro', 'Magnético Pro', 'IA completa com 50 créditos/mês e acesso total', 3, 'MAGNETIC-IA-PRO-PLUS', 50, NULL, true, 50, true, true, 'R$ 397/ano', 'MELHOR CUSTO', 'Fazer Upgrade', '', '["Tudo do Magnético", "50 créditos/mês renováveis", "Acesso exclusivo a agentes Pro", "Prioridade em novos recursos"]', '#8B5CF6');

-- PASSO 1.2: Criar tabela plan_features
CREATE TABLE public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type_id UUID NOT NULL REFERENCES public.plan_types(id) ON DELETE CASCADE,
  feature_slug TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_type_id, feature_slug)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan features" ON public.plan_features FOR SELECT USING (true);
CREATE POLICY "Admins can manage plan features" ON public.plan_features FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserir features para cada plano
DO $$
DECLARE
  v_basic_id UUID;
  v_magnetic_id UUID;
  v_pro_id UUID;
BEGIN
  SELECT id INTO v_basic_id FROM public.plan_types WHERE slug = 'basic';
  SELECT id INTO v_magnetic_id FROM public.plan_types WHERE slug = 'magnetic';
  SELECT id INTO v_pro_id FROM public.plan_types WHERE slug = 'magnetic_pro';

  -- Básico
  INSERT INTO public.plan_features (plan_type_id, feature_slug) VALUES
    (v_basic_id, 'kanban_full'),
    (v_basic_id, 'dashboard'),
    (v_basic_id, 'agents_page'),
    (v_basic_id, 'ai_generation'),
    (v_basic_id, 'ai_chat'),
    (v_basic_id, 'script_ai_write'),
    (v_basic_id, 'script_ai_adjust');

  -- Magnético
  INSERT INTO public.plan_features (plan_type_id, feature_slug) VALUES
    (v_magnetic_id, 'kanban_full'),
    (v_magnetic_id, 'dashboard'),
    (v_magnetic_id, 'agents_page'),
    (v_magnetic_id, 'ai_generation'),
    (v_magnetic_id, 'ai_chat'),
    (v_magnetic_id, 'script_ai_write'),
    (v_magnetic_id, 'script_ai_adjust'),
    (v_magnetic_id, 'chat_history');

  -- Magnético Pro
  INSERT INTO public.plan_features (plan_type_id, feature_slug) VALUES
    (v_pro_id, 'kanban_full'),
    (v_pro_id, 'dashboard'),
    (v_pro_id, 'agents_page'),
    (v_pro_id, 'ai_generation'),
    (v_pro_id, 'ai_chat'),
    (v_pro_id, 'script_ai_write'),
    (v_pro_id, 'script_ai_adjust'),
    (v_pro_id, 'chat_history');
END $$;

-- PASSO 1.3: Criar tabela agent_plan_access
CREATE TABLE public.agent_plan_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  plan_type_id UUID NOT NULL REFERENCES public.plan_types(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, plan_type_id)
);

ALTER TABLE public.agent_plan_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agent plan access" ON public.agent_plan_access FOR SELECT USING (true);
CREATE POLICY "Admins can manage agent plan access" ON public.agent_plan_access FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- PASSO 1.4: Criar tabela credit_packages
CREATE TABLE public.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  credits_amount INTEGER NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('one_time', 'recurring')),
  credits_expire_days INTEGER,
  price_brl NUMERIC NOT NULL,
  price_label TEXT,
  per_credit_label TEXT,
  hotmart_url TEXT,
  hotmart_product_id TEXT,
  badge_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  min_plan_order INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packages" ON public.credit_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage credit packages" ON public.credit_packages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Dados iniciais credit_packages
INSERT INTO public.credit_packages (name, credits_amount, package_type, price_brl, price_label, per_credit_label, credits_expire_days, min_plan_order, display_order, badge_text)
VALUES
  ('+20 Créditos/mês', 20, 'recurring', 27.00, 'R$ 27/mês', 'R$ 1,35/crédito', 30, 2, 1, NULL),
  ('+50 Créditos/mês', 50, 'recurring', 47.00, 'R$ 47/mês', 'R$ 0,94/crédito', 30, 2, 2, 'MAIS POPULAR'),
  ('+100 Créditos/mês', 100, 'recurring', 77.00, 'R$ 77/mês', 'R$ 0,77/crédito', 30, 2, 3, 'MELHOR CUSTO'),
  ('+10 Créditos', 10, 'one_time', 19.90, 'R$ 19,90', 'R$ 1,99/crédito', NULL, 2, 4, NULL),
  ('+25 Créditos', 25, 'one_time', 39.90, 'R$ 39,90', 'R$ 1,60/crédito', NULL, 2, 5, 'MAIS VENDIDO'),
  ('+40 Créditos', 40, 'one_time', 59.90, 'R$ 59,90', 'R$ 1,50/crédito', NULL, 2, 6, NULL);

-- PASSO 1.5: Adicionar plan_type_id em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type_id UUID REFERENCES public.plan_types(id);

-- PASSO 1.6: Adicionar plan_credits_expire_at em user_credits
ALTER TABLE public.user_credits ADD COLUMN IF NOT EXISTS plan_credits_expire_at TIMESTAMP WITH TIME ZONE;

-- PASSO 1.7: Migrar dados existentes
UPDATE public.profiles SET plan_type_id = (SELECT id FROM public.plan_types WHERE slug = 'basic') WHERE plan_type = 'basic' AND plan_type_id IS NULL;
UPDATE public.profiles SET plan_type_id = (SELECT id FROM public.plan_types WHERE slug = 'magnetic') WHERE plan_type = 'magnetic' AND plan_type_id IS NULL;

-- Criar tabela webhook_logs para Hotmart
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'hotmart',
  event_type TEXT,
  payload JSONB,
  status TEXT DEFAULT 'received',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage webhook logs" ON public.webhook_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
