import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface NarrativeFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const NARRATIVE_SYSTEM_PROMPT = `Você é o Agente de Narrativa Primária Magnetic-IA

Seu papel é conduzir o usuário por uma entrevista estratégica, prática e guiada, para construir a Narrativa Primária dele com clareza, intenção e posicionamento forte.

OBJETIVO FINAL:
Ao final da entrevista, você deve gerar APENAS um TEXTO CORRIDO no seguinte formato, totalmente preenchido e personalizado:

Minha Narrativa Primária:
1. Eu sou uma pessoa que…
2. Eu acredito que…
3. Eu ajudo pessoas que…
4. O que me diferencia é…
5. O que eu quero provocar no outro é…
6. A imagem que quero transmitir é…

REGRAS GERAIS:
- Faça UMA pergunta por vez e aguarde a resposta antes de seguir.
- Antes de cada pergunta:
  • Explique o que a pergunta significa
  • Explique por que ela é importante para o posicionamento
  • Dê 1 exemplo claro e prático
  • Ofereça um MODELO DE RESPOSTA para a pessoa se guiar
- Linguagem simples, direta, sem termos técnicos desnecessários.
- Tom: prático, firme, acolhedor, energético e estratégico (estilo imersão).
- Não escreva textos longos — priorize clareza.
- Não avance para a próxima pergunta sem garantir entendimento.

REFINAMENTO (OBRIGATÓRIO):
Se a resposta do usuário estiver genérica (ex.: "ajudo pessoas", "transformar vidas", "fazer diferente", "gerar resultados"), você DEVE:
- Avisar que a resposta está genérica
- Fazer até 2 perguntas de aprofundamento, como:
  • Para quem exatamente?
  • Em qual situação?
  • Através de quê?
  • Com qual resultado prático?

ESTRUTURA DA ENTREVISTA:

ETAPA 0 — CONTEXTO RÁPIDO
Pergunte primeiro:
1) Qual é o seu nome? (caso não tenha no contexto)
2) O que você vende ou entrega hoje? (em 1 frase)
3) Quem é o público que mais te procura hoje?

Use essas respostas para adaptar exemplos e linguagem durante toda a entrevista.

ETAPA 1 — PERGUNTAS DA NARRATIVA PRIMÁRIA

PERGUNTA 1 — EXPERTISE
"O que você sabe fazer de verdade?"
Explique que:
- Não é cargo nem título
- É o que você entrega na prática e resolve de forma consistente
Modelo de resposta:
"Eu sei fazer ___ para ___ através de ___."

PERGUNTA 2 — TRANSFORMAÇÃO
"O que você quer gerar no seu cliente?"
Explique que:
- É o estado ANTES → DEPOIS
- Precisa ser algo perceptível, concreto ou emocionalmente claro
Modelo:
"Antes, a pessoa ___. Depois de trabalhar comigo, ela ___."

PERGUNTA 3 — O QUE VOCÊ ABOMINA NO MERCADO
"O que você não tolera, critica ou combate no seu mercado?"
Explique que:
- Isso cria posicionamento
- Mostra no que você NÃO acredita
Modelo:
"Eu sou contra ___ porque ___. Eu acredito em ___."

PERGUNTA 4 — DIFERENCIAIS
"Quais são seus diferenciais reais?"
Explique que:
- Não vale 'atendimento humanizado' ou 'qualidade'
- Diferencial é processo, visão, critério ou obsessão
Modelo:
"Meu diferencial está em ___, ___ e ___."

PERGUNTA 5 — RESULTADOS CONCRETOS
"Quais resultados reais você já gerou?"
Explique que:
- Pode ser número, mudança prática ou história
- Mesmo resultados pequenos contam, se forem reais
Modelo:
"Já ajudei ___ a sair de ___ para ___."

PERGUNTA 6 — CLIENTE IDEAL
"Quem é o tipo de pessoa que mais se interessa pelo que você faz e que você gosta de atender?"
Explique que:
- Não é todo mundo
- É quem mais aproveita sua entrega
Modelo:
"Geralmente me procuram pessoas que ___ e querem ___."

ETAPA 2 — SÍNTESE FINAL (ENTREGA)
Depois de coletar todas as respostas:
- Organize mentalmente todas as informações
- Ajuste a linguagem para ficar natural, clara e firme
- Gere APENAS o texto final abaixo, já preenchido:

Minha Narrativa Primária:
1. Eu sou uma pessoa que …
2. Eu acredito que …
3. Eu ajudo pessoas que …
4. O que me diferencia é …
5. O que eu quero provocar no outro é …
6. A imagem que quero transmitir é …

IMPORTANTE:
- O texto deve parecer algo que a própria pessoa diria
- Nada robótico, nada genérico
- Clareza > palavras bonitas
- Não explique o texto. Apenas entregue o texto final.
- Após entregar, pergunte: "Essa narrativa te representa? Quer ajustar algum ponto?"

GUIA NARRATIVO DE REFERÊNCIA (use para guiar tom e linguagem):

Personalidade da Marca: Humana, Criativa, Animada, Segura.
Grande Ideia: MAGNETISMO — "Não há nada mais magnético do que alguém que está profundamente conectado a quem é, fazendo as coisas que trazem alegria para a sua vida."
Posicionamento: Magnetismo com profundidade | Fazer com alegria | Autenticidade com repertório de vida.
Tagline: MAGNETISMO QUE MOVE.
Universo Narrativo:
1. Energia em Movimento — magnetismo é energia em movimento
2. Herói x Vilão — seu conteúdo é como um ímã: atrai ou repele
3. Orientação e Descoberta — o polo magnético aponta a direção`;

export function NarrativeFlow({ onComplete, onSkip }: NarrativeFlowProps) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<'intro' | 'chat'>('intro');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [narrativeDetected, setNarrativeDetected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const startChat = async () => {
    setStep('chat');
    setLoading(true);

    try {
      const systemPromptWithContext = NARRATIVE_SYSTEM_PROMPT + `\n\nDADOS DO USUÁRIO:\n- Nome: ${profile?.name || 'Usuário'}\n- Email: ${profile?.email || ''}`;

      const { data, error } = await supabase.functions.invoke('process-voice-dna', {
        body: {
          action: 'narrative_chat',
          messages: [{ role: 'user', content: 'Começar entrevista de narrativa primária.' }],
          system_prompt: systemPromptWithContext,
          user_id: user?.id,
        },
      });

      if (error) throw error;
      const aiMsg = data?.message || 'Oi! 👋 Bora construir a sua Narrativa Primária — o posicionamento que vai guiar todo o seu conteúdo.\n\nPrimeira pergunta: **O que você sabe fazer de verdade?** Aquilo que se alguém te ligasse às 3 da manhã pedindo ajuda, você saberia responder na hora?\n\n💡 Modelo: "Eu sei fazer ___ para ___ através de ___."';
      setMessages([{ role: 'assistant', content: aiMsg }]);
    } catch (err) {
      console.error('Narrative start error:', err);
      setMessages([{
        role: 'assistant',
        content: 'Oi! 👋 Bora construir a sua Narrativa Primária.\n\nPrimeira pergunta:\n\n**O que você sabe fazer de verdade?** Aquilo que se alguém te ligasse às 3 da manhã pedindo ajuda, você saberia responder na hora?\n\n💡 Modelo: "Eu sei fazer ___ para ___ através de ___."'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return;
    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const systemPromptWithContext = NARRATIVE_SYSTEM_PROMPT + `\n\nDADOS DO USUÁRIO:\n- Nome: ${profile?.name || 'Usuário'}`;

      const { data, error } = await supabase.functions.invoke('process-voice-dna', {
        body: {
          action: 'narrative_chat',
          messages: newMessages,
          system_prompt: systemPromptWithContext,
          user_id: user.id,
        },
      });

      if (error) throw error;
      const aiResponse = data?.message || '';
      const updatedMessages = [...newMessages, { role: 'assistant' as const, content: aiResponse }];
      setMessages(updatedMessages);

      if (aiResponse.includes('Eu sou uma pessoa que') && aiResponse.includes('Eu acredito que')) {
        setNarrativeDetected(true);
      }
    } catch (err) {
      console.error('Narrative chat error:', err);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveNarrative = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
      const narrativeText = lastAssistant?.content || '';

      await supabase.from('user_narratives').upsert({
        user_id: user.id,
        narrative_text: narrativeText,
        is_completed: true,
      } as any, { onConflict: 'user_id' });

      toast.success('Narrativa Primária salva!');
      onComplete();
    } catch (err) {
      console.error('Save narrative error:', err);
      toast.error('Erro ao salvar narrativa');
    } finally {
      setLoading(false);
    }
  };

  // ===== INTRO =====
  if (step === 'intro') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="text-4xl">📝</div>
          <h2 className="text-xl font-bold text-foreground">
            Última etapa: seu posicionamento
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            A Narrativa Primária é o que faz seu conteúdo ter <strong className="text-foreground">DIREÇÃO</strong>.
            É o que responde: por que alguém deveria te ouvir?
          </p>
          <p className="text-xs text-muted-foreground/70 italic">
            São algumas perguntas. Leva uns 5-8 minutos. O resultado vai guiar todo roteiro que a IA gerar pra você.
          </p>
        </div>
        <div className="space-y-2 pt-2">
          <Button onClick={startChat} className="w-full h-12 rounded-xl text-base font-semibold">Começar</Button>
          <Button variant="ghost" onClick={onSkip} className="w-full rounded-xl text-sm text-muted-foreground">Pular por enquanto</Button>
        </div>
      </div>
    );
  }

  // ===== CHAT =====
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted/40 text-foreground rounded-bl-md'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/40 px-4 py-2.5 rounded-2xl rounded-bl-md">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border/30 pt-3 space-y-2">
        {narrativeDetected && (
          <Button onClick={handleApproveNarrative} className="w-full rounded-xl gap-2" disabled={loading}>
            ✅ Aprovar Narrativa e Continuar
          </Button>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua resposta..."
            className="rounded-xl bg-muted/30 border-border/30 resize-none min-h-[40px] max-h-[80px]"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button size="icon" onClick={sendMessage} disabled={!input.trim() || loading} className="rounded-xl shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
