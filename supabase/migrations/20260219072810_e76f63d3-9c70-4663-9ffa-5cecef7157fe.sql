
-- Remove the static check constraint that's blocking dynamic plan slugs
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_type_check;
