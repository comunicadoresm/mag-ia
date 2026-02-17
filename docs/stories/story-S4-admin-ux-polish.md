---
id: STORY-TD-S4
epic: EPIC-TD-001
sprint: 4
title: "Admin & UX Polish"
executor: "@ux-design-expert"
quality_gate: "@dev"
quality_gate_tools: [a11y_validation, component_test, code_split_verification, form_validation_test]
priority: P2
effort: 1-2 weeks
status: planning
debt_items: [TD-H06, TD-H08, TD-M09, TD-M01, TD-M08]
---

# Story S4: Admin & UX Polish

## User Story

**As a** content creator and admin,
**I want** validated forms, fast admin pages, accessible status indicators, and consistent navigation,
**So that** the platform is professional, accessible, and performant.

## Story Context

**Existing System Integration:**
- Integrates with: Admin panel (13 sections), Kanban status system, navigation components, forms
- Technology: react-hook-form + Zod (installed but unused), shadcn/ui, React.lazy
- Follows pattern: Existing shadcn/ui form patterns, CM dark theme
- Touch points: Admin pages, Kanban status indicators, navigation components, all forms

**Dependencies:**
- Requires Sprint 3 complete (React Query hooks for form data)
- Can run in PARALLEL with Sprint 5 (different codebase areas)

---

## Acceptance Criteria

### AC-1: Form Validation with Zod (TD-H06) — 3-5 days
- [ ] Zod schemas created for: agent creation, script editing, profile update, admin forms
- [ ] react-hook-form integrated with Zod resolver
- [ ] Inline error messages (not toast-only)
- [ ] Validation runs on blur + submit
- [ ] Server-side errors mapped to form fields
- [ ] Priority forms: Agent creation (admin), Script metadata (user), Profile settings (user)

### AC-2: Admin Code Splitting (TD-H08) — 1 day
- [ ] Admin sections lazy-loaded with `React.lazy()` + `Suspense`
- [ ] Each admin section is a separate chunk
- [ ] Loading fallback shows skeleton (from Sprint 2)
- [ ] Initial bundle size reduced (measure before/after)
- [ ] Admin-only code never loaded for regular users

### AC-3: Accessible Status Indicators (TD-M09) — 1 day
- [ ] Kanban status columns have text labels + icons alongside color
- [ ] Credit alerts use icon + text (not color-only)
- [ ] Script status badges include text label
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 ratio)
- [ ] Tested: Status distinguishable in grayscale mode

### AC-4: Centralized Navigation Config (TD-M01) — 4 hours
- [ ] Single `navigationConfig.ts` file with all routes and labels
- [ ] Desktop sidebar, mobile bottom nav, and breadcrumbs read from config
- [ ] Adding a new route requires editing only one file
- [ ] Config includes: path, label, icon, requiredRole, mobileVisible

### AC-5: Semantic Status Color Tokens (TD-M08) — 4 hours
- [ ] Status colors defined as semantic CSS variables/Tailwind tokens
- [ ] `--status-draft`, `--status-in-progress`, `--status-review`, `--status-published`, etc.
- [ ] All Kanban components use tokens instead of hardcoded `orange-500`, `blue-500`
- [ ] Easy to change status colors in one place
- [ ] Theme-aware (works with CM brand dark theme)

---

## Technical Notes

### Zod + react-hook-form Pattern
```typescript
// src/schemas/agent.ts
import { z } from "zod";

export const agentSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descricao muito curta"),
  model: z.enum(["claude", "gpt-4", "gemini"]),
  system_prompt: z.string().min(50, "Prompt do sistema muito curto"),
  credit_cost: z.number().min(1).max(100),
});

// In component:
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm({
  resolver: zodResolver(agentSchema),
  defaultValues: { name: "", description: "", model: "claude" },
});
```

### Admin Code Splitting
```typescript
// src/pages/Admin/index.tsx
const AgentManager = lazy(() => import("./sections/AgentManager"));
const UserManager = lazy(() => import("./sections/UserManager"));
const PlanManager = lazy(() => import("./sections/PlanManager"));
// ... 13 sections total

<Suspense fallback={<AdminSectionSkeleton />}>
  {activeSection === "agents" && <AgentManager />}
  {activeSection === "users" && <UserManager />}
  {/* ... */}
</Suspense>
```

### Navigation Config
```typescript
// src/config/navigation.ts
export const navigationConfig = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiredRole: "user", mobileVisible: true },
  { path: "/kanban", label: "Kanban", icon: Kanban, requiredRole: "user", mobileVisible: true },
  { path: "/chat", label: "Chat", icon: MessageSquare, requiredRole: "user", mobileVisible: true },
  { path: "/admin", label: "Admin", icon: Shield, requiredRole: "admin", mobileVisible: false },
  // ...
] as const;
```

### Status Color Tokens
```css
/* In globals.css or Tailwind config */
:root {
  --status-draft: theme('colors.gray.500');
  --status-writing: theme('colors.blue.500');
  --status-review: theme('colors.orange.500');
  --status-published: theme('colors.green.500');
  --status-archived: theme('colors.gray.400');
}
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Zod validation too strict | Users can't submit valid data | Start with lenient rules; tighten after observing real data |
| Code splitting increases load time on admin | Admin pages slow to load | Preload likely-next section; measure with Sentry |
| Color token migration misses a component | Inconsistent colors | Search for all hardcoded color classes before marking done |
| Navigation config doesn't cover edge cases | Routes broken | Keep old navigation code until config version is verified |

**Rollback plan:** Each AC is independent. Revert individual changes if issues arise.

## Definition of Done

- [ ] Zod validation on priority forms with inline errors
- [ ] Admin code-split into lazy-loaded sections
- [ ] Status indicators accessible (text + icon + color)
- [ ] Navigation config centralized (single source of truth)
- [ ] Status colors use semantic tokens
- [ ] axe-core audit passes (0 critical/serious on Kanban, Admin)
- [ ] Bundle size reduced (admin sections lazy-loaded)
- [ ] No regression in admin or user-facing functionality

---

*Story S4 — Sprint 4: Admin & UX Polish*
*Epic: EPIC-TD-001 (MAG-IA Technical Debt Remediation)*
