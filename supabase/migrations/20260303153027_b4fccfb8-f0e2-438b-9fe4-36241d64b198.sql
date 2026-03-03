
-- Fix: Drop RESTRICTIVE admin policies and recreate as PERMISSIVE

-- public_leads
DROP POLICY IF EXISTS "Admins can manage leads" ON public.public_leads;
DROP POLICY IF EXISTS "Admins can view leads" ON public.public_leads;
CREATE POLICY "Admins can manage leads"
  ON public.public_leads FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view leads"
  ON public.public_leads FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- public_sessions
DROP POLICY IF EXISTS "Admins can manage sessions" ON public.public_sessions;
CREATE POLICY "Admins can manage sessions"
  ON public.public_sessions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- public_messages
DROP POLICY IF EXISTS "Admins can manage public messages" ON public.public_messages;
CREATE POLICY "Admins can manage public messages"
  ON public.public_messages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
