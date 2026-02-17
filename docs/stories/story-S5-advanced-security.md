---
id: STORY-TD-S5
epic: EPIC-TD-001
sprint: 5
title: "Advanced Security"
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: [security_scan, api_audit, migration_review, a11y_validation]
priority: P2
effort: 1-2 weeks
status: planning
debt_items: [TD-H02, TD-H01, TD-H03, NEW-DB-03, TD-M10]
---

# Story S5: Advanced Security

## User Story

**As a** platform owner,
**I want** API keys encrypted, webhooks cryptographically verified, admin actions audited, and CORS restricted,
**So that** the platform has defense-in-depth against sophisticated attacks.

## Story Context

**Existing System Integration:**
- Integrates with: Supabase Vault (new), Hotmart webhooks, admin pages, all 16 Edge Functions, Kanban DnD
- Technology: Supabase Vault (secret management), HMAC-SHA256 (webhook), PostgreSQL (audit log), CORS config
- Follows pattern: Existing Edge Function patterns, Supabase admin APIs
- Touch points: `supabase/functions/*/index.ts` (CORS), `hotmart-webhook/index.ts`, admin pages, `agents` table

**Dependencies:**
- Requires Sprint 1 complete: Basic security hardened
- Can run in PARALLEL with Sprint 4 (different codebase areas)
- Supabase Vault requires Supabase project configuration

---

## Acceptance Criteria

### AC-1: API Keys to Supabase Vault (TD-H02) — 3-5 days
- [ ] Supabase Vault enabled on the project
- [ ] All agent API keys (`api_key` column in `agents` table) migrated to Vault
- [ ] `agents` table: `api_key` column cleared/removed after migration
- [ ] Edge Functions retrieve keys from Vault at runtime
- [ ] `agents_public` view updated (still hides keys — defense in depth)
- [ ] Verified: API keys NOT visible in any query result (even admin)

### AC-2: Hotmart Webhook HMAC Verification (TD-H01) — 2-3 days
- [ ] HMAC-SHA256 signature verification on all incoming webhooks
- [ ] Timestamp validation (reject webhooks older than 5 minutes)
- [ ] Idempotency check via `webhook_logs` table (no duplicate processing)
- [ ] Remove conditional `hottok` check (current: `if (hottok && ...)`)
- [ ] Reject ALL webhooks without valid signature (no bypass)
- [ ] Verified: Replayed webhook rejected; forged webhook rejected

### AC-3: Admin Audit Log (TD-H03) — 1-2 days
- [ ] `admin_audit_log` table created: `id, admin_user_id, action, target_type, target_id, details, created_at`
- [ ] All admin operations logged: create/update/delete users, agents, plans
- [ ] RLS: only admins can read audit log
- [ ] Admin dashboard shows recent audit entries
- [ ] Verified: Creating/deleting an agent appears in audit log

### AC-4: Restrict CORS Origins (NEW-DB-03) — 2 hours
- [ ] All 16 Edge Functions: Replace `Access-Control-Allow-Origin: *` with specific origin
- [ ] Allowed origins: production domain + localhost for development
- [ ] CORS headers configured via shared utility (not duplicated per function)
- [ ] Verified: Request from unauthorized origin rejected with 403

### AC-5: Kanban DnD Migration to @dnd-kit (TD-M10) — 3-5 days
- [ ] Replace HTML5 DnD API with `@dnd-kit/core` + `@dnd-kit/sortable`
- [ ] Keyboard drag-and-drop support (Tab + Space + Arrow keys)
- [ ] Touch support for mobile (complements Sprint 2 swipeable tabs)
- [ ] ARIA live announcements for drag operations
- [ ] Desktop: drag between columns works
- [ ] Mobile: drag within column works (between columns via tabs from Sprint 2)
- [ ] Verified: Entire Kanban operable via keyboard only

---

## Technical Notes

### Supabase Vault
```sql
-- Store API key in vault
SELECT vault.create_secret(
  'agent-key-{agent_id}',
  'sk-ant-api03-xxxxx',
  'API key for agent {agent_name}'
);

-- Retrieve in Edge Function
const { data: secret } = await supabase.rpc('vault.get_secret', {
  secret_name: `agent-key-${agentId}`
});
```

### Webhook HMAC Verification
```typescript
// hotmart-webhook/index.ts
import { createHmac, timingSafeEqual } from "node:crypto";

function verifyWebhook(body: string, signature: string, timestamp: string, secret: string): boolean {
  if (!signature || !timestamp) return false;

  // Reject old webhooks (>5 min)
  const age = Date.now() - parseInt(timestamp);
  if (age > 300_000) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Admin Audit Log Schema
```sql
CREATE TABLE admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  target_type TEXT NOT NULL, -- 'agent', 'user', 'plan'
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON admin_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at DESC);
```

### CORS Shared Utility
```typescript
// supabase/functions/_shared/cors.ts
const ALLOWED_ORIGINS = [
  Deno.env.get("APP_URL") || "https://mag-ia.app",
  "http://localhost:5173",
];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  };
}
```

### @dnd-kit Migration
```tsx
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor,
  useSensor, useSensors
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";

const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={cards} strategy={verticalListSortingStrategy}>
    {cards.map(card => <SortableCard key={card.id} {...card} />)}
  </SortableContext>
</DndContext>
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vault migration loses API keys | Agents can't call AI providers | Backup all keys before migration; test each agent after |
| HMAC rejects legitimate Hotmart webhooks | Payments not processed | Test with Hotmart sandbox first; keep old endpoint as fallback for 48h |
| CORS restriction breaks client | App can't call Edge Functions | Add all production domains; test in staging first |
| @dnd-kit changes Kanban UX | Users confused by new DnD | Keep same visual behavior; keyboard is additive |
| Audit log table grows large | DB performance | Add `created_at` index; consider retention policy (90 days) |

**Rollback plan:** Each AC is independent. Vault keys can be restored from backup. CORS can revert to `*` if needed. Old DnD code preserved in git history.

## Definition of Done

- [ ] API keys encrypted in Supabase Vault (not in `agents` table)
- [ ] Hotmart webhooks HMAC-verified with replay protection
- [ ] Admin audit log capturing all admin operations
- [ ] CORS restricted to production + localhost origins
- [ ] Kanban fully operable via keyboard (@dnd-kit)
- [ ] No regression in: agent chat, webhook payments, admin functions, Kanban
- [ ] Sentry shows no new errors from Sprint 5 changes
- [ ] Security scan (npm audit) passes with no critical/high vulnerabilities

---

*Story S5 — Sprint 5: Advanced Security*
*Epic: EPIC-TD-001 (MAG-IA Technical Debt Remediation)*
