
-- Remove per_generation from allowed values, update existing agents
UPDATE agents SET billing_type = 'per_messages' WHERE billing_type = 'per_generation';
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_billing_type_check;
ALTER TABLE agents ADD CONSTRAINT agents_billing_type_check CHECK (billing_type IN ('per_messages', 'per_output'));
ALTER TABLE agents ALTER COLUMN billing_type SET DEFAULT 'per_messages';
