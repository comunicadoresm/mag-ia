# MAG-IA Technical Debt Assessment — DRAFT

> Status: DRAFT (Pre-Validation)
> Date: 2026-02-17
> Author: @architect (Aria) — Consolidation Phase (FASE 4)
> Sources: system-architecture.md (FASE 1), SCHEMA.md + DB-AUDIT.md (FASE 2), frontend-spec.md (FASE 3)
> Workflow: brownfield-discovery-001

---

## Purpose

This DRAFT consolidates findings from the three collection phases of the brownfield-discovery workflow. It will be validated by:
- **@data-engineer (FASE 5)** — Database & security findings
- **@ux-design-expert (FASE 6)** — Frontend & UX findings
- **@qa (FASE 7)** — Cross-cutting quality review

After validation, findings will be finalized in `technical-debt-assessment.md` (FASE 8).

---

## Consolidated Findings Summary

| Category | Critical | High | Medium | Low | Total | Source |
|----------|----------|------|--------|-----|-------|--------|
| Security | 3 | 4 | 2 | 0 | 9 | DB-AUDIT + system-architecture |
| Architecture | 2 | 3 | 4 | 2 | 11 | system-architecture + frontend-spec |
| Frontend/UX | 2 | 3 | 5 | 3 | 13 | frontend-spec |
| Database | 0 | 1 | 3 | 2 | 6 | SCHEMA + DB-AUDIT |
| Performance | 0 | 1 | 3 | 1 | 5 | frontend-spec + system-architecture |
| **Total** | **7** | **12** | **17** | **8** | **44** | |

---

## Cross-Source Correlation Analysis

### Findings confirmed by multiple sources

| ID | Finding | Source 1 | Source 2 | Confidence |
|----|---------|----------|----------|------------|
| TD-C01 | Edge Functions without JWT | config.toml (FASE 2) | system-architecture.md (FASE 1) | HIGH |
| TD-C02 | Permissive RLS on agent_documents | DB-AUDIT (FASE 2) | SCHEMA.md (FASE 2) | HIGH |
| TD-C05 | React Query unused | system-architecture.md (FASE 1) | frontend-spec.md (FASE 3) | HIGH |
| TD-C07 | Direct Supabase calls | system-architecture.md (FASE 1) | frontend-spec.md (FASE 3) | HIGH |
| TD-H05 | Kanban mobile issues | frontend-spec.md (FASE 3) | system-architecture.md (FASE 1) | HIGH |
| TD-M15 | Lovable file encoding | frontend-spec.md (FASE 3) | system-architecture.md (FASE 1) | HIGH |

### Findings from single source only (need validation)

| ID | Finding | Source | Needs Validation By |
|----|---------|--------|---------------------|
| TD-C03 | API keys in plaintext | DB-AUDIT | @data-engineer |
| TD-H01 | Webhook signature missing | DB-AUDIT | @data-engineer |
| TD-H02 | Credit cost client influence | DB-AUDIT | @data-engineer |
| TD-C04 | No ErrorBoundary | frontend-spec | @ux-design-expert |
| TD-C06 | AuthContext overloaded | frontend-spec | @ux-design-expert |
| TD-H06 | No form validation | frontend-spec | @ux-design-expert |

---

## Critical Issues (7) — Consolidated

### Security (3 Critical)

#### TD-C01: ALL Edge Functions Have verify_jwt = false
- **Source:** DB-AUDIT SEC-01 + config.toml analysis
- **Risk:** HIGH — Unauthenticated requests reach function code
- **Evidence:** All 16 functions in `supabase/config.toml` have `verify_jwt = false`
- **Mitigation exists:** Functions validate JWT manually, but defense-in-depth is missing
- **Fix:** Change to `true` for 15/16 functions (keep `false` only for `hotmart-webhook`)
- **Effort:** 30 minutes

#### TD-C02: agent_documents & document_chunks RLS Too Permissive
- **Source:** DB-AUDIT SEC-02 + migration 20260130023549
- **Risk:** CRITICAL — Any authenticated user reads ALL agent knowledge bases
- **Evidence:** Policy uses `auth.uid() IS NOT NULL` instead of admin-only
- **Fix:** Replace with `has_role(auth.uid(), 'admin'::app_role)`
- **Effort:** 15 minutes

#### TD-C03: API Keys Stored in Plaintext
- **Source:** DB-AUDIT SEC-03
- **Risk:** MEDIUM-HIGH — Compromised admin = all API keys exposed
- **Evidence:** `agents.api_key` column stores raw keys; `agents_public` view hides them but admin SELECT * reveals them
- **Mitigations exist:** View hides from public, function has REVOKE
- **Fix:** Supabase Vault or environment variables
- **Effort:** Medium

### Architecture/Frontend (4 Critical)

#### TD-C04: No Error Boundary in Frontend
- **Source:** frontend-spec UX-01
- **Risk:** HIGH — JS errors crash entire page to white screen
- **Evidence:** No `ErrorBoundary` component found in src/
- **Fix:** 1 component + wrap in App.tsx
- **Effort:** 1 hour

#### TD-C05: React Query Installed But Unused
- **Source:** frontend-spec UX-03 + system-architecture TD-12
- **Risk:** MEDIUM — All data fetching manual; no caching, dedup, or retry
- **Evidence:** `@tanstack/react-query` v5.83.0 in package.json, `QueryClientProvider` wraps app, but zero `useQuery` calls in components
- **Fix:** Progressive migration of supabase calls to React Query hooks
- **Effort:** Large (2+ weeks)

#### TD-C06: AuthContext Overloaded
- **Source:** frontend-spec UX-04
- **Risk:** MEDIUM — Auth + profile + plan in single context causes cascade re-renders
- **Evidence:** `src/contexts/AuthContext.tsx` (171 lines) manages session, profile, plan_type, onboarding state
- **Fix:** Split into useUser/useProfile/useSession
- **Effort:** Medium (1-2 days)

#### TD-C07: Direct Supabase Calls in Pages
- **Source:** frontend-spec UX-05 + system-architecture TD-01
- **Risk:** MEDIUM — Tight coupling, duplicate queries, no abstraction
- **Evidence:** 20+ files import `supabase` client directly
- **Fix:** Create domain hooks (useAgents, useConversations, useScripts)
- **Effort:** Large (aligns with TD-C05 React Query migration)

---

## High Issues (12) — Consolidated

### Security (4 High)
- **TD-H01:** Hotmart webhook without HMAC signature verification (SEC-04)
- **TD-H02:** Credit consumption accepts client metadata influence (SEC-05)
- **TD-H03:** No admin operation audit trail (SEC-06)
- **TD-H04:** user_credits UPDATE policy too broad — users can self-update (SEC-10)

### Frontend/UX (5 High)
- **TD-H05:** Kanban not mobile responsive (columns 280-320px, horizontal scroll)
- **TD-H06:** No form validation (react-hook-form + Zod installed but unused)
- **TD-H07:** Missing ARIA labels on icon-only buttons
- **TD-H08:** Admin 13 sections not code-split (single bundle)
- **TD-H09:** No loading skeletons (spinners only)

### Database (3 High)
- **TD-H10:** voice-audios bucket set to public (PII exposure)
- **TD-H11:** Missing index on user_roles for has_role() lookups
- **TD-H12:** Missing performance indexes (user_scripts, credit_transactions, voice_profiles)

---

## Medium Issues (17) — Consolidated

### Architecture (4)
- TD-M01: Navigation config duplicated across 3 components
- TD-M02: Modal state duplication (BuyCreditsModal + UpsellModal)
- TD-M03: No i18n framework (hardcoded Portuguese)
- TD-M04: Chat not streaming (refetch instead of SSE)

### Database (3)
- TD-M05: No soft delete pattern (hard CASCADE)
- TD-M06: No plan validity constraint (can reference inactive plan)
- TD-M07: Redundant plan/credit tables (upsell_plans + plan_types overlap)

### Frontend (5)
- TD-M08: Hardcoded colors in Kanban
- TD-M09: Color-only status indicators (a11y)
- TD-M10: No keyboard DnD support
- TD-M11: Inconsistent data patterns (some realtime, most not)
- TD-M12: Sidebar state not persisted

### Security/Quality (5)
- TD-M13: renew-credits requires external cron (failure risk)
- TD-M14: No FK validation on user_scripts.objective
- TD-M15: File encoding (Lovable artifact — 0 line endings)
- TD-M16: No component documentation
- TD-M17: Duplicate animation definitions

---

## Low Issues (8)
- TD-L01: Inconsistent FK patterns (auth.users vs profiles)
- TD-L02: 50+ shadcn/ui components, many unused
- TD-L03: No focus-visible indicators
- TD-L04: No semantic heading hierarchy
- TD-L05: Form errors via toast only
- TD-L06: Only md: breakpoint (no tablet)
- TD-L07: Dark mode only (.dark identical to root)
- TD-L08: No error tracking (Sentry, LogRocket)

---

## Questions for Specialist Validation

### For @data-engineer (FASE 5)
1. Is TD-C01 correctly classified as Critical? Functions do validate JWT internally — does the config.toml setting meaningfully increase risk?
2. TD-C03 (API keys): Is Supabase Vault the right approach, or should we use env vars per function?
3. TD-H02 (credit cost): Can you verify if the Edge Function truly accepts client-side cost influence?
4. TD-M05 (soft delete): Is this worth implementing given the GDPR implications?
5. Are there additional database concerns not captured in DB-AUDIT?
6. TD-H10 (voice-audios): Confirm if signed URLs are supported with Supabase Storage

### For @ux-design-expert (FASE 6)
1. TD-C04 (ErrorBoundary): Should we wrap per-page or at App.tsx level?
2. TD-C05/C07 (React Query + data layer): Priority order for migration?
3. TD-H05 (Kanban mobile): Stacked cards vs accordion vs tabs — recommended pattern?
4. TD-H06 (validation): Which admin forms are highest priority?
5. Are there UX issues missed in the frontend-spec?
6. TD-M04 (streaming): What's the UX impact of non-streaming chat?

### For @qa (FASE 7)
1. Is the severity classification correct across all 44 items?
2. Are there cross-category dependencies we're missing?
3. Sprint ordering: Is security-first the right approach?
4. Are there testing debt items not captured?
5. Risk assessment: What's the overall project risk level?

---

## Draft Roadmap (Subject to Validation)

```
Sprint 1 (Week 1):    Security Hardening
                       TD-C01, TD-C02, TD-H04, TD-H10, TD-H11, TD-H12

Sprint 2 (Week 2-3):  Frontend Foundation
                       TD-C04, TD-H09, TD-C06, TD-H07, TD-M15

Sprint 3 (Week 3-5):  Data Layer Migration
                       TD-C05, TD-C07, TD-M04

Sprint 4 (Week 5-7):  Admin & UX Polish
                       TD-H06, TD-H08, TD-H05, TD-M01, TD-M08

Sprint 5 (Week 7-8):  Advanced Security
                       TD-C03, TD-H01, TD-H02, TD-H03
```

**Total estimated effort: 6-8 weeks (incremental, parallel with features)**

---

*DRAFT — Awaiting specialist validation (FASE 5, 6, 7)*
*— Aria, arquitetando o futuro*
