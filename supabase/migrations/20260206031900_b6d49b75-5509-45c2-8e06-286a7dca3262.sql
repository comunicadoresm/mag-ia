-- Create table for script styles
CREATE TABLE public.script_styles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for script formats
CREATE TABLE public.script_formats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for script objectives
CREATE TABLE public.script_objectives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  display_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.script_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_objectives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for script_styles
CREATE POLICY "Admins can manage styles" 
ON public.script_styles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active styles" 
ON public.script_styles 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for script_formats
CREATE POLICY "Admins can manage formats" 
ON public.script_formats 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active formats" 
ON public.script_formats 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for script_objectives
CREATE POLICY "Admins can manage objectives" 
ON public.script_objectives 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active objectives" 
ON public.script_objectives 
FOR SELECT 
USING (is_active = true);

-- Insert default styles
INSERT INTO public.script_styles (value, label, display_order) VALUES
  ('storytelling_looping', 'Storytelling Looping', 0),
  ('analysis', 'Análise', 1),
  ('tutorial', 'Tutorial', 2),
  ('list', 'Lista', 3),
  ('comparison', 'Comparação', 4);

-- Insert default formats
INSERT INTO public.script_formats (value, label, display_order) VALUES
  ('falado_camera', 'Falado para câmera', 0),
  ('voice_over', 'Voice Over', 1),
  ('texto_tela', 'Texto na Tela', 2),
  ('misto', 'Misto', 3);

-- Insert default objectives
INSERT INTO public.script_objectives (value, label, color, display_order) VALUES
  ('attraction', 'A - Atração', '#EF4444', 0),
  ('connection', 'C - Conexão', '#3B82F6', 1),
  ('conversion', 'V - Conversão', '#22C55E', 2),
  ('retention', 'R - Retenção', '#A855F7', 3);

-- Create updated_at triggers
CREATE TRIGGER update_script_styles_updated_at
BEFORE UPDATE ON public.script_styles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_script_formats_updated_at
BEFORE UPDATE ON public.script_formats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_script_objectives_updated_at
BEFORE UPDATE ON public.script_objectives
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();