-- Fix: Drop and recreate view with SECURITY INVOKER (safe default)
DROP VIEW IF EXISTS public.agents_public;

CREATE VIEW public.agents_public 
WITH (security_invoker = true)
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
    created_at,
    updated_at
FROM public.agents
WHERE is_active = true;

-- Grant access to the view
GRANT SELECT ON public.agents_public TO anon, authenticated;