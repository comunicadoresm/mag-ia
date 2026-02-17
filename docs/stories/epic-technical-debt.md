# Epic: MAG-IA Technical Debt Remediation

> Epic ID: EPIC-TD-001
> Status: Planning
> Created: 2026-02-17
> Source: brownfield-discovery-001 workflow
> Assessment: [technical-debt-assessment.md](../prd/technical-debt-assessment.md) v2.0

---

## Epic Goal

Profissionalizar a plataforma MAG-IA eliminando 52 debitos tecnicos identificados no brownfield discovery, com foco em seguranca (3 exploits ativos), observabilidade (zero tracking/CI) e fundacao frontend, permitindo crescimento seguro da base de usuarios sem reescrita.

## Epic Description

### Existing System Context

- **Current functionality:** Plataforma AI de content marketing com Kanban, chat AI, voice DNA, onboarding, sistema de creditos e integracao Hotmart
- **Technology stack:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Supabase (Auth, DB, Edge Functions, Storage, Realtime)
- **Integration points:** Supabase (30 tabelas, 16 Edge Functions), Hotmart webhooks, AI providers (Claude, GPT-4, Gemini), Supabase Storage (voice-audios)
- **Origin:** Built on Lovable platform, needs professionalization

### Enhancement Details

- **What's being changed:** Hardening de seguranca, setup de observabilidade, refatoracao de frontend, migracao de data layer, polish de UX/admin, e seguranca avancada
- **How it integrates:** Refatoracao incremental sobre a base existente — zero downtime, features novas podem continuar em paralelo
- **Success criteria:**
  - Zero exploits financeiros ativos
  - Error tracking em producao (Sentry)
  - CI/CD pipeline funcional
  - TypeScript strict habilitado
  - React Query como data layer padrao
  - WCAG 2.1 AA compliance em areas criticas

### Debt Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 4 | 5 | 3 | 1 | 13 |
| Architecture/Quality | 0 | 5 | 6 | 1 | 12 |
| Frontend/UX | 1 | 6 | 6 | 5 | 18 |
| Database | 0 | 1 | 3 | 1 | 5 |
| Performance | 0 | 1 | 2 | 1 | 4 |
| **Total** | **5** | **18** | **20** | **9** | **52** |

---

## Stories

| # | Story | Sprint | Executor | Quality Gate | Effort | Priority |
|---|-------|--------|----------|-------------|--------|----------|
| 1 | [Observability Foundation](story-S0-observability-foundation.md) | Sprint 0 | @devops | @qa | 2 dias | P0 — Blocker |
| 2 | [Security Hardening](story-S1-security-hardening.md) | Sprint 1 | @data-engineer | @architect | 3-5 dias | P0 — Critical |
| 3 | [Frontend Foundation](story-S2-frontend-foundation.md) | Sprint 2 | @dev | @architect | 1-2 semanas | P1 — High |
| 4 | [Data Layer Migration](story-S3-data-layer.md) | Sprint 3 | @dev | @architect | 2-3 semanas | P1 — High |
| 5 | [Admin & UX Polish](story-S4-admin-ux-polish.md) | Sprint 4 | @ux-design-expert | @dev | 1-2 semanas | P2 — Medium |
| 6 | [Advanced Security](story-S5-advanced-security.md) | Sprint 5 | @dev | @architect | 1-2 semanas | P2 — Medium |

**Total estimated effort: 7-10 semanas**

---

## Cross-Category Dependencies

```
Sprint 0 (observability) ────► ALL subsequent sprints
  │
Sprint 1 (security) ──── parallelizable ────► Sprint 2 (frontend)
  │
Sprint 2 (ErrorBoundary + AuthContext) ────► Sprint 3 (data layer)
  │
Sprint 3 (data layer) ─────── BOTTLENECK ──────► Sprint 4 + Sprint 5
  │
Sprint 4 (admin/UX) ──── parallelizable ────► Sprint 5 (security)
```

**Key constraints:**
- Sprint 0 MUST complete before any refactoring (cannot refactor blind)
- Sprint 1 (backend) CAN run parallel with Sprint 2 (frontend)
- Sprint 3 is the BOTTLENECK — depends on Sprint 2 (AuthContext split + ErrorBoundary)
- Sprint 4 (frontend) CAN run parallel with Sprint 5 (backend)

---

## Compatibility Requirements

- [x] Existing APIs remain unchanged (Hotmart webhook, AI chat)
- [x] Database schema changes are backward compatible (additive migrations only)
- [x] UI changes follow existing CM dark theme patterns
- [x] Performance impact is positive (indexes, streaming, skeletons)
- [x] Zero downtime — all changes deployed incrementally

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sprint 3 (data layer) takes longer than estimated | Delays Sprint 4-5 | Can parallelize some Sprint 4 items (Zod, nav config) |
| TypeScript strict breaks too many files | Blocks Sprint 2-3 | Enable incrementally: `strictNullChecks` first |
| React Query migration causes regressions | Data fetching broken | Migrate one hook at a time with E2E smoke tests |
| Security fixes break client behavior | Users see errors | Fix exploits in DB/Edge Functions (transparent to client) |
| Sentry reveals too many errors | Alert fatigue | Tune alert thresholds, focus on Critical/Error levels |

## Quality Assurance Strategy

- **Pre-Sprint 0:** Manual testing only (current state)
- **Post-Sprint 0:** Sentry error tracking + CI pipeline on every PR
- **Sprint 1:** SQL security review by @data-engineer for all migrations
- **Sprint 2-3:** Component tests for ErrorBoundary, hooks, ProtectedRoute
- **Sprint 4-5:** Accessibility audit (axe-core) for WCAG compliance

## Definition of Done (Epic-Level)

- [ ] All 5 Critical issues resolved (TD-C01 through TD-C04 + NEW-DB-01)
- [ ] All 18 High issues resolved or in Backlog with justification
- [ ] Sentry reporting errors from production
- [ ] CI pipeline passing on all PRs (lint + type-check + test)
- [ ] TypeScript `strict: true` enabled
- [ ] React Query as standard data fetching pattern
- [ ] No WCAG 1.4.1 violations in Kanban/Chat
- [ ] voice-audios bucket private with signed URLs
- [ ] Cron functions authenticated with CRON_SECRET
- [ ] Performance indexes deployed

---

## Reference Documents

| Document | Content |
|----------|---------|
| [technical-debt-assessment.md](../prd/technical-debt-assessment.md) | Full assessment v2.0 (52 items) |
| [TECHNICAL-DEBT-REPORT.md](../reports/TECHNICAL-DEBT-REPORT.md) | Executive report |
| [system-architecture.md](../architecture/system-architecture.md) | System architecture |
| [SCHEMA.md](../../supabase/docs/SCHEMA.md) | Database schema (30 tables) |
| [DB-AUDIT.md](../../supabase/docs/DB-AUDIT.md) | Security audit |
| [frontend-spec.md](../frontend/frontend-spec.md) | Frontend spec (109+ components) |
| [db-specialist-review.md](../reviews/db-specialist-review.md) | @data-engineer review |
| [ux-specialist-review.md](../reviews/ux-specialist-review.md) | @ux-design-expert review |
| [qa-review.md](../reviews/qa-review.md) | @qa review |

---

*Epic created by Orion (AIOS Master) — Brownfield Discovery Workflow FASE 10*
*— Orion, orquestrando o sistema*
