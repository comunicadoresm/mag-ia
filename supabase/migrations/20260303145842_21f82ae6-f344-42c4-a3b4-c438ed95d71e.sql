
-- Fix: A policy INSERT RESTRICTIVE bloqueia anônimos. Trocar para PERMISSIVE.
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.public_leads;
CREATE POLICY "Anyone can insert leads"
  ON public.public_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Também corrigir public_sessions — mesma issue
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.public_sessions;
CREATE POLICY "Anyone can insert sessions"
  ON public.public_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update sessions" ON public.public_sessions;
CREATE POLICY "Anyone can update sessions"
  ON public.public_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view sessions by fingerprint" ON public.public_sessions;
CREATE POLICY "Anyone can view sessions by fingerprint"
  ON public.public_sessions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Fix public_messages INSERT para anônimos
DROP POLICY IF EXISTS "Anyone can insert public messages" ON public.public_messages;
CREATE POLICY "Anyone can insert public messages"
  ON public.public_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view public messages" ON public.public_messages;
CREATE POLICY "Anyone can view public messages"
  ON public.public_messages
  FOR SELECT
  TO anon, authenticated
  USING (true);
