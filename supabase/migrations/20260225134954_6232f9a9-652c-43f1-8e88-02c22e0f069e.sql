
ALTER TABLE public.agents ADD COLUMN output_markers text[] DEFAULT NULL;

COMMENT ON COLUMN public.agents.output_markers IS 'Array of text markers used to detect structured output for per_output billing. If any marker is found in the AI response, credits are charged.';
