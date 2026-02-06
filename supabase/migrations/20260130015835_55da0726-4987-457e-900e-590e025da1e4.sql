-- Remove verification-related columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS is_verified_student,
DROP COLUMN IF EXISTS verification_source,
DROP COLUMN IF EXISTS verified_at;