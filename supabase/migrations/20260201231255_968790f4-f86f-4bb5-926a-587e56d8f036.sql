-- Recreate agents_public view to include ice_breakers column
DROP VIEW IF EXISTS public.agents_public;

CREATE VIEW public.agents_public AS
SELECT 
  id,
  name,
  slug,
  description,
  icon_url,
  icon_emoji,
  system_prompt,
  welcome_message,
  model,
  is_active,
  display_order,
  ice_breakers,
  created_at,
  updated_at
FROM public.agents
WHERE is_active = true;