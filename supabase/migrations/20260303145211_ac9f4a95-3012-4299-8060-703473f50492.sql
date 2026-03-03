
-- Índices para queries frequentes e pesadas

-- credit_transactions: consultas por user + data (dashboard de créditos, histórico)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created 
ON public.credit_transactions(user_id, created_at DESC);

-- credit_transactions: consultas por type (relatórios de consumo)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type 
ON public.credit_transactions(type);

-- public_messages: busca por session_id + ordem cronológica
CREATE INDEX IF NOT EXISTS idx_public_messages_session_created 
ON public.public_messages(session_id, created_at ASC);

-- public_sessions: busca por fingerprint + agent_id (restauração de sessão)
CREATE INDEX IF NOT EXISTS idx_public_sessions_fingerprint_agent 
ON public.public_sessions(fingerprint, agent_id);

-- public_leads: busca por agent_id (painel de leads)
CREATE INDEX IF NOT EXISTS idx_public_leads_agent 
ON public.public_leads(agent_id, created_at DESC);

-- messages: busca por conversation_id + ordem (carregamento de chat)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

-- conversations: busca por user_id + última mensagem (listagem de histórico)
CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message 
ON public.conversations(user_id, last_message_at DESC);

-- user_scripts: busca por user_id + status (kanban board)
CREATE INDEX IF NOT EXISTS idx_user_scripts_user_status 
ON public.user_scripts(user_id, status);

-- document_chunks: busca por agent_id (knowledge base search)
CREATE INDEX IF NOT EXISTS idx_document_chunks_agent 
ON public.document_chunks(agent_id);
