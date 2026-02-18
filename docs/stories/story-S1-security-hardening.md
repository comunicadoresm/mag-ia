---
id: STORY-TD-S1
epic: EPIC-TD-001
sprint: 1
title: "Security Hardening"
executor: "@data-engineer"
quality_gate: "@architect"
quality_gate_tools: [schema_validation, migration_review, rls_test, edge_function_audit]
priority: P0
effort: 3-5 days
status: implemented
debt_items: [TD-C01, TD-C02, TD-C03, TD-C04, NEW-DB-01, NEW-DB-02, TD-H10, TD-H12]
---

# Story S1: Security Hardening

## User Story

**As a** platform owner,
**I want** all active security exploits closed and defense-in-depth enabled,
**So that** users cannot manipulate credits, access other users' data, or trigger unauthorized functions.

## Story Context

**Existing System Integration:**
- Integrates with: Supabase RLS policies, Edge Functions (16), Storage buckets, cron infrastructure
- Technology: PostgreSQL (RLS, functions), Deno (Edge Functions), Supabase config.toml
- Follows pattern: Existing RLS patterns with `has_role()` function
- Touch points: `supabase/config.toml`, migrations, `consume-credits/index.ts`, `renew-credits/index.ts`, `recheck-user-plans/index.ts`

**ALERT — 3 Exploits Active TODAY:**
1. Users can give themselves unlimited credits (`user_credits` UPDATE policy)
2. Users can override credit cost (`consume-credits` accepts `metadata.credit_cost`)
3. Any authenticated user reads all agent knowledge base (`agent_documents` RLS)

---

## Acceptance Criteria

### AC-1: Close Credits Exploit (TD-C03) — 5 min
- [x] `DROP POLICY "Users can update own credits" ON user_credits;` executed
- [ ] Users can NO LONGER update their own credit balance via Supabase client
- [ ] Credit consumption still works (via Edge Function, not direct UPDATE)
- [ ] Verified: `supabase.from('user_credits').update({plan_credits: 999})` returns permission denied

### AC-2: Remove Client Credit Cost (TD-C04) — ALREADY FIXED
- [x] `consume-credits/index.ts`: `metadata.credit_cost` parameter REMOVED (was already removed)
- [x] `consume-credits/index.ts`: `metadata.message_package_size` parameter REMOVED (reads from DB)
- [x] Cost is read from `agents` table server-side (or `DEFAULT_COSTS` constant)
- [ ] `credit_cost_config` table reviewed (currently unused — flag for cleanup)
- [x] Verified: Sending `credit_cost: 1` in metadata has no effect

### AC-3: Fix Knowledge Base RLS (TD-C02) — 15 min
- [x] `agent_documents` policy replaced with `has_role(auth.uid(), 'admin'::app_role)`
- [x] `document_chunks` policy similarly restricted
- [ ] Chat function still has access (uses service_role key)
- [ ] Verified: Regular user cannot SELECT from `agent_documents`

### AC-4: Authenticate Cron Functions (NEW-DB-01) — ALREADY FIXED
- [x] `renew-credits/index.ts`: Checks `x-cron-secret` header against `CRON_SECRET` env var
- [x] `recheck-user-plans/index.ts`: Same cron secret check
- [x] Returns 401 if secret missing or incorrect
- [ ] Cron job configuration updated with secret header
- [ ] Verified: Calling without secret returns 401

### AC-5: Enable JWT Verification (TD-C01) — ALREADY FIXED
- [x] All Edge Functions in `supabase/config.toml` set to `verify_jwt = true`
- [x] Exception: `hotmart-webhook` remains `verify_jwt = false` (public webhook)
- [x] Exception: `renew-credits` remains `verify_jwt = false` (cron, uses secret header)
- [ ] All existing functionality works (functions already validate JWT internally)
- [ ] Verified: Unauthenticated request to `/chat` returns 401

### AC-6: Privatize Voice Bucket (TD-H10) — 10 min
- [x] `UPDATE storage.buckets SET public = false WHERE id = 'voice-audios';`
- [x] Application code already uses signed URLs for voice audio
- [x] Storage policies added: users can only access files in their own folder
- [ ] Voice calibration flow still works end-to-end
- [ ] Verified: Direct URL to voice file returns 403

### AC-7: Atomic Credit Consumption (NEW-DB-02) — 2 hours
- [x] PostgreSQL function `consume_credits_atomic(user_id, amount)` created
- [x] Uses `SELECT ... FOR UPDATE` lock on `user_credits` row
- [x] Returns success/failure (insufficient credits) as JSONB
- [x] `consume-credits` Edge Function calls this function instead of read-then-write
- [ ] Verified: Two concurrent requests don't result in double-spend

### AC-8: Performance Indexes (TD-H12) — 15 min
- [x] `CREATE INDEX idx_user_scripts_user_status ON user_scripts(user_id, status);`
- [x] `CREATE INDEX idx_credit_tx_user_type_date ON credit_transactions(user_id, type, created_at DESC);`
- [x] `CREATE INDEX idx_voice_profiles_user_calibrated ON voice_profiles(user_id, is_calibrated);`
- [ ] Kanban page load time improved (measurable via Sentry from Sprint 0)

### AC-9: HMAC Webhook Verification (TD-H01) — NEW
- [x] `hotmart-webhook/index.ts`: HMAC-SHA256 verification added
- [x] Uses `HOTMART_WEBHOOK_SECRET` env var for signature validation
- [x] Constant-time comparison to prevent timing attacks
- [x] Backwards-compatible: falls back to hottok if HMAC secret not configured
- [ ] Verified: Forged webhook without valid signature is rejected

### AC-10: IDOR Fix in process-voice-dna — NEW
- [x] `process-voice-dna/index.ts`: Uses `user.id` from JWT instead of body `user_id`
- [x] Validates that audio paths belong to the authenticated user
- [ ] Verified: User A cannot process User B's audio files

---

## Technical Notes

### Migration Order (Critical)
Execute in this exact order to avoid breaking functionality:
1. **AC-1** (DROP UPDATE policy) — independent, safe
2. **AC-3** (RLS fix) — independent, safe
3. **AC-6** (voice bucket) — needs app code change first
4. **AC-8** (indexes) — independent, safe
5. **AC-7** (atomic function) — needs Edge Function change
6. **AC-2** (credit cost) — Edge Function change
7. **AC-4** (cron auth) — Edge Function change
8. **AC-5** (JWT config) — last, most impactful

### Signed URLs for Voice Bucket
```typescript
// Replace direct URL with signed URL
const { data } = await supabase.storage
  .from('voice-audios')
  .createSignedUrl(filePath, 3600); // 1 hour expiry
```

### Atomic Credit Function
```sql
CREATE OR REPLACE FUNCTION consume_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_current INTEGER;
BEGIN
  SELECT plan_credits + purchased_credits INTO v_current
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Debit from plan_credits first, then purchased_credits
  UPDATE user_credits
  SET plan_credits = GREATEST(0, plan_credits - p_amount),
      purchased_credits = CASE
        WHEN plan_credits >= p_amount THEN purchased_credits
        ELSE purchased_credits - (p_amount - plan_credits)
      END,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| JWT breaks existing client sessions | Users logged out | Functions already check JWT internally — `verify_jwt` is defense-in-depth |
| Voice bucket private breaks playback | Audio not playing | Update app to use signed URLs BEFORE privatizing bucket |
| Atomic function changes credit logic | Credits not consumed | Test with concurrent requests before deploying |
| Cron secret misconfigured | Credits not renewed | Test cron invocation with secret before removing old endpoint |

**Rollback plan:** Each migration is independent. If any fails, revert that specific migration only.

## Definition of Done

- [ ] All 3 active exploits closed (AC-1, AC-2, AC-3)
- [ ] Cron functions authenticated (AC-4)
- [ ] JWT enabled on all functions except webhook (AC-5)
- [ ] Voice bucket private with signed URLs (AC-6)
- [ ] Credit consumption atomic (AC-7)
- [ ] Performance indexes deployed (AC-8)
- [ ] No regression in credit flow, chat, voice calibration, Kanban
- [ ] Sentry shows no new errors from security changes

---

*Story S1 — Sprint 1: Security Hardening*
*Epic: EPIC-TD-001 (MAG-IA Technical Debt Remediation)*
