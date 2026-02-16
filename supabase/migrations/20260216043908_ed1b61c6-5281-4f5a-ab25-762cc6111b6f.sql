
-- Create voice_profiles table
CREATE TABLE public.voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_calibrated BOOLEAN DEFAULT FALSE,
  calibration_score INTEGER,
  audio_casual_url TEXT,
  audio_professional_url TEXT,
  audio_positioning_url TEXT,
  transcription_casual TEXT,
  transcription_professional TEXT,
  transcription_positioning TEXT,
  voice_dna JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  recalibrations_count INTEGER DEFAULT 0,
  UNIQUE(user_id)
);

ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice profile" ON public.voice_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice profile" ON public.voice_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice profile" ON public.voice_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create user_narratives table
CREATE TABLE public.user_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expertise TEXT,
  transformation TEXT,
  market_criticism TEXT,
  differentials TEXT,
  concrete_results TEXT,
  ideal_client TEXT,
  narrative_text TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own narrative" ON public.user_narratives FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own narrative" ON public.user_narratives FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own narrative" ON public.user_narratives FOR UPDATE USING (auth.uid() = user_id);

-- Create user_format_profile table
CREATE TABLE public.user_format_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommended_format TEXT NOT NULL,
  quiz_answers JSONB,
  quiz_score INTEGER,
  weekly_plan JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_format_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own format profile" ON public.user_format_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own format profile" ON public.user_format_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own format profile" ON public.user_format_profile FOR UPDATE USING (auth.uid() = user_id);

-- Add onboarding_step to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'basic_info';

-- Create storage bucket for voice audios
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-audios', 'voice-audios', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for voice-audios bucket
CREATE POLICY "Users can upload own voice audios" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voice-audios' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own voice audios" ON storage.objects FOR SELECT USING (bucket_id = 'voice-audios' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own voice audios" ON storage.objects FOR UPDATE USING (bucket_id = 'voice-audios' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Triggers for updated_at
CREATE TRIGGER update_voice_profiles_updated_at BEFORE UPDATE ON public.voice_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_narratives_updated_at BEFORE UPDATE ON public.user_narratives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_format_profile_updated_at BEFORE UPDATE ON public.user_format_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
