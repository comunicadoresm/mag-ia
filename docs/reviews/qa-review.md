# MAG-IA Technical Debt DRAFT -- QA Review

> **Reviewer:** @qa (Quinn) -- Quality Assurance Specialist
> **Date:** 2026-02-17
> **Workflow:** brownfield-discovery-001, FASE 7
> **Documents Reviewed:** technical-debt-DRAFT.md, system-architecture.md, DB-AUDIT.md, frontend-spec.md, TECHNICAL-DEBT-REPORT.md, technical-debt-assessment.md
> **Code Artifacts Inspected:** vitest.config.ts, tsconfig.json, tsconfig.app.json, eslint.config.js, package.json, src/test/setup.ts, src/test/example.test.ts

---

## Executive Summary

The DRAFT assessment is **methodologically sound** and demonstrates a disciplined multi-source cross-referencing approach. The 44 identified debt items are well-categorized, and the severity classifications are **largely correct** with 6 items requiring reclassification. However, the assessment contains **significant blind spots** in testing infrastructure, CI/CD, observability, TypeScript strictness, and ESLint configuration that collectively represent a risk as large as some of the identified Critical items.

**Overall Project Risk Level: HIGH**

The combination of zero test coverage, disabled TypeScript strictness, no CI/CD pipeline, no error tracking, and active security vulnerabilities creates a situation where the refactoring itself is high-risk -- any change can introduce regressions with no safety net to catch them.

**Key finding:** The DRAFT correctly identifies WHAT to fix but underestimates the risk of HOW to fix it. Without testing infrastructure, the proposed 6-8 week refactoring could introduce more bugs than it resolves.

---

## 1. Severity Validation Matrix (All 44 Items)

### Legend
- **AGREE** -- Severity classification is correct
- **UPGRADE** -- Should be elevated to higher severity
- **DOWNGRADE** -- Can be reduced to lower severity
- **RECLASSIFY** -- Needs category change

### Critical Items (7)

| ID | Description | Draft Severity | QA Verdict | Reasoning |
|----|-------------|---------------|------------|-----------|
| TD-C01 | Edge Functions verify_jwt = false | Critical | **AGREE** | Defense-in-depth violation. Even with manual JWT checks, misconfigured or new functions are exposed. 30-minute fix makes this a no-brainer Critical. |
| TD-C02 | agent_documents RLS too permissive | Critical | **AGREE** | Data exposure of business-critical knowledge base content. Confirmed by both DB-AUDIT and schema analysis. |
| TD-C03 | API keys in plaintext | Critical | **DOWNGRADE to HIGH** | Mitigations exist (view filter, function REVOKE). Only admins have access. Not immediately exploitable by regular users. Still urgent, but not same tier as TD-C01/C02. |
| TD-C04 | No ErrorBoundary | Critical | **DOWNGRADE to HIGH** | Important for UX but not data-loss or security. White screen is bad UX, not a security incident. High is appropriate given user impact. |
| TD-C05 | React Query unused | Critical | **DOWNGRADE to HIGH** | This is architectural debt, not a critical failure. The app functions without React Query -- it just does so inefficiently. Calling this Critical conflates "should improve" with "imminent failure." |
| TD-C06 | AuthContext overloaded | Critical | **DOWNGRADE to HIGH** | Performance issue, not a crash-causing bug. Re-renders are wasteful but don't break functionality. High is appropriate. |
| TD-C07 | Direct Supabase calls | Critical | **DOWNGRADE to HIGH** | Maintainability debt, not an immediate risk. Tight coupling makes refactoring harder, but the app works. High is appropriate. |

**Summary:** Only **3 items are truly Critical** (TD-C01, TD-C02, and one item missed -- see Gap Analysis). Items TD-C03 through TD-C07 should be HIGH. This inflates the urgency perception and may lead to misallocation of effort.

### High Items (12)

| ID | Description | Draft Severity | QA Verdict | Reasoning |
|----|-------------|---------------|------------|-----------|
| TD-H01 | Hotmart webhook no HMAC | High | **AGREE** | Replay attacks and spoofing are real risks for a payment webhook. |
| TD-H02 | Credit cost client influence | High | **UPGRADE to CRITICAL** | If verified, this allows users to manipulate credit costs -- a direct financial exploit. This should be Critical pending @data-engineer confirmation. |
| TD-H03 | No admin audit trail | High | **AGREE** | Compliance risk, but not immediately exploitable. |
| TD-H04 | user_credits UPDATE too broad | High | **UPGRADE to CRITICAL** | Users can directly UPDATE their own credit balance. This is a direct financial vulnerability -- users can give themselves unlimited credits. This is more severe than TD-C03 (API keys). |
| TD-H05 | Kanban not mobile responsive | High | **AGREE** | Significant UX issue for a content creator platform where mobile usage is expected. |
| TD-H06 | No form validation | High | **AGREE** | Data integrity risk in admin forms. |
| TD-H07 | Missing ARIA labels | High | **DOWNGRADE to MEDIUM** | Accessibility is important but this is not a blocking issue for most users. WCAG compliance is a Medium-term goal. |
| TD-H08 | Admin not code-split | High | **DOWNGRADE to MEDIUM** | Performance optimization. Admin is low-traffic. Bundle size impact is real but not urgent. |
| TD-H09 | No loading skeletons | High | **DOWNGRADE to MEDIUM** | UX polish, not a functional deficiency. Spinners work. |
| TD-H10 | voice-audios bucket public | High | **AGREE** | PII exposure. Voice data is sensitive personal information. |
| TD-H11 | Missing index on has_role() | High | **DOWNGRADE to MEDIUM** | UNIQUE constraint provides implicit index. Only relevant at scale (1000+ users). Current user base likely small. |
| TD-H12 | Missing performance indexes | High | **DOWNGRADE to MEDIUM** | Same reasoning as TD-H11. Indexes matter at scale; premature optimization concern at current stage. |

### Medium Items (17)

| ID | Description | Draft Severity | QA Verdict | Reasoning |
|----|-------------|---------------|------------|-----------|
| TD-M01 | Navigation config duplicated | Medium | **AGREE** | Maintainability debt. |
| TD-M02 | Modal state duplication | Medium | **AGREE** | Minor DRY violation. |
| TD-M03 | No i18n framework | Medium | **DOWNGRADE to LOW** | Single-market product (Brazil). i18n is premature unless international expansion is planned. |
| TD-M04 | Chat not streaming | Medium | **AGREE** | UX impact is real but functional. Users wait for complete response. |
| TD-M05 | No soft delete | Medium | **AGREE** | Recovery risk, GDPR consideration. |
| TD-M06 | No plan validity constraint | Medium | **AGREE** | Data integrity risk. |
| TD-M07 | Redundant plan/credit tables | Medium | **AGREE** | Schema complexity. |
| TD-M08 | Hardcoded Kanban colors | Medium | **AGREE** | Design system debt. |
| TD-M09 | Color-only status indicators | Medium | **AGREE** | Accessibility (WCAG 1.4.1). |
| TD-M10 | No keyboard DnD | Medium | **AGREE** | Accessibility (WCAG 2.1.1). |
| TD-M11 | Inconsistent data patterns | Medium | **AGREE** | Architecture inconsistency. |
| TD-M12 | Sidebar state not persisted | Medium | **DOWNGRADE to LOW** | Minor UX annoyance. |
| TD-M13 | renew-credits external cron | Medium | **UPGRADE to HIGH** | If the cron fails, users do NOT receive monthly credits. This is a billing/revenue failure. Should be High. |
| TD-M14 | No FK on user_scripts.objective | Medium | **AGREE** | Data integrity. |
| TD-M15 | File encoding (Lovable) | Medium | **AGREE** | Tool compatibility issue. |
| TD-M16 | No component documentation | Medium | **AGREE** | DX debt. |
| TD-M17 | Duplicate animations | Medium | **DOWNGRADE to LOW** | Cosmetic. No functional impact. |

### Low Items (8)

| ID | Description | Draft Severity | QA Verdict | Reasoning |
|----|-------------|---------------|------------|-----------|
| TD-L01 | Inconsistent FK patterns | Low | **AGREE** | Consistency improvement. |
| TD-L02 | 50+ shadcn components unused | Low | **AGREE** | Bundle size, minor. Tree-shaking handles most. |
| TD-L03 | No focus-visible indicators | Low | **AGREE** | Accessibility polish. |
| TD-L04 | No heading hierarchy | Low | **AGREE** | SEO/a11y minor. |
| TD-L05 | Form errors via toast only | Low | **AGREE** | UX polish. |
| TD-L06 | Only md: breakpoint | Low | **AGREE** | Tablet optimization. |
| TD-L07 | Dark mode only | Low | **AGREE** | Design choice, not debt per se. |
| TD-L08 | No error tracking | Low | **UPGRADE to HIGH** | This is severely underrated. Without Sentry/equivalent, production errors are INVISIBLE. You cannot fix what you cannot see. Combined with no tests, this means bugs go undetected until users complain. This should be HIGH. |

### Reclassification Summary

| Change | Items | Count |
|--------|-------|-------|
| AGREE (no change) | 28 items | 28 |
| DOWNGRADE | TD-C03, TD-C04, TD-C05, TD-C06, TD-C07, TD-H07, TD-H08, TD-H09, TD-H11, TD-H12, TD-M03, TD-M12, TD-M17 | 13 |
| UPGRADE | TD-H02, TD-H04, TD-L08, TD-M13 | 4 |

### Revised Severity Distribution

| Severity | Original | Revised | Delta |
|----------|----------|---------|-------|
| Critical | 7 | 3 (+TD-H02, +TD-H04 = 5) | -2 |
| High | 12 | 14 | +2 |
| Medium | 17 | 13 | -4 |
| Low | 8 | 12 | +4 |

**Note:** The revised Critical count of 5 includes TD-C01, TD-C02, TD-H02 (upgraded), TD-H04 (upgraded), plus a new item (see Gap Analysis: TypeScript strictness disabled).

---

## 2. Cross-Category Dependency Graph

### Hard Dependencies (MUST be done in order)

```
TD-C01 (JWT config)
  └── Prerequisite for: TD-H01 (webhook signature)
      Because: Webhook is the exception; all other functions need JWT first

TD-C02 (RLS fix) + TD-H04 (credits UPDATE policy)
  └── Independent but should be same migration batch
  └── Prerequisite for: TD-H02 (credit cost validation)
      Because: No point validating cost if users can UPDATE balance directly

TD-C05 (React Query) ←→ TD-C07 (data layer hooks)
  └── Bidirectional: These are the SAME initiative
  └── Prerequisite for: TD-M04 (streaming chat)
      Because: Streaming requires proper data layer, not inline useEffect
  └── Prerequisite for: TD-M11 (consistent data patterns)

TD-C06 (AuthContext split)
  └── Prerequisite for: TD-C05/C07 (data layer)
      Because: Context split must happen before React Query migration
      to avoid re-render cascading during migration

TD-C04 (ErrorBoundary)
  └── Prerequisite for: ALL frontend refactoring
      Because: Without error boundaries, any refactoring bug crashes entire app
```

### Combinable Items (efficiency gains)

```
GROUP A: Security Migration (single PR)
  TD-C01 + TD-C02 + TD-H04 + TD-H10
  Effort: 1 hour total (config + 1 migration)

GROUP B: Database Indexes (single migration)
  TD-H11 + TD-H12
  Effort: 15 minutes

GROUP C: Data Layer (same initiative, 2-3 weeks)
  TD-C05 + TD-C07 + TD-M11
  These cannot be done separately -- they are facets of the same problem

GROUP D: Accessibility Batch
  TD-H07 + TD-M09 + TD-M10 + TD-L03 + TD-L04
  All a11y improvements; can be one focused sprint

GROUP E: Admin Polish
  TD-H06 + TD-H08 + TD-M01
  Admin-scoped improvements
```

### Hidden Dependencies NOT in DRAFT

```
NEW-01 (TypeScript strict mode) → BLOCKS → TD-C05/C07 (data layer)
  Reason: Migrating to React Query with noImplicitAny:false and
  strictNullChecks:false will produce fragile hooks that don't
  catch null/undefined errors at compile time.

NEW-02 (Test infrastructure) → BLOCKS → ALL refactoring
  Reason: Without tests, every refactoring change is untested.
  The proposed Sprint 2-5 changes touch ~50+ files.

NEW-03 (CI/CD pipeline) → BLOCKS → reliable deployment
  Reason: Manual deploys of security fixes risk misconfiguration.

TD-L08 (error tracking) → SHOULD PRECEDE → Sprint 2+ refactoring
  Reason: Need visibility into production errors before making
  sweeping changes.
```

---

## 3. Sprint Ordering Validation

### Is Security-First the Right Approach?

**YES, with a critical caveat.**

Security-first is correct because:
1. TD-C01 and TD-C02 are genuine vulnerabilities, not theoretical risks
2. TD-H04 (user_credits UPDATE) is a financial exploit vector
3. TD-H10 (voice-audios public) is a PII compliance issue
4. These fixes are small, low-risk, and independently deployable

**The caveat:** Sprint 1 should also include **error tracking setup** (TD-L08 upgraded). Before touching anything else, the team needs production visibility.

### Revised Sprint Ordering

```
Sprint 0 (Day 1-2): OBSERVABILITY FOUNDATION
  - TD-L08: Set up Sentry or equivalent error tracking
  - NEW-02: Establish test infrastructure (at minimum: Supabase mock, auth mock)
  - NEW-03: Basic CI pipeline (lint + type-check + test on PR)
  Effort: 2 days
  Justification: Cannot safely refactor without eyes on production

Sprint 1 (Week 1): SECURITY HARDENING
  - TD-C01: Enable verify_jwt (30 min)
  - TD-C02: Fix RLS on agent_documents/document_chunks (15 min)
  - TD-H04: Remove user_credits UPDATE policy (5 min)
  - TD-H10: voice-audios bucket private (10 min)
  - TD-H11 + TD-H12: Database indexes (15 min)
  - TD-M13: Assess cron reliability for renew-credits
  Effort: ~3 hours of changes + testing/verification
  Justification: Minimal code change, maximum risk reduction

Sprint 2 (Week 2-3): FRONTEND SAFETY NET
  - TD-C04: ErrorBoundary (per-route + App level)
  - TD-C06: Split AuthContext (before data layer migration)
  - TD-H09: Loading skeletons (use existing shadcn Skeleton)
  - TD-M15: Fix file encoding
  - Write tests for AuthContext split (regression safety)
  Effort: 1-2 weeks
  Justification: Safety infrastructure before large refactoring

Sprint 3 (Week 3-5): DATA LAYER MIGRATION
  - TD-C05 + TD-C07 + TD-M11: React Query + data hooks (COMBINED)
  - TD-M04: Chat streaming (requires data layer)
  - Write tests for each new data hook
  Effort: 2-3 weeks (this is the largest and riskiest sprint)
  Justification: Core architecture improvement; must have tests

Sprint 4 (Week 5-7): ADMIN & UX
  - TD-H06: Form validation with Zod
  - TD-H08: Code-split admin sections
  - TD-H05: Kanban mobile responsiveness
  - TD-H07 + TD-M09 + TD-M10: Accessibility batch
  Effort: 1-2 weeks

Sprint 5 (Week 7-8): ADVANCED SECURITY
  - TD-C03: API keys to Vault/env vars
  - TD-H01: Webhook HMAC signature
  - TD-H02: Server-side credit cost validation
  - TD-H03: Admin audit logging
  Effort: 1 week
```

### Parallelization Opportunities

```
PARALLEL TRACK A (Backend): Sprint 1 security + Sprint 5 advanced security
PARALLEL TRACK B (Frontend): Sprint 2 safety net + Sprint 4 UX polish

These tracks are independent and can run simultaneously if team has
both backend and frontend capacity.

Specifically:
- Sprint 1 backend work can run while Sprint 2 frontend work starts
- Sprint 5 backend work can start during Sprint 4 frontend work
- Sprint 3 (data layer) is the BOTTLENECK -- cannot be parallelized
  because it touches both backend patterns and frontend code
```

### Are Effort Estimates Realistic?

| Sprint | DRAFT Estimate | QA Assessment | Notes |
|--------|---------------|---------------|-------|
| Sprint 0 | Not included | 2 days | **MISSING from DRAFT** |
| Sprint 1 | 1 week | 2-3 days | DRAFT overestimates; these are config changes |
| Sprint 2 | 1-2 weeks | 1-2 weeks | Reasonable, especially AuthContext split |
| Sprint 3 | 2 weeks | 2-3 weeks | **DRAFT underestimates**. React Query migration across 50+ files with no existing tests is HIGH risk and HIGH effort |
| Sprint 4 | 1-2 weeks | 1-2 weeks | Reasonable |
| Sprint 5 | 1 week | 1-2 weeks | Webhook signature + Vault migration could take longer |

**Revised total: 7-10 weeks** (vs DRAFT's 6-8 weeks)

The DRAFT's 6-8 week estimate does not account for:
1. Test writing alongside refactoring
2. CI/CD setup
3. Error tracking setup
4. Regression verification time
5. The fact that Sprint 3 (data layer) is consistently underestimated in industry

---

## 4. Testing Debt Assessment

### Current State: CRITICAL

| Metric | Value | Assessment |
|--------|-------|------------|
| Test files in src/ | 1 | Effectively zero |
| That test | `expect(true).toBe(true)` | Placeholder only |
| Test framework | Vitest 3.2.4 + jsdom | Correctly configured |
| Test setup | @testing-library/jest-dom + matchMedia mock | Minimal but functional |
| React Testing Library | v16.0.0 installed | Available but unused |
| Test pattern in vitest.config | `src/**/*.{test,spec}.{ts,tsx}` | Correct |
| Coverage configuration | None | No coverage thresholds |
| E2E testing | None | No Playwright/Cypress |
| Component testing | None | No Storybook tests |
| API/Edge Function testing | None | No Deno test runner configured |
| Test scripts in package.json | `test` and `test:watch` | Present but run 1 placeholder |

### Test Coverage Analysis

```
Current coverage: ~0% (1 placeholder test / 130+ source files)

Files importing Supabase directly: 51
Files with console.error/warn: 36 (84 occurrences)
Files using useQuery/useMutation: 0
Custom hooks to test: 10
Contexts to test: 3
Edge Functions to test: 16
Pages with data fetching: 10+
Complex components (>200 LOC): 15+
```

### Testing Framework Readiness

**Vitest setup is correct** but incomplete:

What's ready:
- Vitest with jsdom environment
- SWC plugin for fast compilation
- Path aliases configured (`@/`)
- Testing Library available
- matchMedia mock for responsive tests

What's missing:
- **Supabase client mock** -- Required for ANY component/hook test
- **Auth context mock** -- Required for testing authenticated pages
- **Router mock** -- Required for testing navigation
- **Coverage configuration** -- No thresholds or reports
- **MSW (Mock Service Worker)** -- Not installed; needed for Edge Function mocking
- **Snapshot configuration** -- No snapshot testing setup

### Recommended Testing Strategy for Refactoring

#### Phase 1: Foundation (Sprint 0, before any refactoring)

```
Priority tests to write FIRST:
1. Auth flow tests (login, logout, session recovery)
2. Credit system tests (balance check, consume, purchase)
3. RLS verification tests (run against Supabase local)
4. Edge Function smoke tests

These protect the most critical business logic before changes begin.
```

#### Phase 2: Alongside Refactoring (Sprints 2-5)

```
For every refactored module, require:
1. Unit tests for new hooks (useAgents, useConversations, etc.)
2. Integration tests for data flow (hook → Supabase mock → UI)
3. Regression tests for the OLD behavior before changing it

Target: 60%+ coverage on new/changed code
```

#### Phase 3: Ongoing (Post-refactoring)

```
1. E2E tests for critical paths (login, chat, kanban, credits)
2. Visual regression tests for design system changes
3. Performance tests (Lighthouse CI)
4. Coverage gate in CI (fail build below threshold)
```

### Testing Dependencies to Install

```json
{
  "devDependencies": {
    "msw": "^2.x",           // Mock Service Worker for API mocking
    "@vitest/coverage-v8": "^3.x",  // Coverage reporting
    "playwright": "^1.x"     // E2E testing (optional, Phase 3)
  }
}
```

---

## 5. Risk Assessment Matrix

### Overall Project Risk: HIGH

| Risk Area | Level | Justification |
|-----------|-------|---------------|
| Security | **CRITICAL** | Active vulnerabilities (TD-C01, TD-C02, TD-H04) with financial exploit potential |
| Testing | **CRITICAL** | 0% coverage; no safety net for any change |
| Observability | **CRITICAL** | No error tracking; production failures are invisible |
| Architecture | **HIGH** | Tight coupling, no abstraction layer, manual data fetching |
| Frontend | **HIGH** | No error boundaries, no consistent patterns |
| Database | **MEDIUM** | Schema is solid; indexes and policies need work |
| Performance | **MEDIUM** | Not optimized but functional at current scale |
| Deployment | **HIGH** | No CI/CD; manual deploys risk introducing errors |
| TypeScript | **HIGH** | strict:false, noImplicitAny:false, strictNullChecks:false -- type safety is theater |

### Top 3 Risks to the Business

#### Risk 1: Financial Exploit via Credit Manipulation (CRITICAL)
**What:** Users can UPDATE their own credit balance (TD-H04) and potentially influence credit cost (TD-H02). Combined, this means users can give themselves unlimited credits for free.
**Impact:** Direct revenue loss. If one user discovers this and shares it, viral exploitation.
**Likelihood:** Medium (requires technical knowledge, but DevTools make it easy)
**Mitigation:** Sprint 1 -- DROP the UPDATE policy (5 minutes).

#### Risk 2: Refactoring Without Safety Net (HIGH)
**What:** The proposed 6-8 week refactoring touches 50+ files across every layer of the application, with ZERO test coverage and NO error tracking. Any introduced bug will be invisible until users report it.
**Impact:** New bugs in production. User trust erosion. Potential data corruption during data layer migration.
**Likelihood:** High (refactoring without tests statistically introduces regressions)
**Mitigation:** Sprint 0 -- Set up Sentry + write foundation tests before touching anything.

#### Risk 3: Data Exposure of Agent Knowledge Bases (CRITICAL)
**What:** Any authenticated user can read ALL agent documents and embedding chunks (TD-C02). This includes proprietary system prompts, training data, and business methodology.
**Impact:** Intellectual property theft. Competitive advantage loss. If knowledge bases contain client data, potential LGPD violation.
**Likelihood:** High (simple SELECT query from authenticated session)
**Mitigation:** Sprint 1 -- Fix RLS policy (15 minutes).

### Confidence Level in Assessment

| Aspect | Confidence | Notes |
|--------|------------|-------|
| Security findings | **HIGH** (90%) | Corroborated by DB-AUDIT + schema + config analysis |
| Frontend findings | **HIGH** (85%) | Verified against frontend-spec + package.json + tsconfig |
| Database findings | **HIGH** (90%) | DB-AUDIT is thorough and well-evidenced |
| Effort estimates | **MEDIUM** (60%) | Refactoring effort is notoriously hard to estimate; Sprint 3 is the biggest unknown |
| Missing items | **MEDIUM** (70%) | We may have missed issues in Edge Function business logic (not code-reviewed) |
| Roadmap ordering | **HIGH** (85%) | Security-first is well-supported; Sprint 0 addition is high-confidence |

---

## 6. Gap Analysis

### GAP-01: CI/CD Pipeline -- NOT ADDRESSED

**Status:** Mentioned in system-architecture.md as TD-15, but NOT included in the 44-item DRAFT inventory.

**Evidence:**
- No `.github/workflows/` directory in project root
- No Dockerfile or deployment configuration
- No build/test automation
- Templates exist in `.aios-core/product/templates/` (github-actions-ci.yml, github-actions-cd.yml) but are NOT deployed

**Impact:** Every deployment is manual. No lint check, no type check, no test run before deploy. Security fixes from Sprint 1 could be deployed incorrectly.

**Recommendation:** Add as **HIGH** priority item. Should be Sprint 0.

### GAP-02: TypeScript Strictness -- SEVERELY UNDERRATED

**Status:** Mentioned in system-architecture.md as TD-02 (Critical) but NOT included in the 44-item DRAFT inventory.

**Evidence from tsconfig.app.json:**
```json
{
  "strict": false,
  "noImplicitAny": false,
  "noUnusedLocals": false,
  "noUnusedParameters": false,
  "noFallthroughCasesInSwitch": false
}
```

**Impact:** TypeScript is being used as "JavaScript with annotations." The compiler cannot catch:
- Null pointer exceptions (`strictNullChecks: false`)
- Untyped variables (`noImplicitAny: false`)
- Missing switch cases
- Unused code accumulation

This is a CRITICAL quality debt. Every React Query hook written with these settings will have null safety holes.

**Recommendation:** Add as **HIGH** priority. Enable incrementally: `strictNullChecks` first (Sprint 2), then `noImplicitAny` (Sprint 3).

### GAP-03: ESLint Configuration -- TOO PERMISSIVE

**Status:** Not mentioned in any assessment document.

**Evidence from eslint.config.js:**
```javascript
"@typescript-eslint/no-unused-vars": "off"
```

Only `recommended` rules active. No custom rules for:
- Import ordering
- React best practices
- Accessibility (eslint-plugin-jsx-a11y)
- No `eslint-plugin-security` for catching obvious vulnerabilities

**Impact:** Linter provides minimal value. Dead code accumulates. Accessibility issues not caught at development time.

**Recommendation:** Add as **MEDIUM** priority item.

### GAP-04: Error Tracking / Monitoring -- CRITICAL GAP

**Status:** Mentioned as TD-L08 (Low) but this is a severe misclassification.

**Evidence:**
- Zero files import any error tracking library
- 84 occurrences of `console.error/warn` across 36 files -- these logs go NOWHERE in production
- No health check endpoints
- No uptime monitoring

**Impact:** Production errors are completely invisible. The team relies entirely on user reports.

**Recommendation:** Already upgraded to HIGH in severity validation. Should be Sprint 0.

### GAP-05: Performance Baseline -- NOT ESTABLISHED

**Status:** Not mentioned in DRAFT.

**Issue:** No Lighthouse scores, no Web Vitals baseline, no bundle size tracking. Without a baseline, it's impossible to verify that refactoring improves (or at minimum doesn't degrade) performance.

**Recommendation:** Run Lighthouse audit and record baseline BEFORE Sprint 2. Add as **MEDIUM** item.

### GAP-06: Security Testing -- NOT ADDRESSED

**Status:** Not mentioned in any document.

**Missing:**
- No dependency vulnerability scanning (`npm audit` or Snyk)
- No SAST (Static Application Security Testing)
- No penetration testing plan
- No CSP (Content Security Policy) headers
- No CORS configuration validation

**Recommendation:** Add `npm audit` to CI pipeline (Sprint 0). Add as **MEDIUM** item for ongoing security testing.

### GAP-07: Environment Variable Validation -- NOT ADDRESSED

**Status:** Mentioned in system-architecture.md as TD-11 (Medium) but NOT included in the 44-item DRAFT inventory.

**Evidence:**
- No `.env.example` committed (it's in untracked files per git status)
- No runtime validation that required env vars exist
- Edge Functions likely have env vars not documented

**Impact:** Silent failures if env vars are missing. New developers cannot set up without tribal knowledge.

**Recommendation:** Add as **MEDIUM** item.

### GAP-08: Edge Function Business Logic -- NOT CODE-REVIEWED

**Status:** Not mentioned.

**Issue:** The DB-AUDIT reviewed Edge Functions for auth patterns, but the actual business logic (credit calculations, AI prompt construction, webhook processing) was not reviewed for correctness.

**Risk:** The `consume-credits` function may have calculation bugs. The `chat` function may have prompt injection vulnerabilities. The `generate-script` function may have quality issues.

**Recommendation:** Add Edge Function business logic review as **MEDIUM** priority for Sprint 5 timeframe.

### Gap Summary

| Gap | Severity | Sprint | In DRAFT? |
|-----|----------|--------|-----------|
| GAP-01: CI/CD Pipeline | HIGH | 0 | No (mentioned in arch doc as TD-15 but excluded from 44 items) |
| GAP-02: TypeScript Strictness | HIGH | 2-3 | No (mentioned in arch doc as TD-02 but excluded from 44 items) |
| GAP-03: ESLint Permissiveness | MEDIUM | 2 | No |
| GAP-04: Error Tracking | HIGH | 0 | Misclassified as Low (TD-L08) |
| GAP-05: Performance Baseline | MEDIUM | Pre-Sprint 2 | No |
| GAP-06: Security Testing | MEDIUM | 0 (npm audit), ongoing | No |
| GAP-07: Env Var Validation | MEDIUM | 2 | No (mentioned in arch doc as TD-11 but excluded) |
| GAP-08: Edge Function Logic | MEDIUM | 5 | No |

**Important note:** The system-architecture.md identified 18 debt items (TD-01 through TD-18). The DRAFT consolidated these into its 44-item inventory, but **at least 3 items from the architecture doc were lost in consolidation**: TD-02 (TypeScript strict), TD-11 (env validation), and TD-15 (CI/CD). These should be re-added.

---

## 7. Answers to the 5 QA Questions

### Q1: Is the severity classification correct across all 44 items?

**Partially.** The classification is directionally correct but has notable inflation at the Critical level and deflation at the Low level.

- **5 of 7 Critical items should be HIGH.** Only TD-C01 (JWT) and TD-C02 (RLS) are truly Critical in the "fix today or face imminent harm" sense. The frontend items (TD-C04 through TD-C07) are important architectural debts but are not immediate threats. TD-C03 (API keys) has sufficient mitigations to be HIGH rather than Critical.
- **2 High items should be CRITICAL:** TD-H02 (credit cost manipulation) and TD-H04 (user_credits UPDATE) are financial exploit vectors and are more dangerous than several items classified as Critical.
- **3 items are underrated:** TD-L08 (error tracking) should be HIGH. TD-M13 (cron failure) should be HIGH. These have outsized business impact.
- **5 items are overrated:** TD-H07, TD-H08, TD-H09, TD-H11, TD-H12 can safely be MEDIUM.

See Section 1 for the complete reclassification matrix.

### Q2: Are there cross-category dependencies we're missing?

**Yes, significantly.** The DRAFT treats items as independent, but there are critical dependency chains:

1. **TD-C04 (ErrorBoundary) blocks ALL frontend refactoring** -- Without error boundaries, any refactoring bug crashes the entire app. This must be done BEFORE Sprints 3-4.
2. **TD-C06 (AuthContext) blocks TD-C05/C07 (data layer)** -- Context must be split before React Query migration to avoid cascading re-render issues during migration.
3. **TypeScript strictness blocks data layer quality** -- Writing React Query hooks with `strictNullChecks: false` produces code that passes compilation but fails at runtime.
4. **Test infrastructure blocks confident refactoring** -- The DRAFT proposes changing 50+ files over 6-8 weeks with zero test coverage. This is a recipe for regressions.
5. **Error tracking blocks production safety** -- Changes deployed without error visibility are blind deployments.

See Section 2 for the complete dependency graph.

### Q3: Sprint ordering: Is security-first the right approach?

**Yes, security-first is correct, but the DRAFT is missing a "Sprint 0."**

Security fixes (Sprint 1) are small, low-risk, and address genuine vulnerabilities. They should absolutely come first.

However, the DRAFT jumps directly from security fixes to frontend refactoring without establishing the safety infrastructure needed for that refactoring:
- Error tracking (Sentry)
- Test foundation (auth mock, Supabase mock, core business logic tests)
- CI pipeline (at minimum: lint + type-check + test)

I recommend inserting a **Sprint 0 (2 days)** for observability and test foundation before Sprint 1. See Section 3 for the revised sprint ordering.

### Q4: Are there testing debt items not captured?

**Yes, testing debt is the single largest gap in the DRAFT.**

The DRAFT mentions zero test files exist but does not classify the absence of tests as a standalone debt item. It should be.

Missing from inventory:
- **No test coverage** (0% -- only 1 placeholder test)
- **No coverage thresholds** (vitest has no coverage config)
- **No Supabase client mock** (cannot test any hook or component)
- **No E2E tests** (no Playwright/Cypress)
- **No Edge Function tests** (Deno test runner not configured)
- **No CI test gate** (tests don't run on PR)
- **No MSW** (Mock Service Worker not installed for API mocking)

The system-architecture.md correctly identified this as TD-03 (Critical: "No test coverage -- Only 1 example test exists"), but this was **not carried into the DRAFT's 44-item inventory**. This is a consolidation oversight.

See Section 4 for the complete testing debt assessment.

### Q5: Risk assessment: What's the overall project risk level?

**HIGH, approaching CRITICAL in two specific areas.**

The project is a functional product with active users, built on a solid stack (React + Supabase), but with accumulated debt from rapid Lovable-platform development. The risk is not that the application will fail catastrophically today, but that:

1. **Active security vulnerabilities** (TD-C01, TD-C02, TD-H04) can be exploited by any technically savvy user TODAY
2. **The proposed refactoring is itself high-risk** due to zero test coverage, no error tracking, and disabled TypeScript strictness
3. **Production errors are invisible** -- the team is currently flying blind

The top 3 business risks are:
1. **Financial exploit via credit manipulation** (TD-H04 + TD-H02)
2. **Refactoring regressions without safety net** (no tests + no monitoring)
3. **Data exposure of proprietary content** (TD-C02)

Confidence in this assessment: **85%** overall. The security and testing findings are high-confidence (90%+). The effort estimates and roadmap ordering are medium-confidence (60-70%).

---

## 8. Overall Recommendation

### Verdict: DRAFT IS APPROVED WITH REQUIRED MODIFICATIONS

The DRAFT is a strong foundation for the technical debt assessment. The methodology (multi-source cross-referencing, correlation analysis, specialist validation) is sound and professional. The 44-item inventory captures the majority of issues.

### Required Modifications Before Finalization

| # | Modification | Priority |
|---|-------------|----------|
| 1 | **Reclassify 6 items** as documented in Section 1 (5 downgrades from Critical, 3 upgrades to Critical/High) | Required |
| 2 | **Add Sprint 0** for observability + test foundation | Required |
| 3 | **Add 3 missing items from system-architecture.md**: TD-02 (TS strictness), TD-11 (env validation), TD-15 (CI/CD) | Required |
| 4 | **Upgrade TD-L08** (error tracking) to High | Required |
| 5 | **Add testing debt** as explicit inventory item (was TD-03 in architecture doc but lost in consolidation) | Required |
| 6 | **Revise effort estimate** from 6-8 weeks to 7-10 weeks (accounting for test writing and Sprint 0) | Recommended |
| 7 | **Add dependency graph** to final assessment | Recommended |
| 8 | **Add performance baseline** step before Sprint 2 | Recommended |

### What the DRAFT Gets Right

1. Security-first prioritization
2. Cross-source correlation analysis (6 items confirmed by multiple sources)
3. Identification of Lovable-platform-specific issues (encoding, lovable-tagger)
4. Realistic recommendation to refactor (not rewrite)
5. Clear fix descriptions with effort estimates for each item
6. Proper assignment of validation responsibilities to specialists

### What the DRAFT Gets Wrong

1. Severity inflation at Critical level (conflates "should improve" with "imminent threat")
2. Missing Sprint 0 for safety infrastructure
3. Lost 3 items from system-architecture.md during consolidation
4. Severely underrates testing debt and error tracking
5. Does not account for the meta-risk of refactoring without tests
6. Does not identify cross-category dependency chains that affect implementation order

---

## Signature

```
Reviewed by: @qa (Quinn)
Role:        Quality Assurance Specialist
Date:        2026-02-17
Workflow:    brownfield-discovery-001, FASE 7
Status:      APPROVED WITH REQUIRED MODIFICATIONS
Confidence:  85%

Items reviewed:       44 (+ 8 gaps identified)
Reclassifications:    17 (13 downgrades, 4 upgrades)
New items identified: 8 (GAP-01 through GAP-08)
Sprint changes:       +1 (Sprint 0 added)
Effort revision:      6-8 weeks -> 7-10 weeks
```

---

*QA review complete. Ready for FASE 8 finalization.*
*-- Quinn, validando a qualidade*
