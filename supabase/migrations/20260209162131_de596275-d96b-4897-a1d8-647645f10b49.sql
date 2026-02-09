
-- Add likes column to user_scripts for tracking curtidas
ALTER TABLE public.user_scripts ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT NULL;
