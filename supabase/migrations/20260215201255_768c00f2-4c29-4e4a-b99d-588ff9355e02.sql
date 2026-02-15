
-- Update the billing_type check constraint to include per_output
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_billing_type_check;
ALTER TABLE agents ADD CONSTRAINT agents_billing_type_check CHECK (billing_type IN ('per_messages', 'per_generation', 'per_output'));
