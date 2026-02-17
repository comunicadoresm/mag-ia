---
id: STORY-TD-S0
epic: EPIC-TD-001
sprint: 0
title: "Observability Foundation"
executor: "@devops"
quality_gate: "@qa"
quality_gate_tools: [ci_pipeline_validation, error_tracking_verification, performance_baseline]
priority: P0
effort: 2 days
status: planning
debt_items: [GAP-01, GAP-04, GAP-05]
---

# Story S0: Observability Foundation

## User Story

**As a** development team,
**I want** error tracking, CI pipeline, and performance baseline,
**So that** we can safely refactor 52 debt items without flying blind.

## Story Context

**Existing System Integration:**
- Integrates with: GitHub repository, Supabase project, Vercel/deployment
- Technology: Sentry (new), GitHub Actions (new), Lighthouse CI (new)
- Follows pattern: Standard React + Supabase observability stack
- Touch points: `package.json` (scripts), `.github/workflows/` (new), `src/main.tsx` (Sentry init)

**Why Sprint 0 is a Blocker:**
- 84 `console.error` calls go to `/dev/null` in production
- No CI pipeline — no lint, no type-check, no test on PR
- No performance baseline — cannot measure improvement or detect regression
- @qa mandated: "Sprint 0 MUST complete before any refactoring"

---

## Acceptance Criteria

### AC-1: Sentry Error Tracking (GAP-04)
- [ ] Sentry SDK installed and initialized in `src/main.tsx`
- [ ] Environment differentiation (development vs production)
- [ ] Source maps uploaded for readable stack traces
- [ ] First error captured and visible in Sentry dashboard
- [ ] Critical alert configured for >10 errors/minute

### AC-2: CI Pipeline (GAP-01)
- [ ] `.github/workflows/ci.yml` created
- [ ] Runs on: pull_request to main
- [ ] Steps: install → lint → type-check → test → build
- [ ] Pipeline passes on current codebase (even with permissive lint)
- [ ] Branch protection rule added: CI must pass before merge

### AC-3: Performance Baseline (GAP-05)
- [ ] Lighthouse audit run on key pages (Dashboard, Kanban, Chat)
- [ ] Metrics documented: LCP, FID, CLS, TTI
- [ ] Baseline saved as reference for Sprint 2-4 improvements

---

## Technical Notes

### Sentry Setup
```typescript
// src/main.tsx — add before ReactDOM.createRoot
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
});
```

### CI Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test -- --passWithNoTests
      - run: npm run build
```

### Key Constraint
- ESLint is currently permissive (`no-unused-vars: off`) — CI will pass initially but tighten in Sprint 2
- TypeScript is `strict: false` — `tsc --noEmit` will pass but will get stricter in Sprint 2-3
- Tests are ~0% coverage (1 placeholder) — `--passWithNoTests` ensures pipeline passes

---

## Risk Assessment

- **Primary Risk:** Sentry DSN exposed in client bundle
- **Mitigation:** DSN is safe to be public (Sentry docs confirm); rate limiting on Sentry side
- **Rollback:** Remove Sentry init + CI workflow (zero impact on app)

## Definition of Done

- [ ] Sentry receiving errors from production
- [ ] CI pipeline passing on current codebase
- [ ] Performance baseline documented
- [ ] No regression in existing functionality
- [ ] Team can see production errors in Sentry dashboard

---

*Story S0 — Sprint 0: Observability Foundation*
*Epic: EPIC-TD-001 (MAG-IA Technical Debt Remediation)*
