-- Create tags table for categories
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text DEFAULT 'Tag',
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create junction table for agent-tags relationship (many-to-many)
CREATE TABLE public.agent_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(agent_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies (everyone can view, only admins can manage)
CREATE POLICY "Anyone can view tags" ON public.tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert tags" ON public.tags
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tags" ON public.tags
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tags" ON public.tags
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Agent tags policies (everyone can view, only admins can manage)
CREATE POLICY "Anyone can view agent tags" ON public.agent_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert agent tags" ON public.agent_tags
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete agent tags" ON public.agent_tags
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default tags
INSERT INTO public.tags (name, slug, icon, display_order) VALUES
  ('Conteúdos', 'conteudos', 'BookOpen', 1),
  ('Persona', 'persona', 'Users', 2);