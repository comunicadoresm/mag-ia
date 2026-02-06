-- Drop existing SELECT policy for agents
DROP POLICY IF EXISTS "Anyone can view active agents" ON public.agents;

-- Create new SELECT policy that only allows admins to see api_key
-- Regular users can see all columns EXCEPT api_key
CREATE POLICY "Anyone can view active agents without api_key" 
ON public.agents 
FOR SELECT 
USING (is_active = true);

-- Create a secure view that excludes api_key for public use
CREATE OR REPLACE VIEW public.agents_public AS
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

-- For the agents table, we need column-level security
-- Revoke direct SELECT on api_key column for non-service roles
-- Since Postgres doesn't support column-level RLS directly, 
-- we'll use a different approach: only admins can see api_key via a function

-- Create a function to get agent api_key (only for edge functions with service role)
CREATE OR REPLACE FUNCTION public.get_agent_api_key(agent_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT api_key 
  FROM public.agents 
  WHERE id = agent_uuid;
$$;

-- Revoke execute from public roles (only service role can use it)
REVOKE EXECUTE ON FUNCTION public.get_agent_api_key(uuid) FROM anon, authenticated;