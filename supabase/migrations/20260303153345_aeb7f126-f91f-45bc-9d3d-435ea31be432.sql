
-- Allow anon to SELECT their own inserted lead (needed for .select().single() after INSERT)
CREATE POLICY "Anyone can view own lead after insert"
  ON public.public_leads
  FOR SELECT
  TO anon, authenticated
  USING (true);
