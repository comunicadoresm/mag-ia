-- Add ice_breakers column to agents table
-- This will store up to 3 suggested prompts as a JSON array
ALTER TABLE public.agents 
ADD COLUMN ice_breakers jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.agents.ice_breakers IS 'Array of up to 3 suggested prompts shown at start of chat';