
-- Fix: API Keys exposure via agents table RLS
-- The agents_public view must be recreated as SECURITY DEFINER (security_invoker=off)
-- so authenticated users can query it without needing direct access to the agents table

-- 1. Drop and recreate agents_public view as SECURITY DEFINER
--    This ensures the view runs with the postgres (owner) permissions,
--    bypassing the RLS on the agents table, while NEVER exposing api_key.
DROP VIEW IF EXISTS public.agents_public;

CREATE VIEW public.agents_public
WITH (security_invoker = off)
AS
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
    plan_access,
    credit_cost,
    billing_type,
    message_package_size,
    created_at,
    updated_at
  FROM public.agents
  WHERE is_active = true;

-- 2. Grant SELECT on agents_public to authenticated users ONLY
--    (not anon - users must be logged in to see agents)
REVOKE ALL ON public.agents_public FROM anon, authenticated;
GRANT SELECT ON public.agents_public TO authenticated;

-- 3. Ensure no direct SELECT on agents table for non-admins
--    (already enforced by existing admin-only policies, but be explicit)
REVOKE SELECT ON public.agents FROM anon;

-- 4. Validate: agents_public view contains NO api_key column
--    (enforced structurally by the view definition above)
