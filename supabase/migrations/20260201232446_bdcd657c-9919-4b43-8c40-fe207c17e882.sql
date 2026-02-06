-- Add policy to allow admins to view ALL agents (including inactive ones)
CREATE POLICY "Admins can view all agents"
ON public.agents
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));