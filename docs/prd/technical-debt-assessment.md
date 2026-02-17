# MAG-IA Technical Debt Assessment

> Version: 2.0 (Post-Validation) | Date: 2026-02-17
> Sources: system-architecture.md, SCHEMA.md, DB-AUDIT.md, frontend-spec.md
> Validated by: @data-engineer (FASE 5), @ux-design-expert (FASE 6), @qa (FASE 7)
> Workflow: brownfield-discovery-001

---

## Project Overview

**MAG-IA (Magnetic.IA)** is an AI-powered content marketing platform for "Comunicadores Magneticos" (CM) — content creators who need help writing scripts, managing content pipelines, and developing their brand voice.

| Metric | Value |
|--------|-------|
| Stack | React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Supabase |
| Pages | 15 routes |
| Components | 109+ (35+ custom, 50+ shadcn/ui) |
| Database | 30 tables, 1 view, 5 functions, 16 Edge Functions |
| Edge Functions | 16 Deno functions |
| Auth | Supabase OTP (magic link) |
| Payments | Hotmart integration |
| Origin | Built on Lovable platform |

---

## Technical Debt Inventory (Post-Validation)

### Category Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 4 | 5 | 3 | 1 | 13 |
| Architecture/Quality | 0 | 5 | 6 | 1 | 12 |
| Frontend/UX | 1 | 6 | 6 | 5 | 18 |
| Database | 0 | 1 | 3 | 1 | 5 |
| Performance | 0 | 1 | 2 | 1 | 4 |
| **Total** | **5** | **18** | **20** | **9** | **52** |

> Changed from v1.0: Was 44 items (7C/12H/17M/8L). Now 52 items after specialist validation added 10 new findings and 8 QA gaps. 13 items reclassified.

---

## Critical Issues (5) — Fix TODAY

### TD-C01: ALL Edge Functions Have verify_jwt = false
- **Source:** DB-AUDIT SEC-01 | **Validated:** @data-engineer, @qa
- **Risk:** Unauthenticated requests reach function code. Especially dangerous for `renew-credits` and `recheck-user-plans` which have ZERO internal auth (see NEW-DB-01)
- **Effort:** Small (config change, 30 min)
- **Fix:** Enable `verify_jwt = true` in `supabase/config.toml` for all user-facing functions. Keep `false` only for `hotmart-webhook`

### TD-C02: agent_documents & document_chunks RLS Too Permissive
- **Source:** DB-AUDIT SEC-02 | **Validated:** @data-engineer, @qa
- **Risk:** ANY authenticated user can read ALL agent knowledge base content (training data, system prompts, business methodology)
- **Effort:** Small (1 migration, 15 min)
- **Fix:** Replace `auth.uid() IS NOT NULL` with `has_role(auth.uid(), 'admin'::app_role)`

### TD-C03: user_credits UPDATE Policy Too Broad *(was TD-H04, UPGRADED from High)*
- **Source:** DB-AUDIT SEC-10 | **Upgraded by:** @data-engineer (code-verified)
- **Risk:** Users can UPDATE their own credit balance directly via Supabase client: `supabase.from('user_credits').update({ plan_credits: 999999 })`
- **Impact:** Direct financial exploit. Any user can give themselves unlimited credits
- **Effort:** Trivial (5 min)
- **Fix:** `DROP POLICY "Users can update own credits" ON user_credits;`

### TD-C04: Credit Consumption Accepts Client-Side Cost *(was TD-H02, UPGRADED from High)*
- **Source:** DB-AUDIT SEC-05 | **Upgraded by:** @data-engineer (code-verified line 59)
- **Risk:** `consume-credits/index.ts` line 59: `const cost = metadata?.credit_cost || DEFAULT_COSTS[action] || 1`. Client sends `credit_cost: 1` instead of default 3.
- **Additional:** `message_package_size` also client-controllable (line 63). `credit_cost_config` table is NEVER consulted
- **Effort:** Small (30 min)
- **Fix:** Remove `metadata.credit_cost` and `metadata.message_package_size`. Read cost from `agents` table server-side

### NEW-DB-01: renew-credits & recheck-user-plans Have ZERO Authentication *(NEW from @data-engineer)*
- **Source:** @data-engineer code review
- **Risk:** Both cron-triggered functions have no auth check whatsoever. Anyone on the internet can trigger credit renewal for ALL users
- **Effort:** Small (30 min)
- **Fix:** Add `CRON_SECRET` header validation to both functions

---

## High Issues (18) — Fix Before Scale

### Security (5)

**TD-H01:** Hotmart Webhook Without HMAC Signature Verification
- Conditional validation (`if (hottok && ...)` — if env var missing, ALL webhooks accepted). No HMAC, no replay protection
- **Fix:** Add HMAC-SHA256 + timestamp validation + idempotency via webhook_logs

**TD-H02:** API Keys Stored in Plaintext *(was TD-C03, DOWNGRADED from Critical per @qa)*
- Mitigated by `agents_public` view + function REVOKE. Still risky at rest
- **Fix:** Supabase Vault (not env vars — multiple agents need per-agent keys)

**TD-H03:** No Admin Operation Audit Trail
- Admin create/delete/modify user operations unlogged
- **Fix:** Log to `access_logs` or dedicated `admin_audit_log`

**NEW-DB-02:** Credit Consumption Race Condition *(NEW from @data-engineer)*
- Read-then-write pattern on `user_credits` without FOR UPDATE lock. Two concurrent requests charge once
- **Fix:** PostgreSQL function with `FOR UPDATE` lock for atomic debit

**TD-H10:** voice-audios Bucket Set to Public
- Voice audio files (PII/LGPD) publicly accessible. Single-line migration set `public = true`
- **Fix:** `UPDATE storage.buckets SET public = false WHERE id = 'voice-audios';` + signed URLs

### Architecture/Quality (5)

**GAP-01:** No CI/CD Pipeline *(NEW from @qa)*
- No `.github/workflows/`, no lint/test/type-check automation. Manual deploys only
- **Fix:** GitHub Actions: lint + type-check + test on PR

**GAP-02:** TypeScript Strictness Disabled *(NEW from @qa — was in system-architecture but lost in consolidation)*
- `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`. Type safety is theater
- **Fix:** Enable incrementally: `strictNullChecks` first (Sprint 2), then `noImplicitAny` (Sprint 3)

**GAP-04:** No Error Tracking *(was TD-L08, UPGRADED from Low per @qa)*
- Zero error tracking. 84 `console.error` calls go nowhere in production. Team is flying blind
- **Fix:** Set up Sentry before any refactoring begins

**TD-M13:** renew-credits Requires External Cron *(UPGRADED from Medium per @data-engineer)*
- Beyond cron failure risk, these functions have zero authentication (see NEW-DB-01)
- **Fix:** Add cron secret + monitoring/alerting for renewal failures

**NEW-UX-03:** No Route Guards *(NEW from @ux-design-expert)*
- Every protected page implements own auth check via useEffect. Flash of unauthenticated content. Easy to forget on new pages
- **Fix:** Create `<ProtectedRoute>` wrapper component

### Frontend/UX (6)

**TD-C04:** No Error Boundary in Frontend *(KEPT as High — reclassified per @qa consensus)*
- No ErrorBoundary. JS errors crash to white screen
- **Fix:** Two-layer strategy: global `<ErrorBoundary>` in App.tsx + per-feature boundaries (Kanban, ScriptEditor, Onboarding)

**TD-H05:** Kanban Not Mobile Responsive *(UPGRADED from High to near-Critical per @ux-design-expert)*
- Columns 280-320px, requires horizontal scroll. For a content marketing platform, Kanban on mobile is essential
- **Fix:** Horizontal swipeable tabs with stacked cards on mobile

**TD-M04:** Chat Not Streaming *(UPGRADED from Medium per @ux-design-expert)*
- AI responses fetched via refetch, not streamed. 5-15 second perceived wait for each response
- **Fix:** Implement SSE streaming from Edge Function. Time-to-first-token drops to <500ms

**TD-M09:** Color-Only Status Indicators *(UPGRADED from Medium per @ux-design-expert)*
- Kanban status, credit alerts use color alone. WCAG 1.4.1 violation. Affects ~8% of male users (colorblind)
- **Fix:** Add text labels, icons, or patterns alongside color

**TD-H09:** No Loading Skeletons
- Users see only spinners. No content skeleton states for perceived performance
- **Fix:** Use existing shadcn/ui Skeleton component across data-fetching sections

**TD-C05:** React Query Installed But Unused *(DOWNGRADED from Critical per @ux-design-expert + @qa)*
- All data fetching is manual useState/useEffect. No caching, dedup, or retry
- **Fix:** Progressive migration: create hook abstractions first, then wire React Query

**TD-H12:** Missing Performance Indexes
- Kanban, transactions, voice profiles missing indexes
- **Fix:** Single migration with 3-4 CREATE INDEX statements

---

## Medium Issues (20) — Address in Sprint Planning

### Architecture (6)
- **TD-C06:** AuthContext overloaded *(DOWNGRADED from Critical per @ux + @qa)* — Auth + profile + plan in one context
- **TD-C07:** Direct Supabase calls in pages *(DOWNGRADED from Critical per @qa)* — 20+ files import client directly
- **TD-M01:** Navigation config duplicated across 3 components
- **TD-M02:** Modal state duplication (BuyCreditsModal + UpsellModal)
- **GAP-03:** ESLint too permissive *(NEW from @qa)* — `no-unused-vars: off`, no a11y plugin
- **GAP-07:** No environment variable validation *(NEW from @qa)*

### Database (3)
- **TD-M05:** No soft delete pattern (hard CASCADE). LGPD requires export before deletion
- **TD-M06:** No plan validity constraint (plan_type_id can ref inactive plan)
- **TD-M07:** Redundant plan/credit tables (upsell_plans + plan_types overlap)

### Frontend (6)
- **TD-M08:** Hardcoded colors in Kanban (6+ files use orange-500, blue-500 directly)
- **TD-M10:** No keyboard DnD support (Kanban uses HTML5 DnD, not @dnd-kit)
- **TD-M11:** Inconsistent data fetching (some realtime, most manual)
- **TD-M12:** Sidebar collapsed state not persisted
- **NEW-UX-04:** Chat.tsx 407 lines with mixed concerns *(NEW from @ux)*
- **NEW-UX-05:** Supabase error parsing hack in Chat.tsx *(NEW from @ux)*

### Security/Quality (3)
- **NEW-DB-03:** CORS wildcard `*` on all 16 Edge Functions *(NEW from @data-engineer)*
- **NEW-DB-05:** Chat function ignores pgvector, does naive keyword matching *(NEW from @data-engineer)*
- **TD-M15:** File encoding issues (Lovable artifact — 0 line endings)

### Observability (2)
- **GAP-05:** Performance baseline not established *(NEW from @qa)*
- **GAP-06:** No security testing (no `npm audit`, no SAST) *(NEW from @qa)*

---

## Low Issues (9) — Backlog

- **TD-L01:** Inconsistent FK patterns (auth.users vs profiles)
- **TD-L02:** 50+ shadcn/ui components, 8-10 likely unused
- **TD-L03:** No focus-visible indicators on custom buttons
- **TD-L04:** No semantic heading hierarchy (multiple h1 per page)
- **TD-L05:** Form errors via toast only (not inline)
- **TD-L06:** Only `md:` breakpoint (no tablet optimization)
- **TD-L07:** .dark CSS identical to root (no actual light mode)
- **TD-M14:** No FK validation on user_scripts.objective *(DOWNGRADED from Medium per @data-engineer)*
- **NEW-DB-04:** credit_cost_config table completely unused *(NEW from @data-engineer)*

---

## Strengths (What's Working Well)

| Area | Strength |
|------|----------|
| **Security** | RLS enabled on ALL 30 tables; RBAC with has_role() function |
| **Database** | Well-structured schema with proper foreign keys and cascades |
| **Design** | Consistent dark theme with CM brand; custom CSS utility classes |
| **Credits** | Sophisticated credit system with audit trail (credit_transactions) |
| **Onboarding** | Innovative Voice DNA + Narrative + Format Quiz flow |
| **RAG** | pgvector integration with IVFFlat index for agent knowledge |
| **Realtime** | Supabase Realtime on messages, credits, metrics |
| **Mobile** | BottomNavigation + safe-area support + MobileChatHistory |
| **Plan System** | Flexible plan_types + plan_features + agent_plan_access (N:N) |
| **AI Multi-model** | Support for Claude, GPT-4, Gemini with per-agent selection |

---

## Recommended Implementation Roadmap (Post-Validation)

### Sprint 0: Observability Foundation (2 days) *(NEW per @qa)*
- GAP-04: Set up Sentry error tracking
- GAP-01: Basic CI pipeline (lint + type-check + test on PR)
- Establish performance baseline (Lighthouse audit)
- **Justification:** Cannot safely refactor without production visibility

### Sprint 1: Security Hardening (3-5 days)
- TD-C03: DROP user_credits UPDATE policy (5 min)
- TD-C04: Remove client credit_cost from consume-credits (30 min)
- TD-C02: Fix agent_documents/document_chunks RLS (15 min)
- NEW-DB-01: Add cron secret to renew-credits + recheck-user-plans (30 min)
- TD-H10: Set voice-audios to private (10 min)
- TD-C01: Enable verify_jwt on all Edge Functions (30 min)
- NEW-DB-02: Atomic credit consumption (PostgreSQL function) (2 hours)
- TD-H12: Add performance indexes (15 min)

### Sprint 2: Frontend Foundation (1-2 weeks)
- TD-C04: ErrorBoundary (two-layer: global + per-feature)
- TD-H05: Kanban mobile (swipeable tabs)
- NEW-UX-03: ProtectedRoute wrapper
- TD-H09: Loading skeletons
- TD-C06: Split AuthContext (Medium → useUser/useProfile/useSession)
- TD-H07: ARIA labels
- TD-M15: Fix file encoding
- GAP-02: Enable `strictNullChecks` in TypeScript

### Sprint 3: Data Layer (2-3 weeks)
- TD-C05 + TD-C07 + TD-M11: React Query + data hooks (COMBINED)
- TD-M04: Chat streaming (SSE)
- NEW-UX-04: Extract Chat.tsx into focused hooks
- GAP-02: Enable `noImplicitAny`

### Sprint 4: Admin & UX Polish (1-2 weeks)
- TD-H06: Form validation with Zod
- TD-H08: Code-split admin sections
- TD-M09: Color-only indicators → add labels/icons
- TD-M01: Centralize navigation config
- TD-M08: Semantic status color tokens

### Sprint 5: Advanced Security (1-2 weeks)
- TD-H02: API keys to Supabase Vault
- TD-H01: Webhook HMAC signature verification
- TD-H03: Admin audit logging
- NEW-DB-03: Restrict CORS origins
- TD-M10: Migrate Kanban to @dnd-kit (keyboard support)

### Ongoing (Backlog)
- TD-M03: i18n framework
- TD-M16: Storybook
- TD-M05: Soft delete pattern
- TD-L06: Tablet breakpoints
- NEW-DB-05: Wire chat to use pgvector search
- GAP-06: Security testing automation

**Total estimated effort: 7-10 weeks** (revised from 6-8 per @qa, accounts for Sprint 0 + test writing)

---

## Cross-Category Dependencies

```
Sprint 0 (observability) ────► ALL subsequent sprints
  │
Sprint 1 (security) ──── can run in parallel with ────► Sprint 2 (frontend)
  │
Sprint 2 (ErrorBoundary + AuthContext split) ────► Sprint 3 (data layer)
  │                                                     │
GAP-02 (TypeScript strict) ────────────────────────────►│
  │                                                     │
Sprint 3 (data layer) ─────────── BOTTLENECK ──────────►│
  │                                                     │
Sprint 4 (admin/UX) ──── can run in parallel with ────► Sprint 5 (security)
```

**Key:** Sprint 3 (data layer) is the BOTTLENECK — cannot be parallelized. ErrorBoundary and AuthContext split MUST complete before data layer migration begins.

---

## Severity Reclassification Log

| Item | v1.0 | v2.0 | Reclassified By | Reason |
|------|------|------|----------------|--------|
| TD-H02 → TD-C04 | High | **Critical** | @data-engineer | Code-verified: `metadata.credit_cost` accepted from client |
| TD-H04 → TD-C03 | High | **Critical** | @data-engineer | Code-verified: Users can UPDATE own credit balance |
| TD-C03 → TD-H02 | Critical | **High** | @qa | Mitigations exist (view, REVOKE) |
| TD-C05 | Critical | **High** | @ux + @qa | Optimization debt, not security vulnerability |
| TD-C06 | Critical | **High** | @ux + @qa | Profile is single state, not separate plan/onboarding |
| TD-C07 | Critical | **High** | @qa | Architectural debt, not imminent threat |
| TD-H05 | High | **Near-Critical** | @ux | Content marketing platform — Kanban on mobile is essential |
| TD-M04 | Medium | **High** | @ux | AI chat platform without streaming is severe UX degradation |
| TD-M09 | Medium | **High** | @ux | WCAG 1.4.1 violation, 8% male users affected |
| TD-M13 | Medium | **High** | @data-engineer | Zero authentication on cron functions |
| TD-H11 | High | **Medium** | @data-engineer | UNIQUE constraint creates implicit index |
| TD-M14 | Medium | **Low** | @data-engineer | Application-layer validation sufficient |
| TD-L08 | Low | **High** | @qa | 84 console.error calls go nowhere in production |

---

## Decision Record

| Decision | Rationale |
|----------|-----------|
| Keep Supabase | Strong foundation; RLS, Realtime, Auth, Storage all in use |
| Keep shadcn/ui | Good component library; well-integrated with Tailwind |
| Migrate to React Query | Installed but unused; standard pattern for Supabase + React |
| Use Supabase Vault for API keys | Per-agent keys need dynamic management (not env vars) |
| Add Sprint 0 | Cannot refactor safely without error tracking + CI + tests |
| Dark mode only (for now) | Aligns with CM brand; light mode is low priority |
| Portuguese only (for now) | Single market; i18n is backlog priority |
| Estimate 7-10 weeks | Revised from 6-8 to account for Sprint 0 and test writing |

---

## Validation Trail

| Phase | Agent | Document | Verdict |
|-------|-------|----------|---------|
| FASE 4 | @architect | [technical-debt-DRAFT.md](technical-debt-DRAFT.md) | Consolidated 44 items |
| FASE 5 | @data-engineer | [db-specialist-review.md](../reviews/db-specialist-review.md) | Approved +5 findings, 2 upgrades |
| FASE 6 | @ux-design-expert | [ux-specialist-review.md](../reviews/ux-specialist-review.md) | Approved +5 findings, 3 upgrades |
| FASE 7 | @qa | [qa-review.md](../reviews/qa-review.md) | Approved +8 gaps, Sprint 0 required |

---

*Version 2.0 — Post-validation by 3 specialist agents*
*Generated by Orion (AIOS Master) — Brownfield Discovery Workflow*
