---
id: STORY-MVP-001
epic: EPIC-TD-001
sprint: MVP
title: "Sprint MVP — Launch-Ready"
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: [security_scan, rls_test, component_test, a11y_validation, e2e_smoke]
priority: P0
effort: "5-7 hours (AIOS) | 2-3 weeks (human)"
status: planning
tier1_items: [TD-C01, TD-C02, TD-C03, TD-C04, NEW-DB-01]
tier2_items: [TD-C04-FE, TD-H05, TD-H09, TD-M04, TD-M09, NEW-UX-03]
---

# Story MVP: Launch-Ready Sprint

## Objetivo

Levar o MAG-IA de "prototipo com exploits" para "MVP lancavel com visual profissional" no menor caminho possivel. Cherry-pick cirurgico dos 52 debt items — so o que bloqueia lancamento ou impacta a experiencia do usuario.

## User Story

**As a** platform owner,
**I want** all security exploits closed and a polished user experience,
**So that** I can launch the MVP with confidence, knowing users can't exploit the system and the product feels professional.

---

## TIER 1: Security — Bloqueia Lancamento

> Sem isso, o produto e exploravel no dia 1. Nenhum usuario deve ver o sistema antes de Tier 1 estar fechado.

### T1-1: DROP Credits UPDATE Policy (TD-C03) — 5 min
**Exploit:** Usuario executa `supabase.from('user_credits').update({plan_credits: 999999})` e ganha creditos infinitos.

- [ ] Executar migration: `DROP POLICY "Users can update own credits" ON user_credits;`
- [ ] Verificar: consume-credits Edge Function continua funcionando (usa service_role)
- [ ] Verificar: update via client retorna permission denied

```sql
-- Migration
DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;
```

### T1-2: Remove Client Credit Cost (TD-C04) — 30 min
**Exploit:** `consume-credits/index.ts` linha 59 aceita `metadata.credit_cost` do cliente. Usuario envia `credit_cost: 1` em vez do default 3.

- [ ] Remover leitura de `metadata.credit_cost` em `consume-credits/index.ts`
- [ ] Remover leitura de `metadata.message_package_size`
- [ ] Custo lido de `DEFAULT_COSTS[action]` ou da tabela `agents` (server-side)
- [ ] Verificar: enviar `credit_cost: 1` no metadata nao tem efeito

```typescript
// ANTES (vulneravel):
const cost = metadata?.credit_cost || DEFAULT_COSTS[action] || 1;

// DEPOIS (seguro):
const cost = DEFAULT_COSTS[action] || 1;
// OU melhor: ler da tabela agents
```

### T1-3: Fix Knowledge Base RLS (TD-C02) — 15 min
**Exploit:** Qualquer usuario autenticado le TODA a base de conhecimento dos agentes (training data, prompts, metodologia).

- [ ] `agent_documents`: trocar policy para `has_role(auth.uid(), 'admin'::app_role)`
- [ ] `document_chunks`: mesma restricao
- [ ] Verificar: chat function ainda acessa (usa service_role key)
- [ ] Verificar: usuario comum nao consegue SELECT em agent_documents

```sql
-- Migration
DROP POLICY IF EXISTS "Allow authenticated read" ON agent_documents;
CREATE POLICY "Only admins read agent_documents"
  ON agent_documents FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Allow authenticated read" ON document_chunks;
CREATE POLICY "Only admins read document_chunks"
  ON document_chunks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
```

### T1-4: Auth Cron Functions (NEW-DB-01) — 30 min
**Exploit:** `renew-credits` e `recheck-user-plans` nao tem NENHUMA autenticacao. Qualquer pessoa na internet pode trigger a renovacao de creditos de TODOS os usuarios.

- [ ] Adicionar verificacao de `x-cron-secret` header em `renew-credits/index.ts`
- [ ] Adicionar mesma verificacao em `recheck-user-plans/index.ts`
- [ ] Retornar 401 se secret ausente ou incorreto
- [ ] Configurar `CRON_SECRET` como env var no Supabase
- [ ] Atualizar cron job para enviar header com secret

```typescript
// Adicionar no inicio de cada cron function:
const cronSecret = Deno.env.get("CRON_SECRET");
const requestSecret = req.headers.get("x-cron-secret");
if (!cronSecret || requestSecret !== cronSecret) {
  return new Response("Unauthorized", { status: 401 });
}
```

### T1-5: Enable JWT Verification (TD-C01) — 30 min
**Exploit:** TODAS as 16 Edge Functions tem `verify_jwt = false` no config. Requests sem autenticacao chegam no codigo da function.

- [ ] Editar `supabase/config.toml`: `verify_jwt = true` em todas as functions
- [ ] Excecao: `hotmart-webhook` permanece `false` (webhook publico)
- [ ] Verificar: todas as funcionalidades existentes continuam (functions ja validam JWT internamente)
- [ ] Verificar: request sem auth para `/chat` retorna 401

---

## TIER 2: Visual & UX — MVP Profissional

> O que transforma o produto de "prototipo funcional" para "MVP que impressiona".

### T2-1: Error Boundary (TD-C04-FE) — 2 horas
**Hoje:** Erro JS = tela branca permanente. Usuario precisa dar reload.
**Depois:** Mensagem amigavel + botao retry.

- [ ] Global `<ErrorBoundary>` em `App.tsx` (catch-all)
- [ ] Per-feature boundaries: Kanban, Chat, ScriptEditor, Onboarding
- [ ] UI de erro: "Algo deu errado" + botao "Tentar novamente"
- [ ] Integrar com Sentry (se configurado) via `componentDidCatch`
- [ ] Reset state ao navegar (nao prender usuario no erro)

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-lg text-muted-foreground">Algo deu errado</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### T2-2: Kanban Mobile (TD-H05) — 3-5 horas
**Hoje:** Colunas 280-320px com scroll horizontal. Inutilizavel no celular.
**Depois:** Tabs swipeaveis por status com cards empilhados.

- [ ] Mobile (<768px): Tabs horizontais por status (Ideia, Rascunho, Revisao, Publicado)
- [ ] Cada tab mostra cards empilhados daquela coluna
- [ ] Swipe entre tabs (touch gesture)
- [ ] Badge com contagem de cards em cada tab
- [ ] Desktop (>=768px): Layout atual inalterado
- [ ] Drag-and-drop funciona dentro da coluna visivel

### T2-3: Loading Skeletons (TD-H09) — 2-3 horas
**Hoje:** Spinner generico enquanto carrega.
**Depois:** Skeleton que replica o layout do conteudo.

- [ ] Dashboard: skeleton cards (metricas, agentes, scripts recentes)
- [ ] Kanban: skeleton colunas com cards placeholder
- [ ] Chat: skeleton lista de mensagens
- [ ] Scripts: skeleton lista de roteiros
- [ ] Usar componente `<Skeleton>` existente do shadcn/ui
- [ ] Sem content shift quando dados carregam (layout estavel)

### T2-4: Chat Streaming (TD-M04) — 3-5 horas
**Hoje:** Faz fetch, espera 5-15 segundos em silencio, mostra resposta inteira de uma vez.
**Depois:** Resposta aparece em tempo real, token por token.

- [ ] Edge Function de chat retorna SSE stream (Server-Sent Events)
- [ ] Frontend processa stream via `ReadableStream` do `fetch`
- [ ] Time-to-first-token < 500ms
- [ ] Mensagem renderizada incrementalmente (efeito "digitando")
- [ ] Erro no stream: mostrar botao retry
- [ ] Historico de chat nao afetado (so mensagens novas streamam)

### T2-5: Status Indicators Acessiveis (TD-M09) — 1-2 horas
**Hoje:** Status do Kanban e alertas de credito usam SÓ cor. ~8% dos homens (daltonicos) nao distinguem.
**Depois:** Cor + icone + texto.

- [ ] Kanban: cada status tem icone + label texto alem da cor
- [ ] Creditos: alerta com icone (triangulo warning) + texto
- [ ] Plan badges: cor + nome do plano
- [ ] WCAG 1.4.1 compliance (nenhuma informacao transmitida so por cor)

### T2-6: ProtectedRoute (NEW-UX-03) — 1 hora
**Hoje:** Cada pagina implementa seu proprio useEffect para checar auth. Flash de conteudo antes do redirect.
**Depois:** Wrapper unico, transicao limpa.

- [ ] Componente `<ProtectedRoute>` criado
- [ ] Redirect para login se nao autenticado
- [ ] Loading skeleton enquanto verifica auth (sem flash)
- [ ] Todas as paginas protegidas usam o wrapper
- [ ] Novas paginas protegidas automaticamente ao usar o componente

```tsx
// src/components/ProtectedRoute.tsx
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <PageSkeleton />;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}
```

---

## Ordem de Execucao

```
FASE A — Security (Tier 1)              ~1-2 horas
├── T1-1: DROP credits policy            (5 min)
├── T1-2: Remove client credit_cost      (30 min)
├── T1-3: Fix RLS agent_documents        (15 min)
├── T1-4: Auth cron functions            (30 min)
└── T1-5: Enable verify_jwt             (30 min)

FASE B — UX Foundation (Tier 2a)         ~3-4 horas
├── T2-1: ErrorBoundary                  (2 horas)
├── T2-6: ProtectedRoute                 (1 hora)
└── T2-3: Loading Skeletons              (2 horas)

FASE C — UX Premium (Tier 2b)           ~5-7 horas
├── T2-2: Kanban Mobile                  (3-5 horas)
├── T2-4: Chat Streaming                 (3-5 horas)  ← pode rodar paralelo
└── T2-5: Status Indicators              (1-2 horas)
```

**Nota:** FASE B e C podem rodar em paralelo com FASE A (areas diferentes do codebase).

---

## O que NAO esta nessa story (e por que)

| Item | Por que NAO entra no MVP |
|------|--------------------------|
| React Query migration | Data fetching funciona, so nao e otimo |
| AuthContext split | Arquitetura interna, usuario nao ve |
| TypeScript strict | Qualidade de codigo, nao UX |
| Supabase Vault | Keys ja protegidas pelo view + REVOKE |
| Admin audit log | So admin usa, nao impacta usuario |
| Zod validation | Toasts de erro funcionam por enquanto |
| @dnd-kit | HTML5 DnD funciona no desktop |
| CI/CD pipeline | Deploy manual por enquanto |
| Sentry | Importante, mas nao bloqueia lancamento |
| Performance indexes | Perceptivel so com escala |

**Todos esses itens voltam no pos-lancamento (Sprints 0-5).**

---

## Definition of Done — MVP Launch-Ready

### Security (Tier 1)
- [ ] Zero exploits financeiros ativos
- [ ] Nenhum usuario pode manipular creditos
- [ ] Knowledge base protegida (so admin)
- [ ] Cron functions autenticadas
- [ ] JWT obrigatorio em todas as Edge Functions (exceto webhook)

### UX (Tier 2)
- [ ] Erro JS mostra UI amigavel (nao tela branca)
- [ ] Kanban usavel no celular (swipeable tabs)
- [ ] Loading com skeletons (nao spinner generico)
- [ ] Chat com streaming em tempo real
- [ ] Status indicators com icone + texto (nao so cor)
- [ ] Auth redirect limpo (sem flash de conteudo)

### Smoke Test Final
- [ ] Fluxo completo: login → dashboard → chat com agente → ver creditos
- [ ] Fluxo Kanban: criar script → mover entre colunas → editar
- [ ] Fluxo mobile: mesmo acima em viewport 375px
- [ ] Fluxo admin: criar agente → configurar → testar chat
- [ ] Security: tentativa de exploit retorna erro

---

*Story MVP — Sprint de lancamento*
*Epic: EPIC-TD-001 (MAG-IA Technical Debt Remediation)*
*Prioridade: Cherry-pick dos 52 debt items — so o que bloqueia lancamento*
