-- =============================================
-- MVP Security Hardening Migration
-- Story: STORY-MVP-001 (Sprint MVP)
-- Fixes: TD-C03, TD-C02, TD-H10, AC-7, AC-8
-- Date: 2026-02-17
-- =============================================

-- ===================
-- TD-C03 — Close credits UPDATE exploit
-- Users can currently UPDATE their own credit balance directly.
-- Credits should ONLY be modified via Edge Functions (service_role).
-- ===================
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

-- ===================
-- TD-C02 — Fix agent_documents & document_chunks RLS
-- Currently ANY authenticated user can read ALL agent knowledge base.
-- Should be admin-only (chat function uses service_role, so unaffected).
-- ===================
DROP POLICY IF EXISTS "Authenticated users can view agent documents" ON public.agent_documents;
DROP POLICY IF EXISTS "Authenticated users can view document chunks" ON public.document_chunks;

-- Replace with admin-only read policies
CREATE POLICY "Admins can view agent documents"
  ON public.agent_documents FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view document chunks"
  ON public.document_chunks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ===================
-- TD-H10 — Revert voice-audios bucket to private
-- Voice audio files contain PII (LGPD). Frontend already uses signed URLs.
-- ===================
UPDATE storage.buckets SET public = false WHERE id = 'voice-audios';

-- Add storage policy: users can only access their own voice audios
DROP POLICY IF EXISTS "Users can upload own voice audios" ON storage.objects;
CREATE POLICY "Users can upload own voice audios"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'voice-audios'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own voice audios" ON storage.objects;
CREATE POLICY "Users can read own voice audios"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'voice-audios'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own voice audios" ON storage.objects;
CREATE POLICY "Users can update own voice audios"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'voice-audios'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===================
-- AC-7 — Atomic credit consumption function
-- Prevents race conditions with concurrent credit deductions.
-- Uses SELECT ... FOR UPDATE to lock the row during transaction.
-- ===================
CREATE OR REPLACE FUNCTION public.consume_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_plan INTEGER;
  v_subscription INTEGER;
  v_bonus INTEGER;
  v_total INTEGER;
  v_remaining INTEGER;
  v_new_plan INTEGER;
  v_new_subscription INTEGER;
  v_new_bonus INTEGER;
  v_expire_at TIMESTAMPTZ;
BEGIN
  -- Lock the row for update (prevents concurrent deductions)
  SELECT plan_credits, subscription_credits, bonus_credits, plan_credits_expire_at
  INTO v_plan, v_subscription, v_bonus, v_expire_at
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_credits');
  END IF;

  -- Check if plan credits expired
  IF v_expire_at IS NOT NULL AND v_expire_at <= NOW() THEN
    v_plan := 0;
    UPDATE public.user_credits
    SET plan_credits = 0, plan_credits_expire_at = NULL
    WHERE user_id = p_user_id;
  END IF;

  v_total := v_plan + v_subscription + v_bonus;

  IF v_total < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'balance', v_total,
      'required', p_amount
    );
  END IF;

  -- Debit in priority order: plan → subscription → bonus
  v_remaining := p_amount;
  v_new_plan := v_plan;
  v_new_subscription := v_subscription;
  v_new_bonus := v_bonus;

  IF v_remaining > 0 AND v_new_plan > 0 THEN
    IF v_new_plan >= v_remaining THEN
      v_new_plan := v_new_plan - v_remaining;
      v_remaining := 0;
    ELSE
      v_remaining := v_remaining - v_new_plan;
      v_new_plan := 0;
    END IF;
  END IF;

  IF v_remaining > 0 AND v_new_subscription > 0 THEN
    IF v_new_subscription >= v_remaining THEN
      v_new_subscription := v_new_subscription - v_remaining;
      v_remaining := 0;
    ELSE
      v_remaining := v_remaining - v_new_subscription;
      v_new_subscription := 0;
    END IF;
  END IF;

  IF v_remaining > 0 AND v_new_bonus > 0 THEN
    v_new_bonus := v_new_bonus - v_remaining;
    v_remaining := 0;
  END IF;

  -- Update the row (still locked)
  UPDATE public.user_credits
  SET plan_credits = v_new_plan,
      subscription_credits = v_new_subscription,
      bonus_credits = v_new_bonus
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'consumed', p_amount,
    'balance', jsonb_build_object(
      'plan', v_new_plan,
      'subscription', v_new_subscription,
      'bonus', v_new_bonus,
      'total', v_new_plan + v_new_subscription + v_new_bonus
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- AC-8 — Performance indexes
-- Optimize common queries on Kanban, credit transactions, and voice profiles.
-- ===================
CREATE INDEX IF NOT EXISTS idx_user_scripts_user_status
  ON public.user_scripts(user_id, status);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user_type_date
  ON public.credit_transactions(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_calibrated
  ON public.voice_profiles(user_id, is_calibrated);
