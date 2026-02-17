# MAG-IA — Relatorio Executivo de Debt Tecnico

> Data: 2026-02-17 | Version 2.0 (Pos-Validacao)
> Brownfield Discovery Workflow — Validado por 3 especialistas

---

## Resumo para Decisao

A MAG-IA e uma plataforma funcional com base solida (Supabase + React + Tailwind), mas acumulou **52 debitos tecnicos** durante o desenvolvimento rapido no Lovable. Os mais urgentes sao de **seguranca** (5 criticos, incluindo 2 exploits financeiros ativos) e **infraestrutura** (sem CI/CD, sem error tracking, sem testes).

### Veredicto: Manter e Profissionalizar

A plataforma **NAO precisa ser reescrita**. A stack atual (React + Supabase) e profissional e escalavel. O que precisa e:

0. **Fundacao de observabilidade** (2 dias) — Sentry + CI + baseline *(NOVO)*
1. **Hardening de seguranca** (3-5 dias) — 8 fixes, maioria config/SQL
2. **Fundacao frontend** (1-2 semanas) — Error boundaries, Kanban mobile, skeletons
3. **Data layer** (2-3 semanas) — React Query, hooks, streaming
4. **Polish** (2 semanas) — Admin, validacao, a11y
5. **Seguranca avancada** (1-2 semanas) — Vault, webhook, audit

**Estimativa total: 7-10 semanas de refatoracao incremental** (pode ser feito em paralelo com features novas).

---

## Onde Estamos

```
                    SEGURANCA     INFRAESTRUTURA  UX/FRONTEND     DATABASE
Status:             CRITICO       CRITICO         FRAGIL          BOA

O que funciona:     RLS em 30     Stack moderna    Design system   Schema correto
                    tabelas       Componentes      CM brand        RLS global
                    RBAC admin    Hooks custom     Mobile nav      Realtime

O que preocupa:     JWT off       Sem CI/CD        Sem ErrorBound  Indexes faltam
                    Credits hack  Sem testes       Kanban mobile   Credits UPDATE
                    RLS permissivo Sem Sentry       Sem streaming   Voice publica
                    Cron sem auth  TS strict off   Sem skeletons   CORS wildcard
```

---

## ALERTA: Exploits Ativos

> Estes 3 problemas sao exploraveis HOJE por qualquer usuario autenticado:

### 1. Usuarios podem dar-se creditos infinitos
```sql
-- Qualquer usuario pode executar via browser:
-- supabase.from('user_credits').update({ plan_credits: 999999 })
DROP POLICY "Users can update own credits" ON user_credits;
```
**Tempo:** 5 minutos | **Impacto:** Perda de receita direta

### 2. Custo de creditos controlado pelo cliente
```typescript
// consume-credits aceita credit_cost do cliente (linha 59)
// Corrigir: ler custo do banco, nao do metadata
const cost = metadata?.credit_cost || DEFAULT_COSTS[action]; // REMOVER metadata.credit_cost
```
**Tempo:** 30 minutos | **Impacto:** Usuarios pagam menos do que devem

### 3. Knowledge base exposta para todos
```sql
-- Qualquer autenticado le TODOS os documentos dos agentes
DROP POLICY "Authenticated users can view agent documents" ON agent_documents;
CREATE POLICY "Admins can manage agent documents" ON agent_documents
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
```
**Tempo:** 15 minutos | **Impacto:** Vazamento de prompts, dados de treinamento

---

## Top 7 Acoes Imediatas (Revisado)

### 1. DROP policy de UPDATE em user_credits (TD-C03)
```sql
DROP POLICY "Users can update own credits" ON user_credits;
```
**Tempo:** 5 min | **Impacto:** Fecha exploit financeiro #1

### 2. Remover credit_cost do cliente (TD-C04)
```typescript
// consume-credits/index.ts — remover linhas 59 e 63
// Ler custo do agents table server-side
```
**Tempo:** 30 min | **Impacto:** Fecha exploit financeiro #2

### 3. Corrigir RLS de agent_documents (TD-C02)
```sql
DROP POLICY "Authenticated users can view agent documents" ON agent_documents;
CREATE POLICY "Admins can manage agent documents" ON agent_documents
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
-- Repetir para document_chunks
```
**Tempo:** 15 min | **Impacto:** Para vazamento de knowledge base

### 4. Autenticar funcoes cron (NEW-DB-01)
```typescript
// renew-credits + recheck-user-plans — adicionar:
const cronSecret = Deno.env.get("CRON_SECRET");
if (req.headers.get("x-cron-secret") !== cronSecret) return 401;
```
**Tempo:** 30 min | **Impacto:** Impede invocacao externa nao autorizada

### 5. Habilitar JWT nas Edge Functions (TD-C01)
```toml
# supabase/config.toml — mudar para true em TODAS (exceto hotmart-webhook)
[functions.chat]
verify_jwt = true
```
**Tempo:** 30 min | **Impacto:** Defense-in-depth para todas as funcoes

### 6. Privatizar bucket voice-audios (TD-H10)
```sql
UPDATE storage.buckets SET public = false WHERE id = 'voice-audios';
```
**Tempo:** 10 min | **Impacto:** Protege dados de voz (PII/LGPD)

### 7. Adicionar Indexes Criticos (TD-H12)
```sql
CREATE INDEX idx_user_scripts_user_status ON user_scripts(user_id, status);
CREATE INDEX idx_credit_tx_type ON credit_transactions(user_id, type, created_at DESC);
CREATE INDEX idx_voice_profiles_calibrated ON voice_profiles(user_id, is_calibrated);
```
**Tempo:** 10 min | **Impacto:** Performance em Kanban, creditos, onboarding

---

## Metricas do Projeto

| Metrica | Valor |
|---------|-------|
| Tabelas no banco | 30 |
| Edge Functions | 16 |
| Componentes React | 109+ |
| Hooks customizados | 10 |
| Contexts (global state) | 3 |
| Rotas/Paginas | 15 |
| Issues de seguranca | 13 (4 criticas) |
| Issues de arquitetura/quality | 12 (5 high) |
| Issues de UX | 18 (1 critica, 6 high) |
| Issues de database | 5 |
| Issues de performance | 4 |
| **Total debt items** | **52** |
| Cobertura de testes | **~0%** (1 placeholder) |
| Error tracking | **Nenhum** |
| CI/CD pipeline | **Nenhum** |

---

## Quadro de Risco (Revisado)

```
        IMPACTO
  Alto  | C03 (credits)  | GAP-01 (CI/CD)       |
        | C04 (cost hack)| GAP-02 (TS strict)   |
        | DB-01 (cron)   | GAP-04 (Sentry)      |
        | C02 (RLS docs) | H05 (Kanban mobile)  |
  ------+----------------+----------------------+
  Medio | H01 (webhook)  | M04 (streaming)      |
        | H02 (API keys) | M09 (color-only)     |
        | H03 (audit)    | C05 (React Query)    |
        | DB-02 (race)   | UX-03 (route guards) |
  ------+----------------+----------------------+
  Baixo | DB-03 (CORS)   | M08 (hardcoded color)|
        | M05 (soft del) | M10 (keyboard DnD)   |
        +----------------+----------------------+
              ALTA                MEDIA
                     PROBABILIDADE
```

---

## Roadmap Sugerido (Revisado)

```
Dia 1-2:     ██ Sprint 0: Observabilidade (NOVO)
             - Sentry, CI pipeline, baseline de performance

Semana 1:    ████ Sprint 1: Security Hardening
             - Credits exploit, RLS, JWT, cron auth, voice bucket, indexes

Semana 2-3:  ████████ Sprint 2: Frontend Foundation
             - ErrorBoundary, Kanban mobile, route guards, skeletons, AuthContext

Semana 3-5:  ████████████ Sprint 3: Data Layer (BOTTLENECK)
             - React Query, data hooks, chat streaming, Chat.tsx refactor

Semana 5-7:  ████████████ Sprint 4: Admin & UX Polish
             - Zod validation, code-split, a11y, nav config, status tokens

Semana 7-9:  ████████ Sprint 5: Advanced Security
             - Vault, HMAC webhook, audit log, CORS, @dnd-kit
```

**Paralelizacao possivel:**
- Sprint 1 (backend) pode rodar em paralelo com Sprint 2 (frontend)
- Sprint 4 (frontend) pode rodar em paralelo com Sprint 5 (backend)
- Sprint 3 (data layer) e o GARGALO — nao pode ser paralelizado

---

## Novos Findings das Revisoes Especialistas

### @data-engineer encontrou 5 problemas nao documentados:
1. **renew-credits sem autenticacao** (CRITICO) — qualquer pessoa invoca
2. **Race condition em creditos** (HIGH) — read-then-write sem lock
3. **CORS wildcard `*`** (MEDIUM) — todos os 16 Edge Functions
4. **credit_cost_config nao usado** (LOW) — tabela morta no schema
5. **Chat ignora pgvector** (MEDIUM) — faz keyword matching ao inves de similarity search

### @ux-design-expert encontrou 5 problemas nao documentados:
1. **Kanban usa HTML5 DnD** (MEDIUM) — @dnd-kit instalado mas nao usado no Kanban
2. **Sem empty states** (LOW-MEDIUM) — inconsistente, sem call-to-action
3. **Sem route guards** (HIGH) — flash de conteudo, facil esquecer em novas paginas
4. **Chat.tsx 407 linhas** (MEDIUM) — mixed concerns, impossivel testar
5. **Hack de parsing de erro** (MEDIUM) — fragil, depende de internals do Supabase SDK

### @qa identificou 8 lacunas no assessment:
1. **CI/CD** (HIGH) — sem pipeline, deploy manual
2. **TypeScript strict** (HIGH) — `strict: false` invalida type safety
3. **ESLint permissivo** (MEDIUM) — `no-unused-vars: off`
4. **Error tracking** (HIGH) — 84 console.error vao para o vazio
5. **Performance baseline** (MEDIUM) — sem Lighthouse, sem Web Vitals
6. **Security testing** (MEDIUM) — sem `npm audit`, sem SAST
7. **Env var validation** (MEDIUM) — sem validacao no startup
8. **Edge Function logic** (MEDIUM) — business logic nao auditada

---

## Comparativo: Reescrever vs Refatorar

| Criterio | Reescrever | Refatorar (Recomendado) |
|----------|-----------|------------------------|
| Tempo | 3-6 meses | 7-10 semanas |
| Risco | Alto (features perdidas) | Baixo (incremental) |
| Custo | Alto | Medio |
| Downtime | Sim (migracao) | Zero |
| Features novas | Pausadas | Em paralelo |
| Stack final | Mesma (React+Supabase) | Mesma |

**Conclusao:** Nao ha justificativa tecnica para reescrita. O debt e gerenciavel com refatoracao incremental.

---

## Documentos de Referencia

| Documento | Conteudo |
|-----------|---------|
| [system-architecture.md](../architecture/system-architecture.md) | Arquitetura completa do sistema |
| [SCHEMA.md](../../supabase/docs/SCHEMA.md) | Schema completo do banco (30 tabelas) |
| [DB-AUDIT.md](../../supabase/docs/DB-AUDIT.md) | Auditoria de seguranca (15 findings) |
| [frontend-spec.md](../frontend/frontend-spec.md) | Spec de frontend/UX (109+ componentes) |
| [technical-debt-DRAFT.md](../prd/technical-debt-DRAFT.md) | DRAFT inicial (44 items) |
| [technical-debt-assessment.md](../prd/technical-debt-assessment.md) | Assessment final v2.0 (52 items) |
| [db-specialist-review.md](../reviews/db-specialist-review.md) | Review @data-engineer (+5 findings) |
| [ux-specialist-review.md](../reviews/ux-specialist-review.md) | Review @ux-design-expert (+5 findings) |
| [qa-review.md](../reviews/qa-review.md) | Review @qa (+8 gaps, Sprint 0) |

---

*Version 2.0 — Pos-validacao por @data-engineer, @ux-design-expert, @qa*
*Gerado por Orion (AIOS Master) — Brownfield Discovery Workflow*
