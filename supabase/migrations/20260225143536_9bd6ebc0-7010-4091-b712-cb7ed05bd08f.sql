
DROP FUNCTION IF EXISTS public.get_agents_public(uuid[]);

CREATE OR REPLACE FUNCTION public.get_agents_public(p_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(id uuid, name text, slug text, description text, icon_url text, icon_emoji text, system_prompt text, welcome_message text, model text, is_active boolean, display_order integer, ice_breakers jsonb, plan_access text, billing_type text, credit_cost integer, message_package_size integer, output_markers text[], updated_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    a.id, a.name, a.slug, a.description, a.icon_url, a.icon_emoji,
    a.system_prompt, a.welcome_message, a.model, a.is_active, a.display_order,
    a.ice_breakers, a.plan_access, a.billing_type, a.credit_cost,
    a.message_package_size, a.output_markers, a.updated_at, a.created_at
  FROM public.agents a
  WHERE a.is_active = true
    AND a.display_order < 900
    AND (p_ids IS NULL OR a.id = ANY(p_ids))
  ORDER BY a.display_order;
$function$;
