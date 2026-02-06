
-- Create enum for kanban columns/status
CREATE TYPE script_status AS ENUM ('idea', 'scripting', 'recording', 'editing', 'posted');

-- Create enum for objectives
CREATE TYPE script_objective AS ENUM ('attraction', 'connection', 'conversion', 'retention');

-- Create script_templates table (admin-managed templates)
CREATE TABLE public.script_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  theme TEXT,
  style TEXT NOT NULL, -- storytelling_looping, analysis, etc.
  format TEXT, -- falado_camera, etc.
  objective script_objective,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  script_structure JSONB NOT NULL DEFAULT '{}', -- IDF structure template
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_scripts table (user's scripts based on templates)
CREATE TABLE public.user_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.script_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  theme TEXT,
  style TEXT NOT NULL,
  format TEXT,
  objective script_objective,
  status script_status NOT NULL DEFAULT 'scripting',
  script_content JSONB NOT NULL DEFAULT '{}', -- IDF content
  -- Metrics (only filled when posted)
  views INTEGER,
  comments INTEGER,
  followers INTEGER,
  shares INTEGER,
  saves INTEGER,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.script_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for script_templates
CREATE POLICY "Anyone can view active templates" 
ON public.script_templates 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage templates" 
ON public.script_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_scripts
CREATE POLICY "Users can view own scripts" 
ON public.user_scripts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scripts" 
ON public.user_scripts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scripts" 
ON public.user_scripts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scripts" 
ON public.user_scripts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_script_templates_updated_at
BEFORE UPDATE ON public.script_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_scripts_updated_at
BEFORE UPDATE ON public.user_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial templates for testing
INSERT INTO public.script_templates (title, theme, style, format, objective, script_structure) VALUES
('Storytelling Looping', 'Marketing', 'storytelling_looping', 'falado_camera', 'attraction', 
  '{"inicio": {"title": "INÍCIO (GANCHO)", "sections": [{"id": "abertura", "label": "1. Abertura com tensão", "placeholder": "Comece com uma frase que gere curiosidade..."}]}, "desenvolvimento": {"title": "DESENVOLVIMENTO", "sections": [{"id": "contexto", "label": "2. Contexto", "placeholder": "Explique o cenário..."}, {"id": "conflito", "label": "3. Conflito", "placeholder": "Apresente o problema..."}]}, "final": {"title": "FINAL", "sections": [{"id": "resolucao", "label": "4. Resolução", "placeholder": "Mostre a solução..."}, {"id": "cta", "label": "5. CTA", "placeholder": "Chamada para ação..."}]}}'
),
('Análise de Tendência', 'Lifestyle', 'analysis', 'falado_camera', 'connection',
  '{"inicio": {"title": "INÍCIO (GANCHO)", "sections": [{"id": "hook", "label": "1. Hook provocativo", "placeholder": "Uma pergunta ou afirmação impactante..."}]}, "desenvolvimento": {"title": "DESENVOLVIMENTO", "sections": [{"id": "dados", "label": "2. Dados e fatos", "placeholder": "Apresente informações relevantes..."}, {"id": "analise", "label": "3. Sua análise", "placeholder": "Sua perspectiva sobre o tema..."}]}, "final": {"title": "FINAL", "sections": [{"id": "conclusao", "label": "4. Conclusão", "placeholder": "Resuma seu ponto de vista..."}, {"id": "engajamento", "label": "5. Engajamento", "placeholder": "Peça a opinião da audiência..."}]}}'
);
