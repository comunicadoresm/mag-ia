---
id: STORY-TD-S2
epic: EPIC-TD-001
sprint: 2
title: "Frontend Foundation"
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: [component_test, a11y_validation, typescript_check, pattern_validation]
priority: P1
effort: 1-2 weeks
status: planning
debt_items: [TD-C04, TD-H05, NEW-UX-03, TD-H09, TD-C06, TD-H07, TD-M15, GAP-02]
---

# Story S2: Frontend Foundation

## User Story

**As a** user on mobile or desktop,
**I want** a resilient UI with proper error handling, fast loading states, and mobile-optimized Kanban,
**So that** I can manage my content pipeline reliably from any device.

## Story Context

**Existing System Integration:**
- Integrates with: React component tree, `AuthContext`, Kanban page, all routes
- Technology: React 18, shadcn/ui (Skeleton component available), TypeScript
- Follows pattern: Existing shadcn/ui patterns, Tailwind utility classes, CM dark theme
- Touch points: `src/App.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/Kanban.tsx`, all route pages

**Dependencies:**
- Requires Sprint 0 complete (Sentry for error tracking)
- Can run in PARALLEL with Sprint 1 (security — different codebase area)
- MUST complete before Sprint 3 (AuthContext split needed for data layer migration)

---

## Acceptance Criteria

### AC-1: Error Boundary (TD-C04) — 2 hours
- [ ] Global `<ErrorBoundary>` wrapping entire app in `App.tsx`
- [ ] Per-feature boundaries for: Kanban, ScriptEditor, Onboarding, Chat
- [ ] Error UI shows "algo deu errado" with retry button (not white screen)
- [ ] Errors reported to Sentry automatically via `componentDidCatch`
- [ ] Reset state on navigation (don't trap user in error state)

### AC-2: Kanban Mobile (TD-H05) — 3-5 days
- [ ] Mobile view (<768px): Horizontal swipeable tabs for status columns
- [ ] Each tab shows stacked cards for that status
- [ ] Swipe gestures for navigation between columns
- [ ] Drag-and-drop works within visible column
- [ ] Desktop view (>=768px): Unchanged horizontal columns layout
- [ ] Status indicator dots on tab header showing card counts

### AC-3: ProtectedRoute Wrapper (NEW-UX-03) — 2 hours
- [ ] `<ProtectedRoute>` component created
- [ ] Redirects to login if not authenticated
- [ ] Shows loading skeleton while checking auth (no flash of content)
- [ ] All protected pages use `<ProtectedRoute>` instead of inline useEffect checks
- [ ] New pages get protection automatically by using the wrapper

### AC-4: Loading Skeletons (TD-H09) — 1 day
- [ ] Skeleton states for: Dashboard cards, Kanban columns, Chat message list, Script list
- [ ] Uses existing shadcn/ui `<Skeleton>` component
- [ ] Replaces current spinner-only loading states
- [ ] Maintains layout stability (no content shift when data loads)

### AC-5: AuthContext Split (TD-C06) — 1 day
- [ ] `AuthContext` split into: `useAuth()` (session/login/logout), `useProfile()` (profile data), `useUserPlan()` (plan_type, credits)
- [ ] Each hook has its own context provider
- [ ] Profile changes don't re-render auth-dependent components
- [ ] Plan changes don't re-render profile-dependent components
- [ ] All existing consumers migrated to appropriate hook

### AC-6: ARIA Labels (TD-H07) — 4 hours
- [ ] All icon-only buttons have `aria-label` attribute
- [ ] Navigation items have proper `aria-current` for active state
- [ ] Form inputs have associated labels
- [ ] Interactive elements are keyboard-focusable
- [ ] axe-core audit passes with 0 critical/serious violations

### AC-7: File Encoding Fix (TD-M15) — 30 min
- [ ] `.editorconfig` created with `end_of_line = lf`
- [ ] `.gitattributes` configured for consistent line endings
- [ ] Lovable-generated files with 0 line endings normalized

### AC-8: TypeScript strictNullChecks (GAP-02 partial) — 2-3 days
- [ ] `strictNullChecks: true` enabled in `tsconfig.json`
- [ ] All type errors from strictNullChecks resolved
- [ ] No `as any` escape hatches added (proper null handling)
- [ ] CI pipeline passes with strictNullChecks

---

## Technical Notes

### Error Boundary Pattern
```tsx
// src/components/ErrorBoundary.tsx
import * as Sentry from "@sentry/react";

export const AppErrorBoundary = ({ children }) => (
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2>Algo deu errado</h2>
        <Button onClick={resetError}>Tentar novamente</Button>
      </div>
    )}
  >
    {children}
  </Sentry.ErrorBoundary>
);
```

### Kanban Mobile — Swipeable Tabs
```tsx
// Concept: Tab-based mobile layout
<div className="md:hidden">
  <TabGroup selectedIndex={activeColumn} onChange={setActiveColumn}>
    <TabList className="flex overflow-x-auto gap-2">
      {columns.map(col => (
        <Tab key={col.id} className="whitespace-nowrap">
          {col.title} ({col.cards.length})
        </Tab>
      ))}
    </TabList>
    <TabPanels className="touch-pan-x">
      {columns.map(col => (
        <TabPanel key={col.id}>
          {col.cards.map(card => <ScriptCard key={card.id} {...card} />)}
        </TabPanel>
      ))}
    </TabPanels>
  </TabGroup>
</div>
<div className="hidden md:flex gap-4">
  {/* Existing desktop Kanban layout */}
</div>
```

### AuthContext Split Strategy
1. Create `src/contexts/AuthSessionContext.tsx` (session, login, logout)
2. Create `src/hooks/useProfile.ts` (profile data, avatar, name)
3. Create `src/hooks/useUserPlan.ts` (plan_type, credits, features)
4. Migrate consumers one page at a time
5. Remove old `AuthContext` when all consumers migrated

### File Encoding
```ini
# .editorconfig
root = true
[*]
end_of_line = lf
charset = utf-8
insert_final_newline = true
trim_trailing_whitespace = true
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| AuthContext split breaks auth flow | Users can't login | Migrate one consumer at a time; keep old context until all migrated |
| strictNullChecks reveals hundreds of errors | Long resolution time | Fix in batches by directory; use `// @ts-expect-error` sparingly |
| Kanban mobile UX not intuitive | Users confused | Test with 3 CM users before full rollout |
| ErrorBoundary catches too aggressively | Features stop working | Per-feature boundaries only on known-risky areas |

**Rollback plan:** Each AC is independent and can be reverted via git revert.

## Definition of Done

- [ ] ErrorBoundary catches JS errors (no more white screen)
- [ ] Kanban usable on mobile (swipeable tabs)
- [ ] ProtectedRoute on all authenticated pages
- [ ] Loading skeletons on data-fetching pages
- [ ] AuthContext split into 3 focused hooks
- [ ] ARIA labels on all interactive elements
- [ ] File encoding normalized
- [ ] `strictNullChecks: true` passing in CI
- [ ] Sentry shows no new errors from Sprint 2 changes
- [ ] No regression in existing desktop functionality

---

*Story S2 — Sprint 2: Frontend Foundation*
*Epic: EPIC-TD-001 (MAG-IA Technical Debt Remediation)*
