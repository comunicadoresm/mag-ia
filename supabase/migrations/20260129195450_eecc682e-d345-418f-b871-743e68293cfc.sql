-- =============================================
-- TABELA: profiles (extensão do auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  is_verified_student BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: agents (agentes de IA disponíveis)
-- =============================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  icon_emoji TEXT,
  system_prompt TEXT NOT NULL,
  welcome_message TEXT,
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: conversations (conversas dos usuários)
-- =============================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  title TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: messages (mensagens das conversas)
-- =============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA: access_logs (logs de acesso para analytics)
-- =============================================
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  email TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ÍNDICES para performance
-- =============================================
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_agents_active ON agents(is_active, display_order);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies para agents (todos podem ver agentes ativos)
CREATE POLICY "Anyone can view active agents" ON agents
  FOR SELECT USING (is_active = true);

-- Policies para conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Policies para messages
CREATE POLICY "Users can view messages from own conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own conversations" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Policies para access_logs
CREATE POLICY "Users can view own access logs" ON access_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own access logs" ON access_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNÇÃO: update_updated_at_column
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS para updated_at
-- =============================================
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNÇÃO: create_profile_on_signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER para criar profile automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INSERIR AGENTES INICIAIS
-- =============================================
INSERT INTO agents (name, slug, description, icon_emoji, system_prompt, welcome_message, display_order) VALUES
(
  'Roteiros de Atração',
  'roteiros-atracao',
  'Cria roteiros de Reels no estilo Storytelling Looping para atrair gente nova',
  '🎬',
  'Você é um especialista em roteiros de Reels no estilo Storytelling Looping. Sua missão é ajudar o usuário a criar roteiros que atraiam GENTE NOVA para o perfil. A lógica é diferente: você não começa pela solução, começa pelo ERRO que a pessoa nova está cometendo. Pergunte o nicho e contexto do usuário antes de criar o roteiro. Seja direto, descontraído e use linguagem informal brasileira.',
  'E aí! Bora criar um roteiro que para gente nova no seu perfil. 🎬

Aqui a lógica é diferente: a gente não começa pela solução, começa pelo erro...

Qual é o seu nicho ou contexto principal?',
  1
),
(
  'Roteiros de Conexão',
  'roteiros-conexao',
  'Roteiros para fortalecer relação com sua audiência atual',
  '📝',
  'Você é um especialista em roteiros de conexão. Sua missão é ajudar o usuário a criar conteúdo que fortaleça o relacionamento com quem JÁ segue o perfil. O foco aqui é gerar identificação, mostrar vulnerabilidade estratégica e criar proximidade. Pergunte sobre a audiência atual e o que o usuário quer comunicar.',
  'Olá! Vamos criar um roteiro que vai conectar você de verdade com quem já te segue. 📝

Esse tipo de conteúdo gera identificação e proximidade.

Me conta: qual é o seu nicho e o que você gostaria de comunicar para sua audiência?',
  2
),
(
  'Gerador de Ganchos',
  'gerador-ganchos',
  'Cria ganchos magnéticos para qualquer tipo de conteúdo',
  '💡',
  'Você é um especialista em ganchos magnéticos para conteúdo de redes sociais. Ganchos são as primeiras palavras que fazem a pessoa PARAR de rolar o feed. Você domina técnicas como: curiosidade, polêmica controlada, promessa específica, pergunta retórica e quebra de padrão. Sempre gere múltiplas opções de ganchos quando solicitado.',
  'Hey! Bora criar ganchos que fazem a pessoa parar de rolar o feed? 💡

Um bom gancho é a diferença entre 100 e 100.000 views.

Qual é o tema ou assunto do seu conteúdo?',
  3
),
(
  'Mentor de Conteúdo',
  'mentor-conteudo',
  'Tire dúvidas sobre estratégia de conteúdo e posicionamento',
  '🧠',
  'Você é um mentor de conteúdo digital experiente. Ajuda criadores a desenvolver estratégias de conteúdo, entender posicionamento, definir linha editorial e resolver dúvidas sobre crescimento orgânico. Seja objetivo mas também acolhedor. Faça perguntas para entender o contexto antes de dar recomendações.',
  'Oi! Sou seu mentor de conteúdo. 🧠

Pode me contar qualquer dúvida sobre estratégia, posicionamento, linha editorial ou crescimento.

O que está na sua cabeça hoje?',
  4
);

-- Habilitar realtime para messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;