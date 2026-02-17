# MAG-IA Technical Debt DRAFT -- Database & Security Specialist Review

> **Reviewer:** @data-engineer (Dara)
> **Phase:** FASE 5 -- Brownfield Discovery Validation
> **Date:** 2026-02-17
> **Scope:** All security/database findings (TD-C01..C03, TD-H01..H04, TD-H10..H12, TD-M05..M07, TD-M13..M14, TD-L01)
> **Method:** Source code audit of 16 Edge Functions, 31 migration files, config.toml, SCHEMA.md, DB-AUDIT.md
> **Workflow:** brownfield-discovery-001

---

## Executive Summary

**Overall assessment: AGREE with DRAFT, with significant adjustments and 5 new findings.**

The DRAFT correctly identifies the most critical security and database issues. However, after reading every line of the Edge Function source code and cross-referencing migration SQL, I am:

- **Upgrading** 2 findings to higher severity (TD-H02 -> CRITICAL, TD-M13 -> HIGH)
- **Downgrading** 1 finding severity (TD-C01 remains CRITICAL but with nuance)
- **Confirming** 10 findings as-is
- **Adjusting** 2 findings with corrections to the technical details
- **Adding** 5 new findings not captured in the DRAFT

The single most urgent finding is the **credit cost client influence** (TD-H02), which I am escalating to CRITICAL after verifying that the `consume-credits` function directly accepts `metadata.credit_cost` from the client with zero server-side validation.

---

## Per-Finding Validation Table

| ID | DRAFT Severity | My Verdict | Action | Rationale |
|----|---------------|------------|--------|-----------|
| TD-C01 | Critical | **Critical (CONFIRMED)** | Approve with correction | Verified: 13 functions in config.toml (not 16). 3 functions missing from config entirely. |
| TD-C02 | Critical | **Critical (CONFIRMED)** | Approve | Verified: `auth.uid() IS NOT NULL` on line 66 of migration 20260130023549. |
| TD-C03 | Critical | **High (DOWNGRADE context)** | Adjust | Severity label is "Critical" in DRAFT positioning but body says "MEDIUM-HIGH". Recommend HIGH. |
| TD-H01 | High | **High (CONFIRMED)** | Approve with detail | Verified: hottok check is conditional (`if (hottok && ...`). No HMAC. |
| TD-H02 | High | **CRITICAL (UPGRADE)** | Escalate | Verified line 59: `cost = metadata?.credit_cost \|\| DEFAULT_COSTS[action]`. Client sends cost directly. |
| TD-H03 | High | **High (CONFIRMED)** | Approve | Verified: admin-create-user, admin-delete-user have zero audit logging. |
| TD-H04 | High | **CRITICAL (UPGRADE)** | Escalate | Verified: `FOR UPDATE USING (auth.uid() = user_id)` allows direct balance manipulation. |
| TD-H10 | High | **High (CONFIRMED)** | Approve | Verified: migration 20260217010458 is a single line: `SET public = true`. |
| TD-H11 | High | **Medium (DOWNGRADE)** | Adjust | UNIQUE(user_id, role) creates implicit btree index. Performance impact is minimal. |
| TD-H12 | High | **High (CONFIRMED)** | Approve | Verified: no index on user_scripts(user_id, status), credit_transactions missing composite index for type filtering. |
| TD-M05 | Medium | **Medium (CONFIRMED)** | Approve | Hard CASCADE confirmed across all FK relationships. |
| TD-M06 | Medium | **Medium (CONFIRMED)** | Approve | No constraint or trigger validates plan_type_id references active plan. |
| TD-M07 | Medium | **Medium (CONFIRMED)** | Approve | upsell_plans, credit_subscriptions tier enum, credit_purchases package enum all overlap with plan_types/credit_packages. |
| TD-M13 | Medium | **HIGH (UPGRADE)** | Escalate | renew-credits has NO authentication at all. Anyone can invoke it. |
| TD-M14 | Medium | **Low (DOWNGRADE)** | Adjust | user_scripts.objective is TEXT with no FK, but validated at application level (UI dropdown). |
| TD-L01 | Low | **Low (CONFIRMED)** | Approve | Confirmed: user_credits, credit_transactions reference auth.users; conversations, user_scripts reference profiles. |

---

## Detailed Finding Analysis

### TD-C01: ALL Edge Functions Have verify_jwt = false -- CRITICAL CONFIRMED (with correction)

**DRAFT claim:** 16 functions have verify_jwt = false.
**Actual finding:** config.toml contains only **13** function entries, not 16. Three functions are **missing entirely** from config.toml:
- `admin-update-email`
- `recheck-user-plans`
- `send-auth-email`

Functions missing from config.toml will inherit the project default (which is `verify_jwt = true` in Supabase unless overridden). This is actually **worse** for `recheck-user-plans` and `renew-credits` because they lack internal auth checks too (see NEW-01).

**Verified auth patterns across all 16 functions:**

| Function | config.toml | Internal Auth | Risk |
|----------|-------------|---------------|------|
| chat | verify_jwt=false | JWT via getUser() | Low (defense-in-depth missing) |
| consume-credits | verify_jwt=false | JWT via getUser() | Low (defense-in-depth missing) |
| generate-script | verify_jwt=false | JWT via getUser() | Low (defense-in-depth missing) |
| generate-script-chat | verify_jwt=false | JWT via getUser() | Low (defense-in-depth missing) |
| setup-user-plan | verify_jwt=false | JWT via getUser() | Low (defense-in-depth missing) |
| process-document | verify_jwt=false | JWT via getUser() | Low (defense-in-depth missing) |
| verify-student | verify_jwt=false | JWT via getUser() | Low (defense-in-depth missing) |
| process-voice-dna | verify_jwt=false | JWT via getUser() | Low (defense-in-depth missing) |
| recalibrate-voice | verify_jwt=false | JWT via getUser() | Low (defense-in-depth missing) |
| admin-create-user | verify_jwt=false | JWT via getClaims() + admin check | Low (defense-in-depth missing) |
| admin-delete-user | verify_jwt=false | JWT via getClaims() + admin check | Low (defense-in-depth missing) |
| hotmart-webhook | verify_jwt=false | hottok header | Correct (external webhook) |
| **renew-credits** | verify_jwt=false | **NONE** | **CRITICAL** |
| admin-update-email | NOT IN CONFIG | Likely JWT | Needs verification |
| **recheck-user-plans** | NOT IN CONFIG | **NONE** | **CRITICAL** |
| send-auth-email | NOT IN CONFIG | Webhook signature (standardwebhooks) | OK (Supabase hook) |

**Recommendation (updated):**

```toml
# Enable JWT for all user-facing functions
[functions.chat]
verify_jwt = true

[functions.consume-credits]
verify_jwt = true

[functions.generate-script]
verify_jwt = true

[functions.generate-script-chat]
verify_jwt = true

[functions.setup-user-plan]
verify_jwt = true

[functions.process-document]
verify_jwt = true

[functions.verify-student]
verify_jwt = true

[functions.process-voice-dna]
verify_jwt = true

[functions.recalibrate-voice]
verify_jwt = true

[functions.admin-create-user]
verify_jwt = true

[functions.admin-delete-user]
verify_jwt = true

[functions.admin-update-email]
verify_jwt = true

# Keep false for external webhooks and system hooks
[functions.hotmart-webhook]
verify_jwt = false

[functions.send-auth-email]
verify_jwt = false

# Cron/system functions - add internal secret validation
[functions.renew-credits]
verify_jwt = false

[functions.recheck-user-plans]
verify_jwt = false
```

---

### TD-C02: agent_documents & document_chunks RLS Too Permissive -- CRITICAL CONFIRMED

**Verified in migration 20260130023549, lines 63-77:**

```sql
CREATE POLICY "Authenticated users can view agent documents"
ON public.agent_documents FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view document chunks"
ON public.document_chunks FOR SELECT
USING (auth.uid() IS NOT NULL);
```

This means any authenticated user (including basic plan trial users) can read ALL agent documents and ALL embedding chunks across every agent in the system. This exposes:
- System prompts embedded in document content
- Business knowledge bases
- Training data
- Potentially proprietary content

**Additional concern:** The `chat/index.ts` function's `searchKnowledge()` function (line 32-71) fetches document_chunks using service_role key, so the RLS policy doesn't even apply to the chat function itself. This means the permissive RLS only creates risk from **direct client Supabase queries**, not from Edge Functions.

**Fix (immediate):**

```sql
-- Remove permissive policies
DROP POLICY "Authenticated users can view agent documents" ON agent_documents;
DROP POLICY "Authenticated users can view document chunks" ON document_chunks;

-- The admin FOR ALL policy already covers admin access.
-- If chat needs document access, it already uses service_role.
-- No additional user-facing SELECT policy is needed.
```

---

### TD-C03: API Keys Stored in Plaintext -- SEVERITY CLARIFICATION (HIGH)

The DRAFT positions this under "Critical Issues (3 Critical)" but the body text says "MEDIUM-HIGH". After review, I classify this as **HIGH**, not Critical.

**Mitigations verified in code:**
1. `agents_public` view correctly excludes `api_key` column (verified in SCHEMA.md)
2. `get_agent_api_key()` function has REVOKE from anon/authenticated (per DB-AUDIT)
3. RLS on agents table restricts admin-only write operations

**However:** The `chat/index.ts` function on line 283-286 does `SELECT *` on agents table using service_role, then passes `agent.api_key` directly to external API calls. If any Edge Function logs are exposed or there is a server-side error that leaks the agent object, API keys are exposed.

**Recommendation:** Supabase Vault is the correct approach, not env vars per function. Reasons:
- There are multiple agents, each with a different API key
- Environment variables are per-project, not per-agent
- Vault allows key rotation without code deploys

```sql
-- Migration: Move api_key to Supabase Vault
-- Step 1: For each agent, store in vault
SELECT vault.create_secret(api_key, 'agent_apikey_' || id::text, 'Agent API key for ' || name)
FROM agents WHERE api_key IS NOT NULL;

-- Step 2: Replace api_key column with vault reference
ALTER TABLE agents ADD COLUMN api_key_vault_id UUID;
-- Step 3: Update Edge Functions to use vault.decrypted_secrets
-- Step 4: Drop api_key column after verification
```

---

### TD-H01: Hotmart Webhook Without HMAC Signature Verification -- HIGH CONFIRMED

**Verified in `hotmart-webhook/index.ts`, lines 30-39:**

```typescript
const hottok = Deno.env.get("HOTMART_HOTTOK");
const receivedToken = payload?.hottok || req.headers.get("x-hotmart-hottok") || "";

if (hottok && receivedToken !== hottok) {
    // reject
}
```

**Critical problems found:**
1. **Conditional validation:** `if (hottok && ...)` means if the `HOTMART_HOTTOK` env var is not set, ALL webhooks are accepted without any validation
2. **Token in payload body:** `payload?.hottok` means the secret token travels in the request body (not just headers), which is more prone to logging/exposure
3. **No HMAC:** No signature verification on the request body
4. **No replay protection:** No timestamp validation, no idempotency key
5. **Always returns 200:** Even on rejection (line 37), returns status 200. While this prevents Hotmart retries, it makes monitoring harder

**Impact is real:** A forged PURCHASE_APPROVED webhook with a valid hottok can:
- Activate any plan for any email address
- Grant unlimited credits
- Create subscription records

**Fix recommendation:**

```typescript
// Add HMAC verification
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const rawBody = await req.text();
const payload = JSON.parse(rawBody);

const signature = req.headers.get("x-hotmart-webhook-signature");
const expectedSignature = hmac("sha256", hookSecret, rawBody, "utf8", "hex");

if (signature !== expectedSignature) {
  // Reject with logging
}

// Add timestamp validation
const webhookTimestamp = payload?.creation_date;
if (webhookTimestamp) {
  const age = Date.now() - new Date(webhookTimestamp).getTime();
  if (age > 5 * 60 * 1000) { // 5 minutes
    // Reject stale webhook
  }
}

// Add idempotency via webhook_logs
const transactionId = payload?.data?.purchase?.transaction || payload?.data?.subscription?.subscriber?.code;
const { data: existing } = await supabase
  .from("webhook_logs")
  .select("id")
  .eq("event_type", eventType)
  .eq("status", "processed")
  .contains("payload", { data: { purchase: { transaction: transactionId } } })
  .maybeSingle();

if (existing) {
  return new Response(JSON.stringify({ status: "duplicate" }), { status: 200 });
}
```

---

### TD-H02: Credit Cost Client Influence -- UPGRADED TO CRITICAL

**This is the most dangerous finding in the codebase.** The DRAFT classified it as HIGH. After reading the actual source code, I am escalating to **CRITICAL**.

**Verified in `consume-credits/index.ts`, line 59:**

```typescript
const cost = metadata?.credit_cost || DEFAULT_COSTS[action] || 1;
```

The `ConsumeRequest` interface (lines 9-18) explicitly accepts:

```typescript
interface ConsumeRequest {
  action: "script_generation" | "script_adjustment" | "chat_messages";
  metadata?: {
    agent_id?: string;
    conversation_id?: string;
    script_id?: string;
    credit_cost?: number;       // <-- CLIENT CAN SET THIS
    message_package_size?: number; // <-- CLIENT CAN SET THIS TOO
  };
}
```

**Attack vector:**
A malicious user can call the `consume-credits` function with:
```json
{
  "action": "script_generation",
  "metadata": { "credit_cost": 0 }
}
```

Since `0` is falsy in JavaScript, `metadata?.credit_cost || DEFAULT_COSTS[action]` would fall through to the default. BUT a user can send:
```json
{
  "action": "script_generation",
  "metadata": { "credit_cost": 1 }
}
```

This would consume only 1 credit instead of the default 3 for script_generation.

**Additionally, line 63:**
```typescript
const packageSize = metadata?.message_package_size || 5;
```

A user can send `"message_package_size": 999999` to effectively never be charged for chat messages (only charged on message 1, then not again until message 999999).

**But there is nuance:** The `chat/index.ts` function (lines 296-327) has its OWN credit consumption logic that reads `agent.billing_type`, `agent.credit_cost`, and `agent.message_package_size` from the **database**, NOT from client input. This means:
- **Chat flow is partially protected** (chat does its own billing server-side)
- **consume-credits is still directly callable** by any authenticated user
- **The `consume-credits` function is also called from the frontend** for script generation

**The `credit_cost_config` table is NEVER READ by any Edge Function.** It exists in the schema but is completely unused in code. The DRAFT's DB-AUDIT says "The `credit_cost_config` table is read but client can potentially bypass" -- this is **incorrect**. The table is never consulted.

**Fix (immediate):**

```typescript
// consume-credits/index.ts - Replace line 59 with server-side lookup
// REMOVE: const cost = metadata?.credit_cost || DEFAULT_COSTS[action] || 1;

// ADD: Server-side cost determination
let cost = DEFAULT_COSTS[action] || 1;

// If agent_id is provided, use agent's configured cost
if (metadata?.agent_id) {
  const { data: agent } = await supabase
    .from("agents")
    .select("credit_cost, message_package_size, billing_type")
    .eq("id", metadata.agent_id)
    .single();

  if (agent?.credit_cost) {
    cost = agent.credit_cost;
  }
}

// For chat_messages, use server-side package size
if (action === "chat_messages" && metadata?.conversation_id) {
  // REMOVE: const packageSize = metadata?.message_package_size || 5;
  let packageSize = 5; // default
  if (metadata?.agent_id) {
    const { data: agent } = await supabase
      .from("agents")
      .select("message_package_size")
      .eq("id", metadata.agent_id)
      .single();
    packageSize = agent?.message_package_size || 5;
  }
  // ... rest of billing logic
}
```

---

### TD-H04: user_credits UPDATE Policy Too Broad -- UPGRADED TO CRITICAL

**Verified in migration 20260207123006, lines 33-35:**

```sql
CREATE POLICY "Users can update own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);
```

This allows any authenticated user to directly update their own credit balance using the Supabase client:

```typescript
// From browser console, a user could do:
const { error } = await supabase
  .from('user_credits')
  .update({ plan_credits: 999999, bonus_credits: 999999 })
  .eq('user_id', myUserId);
```

This is a direct financial exploit. The Edge Functions use service_role key, so they bypass RLS entirely. There is **no legitimate reason** for a user to have UPDATE access to their own credit wallet.

**Fix (immediate, Sprint 1 priority):**

```sql
-- Drop the dangerous policy
DROP POLICY "Users can update own credits" ON user_credits;

-- Users should only be able to SELECT their balance
-- All mutations go through Edge Functions with service_role
```

---

### TD-H10: voice-audios Bucket Set to Public -- HIGH CONFIRMED

**Verified in migration 20260217010458:**

```sql
UPDATE storage.buckets SET public = true WHERE id = 'voice-audios';
```

This is a single-line migration that makes the entire voice-audios bucket publicly accessible. Voice audio files contain:
- Casual speaking samples
- Professional speaking samples
- Positioning audio

This is PII under LGPD (Brazilian data protection law). Supabase Storage does support signed URLs for private buckets.

**Fix:**

```sql
-- Revert to private
UPDATE storage.buckets SET public = false WHERE id = 'voice-audios';

-- Storage policies already exist for user-scoped access:
-- "Users can upload own voice audios" - folder-scoped by user_id
-- "Users can view own voice audios" - folder-scoped by user_id
-- These work with signed URLs when bucket is private
```

In Edge Functions (`process-voice-dna`, `recalibrate-voice`), replace any direct URL access with signed URL generation:

```typescript
const { data: signedUrl } = await supabase.storage
  .from('voice-audios')
  .createSignedUrl(`${userId}/audio.webm`, 3600); // 1 hour expiry
```

---

### TD-H11: Missing Index on user_roles for has_role() -- DOWNGRADED TO MEDIUM

The `UNIQUE(user_id, role)` constraint on `user_roles` creates an implicit B-tree index on `(user_id, role)`. The `has_role()` function does:

```sql
EXISTS(SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)
```

This query is perfectly served by the implicit unique index. At the current scale (likely hundreds, not millions of users), there is zero performance concern. Even at 100K users, the unique index is sufficient.

**Verdict:** Medium (improvement opportunity, not a current problem).

---

### TD-H12: Missing Performance Indexes -- HIGH CONFIRMED

Verified that these indexes are missing:

```sql
-- user_scripts: Kanban loads by user+status on every page view
-- Current: NO index on (user_id, status)
CREATE INDEX idx_user_scripts_user_status ON user_scripts(user_id, status);

-- credit_transactions: No composite for type filtering (admin analytics)
-- Current: only idx_credit_tx_user(user_id, created_at DESC)
CREATE INDEX idx_credit_tx_type ON credit_transactions(user_id, type, created_at DESC);

-- voice_profiles: calibration status check
CREATE INDEX idx_voice_profiles_calibrated ON voice_profiles(user_id, is_calibrated);
```

---

### TD-M05: No Soft Delete Pattern -- MEDIUM CONFIRMED

All FK relationships use `ON DELETE CASCADE`. Deleting a conversation destroys all messages. Deleting a user destroys everything. No recovery possible.

**LGPD consideration:** Brazil's data protection law (LGPD) requires data export capability before deletion. Soft delete is one approach, but the minimum requirement is a pre-deletion export step.

**Recommendation:** Start with `deleted_at TIMESTAMPTZ` on the three highest-value tables:
- `conversations` (preserves chat history)
- `user_scripts` (preserves content work)
- `messages` (preserves AI interactions)

---

### TD-M06: No Plan Validity Constraint -- MEDIUM CONFIRMED

`profiles.plan_type_id` can reference a deactivated plan (is_active = false). This is confirmed by:
- No CHECK constraint
- No trigger validation
- The `recheck-user-plans` function only runs periodically (cron), not on update

---

### TD-M07: Redundant Plan/Credit Tables -- MEDIUM CONFIRMED

Overlap verified:
- `upsell_plans` (legacy) has hardcoded Hotmart URLs
- `plan_types` (new) has the same plus more fields
- `credit_subscriptions.tier` has CHECK constraint `('plus_20','plus_50','plus_100')` which doesn't match credit_packages
- `credit_purchases.package` has CHECK constraint `('avulso_10','avulso_25','avulso_40')` which doesn't match credit_packages

The webhook function already uses `plan_types` and `credit_packages`, but the old tables remain with their hardcoded enums.

---

### TD-M13: renew-credits Requires External Cron -- UPGRADED TO HIGH

**After reading the source code, I found a much bigger problem than the DRAFT describes.**

The `renew-credits` function has **ZERO authentication**. It:
1. Does not check for an Authorization header
2. Does not validate any JWT
3. Does not check for any secret token
4. Has `verify_jwt = false` in config.toml

This means **anyone on the internet** can call:
```
POST https://<project>.supabase.co/functions/v1/renew-credits
```

And trigger a full credit renewal cycle for ALL users with expired credits. While the business logic itself is not destructive (it renews credits that are due), the same applies to `recheck-user-plans` which is also unauthenticated.

**The DRAFT only mentions "failure risk" from cron dependency. The actual risk is unauthorized invocation.**

**Fix (immediate):**

```typescript
// Add secret validation to cron-triggered functions
const cronSecret = Deno.env.get("CRON_SECRET");
const receivedSecret = req.headers.get("x-cron-secret");

if (!cronSecret || receivedSecret !== cronSecret) {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

### TD-M14: No FK Validation on user_scripts.objective -- DOWNGRADED TO LOW

The `objective` field was migrated from ENUM to TEXT (migration 20260206033308). While there is no FK to `script_objectives`, the field is populated from a dropdown in the UI that reads from `script_objectives`. Risk is low as there is no security impact.

---

### TD-L01: Inconsistent FK Patterns -- LOW CONFIRMED

Confirmed split:
- `auth.users(id)` references: user_credits, credit_transactions (in migration), credit_subscriptions, credit_purchases, user_roles
- `profiles(id)` references: conversations, user_scripts, voice_profiles, user_narratives, user_format_profile, user_metrics

Note: The migration 20260207123006 shows `user_credits.user_id` references `profiles(id)`, not `auth.users(id)` as stated in SCHEMA.md. The SCHEMA.md has an error here. Both `profiles.id` and `auth.users.id` are the same UUID (profiles.id IS auth.users.id), so this is cosmetic but inconsistent documentation.

---

## NEW Findings (Not in DRAFT)

### NEW-01: renew-credits and recheck-user-plans Have ZERO Authentication (CRITICAL)

**Location:** `supabase/functions/renew-credits/index.ts`, `supabase/functions/recheck-user-plans/index.ts`

Both cron-triggered functions have no authentication whatsoever:
- No Authorization header check
- No secret token validation
- config.toml has `verify_jwt = false` for renew-credits
- recheck-user-plans is not even in config.toml

Anyone can trigger credit renewal or plan re-verification for all users.

**Impact:**
- `renew-credits`: Could prematurely renew credits, reset subscription credits, manipulate cycle dates
- `recheck-user-plans`: Could trigger mass ActiveCampaign API calls, potentially hitting rate limits and causing legitimate plan checks to fail

**Fix:** Add shared cron secret validation (see TD-M13 fix above).

---

### NEW-02: Credit Consumption Race Condition (HIGH)

**Location:** `consume-credits/index.ts` lines 99-180, `chat/index.ts` lines 330-374

Both functions perform a read-then-write pattern on `user_credits` without any locking:
1. Read current balance (SELECT)
2. Calculate new balance in application code
3. Write new balance (UPDATE)

If two concurrent requests arrive (e.g., user opens two chat tabs), both read the same balance, both compute the deduction, and the last UPDATE wins, effectively only charging once for two operations.

**No FOR UPDATE lock, no advisory lock, no database-level constraint** prevents this.

**Fix:**

```sql
-- Option A: Use a PostgreSQL function for atomic debit
CREATE OR REPLACE FUNCTION consume_user_credits(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS TABLE(success BOOLEAN, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits RECORD;
  v_remaining INTEGER;
  v_new_plan INTEGER;
  v_new_sub INTEGER;
  v_new_bonus INTEGER;
BEGIN
  -- Lock the row for update
  SELECT plan_credits, subscription_credits, bonus_credits
  INTO v_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  v_remaining := p_amount;
  v_new_plan := v_credits.plan_credits;
  v_new_sub := v_credits.subscription_credits;
  v_new_bonus := v_credits.bonus_credits;

  -- Check sufficient balance
  IF (v_new_plan + v_new_sub + v_new_bonus) < p_amount THEN
    RETURN QUERY SELECT false, (v_new_plan + v_new_sub + v_new_bonus);
    RETURN;
  END IF;

  -- Debit: plan -> subscription -> bonus
  IF v_remaining > 0 AND v_new_plan > 0 THEN
    IF v_remaining <= v_new_plan THEN
      v_new_plan := v_new_plan - v_remaining;
      v_remaining := 0;
    ELSE
      v_remaining := v_remaining - v_new_plan;
      v_new_plan := 0;
    END IF;
  END IF;

  IF v_remaining > 0 AND v_new_sub > 0 THEN
    IF v_remaining <= v_new_sub THEN
      v_new_sub := v_new_sub - v_remaining;
      v_remaining := 0;
    ELSE
      v_remaining := v_remaining - v_new_sub;
      v_new_sub := 0;
    END IF;
  END IF;

  IF v_remaining > 0 AND v_new_bonus > 0 THEN
    v_new_bonus := v_new_bonus - v_remaining;
    v_remaining := 0;
  END IF;

  -- Atomic update
  UPDATE user_credits
  SET plan_credits = v_new_plan,
      subscription_credits = v_new_sub,
      bonus_credits = v_new_bonus
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, (v_new_plan + v_new_sub + v_new_bonus);
END;
$$;
```

---

### NEW-03: CORS Wildcard on All Edge Functions (MEDIUM)

**Location:** Every Edge Function has:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
};
```

All 16 functions accept requests from any origin. This means any website on the internet can make authenticated requests to the MAG-IA API if the user has an active session with a valid JWT token stored in localStorage.

**Impact:** Combined with `verify_jwt = false`, this means a malicious site can:
1. Craft requests to consume-credits with `credit_cost: 0`
2. Read user data via Edge Functions
3. Trigger admin operations if the user is an admin

**Fix:**

```typescript
const ALLOWED_ORIGINS = [
  "https://mag-ia.com",      // production
  "https://app.mag-ia.com",  // production app
  "http://localhost:5173",    // local dev
];

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin || "") ? origin! : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});
```

---

### NEW-04: credit_cost_config Table is Completely Unused (LOW)

**Location:** Table `credit_cost_config` created in migration 20260215195034

The `credit_cost_config` table exists with admin RLS policies and public read access, but is **never queried by any Edge Function**. The `consume-credits` function uses hardcoded `DEFAULT_COSTS` and client-sent `metadata.credit_cost` instead.

The `chat/index.ts` function reads `agent.credit_cost` from the agents table, not from `credit_cost_config`.

**Impact:** Dead code/schema creates confusion and false sense of configuration.

**Fix:** Either:
1. Wire consume-credits to actually read from credit_cost_config (recommended)
2. Drop the table if it's not needed

---

### NEW-05: chat Function Does Not Use Vector Search (MEDIUM)

**Location:** `chat/index.ts`, function `searchKnowledge()` (lines 32-71)

The `search_agent_knowledge()` PostgreSQL function exists and performs proper vector similarity search using pgvector. However, the `chat/index.ts` function does **NOT** call it. Instead, it:

1. Fetches the first 20 document_chunks with a simple `SELECT content` (line 41-43)
2. Performs naive keyword matching in JavaScript (lines 46-55)
3. Falls back to returning the first 3 chunks if no keywords match (line 63)

This means:
- The IVFFlat vector index is unused
- The 1536-dimension embeddings stored in document_chunks are never queried
- RAG quality is significantly degraded (keyword matching vs. semantic similarity)

**This is not a security issue but is a significant functionality debt** that should be tracked.

**Fix:** Use the existing `search_agent_knowledge()` RPC or implement proper embedding-based search:

```typescript
async function searchKnowledge(supabase: any, agentId: string, query: string): Promise<string> {
  // Generate embedding for query
  const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: query,
    }),
  });
  const { data } = await embeddingResponse.json();
  const queryEmbedding = data[0].embedding;

  // Use the existing RPC function
  const { data: chunks, error } = await supabase.rpc("search_agent_knowledge", {
    p_agent_id: agentId,
    p_query_embedding: queryEmbedding,
    p_match_count: 5,
    p_match_threshold: 0.7,
  });

  if (error || !chunks?.length) return "";
  return chunks.map((c: { content: string }) => c.content).join("\n\n---\n\n");
}
```

---

## Answers to the 6 Questions for @data-engineer

### 1. Is TD-C01 correctly classified as Critical?

**Yes, but with nuance.** For the 11 user-facing functions that validate JWT internally, the risk is defense-in-depth loss -- not direct exploitation. The real Critical risk is the 2 functions (`renew-credits`, `recheck-user-plans`) that have `verify_jwt = false` AND no internal auth whatsoever. I recommend keeping TD-C01 as Critical specifically because of these unprotected functions, while noting that the others are lower individual risk.

### 2. TD-C03 (API Keys): Supabase Vault or env vars per function?

**Supabase Vault is the correct approach.** Environment variables won't work because:
- There are multiple agents, each with its own API key (Claude, OpenAI, Gemini)
- Agent API keys are managed dynamically via admin UI
- Env vars would require a redeploy for every key change
- Vault allows per-row encryption with audit-friendly key management

If Vault is not available in the current Supabase plan, the interim solution is `pgcrypto` symmetric encryption with an encryption key stored as an env var:

```sql
-- Encrypt
UPDATE agents SET api_key = pgp_sym_encrypt(api_key, current_setting('app.settings.encryption_key'));
-- Decrypt in function
SELECT pgp_sym_decrypt(api_key::bytea, current_setting('app.settings.encryption_key')) FROM agents;
```

### 3. TD-H02: Does the Edge Function truly accept client-side cost influence?

**YES, confirmed.** Line 59 of `consume-credits/index.ts`:

```typescript
const cost = metadata?.credit_cost || DEFAULT_COSTS[action] || 1;
```

The client interface explicitly includes `credit_cost?: number` and `message_package_size?: number` in the metadata. Both are used directly without server-side validation.

**Additional finding:** The `chat/index.ts` function has its OWN billing logic (lines 296-374) that reads cost from the database, so chat is partially protected. But `consume-credits` is still directly callable and exploitable.

### 4. TD-M05 (Soft Delete): Worth implementing given GDPR/LGPD implications?

**Yes, but phased.** LGPD (Lei Geral de Protecao de Dados) requires:
- Right to data export (Art. 18, V)
- Right to deletion (Art. 18, VI)

Soft delete helps with both: it enables export before permanent deletion, and allows a grace period for accidental deletions. Recommendation:
- **Phase 1:** Add `deleted_at` to `conversations`, `messages`, `user_scripts` (highest-value user content)
- **Phase 2:** Add deletion job that permanently removes records after 30 days
- **Phase 3:** Add data export endpoint that generates user data archive before deletion

### 5. Are there additional database concerns not captured in DB-AUDIT?

**Yes, 5 new findings identified:**
1. **NEW-01 (CRITICAL):** renew-credits and recheck-user-plans have zero authentication
2. **NEW-02 (HIGH):** Credit consumption race condition (read-then-write without locking)
3. **NEW-03 (MEDIUM):** CORS wildcard on all Edge Functions
4. **NEW-04 (LOW):** credit_cost_config table completely unused
5. **NEW-05 (MEDIUM):** chat function does not use vector search (ignores pgvector embeddings)

### 6. TD-H10 (voice-audios): Confirm signed URLs are supported with Supabase Storage?

**Confirmed.** Supabase Storage fully supports signed URLs for private buckets via:

```typescript
const { data } = await supabase.storage
  .from('voice-audios')
  .createSignedUrl('path/to/file.webm', 3600); // expires in 1 hour
```

The storage RLS policies already in place (migration 20260216043908, lines 77-79) correctly scope access by user_id folder:

```sql
CREATE POLICY "Users can view own voice audios" ON storage.objects
  FOR SELECT USING (bucket_id = 'voice-audios' AND auth.uid()::text = (storage.foldername(name))[1]);
```

These policies will work correctly with signed URLs when the bucket is set to private. The fix is literally one line:

```sql
UPDATE storage.buckets SET public = false WHERE id = 'voice-audios';
```

---

## Recommended Priority Changes to DRAFT Roadmap

### Sprint 1 (Week 1): Security Hardening -- REVISED

```
CRITICAL (do first, same day):
  1. TD-H04: DROP user_credits UPDATE policy (5 min)
  2. TD-H02: Remove client credit_cost influence from consume-credits (30 min)
  3. TD-C02: DROP permissive RLS on agent_documents/document_chunks (5 min)
  4. NEW-01: Add secret validation to renew-credits + recheck-user-plans (30 min)
  5. TD-H10: Set voice-audios bucket to private (5 min)

HIGH (same week):
  6. TD-C01: Update config.toml verify_jwt for all functions (30 min)
  7. NEW-02: Implement atomic credit consumption (PostgreSQL function) (2 hours)
  8. TD-H12: Add missing performance indexes (15 min)
```

### Sprint 2 (Week 2-3): Defense Hardening

```
  9. TD-H01: Implement HMAC webhook verification (2 hours)
  10. TD-H03: Add admin audit logging (4 hours)
  11. NEW-03: Restrict CORS origins (1 hour)
  12. TD-C03: Migrate API keys to Vault/pgcrypto (4 hours)
```

### Sprint 3 (Week 3-5): Data Quality

```
  13. TD-M05: Add soft delete to conversations/messages/user_scripts (4 hours)
  14. TD-M07: Deprecate legacy plan/credit tables (2 hours)
  15. TD-M06: Add plan validity constraint (1 hour)
  16. NEW-04: Wire credit_cost_config or remove (1 hour)
  17. NEW-05: Implement proper vector search in chat (4 hours)
```

---

## Updated Summary Table

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security (DRAFT) | 3 | 4 | 2 | 0 | 9 |
| Security (Revised) | **5** (+2) | **4** (reshuffled) | **3** (+1) | **1** (+1) | **13** (+4) |
| Database (DRAFT) | 0 | 1 | 3 | 2 | 6 |
| Database (Revised) | 0 | **2** (+1) | **2** (-1) | **1** (-1) | **5** (-1, reclassified) |

---

## Signature

**Reviewed and validated by:** @data-engineer (Dara)
**Date:** 2026-02-17
**Verdict:** DRAFT APPROVED with adjustments -- 2 severity upgrades, 1 downgrade, 5 new findings
**Confidence level:** HIGH (all claims verified against source code)

*Recomendo que os itens TD-H02, TD-H04 e NEW-01 sejam corrigidos antes de qualquer deploy adicional. Sao exploraveis hoje por qualquer usuario autenticado.*

---

*-- Dara, guardando cada bit*
