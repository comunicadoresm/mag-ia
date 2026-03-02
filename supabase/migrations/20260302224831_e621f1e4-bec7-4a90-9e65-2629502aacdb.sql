
-- Add public agent columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS public_message_limit INTEGER DEFAULT 20;

-- Create public_leads table
CREATE TABLE public_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id),
  agent_slug TEXT,
  source TEXT DEFAULT 'public_agent',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_public_leads_email ON public_leads(email);
CREATE INDEX idx_public_leads_agent ON public_leads(agent_id);

ALTER TABLE public_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Anyone can insert leads" ON public_leads FOR INSERT WITH CHECK (true);
-- Only admins can view leads
CREATE POLICY "Admins can view leads" ON public_leads FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage leads" ON public_leads FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create public_sessions table
CREATE TABLE public_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public_leads(id),
  fingerprint TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id),
  messages_used INTEGER DEFAULT 0,
  max_messages INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours'
);
CREATE INDEX idx_public_sessions_fingerprint ON public_sessions(fingerprint, agent_id);

ALTER TABLE public_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert and read sessions (filtered by fingerprint in app)
CREATE POLICY "Anyone can insert sessions" ON public_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view sessions by fingerprint" ON public_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can update sessions" ON public_sessions FOR UPDATE USING (true);
CREATE POLICY "Admins can manage sessions" ON public_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create public_messages table
CREATE TABLE public_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_public_messages_session ON public_messages(session_id, created_at);

ALTER TABLE public_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert public messages" ON public_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view public messages" ON public_messages FOR SELECT USING (true);
CREATE POLICY "Admins can manage public messages" ON public_messages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RPC for public agents (no sensitive data)
CREATE OR REPLACE FUNCTION get_public_agents(p_slug TEXT DEFAULT NULL)
RETURNS TABLE(
  id UUID, name TEXT, slug TEXT, description TEXT, icon_url TEXT, icon_emoji TEXT,
  welcome_message TEXT, is_active BOOLEAN, display_order INTEGER, ice_breakers JSONB,
  public_message_limit INTEGER
)
LANGUAGE sql SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT a.id, a.name, a.slug, a.description, a.icon_url, a.icon_emoji,
    a.welcome_message, a.is_active, a.display_order, a.ice_breakers,
    a.public_message_limit
  FROM public.agents a
  WHERE a.is_active = true AND a.is_public = true
    AND (p_slug IS NULL OR a.slug = p_slug)
  ORDER BY a.display_order;
$$;

-- Add public agent read policy for anon users (only public agents, limited fields via RPC)
CREATE POLICY "Anyone can view public agents via RPC" ON agents FOR SELECT USING (is_public = true AND is_active = true);
