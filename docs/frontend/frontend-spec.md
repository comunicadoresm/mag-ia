# MAG-IA Frontend & UX Specification

> Generated: 2026-02-17 | Auditor: @ux-design-expert (Brownfield Discovery FASE 3)
> Stack: React 18.3.1 + Vite 5.4 + TypeScript 5.8 + Tailwind 3.4 + shadcn/ui

---

## 1. Component Inventory

### Summary

| Category | Count | Complexity |
|----------|-------|-----------|
| Custom Components (root) | 22 | Mixed |
| Admin Components | 13 | Mostly Complex |
| Kanban Components | 8 | Mostly Complex |
| Credits Components | 6 | Simple-Medium |
| Onboarding Components | 8 | Mostly Complex |
| Modal Components | 2 | Complex |
| shadcn/ui Primitives | 50+ | N/A (library) |
| **Total** | **109+** | |

### Custom Components Detail

#### Core / Layout
| Component | Lines | Complexity | Purpose |
|-----------|-------|-----------|---------|
| `AppLayout` | 40 | Simple | Main layout: MainSidebar + content + BottomNavigation |
| `MainSidebar` | 320 | Complex | Collapsible nav, credit widget, tag filter, admin link |
| `BottomNavigation` | 40 | Simple | Mobile tab bar (5 items) |
| `Logo` | ~20 | Simple | Brand logo with size variants |
| `Sidebar` | ~30 | Simple | Legacy sidebar (unused?) |
| `NavLink` | ~20 | Simple | Navigation link wrapper |

#### Chat
| Component | Lines | Complexity | Purpose |
|-----------|-------|-----------|---------|
| `ChatBubble` | 51 | Simple | Message bubble with markdown rendering |
| `ChatSidebar` | 237 | Complex | Conversation list, grouping, rename, delete |
| `ChatInput` | ~50 | Simple | Message input (separate from Chat.tsx inline) |
| `MobileChatHistory` | ~100 | Medium | Mobile conversation drawer |
| `ConversationItem` | ~50 | Simple | Conversation list item |
| `IceBreakers` | 35 | Simple | Suggestion chips for chat |

#### Agent / Home
| Component | Lines | Complexity | Purpose |
|-----------|-------|-----------|---------|
| `AgentCard` | ~40 | Simple | Agent display card |
| `AgentSelector` | ~50 | Simple | Agent dropdown selector |
| `HomeInput` | ~60 | Simple | Home page search/input |
| `HomeSidebar` | ~80 | Medium | Home page sidebar |

#### Credits / Monetization
| Component | Lines | Complexity | Purpose |
|-----------|-------|-----------|---------|
| `CreditBadge` | ~30 | Simple | Credit balance display |
| `CreditAlert` | ~40 | Simple | Low credit warning |
| `FeatureGate` | 51 | Medium | Plan-based feature access control |
| `UpgradePrompt` | ~40 | Simple | Upgrade CTA |
| `IconPicker` | ~50 | Simple | Emoji/icon picker |
| `OTPInput` | ~60 | Medium | OTP code input |

#### Modals
| Component | Lines | Complexity | Purpose |
|-----------|-------|-----------|---------|
| `BuyCreditsModal` | ~200 | Complex | Credit package purchase |
| `UpsellModal` | ~150 | Complex | Plan upgrade modal |

#### Admin (13)
| Component | Lines | Complexity | Purpose |
|-----------|-------|-----------|---------|
| `AdminAgentsSection` | ~500 | Complex | Agent CRUD + model selection |
| `AdminCreditPackages` | ~300 | Complex | Credit package config |
| `AdminCreditsOverview` | ~200 | Complex | Credit usage dashboard |
| `AdminMetricsDashboard` | ~200 | Complex | System metrics |
| `AdminPlanTypes` | ~350 | Complex | Plan tier management |
| `AdminUpsellPlans` | ~200 | Complex | Upsell configuration |
| `AdminUserCredits` | ~200 | Complex | Per-user credit management |
| `AgentDocuments` | ~250 | Complex | Document upload/management |
| `ScriptOptionsManagement` | ~200 | Complex | Script options config |
| `ScriptStructureEditor` | ~300 | Complex | Script structure editor |
| `ScriptTemplateManagement` | ~250 | Complex | Template management |
| `SortableAgentList` | ~150 | Medium | Drag-and-drop agent ordering |
| `UserManagement` | ~300 | Complex | User admin panel |

#### Kanban (8)
| Component | Lines | Complexity | Purpose |
|-----------|-------|-----------|---------|
| `KanbanBoard` | 404 | Complex | Main kanban orchestrator |
| `KanbanColumn` | ~150 | Medium | Draggable column |
| `KanbanCard` | 167 | Medium | Card with gradient + actions |
| `ScriptEditor` | 437 | Complex | Script editing sheet |
| `AIScriptChat` | 471 | Complex | AI-assisted script writing |
| `NewCardDialog` | ~100 | Medium | New script dialog |
| `MetricsModal` | ~100 | Medium | Post metrics |
| `PostedModal` | ~100 | Medium | Posted confirmation |

#### Credits Analytics (6)
| Component | Lines | Complexity | Purpose |
|-----------|-------|-----------|---------|
| `CreditCompositionChart` | ~80 | Medium | Credit breakdown donut |
| `CreditMetricCard` | 36 | Simple | Metric card with variants |
| `CycleProgressBar` | ~40 | Simple | Cycle progress bar |
| `PlanInfoCard` | ~60 | Simple | Plan info display |
| `PurchaseHistoryTable` | ~100 | Medium | Transaction table |
| `UsageByFeatureChart` | ~80 | Medium | Feature usage chart |

#### Onboarding (8)
| Component | Lines | Complexity | Purpose |
|-----------|-------|-----------|---------|
| `MagneticOnboarding` | 141 | Complex | Onboarding orchestrator (3 steps) |
| `VoiceDNAFlow` | 425 | Complex | Voice recording + calibration |
| `VoiceDNASetup` | ~200 | Complex | Voice setup wrapper |
| `FormatQuizFlow` | 453 | Complex | Format selection quiz |
| `FormatQuizSetup` | ~150 | Complex | Format setup wrapper |
| `NarrativeFlow` | 333 | Complex | Narrative interview chat |
| `NarrativeSetup` | ~150 | Complex | Narrative setup wrapper |
| `AudioRecorder` | ~200 | Complex | Audio recording component |

---

## 2. Design System Analysis

### Color Palette (CSS Variables)

```
Brand Primary:  #FAFC59 (hsl 61 97% 67%) - CM Yellow
Primary Hover:  hsl(61 95% 60%) - Darker yellow
Cream Accent:   hsl(61 100% 90%) - Light yellow

Background:     hsl(0 0% 10%) - Dark gray (#1A1A1A)
Foreground:     hsl(0 0% 98%) - Near white
Card:           hsl(0 0% 14%) - Slightly lighter gray
Muted:          hsl(0 0% 18%) - Muted surfaces
Secondary:      hsl(0 0% 16%) - Sidebar background

Success:        hsl(142 76% 36%) - Green
Warning:        hsl(38 92% 50%) - Orange
Destructive:    hsl(0 84% 60%) - Red

Border:         hsl(61 30% 25%) - Subtle yellow-tinted
Ring:           CM Yellow (same as primary)
```

### Typography
- **Font**: Inter (Google Fonts) with system fallback
- **Weights**: 300, 400, 500, 600, 700
- **Scale**: Tailwind default (text-xs through text-3xl, ad-hoc)
- **No formal heading scale** defined

### Spacing & Radius
- **Base Radius**: 1rem (16px) - `--radius: 1rem`
- **Variants**: xl=1rem, 2xl=1.25rem, 3xl=1.5rem
- **Container**: max 1400px, 1rem padding

### Custom CSS Classes (Design Tokens)
```css
.btn-cm-primary     /* Yellow button with glow shadow */
.btn-cm-secondary   /* Transparent + border */
.btn-cm-ghost       /* Ghost button */
.card-cm            /* Card with subtle border */
.card-cm-interactive /* Hoverable card */
.bubble-user        /* Yellow chat bubble */
.bubble-assistant   /* Dark chat bubble */
.input-cm           /* Input with border focus */
.badge-cm           /* Pill badge */
.icon-circle        /* Yellow icon container */
.gradient-cm        /* Yellow gradient */
.glow-primary       /* Primary glow shadow */
```

### Design System Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| **Dark mode only** | Medium | No light mode support; `.dark` class defined but identical to root |
| **Hardcoded colors** | Medium | KanbanCard uses `orange-500`, `blue-500`, `purple-500`, `green-500` directly instead of semantic tokens |
| **No heading scale** | Low | Typography handled per-component with ad-hoc text-* classes |
| **Inconsistent border radius** | Low | Mix of `rounded-xl`, `rounded-2xl`, `rounded-lg` without clear hierarchy |
| **Duplicate animations** | Low | Keyframes defined both in `index.css` and `tailwind.config.ts` |
| **No component documentation** | Medium | No Storybook or component catalog |

---

## 3. Page Architecture

### Pages (15 total)

| Page | Lines | Layout | Data Fetching | Auth Required |
|------|-------|--------|--------------|---------------|
| `Login` | 130 | Standalone | supabase.functions (verify-student), signInWithOtp | No |
| `Verify` | ~100 | Standalone | verifyOtp, resend countdown | No |
| `AccessDenied` | ~30 | Standalone | None | No |
| `Home` | 385 | AppLayout | useDashboardMetrics, supabase direct | Yes |
| `Agents` | ~250 | AppLayout | supabase.from('agents_public'), tags | Yes |
| `Chat` | 407 | Custom (ChatSidebar) | supabase direct, realtime subscription | Yes |
| `History` | ~150 | AppLayout | supabase.from('conversations') | Yes |
| `Kanban` | ~60 | AppLayout | Delegates to KanbanBoard | Yes |
| `Profile` | 357 | AppLayout | supabase.from('profiles'), voice/narrative | Yes |
| `Credits` | ~140 | AppLayout | useCredits, useCycleProgress, useCreditHistory | Yes |
| `Admin` | ~200 | Custom sidebar | Admin role check, section routing | Yes (Admin) |
| `AdminAgents` | ~10 | Redirect | Navigate to /admin?section=agents | - |
| `AdminCredits` | ~10 | Redirect | Navigate to /admin?section=credits-overview | - |
| `NotFound` | ~30 | Standalone | None | No |
| `Index` | ~10 | Redirect | Navigate to /login | No |

### Layout Patterns

**Pattern A: AppLayout** (Home, Agents, Kanban, History, Profile, Credits)
```
┌──────────┬────────────────────────┐
│ MainSidebar │     Content Area       │ (Desktop)
│ (collapsible) │                        │
└──────────┴────────────────────────┘
┌────────────────────────────────────┐
│           Content Area             │ (Mobile)
│                                    │
├──────────┬──────┬──────┬──────┬───┤
│  Home    │ Agentes │ Kanban │ Hist │ Perfil │ (BottomNavigation)
└──────────┴──────┴──────┴──────┴───┘
```

**Pattern B: Chat (Custom)**
```
┌──────────┬────────────────────────┐
│ ChatSidebar │   Chat Messages      │ (Desktop)
│ (conversations)│                   │
│            │   Input Area          │
└──────────┴────────────────────────┘
```

**Pattern C: Admin (Custom)**
```
┌──────────┬────────────────────────┐
│ Admin Nav │   Section Content     │ (Desktop)
│ (sidebar)  │                       │
└──────────┴────────────────────────┘
```

**Pattern D: Auth (Standalone)**
```
┌────────────────────────────────────┐
│           Centered Card            │
│           (Login/Verify)           │
└────────────────────────────────────┘
```

---

## 4. UX Flow Analysis

### Flow 1: Authentication
```
Login (email) → verify-student Edge Function
  ├── NOT verified → /access-denied
  └── Verified → Send OTP → /verify
       └── Click email link → Auto-login
            ├── New user → setup-user-plan → /home (+ InitialSetupModal)
            └── Existing → /home
                 └── Magnetic plan → MagneticOnboarding
```

### Flow 2: Onboarding (Magnetic Plan)
```
Home renders MagneticOnboarding (if onboarding_step != 'completed')
  ├── Step 1: Voice DNA → Record 3 audios → AI analysis → voice_dna JSONB
  ├── Step 2: Format Quiz → 5 questions → recommended_format + weekly_plan
  └── Step 3: Narrative → AI chat interview → narrative_text
  └── Each step can be skipped ("Configurar depois")
  └── Accessible later from Profile > "Identidade Magnetica"
```

### Flow 3: Chat
```
Agents page → Click agent → Create conversation → /chat/:conversationId
  ├── Welcome message displayed (if configured)
  ├── Ice breakers shown (if configured)
  ├── User types message → Optimistic UI → Edge Function (chat)
  ├── AI response arrives (via refetch, not streaming)
  └── Realtime subscription updates messages

Chat sidebar (desktop) groups: Today / Yesterday / This Week / Older
Mobile: Sheet drawer for conversation history
```

### Flow 4: Kanban / Scripts
```
/kanban → KanbanBoard
  ├── Templates column (admin-managed)
  ├── User duplicates template → Creates user_script (status: 'idea')
  ├── Columns: scripting → recording → editing → posted
  ├── ScriptEditor (Sheet) → Edit fields + AI chat
  │    └── AIScriptChat → Sends to generate-script-chat Edge Function
  ├── PostedModal → Enter metrics + post_url
  └── MetricsModal → View post performance
```

### Flow 5: Credits
```
Credit check (pre-send in Chat, pre-generate in Kanban)
  ├── Has credits → Proceed (consume-credits Edge Function)
  └── No credits → showBuyCredits()
       ├── Can buy (plan allows) → BuyCreditsModal
       │    ├── One-time packages → Hotmart checkout
       │    └── Subscriptions → Hotmart checkout
       └── Cannot buy → showUpsell() → UpsellModal
            └── Upgrade plan → Hotmart checkout
```

---

## 5. State Management

### Context Providers (3)

```
QueryClientProvider (react-query — installed but barely used)
  └── TooltipProvider
       └── BrowserRouter
            └── AuthProvider ← Heavy: auth + profile + plan setup
                 └── CreditsModalProvider ← Modal open/close + plan logic
                      └── SidebarProvider ← collapsed boolean
                           └── AppRoutes
```

### Custom Hooks (10)

| Hook | Purpose | Deps |
|------|---------|------|
| `useAuth()` | Auth state, profile, sign in/out | Supabase auth listener |
| `useCredits()` | Credit balance (plan/sub/bonus), cycle dates | Supabase realtime |
| `usePlanPermissions()` | Feature flags, plan type, upgrade logic | useAuth, supabase |
| `useCreditHistory()` | Transaction history | supabase queries |
| `useCycleProgress()` | Usage percentage, projected days | useCredits, useCreditHistory |
| `useDashboardMetrics()` | Dashboard KPIs, post aggregates | supabase queries |
| `useHotmartCheckout()` | Open Hotmart payment URL | window.open |
| `useUpsellPlans()` | Fetch upsell plan data | supabase queries |
| `useIsMobile()` | Breakpoint detection (768px) | matchMedia |
| `useToast()` | Toast notifications | shadcn/ui |

### State Management Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| **AuthContext overloaded** | High | Auth + profile + plan setup + refreshProfile in single context |
| **React Query unused** | Medium | QueryClient initialized but no useQuery hooks. All data fetching is manual useState/useEffect |
| **No error state** | Medium | Errors logged to console, no global error tracking |
| **Context re-renders** | Medium | Any auth change triggers re-render of all consumers |
| **Sidebar state not persisted** | Low | Collapsed state resets on refresh |
| **Direct Supabase everywhere** | High | Pages make raw `supabase.from()` calls instead of going through hooks/query layer |

---

## 6. Responsive Design Assessment

### Breakpoint Usage
- **Only `md:` (768px)** is consistently used
- **No `sm:` or `lg:` breakpoints** — missing tablet/large desktop optimization
- **Container**: max-w-[1400px] at 2xl

### Mobile Patterns
- `BottomNavigation`: Fixed bottom tab bar with 5 items (md:hidden)
- `MainSidebar`: hidden on mobile (md:flex)
- `MobileChatHistory`: Dedicated mobile conversation list
- `safe-bottom` / `safe-top`: Safe area for notch devices

### Mobile UX Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| **Kanban not mobile-friendly** | High | Columns are 280-320px wide, requires horizontal scroll |
| **Tables overflow on mobile** | Medium | PurchaseHistoryTable, admin tables need horizontal scroll |
| **Chat sidebar hidden on mobile** | Low | Uses Sheet drawer — OK but different from desktop |
| **No tablet breakpoint** | Medium | iPad (1024px) shows mobile or desktop layout, nothing between |
| **Admin sidebar** | Medium | Fixed 240px on desktop, full-screen overlay on mobile |

---

## 7. Frontend Architecture Issues

### Critical

| ID | Issue | Impact |
|----|-------|--------|
| UX-01 | **No Error Boundary** | Unhandled errors crash entire page without recovery |
| UX-02 | **No loading skeletons** | Users see spinner only; no content skeleton states |
| UX-03 | **React Query installed but unused** | Data fetching is manual useState/useEffect everywhere, no cache/dedup |
| UX-04 | **AuthContext overloaded** | Single context handles auth + profile + plan — any change re-renders all consumers |

### High

| ID | Issue | Impact |
|----|-------|--------|
| UX-05 | **Direct Supabase calls in pages** | No data layer abstraction; tight coupling to Supabase client |
| UX-06 | **Kanban not responsive** | Hardcoded column widths break on mobile |
| UX-07 | **No form validation** | react-hook-form + Zod installed but not used; admin forms lack validation |
| UX-08 | **Missing ARIA labels** | Icon-only buttons lack screen reader labels |
| UX-09 | **Admin not code-split** | 13 complex admin components loaded in single bundle |

### Medium

| ID | Issue | Impact |
|----|-------|--------|
| UX-10 | **Navigation config duplicated** | MainSidebar + BottomNavigation define nav items separately |
| UX-11 | **Modal state duplication** | BuyCreditsModal + UpsellModal share similar open/close pattern |
| UX-12 | **Color-only status indicators** | Kanban status uses color alone (orange/blue/purple/green) |
| UX-13 | **No keyboard DnD support** | Kanban drag-and-drop has no keyboard fallback |
| UX-14 | **Hardcoded Portuguese strings** | No i18n framework; all strings inline |
| UX-15 | **No component documentation** | No Storybook; hard to discover available components |
| UX-16 | **Chat not streaming** | AI responses fetched via refetch, not streamed |
| UX-17 | **Inconsistent data patterns** | Some hooks use realtime (useCredits), most don't |

### Low

| ID | Issue | Impact |
|----|-------|--------|
| UX-18 | **Duplicate animation definitions** | Keyframes in both index.css and tailwind.config.ts |
| UX-19 | **Empty files in codebase** | AppLayout, Home, Login etc have content but 0 newlines (Lovable artifact) |
| UX-20 | **Sidebar not persisted** | Collapsed state resets on page refresh |
| UX-21 | **50+ shadcn/ui components** | Many potentially unused (menubar, navigation-menu, calendar, etc.) |

---

## 8. Design System Recommendations

### Immediate Wins
1. **Define heading scale** — h1=2xl bold, h2=xl semibold, h3=lg medium, body=sm
2. **Replace hardcoded Kanban colors** with semantic tokens (e.g., `--status-scripting`, `--status-recording`)
3. **Add focus-visible styles** for keyboard navigation
4. **Create ErrorBoundary** component with fallback UI

### Design System Expansion
1. **Component variants**: Define Button sizes (sm/md/lg), Card variants (default/interactive/highlighted)
2. **Spacing tokens**: Define 4px grid system with named tokens (space-xs through space-3xl)
3. **Motion tokens**: Standardize transition durations (fast=150ms, normal=200ms, slow=300ms)
4. **Light mode**: Define light theme CSS variables for future support

### Missing Components
- `Skeleton` (exists in shadcn/ui but not used)
- `ErrorBoundary` (not implemented)
- `EmptyState` (for empty lists/results)
- `LoadingPage` (full-page loading state)
- `ConfirmDialog` (reusable confirmation modal)

---

## 9. Performance Considerations

| Area | Issue | Recommendation |
|------|-------|----------------|
| **Bundle size** | 50+ shadcn/ui, Recharts, lucide-react full set | Tree-shake unused; lazy-load Recharts |
| **Admin** | 13 complex sections in single chunk | Code-split with React.lazy per section |
| **Re-renders** | AuthContext causes cascade updates | Split into useUser/useProfile/useSession |
| **Data fetching** | No caching, no dedup | Migrate to React Query for all supabase calls |
| **Images** | Agent icons are emoji (good), avatars via Supabase Storage | Add image optimization for uploaded photos |
| **Chat** | Messages refetched entirely after each send | Use optimistic + delta updates |

---

## 10. Accessibility (a11y) Gaps

| Category | Finding | WCAG |
|----------|---------|------|
| **Labels** | Icon-only buttons lack aria-label | 1.1.1 |
| **Color contrast** | Muted foreground (60% gray) on dark bg may fail | 1.4.3 |
| **Color-only info** | Kanban status, credit alerts use color alone | 1.4.1 |
| **Keyboard** | DnD kanban has no keyboard alternative | 2.1.1 |
| **Focus** | No visible focus indicators on custom buttons | 2.4.7 |
| **Heading structure** | No semantic heading hierarchy | 1.3.1 |
| **Alt text** | Chat agent emoji used as avatar — no alt text | 1.1.1 |
| **Error identification** | Form errors shown via toast only, not inline | 3.3.1 |

---

## 11. Third-Party Dependencies

### Active
| Library | Purpose | Impact |
|---------|---------|--------|
| `@supabase/supabase-js` | Backend/Auth/DB/Storage | Core |
| `react-router-dom` | Client-side routing | Core |
| `@tanstack/react-query` | Data caching (underused) | Medium |
| `tailwindcss` | Utility CSS | Core |
| `shadcn/ui` | Component primitives | Core |
| `lucide-react` | Icons | Medium |
| `recharts` | Charts (Dashboard, Credits) | Large bundle |
| `react-hook-form` + `zod` | Form validation (underused) | Medium |
| `@dnd-kit/*` | Drag and drop (Kanban) | Medium |
| `date-fns` | Date formatting | Small |
| `sonner` | Toast notifications | Small |
| `react-markdown` | Markdown rendering (Chat) | Medium |

### Dev Dependencies
| Library | Purpose |
|---------|---------|
| `lovable-tagger` | Lovable platform integration |
| `vite` | Build tool |
| `typescript` | Type safety |
| `eslint` | Linting |

---

## 12. File Issues

### Empty/Broken Files
Several `.tsx` files have content but **0 line endings** — likely a Lovable platform export artifact. Files include:
- `src/pages/Home.tsx` (22KB, 385 lines when parsed)
- `src/pages/Login.tsx` (5KB)
- `src/pages/Agents.tsx` (10KB)
- `src/pages/Profile.tsx` (20KB)
- `src/pages/Kanban.tsx` (2KB)
- `src/components/AgentCard.tsx` (1KB)
- `src/components/AppLayout.tsx` (1KB)
- `src/components/BottomNavigation.tsx` (1KB)

These files read correctly by the runtime but tools like `wc -l`, `cat -n`, and some editors may show them as empty.

**Recommendation**: Run `dos2unix` or normalize line endings across all files.

---

## 13. Recommendations Priority

### P0 — Immediate (Week 1)
1. Add `ErrorBoundary` component wrapping major page sections
2. Add loading skeletons for data-fetching sections
3. Fix line endings across all source files
4. Add aria-labels to all icon-only buttons

### P1 — Short-term (Week 2-3)
5. Migrate data fetching to React Query (replace manual useEffect patterns)
6. Split AuthContext into smaller, focused contexts
7. Implement form validation with react-hook-form + Zod in admin
8. Fix Kanban mobile responsiveness
9. Code-split Admin page sections with React.lazy

### P2 — Medium-term (Month 1-2)
10. Define formal design token system (heading scale, spacing, motion)
11. Replace hardcoded colors with semantic tokens
12. Add keyboard support to Kanban DnD
13. Centralize navigation config
14. Implement chat streaming (SSE/WebSocket)
15. Add visible focus indicators (focus-visible)

### P3 — Long-term (Quarter)
16. Add Storybook for component documentation
17. Implement light mode theme
18. Add i18n framework for future multilingual support
19. Performance audit with Lighthouse/Web Vitals
20. Comprehensive a11y audit (WCAG 2.1 AA)
