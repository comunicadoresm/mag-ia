---
id: STORY-TD-S3
epic: EPIC-TD-001
sprint: 3
title: "Data Layer Migration"
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: [pattern_validation, performance_test, regression_test, typescript_check]
priority: P1
effort: 2-3 weeks
status: planning
debt_items: [TD-C05, TD-C07, TD-M11, TD-M04, NEW-UX-04, GAP-02]
---

# Story S3: Data Layer Migration

## User Story

**As a** user,
**I want** instant data loading, real-time updates, and streaming AI responses,
**So that** the platform feels responsive and professional.

## Story Context

**Existing System Integration:**
- Integrates with: All pages that fetch data (Dashboard, Kanban, Chat, Scripts, Admin)
- Technology: React Query v5 (installed but unused), Supabase client, Edge Functions
- Current pattern: `useState` + `useEffect` + `supabase.from()` directly in components
- Touch points: 20+ files importing Supabase client directly, `Chat.tsx` (407 lines)

**Dependencies:**
- Requires Sprint 2 complete: AuthContext split (useProfile/useUserPlan are data hooks)
- Requires Sprint 2 complete: ErrorBoundary (catches React Query errors gracefully)
- BOTTLENECK: Cannot be parallelized — touches data fetching across entire app

---

## Acceptance Criteria

### AC-1: React Query Infrastructure (TD-C05) — 1 day
- [ ] `QueryClientProvider` already wraps app (confirmed present)
- [ ] Default query client configured: `staleTime: 5min`, `retry: 2`, `refetchOnWindowFocus: false`
- [ ] Devtools enabled in development (`@tanstack/react-query-devtools`)
- [ ] Error handling integrated with Sentry + ErrorBoundary

### AC-2: Domain Data Hooks (TD-C07) — 1 week
- [ ] `useAgents()` — fetches agent list with caching
- [ ] `useAgent(id)` — fetches single agent
- [ ] `useConversations(agentId)` — fetches conversation list
- [ ] `useMessages(conversationId)` — fetches messages with realtime subscription
- [ ] `useScripts(userId)` — fetches scripts for Kanban
- [ ] `useCredits(userId)` — fetches credit balance with realtime
- [ ] `useUserProfile()` — wraps the Sprint 2 `useProfile` hook with React Query
- [ ] All hooks return `{ data, isLoading, error }` pattern
- [ ] All hooks include proper TypeScript types

### AC-3: Migrate Pages to Hooks (TD-C07 + TD-M11) — 3-5 days
- [ ] Dashboard: uses `useCredits()`, `useAgents()`, `useScripts()`
- [ ] Kanban: uses `useScripts()` with realtime subscription
- [ ] Chat: uses `useMessages()`, `useConversations()`, `useAgent()`
- [ ] Admin pages: uses domain hooks (progressive migration)
- [ ] Direct `supabase.from()` calls removed from all page components
- [ ] Loading states use skeletons from Sprint 2

### AC-4: Chat Streaming (TD-M04) — 3-5 days
- [ ] Chat Edge Function returns SSE stream (Server-Sent Events)
- [ ] Frontend processes stream via `EventSource` or `fetch` with `ReadableStream`
- [ ] Time-to-first-token < 500ms (vs current 5-15 second wait)
- [ ] Streaming message rendered incrementally (typing effect)
- [ ] Error handling: stream interruption shows retry option
- [ ] Existing chat history unaffected (only new messages stream)

### AC-5: Chat.tsx Refactor (NEW-UX-04) — 2-3 days
- [ ] `Chat.tsx` (407 lines) split into focused modules:
  - `useChatMessages()` — message fetching and realtime
  - `useChatSend()` — message sending with credit consumption
  - `ChatMessageList` — message rendering component
  - `ChatInput` — input with auto-resize and send button
  - `ChatHeader` — agent info and conversation controls
- [ ] Each module < 100 lines
- [ ] Supabase error parsing hack (NEW-UX-05) replaced with proper error handling

### AC-6: TypeScript noImplicitAny (GAP-02 complete) — 2-3 days
- [ ] `noImplicitAny: true` enabled in `tsconfig.json`
- [ ] All type errors from noImplicitAny resolved
- [ ] Domain hooks fully typed (no `any` in data layer)
- [ ] CI pipeline passes with full strict mode

---

## Technical Notes

### React Query Hook Pattern
```typescript
// src/hooks/useScripts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useScripts(userId: string) {
  return useQuery({
    queryKey: ["scripts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_scripts")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUpdateScript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from("user_scripts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scripts"] });
    },
  });
}
```

### Chat Streaming (SSE)
```typescript
// Edge Function: stream response
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of aiResponse) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
      );
    }
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  },
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  },
});
```

### Migration Order
1. Create hooks (no UI change — hidden behind feature)
2. Migrate Dashboard first (simplest page)
3. Migrate Kanban (adds realtime)
4. Refactor Chat.tsx + add streaming (most complex)
5. Migrate Admin pages (lowest priority)
6. Enable `noImplicitAny` (final step)

### Key Constraint
- Migrate ONE page at a time — never have two pages mid-migration simultaneously
- Keep old data fetching code until React Query version is verified
- Streaming requires Edge Function change (deploy backend first, then frontend)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| React Query migration breaks data flow | Pages show stale/wrong data | Migrate one page at a time; E2E smoke test after each |
| Chat streaming breaks existing chat | Users lose conversations | New messages only; history stays as-is |
| Chat.tsx refactor introduces bugs | Chat doesn't work | Extract one module at a time; test after each extraction |
| noImplicitAny reveals hundreds of errors | Long resolution time | Fix data layer hooks first; page components last |

**Rollback plan:** Each page migration is independent. If streaming fails, keep refetch pattern.

## Definition of Done

- [ ] React Query configured with devtools
- [ ] All domain hooks created and typed
- [ ] All pages migrated to use hooks (no direct `supabase.from()` in pages)
- [ ] Chat streaming working with <500ms TTFT
- [ ] Chat.tsx split into modules (<100 lines each)
- [ ] `noImplicitAny: true` passing in CI
- [ ] TypeScript `strict: true` fully enabled
- [ ] No regression in any data-fetching flow
- [ ] Sentry shows no new errors from data layer changes
- [ ] React Query devtools shows proper cache behavior

---

*Story S3 — Sprint 3: Data Layer Migration (BOTTLENECK)*
*Epic: EPIC-TD-001 (MAG-IA Technical Debt Remediation)*
