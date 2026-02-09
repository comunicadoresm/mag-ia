
-- Table to store user dashboard profile/metrics data
CREATE TABLE public.user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  profile_photo_url TEXT,
  display_name TEXT,
  handle TEXT,
  -- Current values (manually updatable + auto from posts)
  current_followers INTEGER DEFAULT 0,
  current_revenue DECIMAL(12,2) DEFAULT 0,
  current_clients INTEGER DEFAULT 0,
  -- Initial "before" values (set once on first access)
  initial_followers INTEGER DEFAULT 0,
  initial_revenue DECIMAL(12,2) DEFAULT 0,
  initial_clients INTEGER DEFAULT 0,
  initial_views INTEGER DEFAULT 0,
  -- Track if initial setup is done
  initial_setup_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view their own metrics
CREATE POLICY "Users can view own metrics"
  ON public.user_metrics FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own metrics
CREATE POLICY "Users can insert own metrics"
  ON public.user_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own metrics
CREATE POLICY "Users can update own metrics"
  ON public.user_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_metrics_updated_at
  BEFORE UPDATE ON public.user_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for user_metrics
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_metrics;
