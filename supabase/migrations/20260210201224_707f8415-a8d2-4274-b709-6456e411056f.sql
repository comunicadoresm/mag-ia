-- Add plan_access column to agents: controls which plans can see/use this agent
-- Values: 'all' (both basic and magnetic), 'basic' (basic only), 'magnetic' (magnetic only)
ALTER TABLE public.agents ADD COLUMN plan_access TEXT DEFAULT 'magnetic' CHECK (plan_access IN ('all', 'basic', 'magnetic'));

-- Also add to the public view so frontend can filter
DROP VIEW IF EXISTS public.agents_public;
CREATE VIEW public.agents_public WITH (security_invoker=on) AS
  SELECT id, name, slug, description, icon_url, icon_emoji, system_prompt, welcome_message, model, is_active, display_order, ice_breakers, created_at, updated_at, plan_access
  FROM public.agents
  WHERE is_active = true;