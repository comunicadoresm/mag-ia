-- Change objective column from enum to text in script_templates
ALTER TABLE public.script_templates 
  ALTER COLUMN objective TYPE text USING objective::text;

-- Change objective column from enum to text in user_scripts
ALTER TABLE public.user_scripts 
  ALTER COLUMN objective TYPE text USING objective::text;

-- Drop the enum type (no longer needed)
DROP TYPE IF EXISTS public.script_objective;