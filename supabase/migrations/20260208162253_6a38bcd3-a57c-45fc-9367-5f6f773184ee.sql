
-- Table to store all upsell/purchase plan configurations
CREATE TABLE public.upsell_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('magnetic', 'subscription', 'package')),
  name TEXT NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL DEFAULT 0,
  credits_label TEXT, -- e.g. "/mês", "único"
  price_brl DECIMAL(10,2) NOT NULL,
  price_label TEXT, -- e.g. "/ano", "/mês", "único"
  per_credit_label TEXT, -- e.g. "R$1,35/crédito"
  hotmart_url TEXT NOT NULL DEFAULT '',
  button_text TEXT NOT NULL DEFAULT 'Comprar',
  badge_text TEXT, -- e.g. "Mais popular", "Melhor custo"
  features JSONB DEFAULT '[]', -- array of feature strings (for magnetic plan)
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upsell_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read active plans (needed for modals)
CREATE POLICY "Anyone can read active plans"
  ON public.upsell_plans FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert plans"
  ON public.upsell_plans FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plans"
  ON public.upsell_plans FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plans"
  ON public.upsell_plans FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed default data
INSERT INTO public.upsell_plans (type, name, description, credits, credits_label, price_brl, price_label, per_credit_label, hotmart_url, button_text, badge_text, features, display_order) VALUES
  ('magnetic', 'Plano Magnético', 'IA completa + 30 créditos/mês', 30, '/mês', 197, '/ano', NULL, 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon', 'Fazer Upgrade — R$197/ano', NULL, '["Agentes de IA ilimitados", "30 créditos que renovam todo mês", "Histórico completo de conversas"]', 0),
  ('subscription', '+20 créditos', '+20 créditos/mês', 20, '/mês', 27, '/mês', 'R$1,35/crédito', 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon', 'Assinar', NULL, '[]', 1),
  ('subscription', '+50 créditos', '+50 créditos/mês', 50, '/mês', 47, '/mês', 'R$0,94/crédito', 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon', 'Assinar', 'Mais popular', '[]', 2),
  ('subscription', '+100 créditos', '+100 créditos/mês', 100, '/mês', 77, '/mês', 'R$0,77/crédito', 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon', 'Assinar', 'Melhor custo', '[]', 3),
  ('package', '+10 créditos', '+10 créditos avulsos', 10, '', 19.90, 'único', 'R$1,99/crédito', 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon', 'Comprar', NULL, '[]', 4),
  ('package', '+25 créditos', '+25 créditos avulsos', 25, '', 39.90, 'único', 'R$1,60/crédito', 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon', 'Comprar', 'Mais vendido', '[]', 5),
  ('package', '+40 créditos', '+40 créditos avulsos', 40, '', 59.90, 'único', 'R$1,50/crédito', 'https://pay.hotmart.com/H103963338X?checkoutMode=2&off=g4gweuon', 'Comprar', NULL, '[]', 6);

-- Trigger for updated_at
CREATE TRIGGER update_upsell_plans_updated_at
  BEFORE UPDATE ON public.upsell_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
