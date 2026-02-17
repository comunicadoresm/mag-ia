-- =============================================
-- MVP Security Hardening Migration
-- Story: STORY-MVP-001 (Sprint MVP)
-- Fixes: TD-C03, TD-C02, TD-H10
-- Date: 2026-02-17
-- =============================================

-- ===================
-- T1-1: TD-C03 — Close credits UPDATE exploit
-- Users can currently UPDATE their own credit balance directly.
-- Credits should ONLY be modified via Edge Functions (service_role).
-- ===================
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

-- ===================
-- T1-3: TD-C02 — Fix agent_documents & document_chunks RLS
-- Currently ANY authenticated user can read ALL agent knowledge base.
-- Should be admin-only (chat function uses service_role, so unaffected).
-- ===================
DROP POLICY IF EXISTS "Authenticated users can view agent documents" ON public.agent_documents;
DROP POLICY IF EXISTS "Authenticated users can view document chunks" ON public.document_chunks;

-- ===================
-- T1-6: TD-H10 — Revert voice-audios bucket to private
-- Voice audio files contain PII (LGPD). Should use signed URLs.
-- ===================
UPDATE storage.buckets SET public = false WHERE id = 'voice-audios';
