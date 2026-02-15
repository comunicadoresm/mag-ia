
-- AJUSTE 2: Campo para controlar onboarding obrigatório
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_setup BOOLEAN DEFAULT FALSE;

-- AJUSTE 4: Campo para URL do post publicado
ALTER TABLE public.user_scripts ADD COLUMN IF NOT EXISTS post_url TEXT;

-- AJUSTE 14: Tabela de configuração global de custos de créditos
CREATE TABLE IF NOT EXISTS public.credit_cost_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_slug TEXT NOT NULL UNIQUE,
  action_label TEXT NOT NULL,
  credit_cost INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_cost_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage credit cost config"
  ON public.credit_cost_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view credit cost config"
  ON public.credit_cost_config FOR SELECT
  USING (true);

-- Insert default cost config
INSERT INTO public.credit_cost_config (action_slug, action_label, credit_cost, description) VALUES
  ('script_generation', 'Geração de roteiro (Kanban)', 3, 'Cobrado quando o usuário aprova um roteiro gerado pela IA'),
  ('script_adjustment', 'Ajuste de roteiro (Kanban)', 1, 'Cobrado cada vez que o usuário aplica um ajuste via IA'),
  ('chat_messages', 'Chat com agente (padrão)', 1, 'Cobrado na primeira mensagem e a cada X mensagens'),
  ('message_package_size', 'Pacote de mensagens (padrão)', 5, 'A cada quantas mensagens cobrar 1 crédito no chat')
ON CONFLICT (action_slug) DO NOTHING;
