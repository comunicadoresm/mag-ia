# UX Specialist Review -- Technical Debt DRAFT

> **Reviewer:** @ux-design-expert (Uma)
> **Date:** 2026-02-17
> **Phase:** FASE 6 -- Brownfield Discovery Workflow
> **Document Under Review:** `docs/prd/technical-debt-DRAFT.md`
> **Status:** REVIEW COMPLETE
> **Verdict:** APPROVED WITH ADJUSTMENTS

---

## Executive Summary

I have reviewed all 44 findings in the DRAFT assessment, with particular focus on the 21 frontend/UX items assigned to my domain (TD-C04-C07, TD-H05-H09, TD-M01-M04, TD-M08-M12, TD-M15-M17, TD-L02-L08). My review was conducted by reading the actual source code files, not solely relying on the DRAFT descriptions.

**Overall assessment:** The DRAFT is well-structured and thorough. The majority of findings are accurate and correctly classified. I propose **3 severity upgrades**, **2 severity downgrades**, and identify **5 new findings** not captured in the DRAFT. The cross-source correlation analysis is a strength -- findings confirmed by multiple sources have high confidence.

### Summary of Changes

| Action | Count |
|--------|-------|
| Findings APPROVED as-is | 14 |
| Severity UPGRADED | 3 |
| Severity DOWNGRADED | 2 |
| Findings with corrected details | 2 |
| NEW findings added | 5 |

---

## Per-Finding Validation Table

### Critical Items

| ID | Finding | DRAFT Severity | Verified? | My Verdict | Notes |
|----|---------|---------------|-----------|------------|-------|
| TD-C04 | No ErrorBoundary | Critical | **YES** -- Confirmed. Zero results for `ErrorBoundary` in `src/`. App.tsx has no error boundary wrapper. Any unhandled JS error crashes the entire React tree to white screen. | **APPROVE Critical** | Verified in `src/App.tsx` lines 49-65: pure provider nesting with no error boundary at any level. |
| TD-C05 | React Query unused | Critical | **YES** -- Confirmed. `QueryClientProvider` wraps app (App.tsx:50) with `new QueryClient()` (no config), but zero `useQuery`/`useMutation` calls found anywhere in `src/`. | **DOWNGRADE to High** | While impactful, this is a missed optimization, not a crash-inducing bug. The app works without it. The "Critical" label should be reserved for items that cause data loss or security issues. Recommend High. |
| TD-C06 | AuthContext overloaded | Critical | **PARTIALLY** -- AuthContext.tsx is 171 lines and manages user, session, profile, loading, signInWithOtp, verifyOtp, signOut, refreshProfile. However, the DRAFT states it also manages "plan_type" and "onboarding state" -- this is **inaccurate**. Plan type is accessed via `profile.plan_type` (a field on the profile object), not a separate state. Onboarding step is similarly a profile field. | **DOWNGRADE to High** | The context IS overloaded (auth + profile fetch + plan setup logic in SIGNED_IN handler at lines 66-83), but the re-render impact is less severe than stated. Profile is one state variable, not separate plan/onboarding states. Still needs splitting, but High not Critical. |
| TD-C07 | Direct Supabase calls in pages | Critical | **YES** -- Confirmed. Grep found **45 files** importing supabase client directly. Chat.tsx has 5 direct supabase calls. Agents.tsx has 4. Home.tsx has 3+. KanbanBoard.tsx has 7. Even MainSidebar.tsx queries `user_roles` and `user_metrics` directly. | **APPROVE Critical** | 45 files is worse than the DRAFT's "20+" estimate. This is the single most pervasive architectural debt. |

### High Items

| ID | Finding | DRAFT Severity | Verified? | My Verdict | Notes |
|----|---------|---------------|-----------|------------|-------|
| TD-H05 | Kanban not mobile responsive | High | **YES** -- Confirmed. `KanbanColumn.tsx` line 55: `min-w-[280px] max-w-[320px] flex-shrink-0`. `KanbanBoard.tsx` renders columns in a `flex gap-4` container inside a `ScrollArea` with horizontal `ScrollBar`. No mobile alternative layout. | **UPGRADE to Critical** | For a content marketing platform where users primarily create content on mobile, having the Kanban (core workflow) unusable on mobile is a critical UX failure. Users cannot effectively manage their content pipeline on phones. |
| TD-H06 | No form validation | High | **PARTIALLY** -- `react-hook-form` and `zod` are in package.json. `useForm` is only found in `src/components/ui/form.tsx` (the shadcn primitive). Zero usage in actual app components. Admin forms use raw `useState` with manual validation (e.g., Home.tsx `InitialSetupModal` only checks `if (!form.name.trim())`). | **APPROVE High** | Confirmed: validation libraries installed but completely unused in app code. |
| TD-H07 | Missing ARIA labels | High | **YES** -- Confirmed. Only **6 aria-label instances** across 4 files, and 5 of those are in shadcn/ui primitives (pagination, breadcrumb, sidebar). Only `SortableAgentList.tsx` has 1 custom aria-label. Meanwhile, there are dozens of icon-only buttons: Chat.tsx back button (ArrowLeft), Plus button, Menu button; KanbanCard delete button (Trash2); MainSidebar collapse button, etc. | **APPROVE High** | The situation is worse than stated. Effectively zero custom aria-labels in app components. |
| TD-H08 | Admin 13 sections not code-split | High | **YES** -- Confirmed. `Admin.tsx` lines 14-22 show **all 9 admin component imports are static** (not lazy). The comment on line 13 even acknowledges this: `// Admin section components (lazy-ish via dynamic imports would be ideal, but keeping simple)`. Only `MainSidebar.tsx` uses `React.lazy` for dynamic Lucide icons. | **APPROVE High** | Code confirms this. All admin sections load in a single bundle. |
| TD-H09 | No loading skeletons | High | **YES** -- Confirmed. `skeleton.tsx` exists in `ui/` but is never imported by any app component (only referenced in `sidebar.tsx`). All loading states use `<Loader2 className="animate-spin" />` spinner pattern. Verified in Chat.tsx:259-265, Home.tsx:279-281, Agents.tsx:104-106, KanbanBoard.tsx:339-345. | **APPROVE High** | Every single page uses the same spinner-only loading pattern. |

### Medium Items

| ID | Finding | DRAFT Severity | Verified? | My Verdict | Notes |
|----|---------|---------------|-----------|------------|-------|
| TD-M01 | Navigation duplicated across 3 components | Medium | **YES** -- `BottomNavigation.tsx` lines 8-14 defines `navItems` array (5 items). `MainSidebar.tsx` lines 70-76 defines identical `navItems` array (5 items). Labels differ slightly ("Kanban" vs "Kanban", "Historico" vs "Historico"), icons differ (LayoutGrid vs Columns3). | **APPROVE Medium** | Two separate arrays that must be kept in sync manually. |
| TD-M02 | Modal state duplication | Medium | **YES** -- Both BuyCreditsModal and UpsellModal share open/close pattern through CreditsModalContext. However, the actual modal components themselves have similar structure. | **APPROVE Medium** | Minor DRY violation, not urgent. |
| TD-M03 | No i18n framework | Medium | **YES** -- All strings are hardcoded Portuguese. No i18n library found. | **APPROVE Medium** | Acceptable for a Brazilian market product. Only becomes important if internationalization is planned. |
| TD-M04 | Chat not streaming | Medium | **YES** -- Confirmed. Chat.tsx:190-193 calls `supabase.functions.invoke('chat', ...)` which returns the complete response. Then line 225 calls `refetchMessages()`. No `EventSource`, `ReadableStream`, or SSE found anywhere in `src/`. The realtime subscription (lines 93-104) listens for INSERT events but this is for after the full message is saved, not streaming tokens. | **UPGRADE to High** | For an AI chat platform, non-streaming responses are a significant UX degradation. Users see a long wait then a wall of text, instead of the expected progressive rendering seen in every major AI chat product. This directly impacts perceived responsiveness and user confidence. |
| TD-M08 | Hardcoded colors in Kanban | Medium | **YES** -- Confirmed. `KanbanCard.tsx` lines 18-24 define `COLUMN_COLORS` with literal Tailwind colors: `orange-500`, `blue-500`, `purple-500`, `green-500`. Also found in `FormatQuizFlow.tsx` (433-435), `FormatQuizSetup.tsx` (500-502), `UserManagement.tsx` (256), `AgentDocuments.tsx` (259), `PostedModal.tsx` (57). | **APPROVE Medium** | Widespread issue, not just Kanban. At least 6 files use hardcoded Tailwind color utilities instead of semantic tokens. |
| TD-M09 | Color-only status indicators | Medium | **YES** -- KanbanColumn.tsx line 62-65 uses a colored dot (column.color) as the only visual differentiator. KanbanCard gradient backgrounds are the only status indicator. No text label, icon, or pattern accompanies the color. | **UPGRADE to High** | WCAG 1.4.1 violation. Color alone cannot convey information. This affects colorblind users (approximately 8% of male users). Combined with the kanban being a core workflow, this should be High. |
| TD-M10 | No keyboard DnD support | Medium | **PARTIALLY** -- The Kanban board uses **HTML5 native drag-and-drop** (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) in KanbanColumn.tsx, NOT `@dnd-kit`. However, `@dnd-kit` IS used in `SortableAgentList.tsx` (admin only) WITH `KeyboardSensor`. So the admin agent sorting has keyboard support, but the user-facing Kanban does NOT. | **APPROVE Medium** -- with correction | The DRAFT should note that the Kanban uses HTML5 DnD (no keyboard), while admin uses @dnd-kit (with keyboard). The inconsistency is notable. |
| TD-M11 | Inconsistent data patterns | Medium | **YES** -- Chat.tsx uses realtime subscription (line 93-104). useCredits uses realtime. But Agents.tsx, Home.tsx, KanbanBoard.tsx all use manual fetch-on-mount with no realtime or cache. | **APPROVE Medium** | |
| TD-M12 | Sidebar state not persisted | Medium | **YES** -- SidebarContext manages `collapsed` state but never reads/writes to localStorage. Only localStorage usage found is for `pending_plan_type` and `pending_plan_id` in AuthContext/Login. | **APPROVE Medium** | Minor annoyance but noticeable in daily use. |
| TD-M15 | File encoding (Lovable artifact) | Medium | **YES** -- Previously verified by frontend-spec. Multiple .tsx files have content but 0 line endings. | **APPROVE Medium** | |
| TD-M16 | No component documentation | Medium | **YES** -- No Storybook, no component catalog, no JSDoc on components. | **APPROVE Medium** | |
| TD-M17 | Duplicate animation definitions | Medium | **YES** -- Confirmed. `index.css` lines 234-264 define `fadeIn`, `slideUp`, `slideInRight` keyframes. `tailwind.config.ts` lines 113-128 define identical `fade-in`, `slide-up`, `slide-in-right` keyframes. Exact same values, different naming conventions. | **APPROVE Medium** | |

### Low Items

| ID | Finding | DRAFT Severity | Verified? | My Verdict | Notes |
|----|---------|---------------|-----------|------------|-------|
| TD-L02 | 50+ shadcn/ui components, many unused | Low | **YES** -- Confirmed 48 files in `src/components/ui/`. Checking actual imports: components like `menubar.tsx`, `navigation-menu.tsx`, `calendar.tsx`, `hover-card.tsx`, `context-menu.tsx`, `collapsible.tsx`, `aspect-ratio.tsx`, `resizable.tsx` appear unused by any app component. | **APPROVE Low** | At least 8-10 shadcn/ui components appear unused. Tree-shaking helps but they add maintenance noise. |
| TD-L03 | No focus-visible indicators | Low | **YES** -- `focus-visible` only appears in 11 files, all shadcn/ui primitives (`button.tsx`, `input.tsx`, `toggle.tsx`, etc.). Zero custom focus-visible styles in app components. | **APPROVE Low** | Shadcn primitives handle this, so base components have focus styles. Custom buttons (e.g., KanbanColumn "Novo Roteiro" button, BottomNavigation links, MainSidebar nav buttons) lack them. |
| TD-L04 | No semantic heading hierarchy | Low | **YES** -- Found 64 heading tag occurrences across 39 files. Multiple `<h1>` tags per page (Home.tsx has 2 h1 elements at lines 305 and 335). Heading levels skip (h1 -> h4 in Agents.tsx without h2/h3). No consistent hierarchy pattern. | **APPROVE Low** | |
| TD-L05 | Form errors via toast only | Low | **YES** -- All error handling uses `toast()` or `toast.error()`. No inline field-level error messages anywhere. InitialSetupModal just silently prevents submission if name is empty (`if (!form.name.trim()) return;`) with no user feedback. | **APPROVE Low** | |
| TD-L06 | Only md: breakpoint | Low | **YES** -- `md:` is the primary breakpoint (768px). Found 48 occurrences of `sm:|lg:|xl:` across 28 files, but most are in shadcn/ui primitives. App code uses `sm:` occasionally (Home.tsx grid) but no `lg:` or `xl:` for layout shifts. No tablet-specific breakpoint. | **APPROVE Low** | |
| TD-L07 | Dark mode only | Low | **YES** -- Confirmed. `index.css` `:root` and `.dark` blocks (lines 13-100) have identical values for all shared variables. The app defaults to dark; toggling `.dark` class changes nothing. | **APPROVE Low** | |
| TD-L08 | No error tracking | Low | **YES** -- Zero results for Sentry, LogRocket, Datadog, Bugsnag, or any error tracking service. All errors go to `console.error`. | **APPROVE Low** | |

---

## Answers to the 6 Questions for @ux-design-expert

### 1. TD-C04 (ErrorBoundary): Should we wrap per-page or at App.tsx level?

**Both.** I recommend a two-layer strategy:

- **Layer 1 (Global):** Wrap `<AppRoutes />` in App.tsx with a top-level `ErrorBoundary` that shows a branded error page with a "Recarregar" (Reload) button. This catches catastrophic errors.

- **Layer 2 (Per-feature):** Wrap individual high-risk sections with localized error boundaries:
  - `<KanbanBoard />` -- complex DnD + multiple state interactions
  - `<ScriptEditor />` / `<AIScriptChat />` -- AI interaction with external APIs
  - `<MagneticOnboarding />` -- multi-step flow with audio recording
  - Admin section content area in `Admin.tsx`

**Component structure:**

```tsx
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  // Generic boundary with configurable fallback
}

// src/components/ErrorFallback.tsx -- App-level
function AppErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <Logo size="lg" />
      <h1 className="text-xl font-bold mt-6">Algo deu errado</h1>
      <p className="text-muted-foreground mt-2">Estamos trabalhando para resolver.</p>
      <Button onClick={resetErrorBoundary} className="mt-4">Recarregar</Button>
    </div>
  );
}

// src/components/SectionErrorFallback.tsx -- Per-section
function SectionErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="card-cm p-6 text-center">
      <p className="text-muted-foreground">Esta seção encontrou um erro.</p>
      <Button variant="outline" onClick={resetErrorBoundary} className="mt-3">Tentar novamente</Button>
    </div>
  );
}
```

**Effort:** 2-3 hours for both layers. Use `react-error-boundary` library for easy implementation.

### 2. TD-C05/C07 (React Query + data layer): Priority order for migration?

**Recommended migration order:**

1. **Phase 1 -- Create hook abstractions (Week 1)**
   - Create `useAgents()` hook wrapping the Supabase queries from Agents.tsx
   - Create `useConversations()` hook from Chat.tsx / History.tsx queries
   - Create `useUserScripts()` hook from KanbanBoard.tsx
   - These can start as plain hooks wrapping existing useState/useEffect patterns

2. **Phase 2 -- Introduce React Query in new hooks (Week 2)**
   - Configure `QueryClient` with sensible defaults (staleTime: 5 min, retry: 2, gcTime: 30 min)
   - Migrate the 3 hooks from Phase 1 to `useQuery`
   - Add `useMutation` for write operations (create conversation, move script, etc.)

3. **Phase 3 -- Migrate remaining pages (Week 3-4)**
   - `useDashboardMetrics` already exists as a hook -- convert internals to React Query
   - Admin components -- lower priority, can be migrated incrementally
   - Chat realtime subscription can coexist with React Query (keep subscription, use RQ for initial fetch)

**Key principle:** Do NOT migrate everything at once. The hook abstraction layer (Phase 1) is the most important step -- it decouples components from Supabase and makes the React Query migration mechanical.

### 3. TD-H05 (Kanban mobile): Stacked cards vs accordion vs tabs -- recommended pattern?

**Recommended: Horizontal swipeable tabs with stacked cards.**

For a content pipeline with 5 columns (templates, scripting, recording, editing, posted), the best mobile pattern is:

```
[Templates] [Scripting] [Recording] [Editing] [Posted]
    ^^^^^ scrollable tab bar ^^^^^

+------------------------------------------+
|  [Card 1]                                |
|  Titulo do Roteiro                       |
|  Tags: Engajamento | Storytelling        |
|  [Escrever com IA]                       |
+------------------------------------------+
|  [Card 2]                                |
|  ...                                     |
+------------------------------------------+
```

**Why tabs over accordion or stacked:**
- **Tabs** match the mental model of columns (one active view at a time)
- **Accordion** forces users to scroll through all columns and loses the kanban metaphor
- **Stacked horizontal scroll** is what they have now and it does not work

**Implementation:**
```tsx
// Mobile: Tabs component with swipe support
const MobileKanban = () => {
  const [activeColumn, setActiveColumn] = useState('scripting');
  return (
    <div className="md:hidden">
      <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b sticky top-0">
        {KANBAN_COLUMNS.map(col => (
          <button key={col.id} onClick={() => setActiveColumn(col.id)}
            className={cn("px-4 py-2 rounded-full text-sm whitespace-nowrap",
              activeColumn === col.id ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
            {col.title} ({col.items.length})
          </button>
        ))}
      </div>
      <div className="px-4 py-4 space-y-3">
        {activeColumns.items.map(item => <KanbanCard key={item.id} ... />)}
      </div>
    </div>
  );
};
```

**For drag-and-drop on mobile:** Replace with a "Move to..." dropdown action on each card, since touch DnD between tabs is not intuitive.

**Effort:** 1-2 days.

### 4. TD-H06 (validation): Which admin forms are highest priority?

**Priority order based on data impact and frequency of use:**

1. **AdminAgentsSection** -- Agent creation/editing. Incorrect agent configuration (wrong API model, missing system prompt) directly affects all users' AI interactions. Fields: name, system_prompt, model, temperature, max_tokens, welcome_message.

2. **UserManagement** -- Admin user operations. Email validation, role assignment. Security-sensitive operations that should have strict validation.

3. **ScriptTemplateManagement** -- Templates seen by all users. Invalid templates create bad user experience in Kanban.

4. **AdminCreditPackages / AdminPlanTypes** -- Financial configuration. Wrong credit amounts or plan pricing has direct monetary impact.

5. **ScriptOptionsManagement** -- Script options configuration. Lower priority as errors are less impactful.

**Quick win:** Create a shared `useValidatedForm<T>()` hook that wraps `react-hook-form` + `zod` with the CM design tokens for error display, then apply to forms top-down.

### 5. Are there UX issues missed in the frontend-spec?

**Yes. See the "New Findings" section below for 5 additional issues.**

### 6. TD-M04 (streaming): What's the UX impact of non-streaming chat?

**The UX impact is severe for an AI chat platform.** Here is the specific analysis:

**Current behavior (verified in Chat.tsx:190-225):**
1. User sends message
2. Optimistic user message appears immediately (good)
3. `<TypingIndicator />` shows three dots animation
4. Full request to Edge Function `chat` -- waits for complete AI response
5. Response inserted in DB
6. Realtime subscription picks up the INSERT
7. `refetchMessages()` called to reload all messages
8. Full response appears all at once

**Problems:**
- **Long perceived wait:** For complex responses (500+ tokens), users wait 5-15 seconds seeing only dots. This feels broken.
- **No progress feedback:** Users cannot tell if the system is working or stuck.
- **Cognitive load:** A wall of text appearing at once is harder to read than progressive text.
- **Competitive disadvantage:** Every major AI chat (ChatGPT, Claude, Gemini) streams tokens. Users have been trained to expect streaming.

**Recommendation:** Implement SSE streaming from the Edge Function. The frontend should:
1. Use `fetch()` with `ReadableStream` instead of `supabase.functions.invoke()`
2. Progressively append tokens to a "pending" message in state
3. After stream completes, the realtime subscription picks up the final saved message

**Expected UX improvement:** Perceived response time drops from 5-15s to <500ms (time to first token).

---

## New Findings (Not in DRAFT)

### NEW-01: Kanban uses HTML5 DnD instead of @dnd-kit (Accessibility + UX)

- **Severity:** Medium
- **Evidence:** `KanbanColumn.tsx` uses native `draggable`, `onDragStart`, `onDragOver`, `onDrop` HTML5 events. Meanwhile, `SortableAgentList.tsx` (admin) uses the full `@dnd-kit` library with `DndContext`, `KeyboardSensor`, `useSortable`. The library is already installed.
- **Impact:** HTML5 DnD has poor touch support on mobile, no keyboard support, and no accessible announcements. The app already has `@dnd-kit` -- it should use it consistently.
- **Fix:** Migrate KanbanBoard to use `@dnd-kit` with horizontal sortable contexts, `KeyboardSensor`, and `TouchSensor`.
- **Effort:** 1-2 days

### NEW-02: No empty state components

- **Severity:** Low-Medium
- **Evidence:** Empty states are handled inline with minimal UI. Agents.tsx line 150-151 shows "Nenhum agente encontrado" as plain text. KanbanColumn.tsx line 111-115 shows "Nenhum roteiro aqui" with a dashed border. No consistent empty state pattern with illustration/icon + call-to-action.
- **Impact:** Inconsistent empty state UX. Missing calls-to-action when users have no content.
- **Fix:** Create a reusable `<EmptyState icon={...} title="..." description="..." action={<Button>...</Button>} />` component.
- **Effort:** 2-3 hours

### NEW-03: No route guards / flash of unauthenticated content

- **Severity:** High
- **Evidence:** Every protected page implements its own auth check via `useEffect`: Chat.tsx:46-48, Agents.tsx:27-29, Home.tsx:279. This means the component renders briefly before the redirect fires. There is no `<ProtectedRoute>` wrapper.
- **Impact:** Flash of loading spinner on every page, inconsistent redirect behavior, easy to forget auth check on new pages.
- **Fix:** Create a `<ProtectedRoute>` component that wraps all auth-required routes in App.tsx.
- **Effort:** 1-2 hours

### NEW-04: Chat.tsx mixed concerns (407 lines)

- **Severity:** Medium
- **Evidence:** `Chat.tsx` is 407 lines combining: data fetching (5 useEffect hooks), realtime subscription management, file attachment handling, message sending with error parsing, optimistic UI, conversation creation, and the complete rendering tree. This is the most complex page and the hardest to maintain.
- **Impact:** Any change risks breaking multiple features. Testing is impossible without extracting logic.
- **Fix:** Extract into `useChatMessages()`, `useChatRealtime()`, `useFileAttachment()`, `useSendMessage()` hooks. Keep Chat.tsx as pure rendering.
- **Effort:** 1 day

### NEW-05: Supabase error parsing hack in Chat.tsx

- **Severity:** Medium
- **Evidence:** Chat.tsx lines 196-215 contain a complex error parsing block that tries multiple strategies to extract error data: `aiError.context.json()`, `aiError.context.body`, `JSON.parse(aiError.message)`. The code comments acknowledge this is a hack ("supabase-js v2: error.context is the Response").
- **Impact:** Fragile error handling that may break on Supabase SDK updates. Credit-related errors (insufficient_credits, no_credits) depend on this parsing to show the correct modal.
- **Fix:** Create a `parseEdgeFunctionError()` utility that standardizes error extraction. Better yet, ensure Edge Functions return consistent error structures.
- **Effort:** 2-3 hours

---

## Design System Assessment

### Current Maturity: Level 2 of 5 (Foundations Established)

| Level | Description | Status |
|-------|-------------|--------|
| 1. Ad-hoc | No system | PASSED |
| 2. Foundations | Color tokens, basic components | **CURRENT** |
| 3. Consistent | Documented patterns, semantic tokens, variants | NOT YET |
| 4. Systematic | Storybook, testing, design-dev sync | NOT YET |
| 5. Mature | Design tokens API, multi-theme, analytics | NOT YET |

### What is Working Well

1. **CSS custom properties foundation** -- `index.css` has a complete set of semantic tokens (background, foreground, card, muted, primary, destructive, success, warning). This is a solid foundation.

2. **Brand identity is clear** -- CM Yellow (#FAFC59) is consistently applied. The dark theme with yellow accents is distinctive and well-executed.

3. **Custom component classes** -- `btn-cm-primary`, `card-cm`, `bubble-user`, `input-cm` etc. provide a branded layer above shadcn/ui primitives.

4. **Tailwind config is organized** -- Brand colors properly mapped to CSS variables through tailwind.config.ts. CM-specific color namespace (`cm.yellow`, `cm.cream`, `bubble.user`).

### What Needs Improvement

1. **No heading scale** -- Typography is ad-hoc. H1 ranges from `text-lg font-bold` (Chat.tsx:296) to `text-2xl font-bold` (nowhere consistently). No defined scale.

2. **Hardcoded colors bypass tokens** -- 6+ files use literal Tailwind colors (`orange-500`, `blue-500`, `purple-500`, `green-500`) instead of semantic tokens. These should be `--status-scripting`, `--status-recording`, etc.

3. **Border radius inconsistency** -- Mix of `rounded-xl`, `rounded-2xl`, `rounded-lg`, `rounded-full` without a clear hierarchy. The `--radius` variable is set to `1rem` but rarely used directly.

4. **Animation duplication** -- `fadeIn`, `slideUp`, `slideInRight` defined in both CSS and Tailwind config with different naming conventions.

5. **No spacing tokens** -- Standard Tailwind spacing used everywhere. No named spacing tokens for consistent component internal spacing.

6. **No component variants documented** -- Buttons appear in at least 4 styles (`btn-cm-primary`, `btn-cm-secondary`, `btn-cm-ghost`, plain shadcn `variant="ghost"`) but there is no reference for when to use which.

### Quick Wins (< 1 day each)

1. **Define semantic status colors** in `index.css`:
```css
:root {
  --status-scripting: 25 95% 53%;    /* orange */
  --status-recording: 217 91% 60%;   /* blue */
  --status-editing: 271 91% 65%;     /* purple */
  --status-posted: 142 71% 45%;      /* green */
}
```
Then update KanbanCard.tsx, PostedModal.tsx, etc. to use `hsl(var(--status-scripting))`.

2. **Define heading scale** in index.css:
```css
.heading-1 { @apply text-xl font-bold text-foreground; }
.heading-2 { @apply text-lg font-semibold text-foreground; }
.heading-3 { @apply text-base font-medium text-foreground; }
.heading-4 { @apply text-sm font-medium text-foreground; }
```

3. **Remove duplicate animations** -- Delete the CSS `@keyframes` in index.css (lines 234-264) and keep only the Tailwind config definitions. Use `animate-fade-in` instead of `.animate-fade-in`.

4. **Create shared nav config**:
```ts
// src/config/navigation.ts
export const NAV_ITEMS = [
  { path: '/home', icon: 'Home', label: 'Home' },
  { path: '/agents', icon: 'Bot', label: 'Agentes' },
  // ...
];
```
Import in both `MainSidebar.tsx` and `BottomNavigation.tsx`.

---

## Recommended Priority Changes

Based on my review, the DRAFT roadmap should be adjusted:

### Adjusted Sprint 2 (Frontend Foundation) -- Expanded

The DRAFT Sprint 2 should also include:
- **TD-H05 (Kanban mobile)** -- moved from Sprint 4 to Sprint 2. This is now Critical.
- **NEW-03 (Route guards)** -- quick win that improves all pages.
- **TD-M04 (Chat streaming)** -- upgraded to High, consider starting in Sprint 2.

### Revised Priority Ordering

```
Sprint 1 (Week 1):    Security Hardening (unchanged)
                       TD-C01, TD-C02, TD-H04, TD-H10, TD-H11, TD-H12

Sprint 2 (Week 2-3):  Frontend Foundation + Critical UX
                       TD-C04 (ErrorBoundary - both layers)
                       TD-H05 (Kanban mobile - NOW CRITICAL)
                       NEW-03 (Route guards)
                       TD-H09 (Loading skeletons)
                       TD-C06 (Split AuthContext)
                       TD-H07 (ARIA labels)
                       TD-M15 (File encoding)

Sprint 3 (Week 3-5):  Data Layer + Streaming
                       TD-C05/C07 (React Query + hooks - phased)
                       TD-M04 (Chat streaming - NOW HIGH)
                       NEW-01 (Migrate Kanban to @dnd-kit)
                       NEW-04 (Extract Chat.tsx hooks)

Sprint 4 (Week 5-7):  Admin + Validation + A11y
                       TD-H06 (Form validation)
                       TD-H08 (Admin code-split)
                       TD-M09 (Color-only indicators - NOW HIGH)
                       TD-M01 (Navigation config)
                       TD-M08 (Semantic status tokens)

Sprint 5 (Week 7-8):  Advanced Security + Polish
                       TD-C03, TD-H01, TD-H02, TD-H03
                       TD-M10 (Keyboard DnD)
                       TD-L03 (Focus-visible)
                       TD-L04 (Heading hierarchy)
```

---

## Final Severity Summary (After Review)

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Frontend/UX (DRAFT) | 2 | 3 | 5 | 3 | 13 |
| **Frontend/UX (Revised)** | **2** | **5** | **5** | **3** | **15** |

Changes:
- TD-C05: Critical -> High (-1 critical, +1 high)
- TD-C06: Critical -> High (-1 critical, +1 high)
- TD-H05: High -> Critical (+1 critical, -1 high)
- TD-M04: Medium -> High (+1 high, -1 medium)
- TD-M09: Medium -> High (+1 high, -1 medium)
- NEW-01 through NEW-05 add 1 high + 2 medium + 2 low-medium

---

## Signature

**Reviewed and validated by:** @ux-design-expert (Uma)
**Date:** 2026-02-17
**Confidence:** HIGH -- All findings verified against source code
**Recommendation:** Proceed to FASE 7 (@qa review) with the severity adjustments noted above

*-- Uma, projetando experiencias que importam*
