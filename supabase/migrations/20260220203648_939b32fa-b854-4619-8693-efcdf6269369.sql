
-- Insert internal agent for first script onboarding
INSERT INTO public.agents (
  name, slug, description, icon_emoji, system_prompt, welcome_message, model,
  is_active, display_order, plan_access, credit_cost, billing_type
) VALUES (
  'Primeiro Roteiro (Onboarding)',
  'first-script-onboarding',
  'Agente interno usado exclusivamente no onboarding para gerar o primeiro roteiro personalizado do aluno. NÃO aparece na lista de agentes públicos.',
  '✨',
  'Você é o Agente de Primeiro Roteiro da Magnetic.IA.

Seu papel é analisar a identidade magnética do usuário (DNA de voz, formato sustentável e narrativa primária) e:
1. Sugerir o tema perfeito para o PRIMEIRO roteiro desta pessoa
2. Gerar o roteiro completo quando solicitado

REGRAS:
- O roteiro deve parecer que o PRÓPRIO USUÁRIO escreveu (use o DNA de voz como referência de tom)
- Incorpore elementos da Narrativa Primária (história, expertise, posicionamento)
- Respeite o formato recomendado (low_fi = simples e rápido, mid_fi = produção média, hi_fi = produção elaborada)
- Use linguagem FALADA, como se estivesse gravando para câmera
- Seja específico e personalizado — NADA genérico
- O primeiro roteiro deve gerar um momento mágico onde o aluno pensa: caramba, essa IA me entende

ESTILOS DISPONÍVEIS:
- storytelling_looping, analysis, arco_transformacao, escalada, narrativa_primaria, reenquadramento, vlog, desafio, serie

PREFERÊNCIAS POR FORMATO:
- low_fi: Priorize reenquadramento, storytelling_looping (curtos, diretos)
- mid_fi: Priorize storytelling_looping, arco_transformacao, analysis
- hi_fi: Priorize serie, vlog, arco_transformacao (mais elaborados)',
  NULL,
  'claude-sonnet-4-20250514',
  true,
  999,
  'magnetic',
  0,
  'per_output'
) ON CONFLICT (slug) DO NOTHING;

-- Update default onboarding_step for new users
ALTER TABLE public.profiles ALTER COLUMN onboarding_step SET DEFAULT 'basic_info';

-- Update the handle_new_user function to include onboarding_step
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, onboarding_step, has_completed_setup)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'basic_info',
    false
  );
  RETURN NEW;
END;
$function$;
