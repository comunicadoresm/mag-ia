-- Add api_key column to agents table for per-agent API key configuration
ALTER TABLE public.agents ADD COLUMN api_key text;

-- Add a comment explaining the field
COMMENT ON COLUMN public.agents.api_key IS 'Optional API key for direct provider integration (OpenAI, Anthropic, Google)';