import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';


interface NarrativeSetupProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

// System prompt for the narrative agent (GPT-5 Mini via Lovable AI)
const NARRATIVE_SYSTEM_PROMPT = `Você é o Agente de Narrativa Primária da Imersão Conteúdo na Prática.

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

1) Qual é o seu nome?

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

- Use o documento de GUIA NARRATIVO da sua base de conhecimento para Guiar a sua Comunicação`;

export function NarrativeSetup({ open, onComplete, onSkip }: NarrativeSetupProps) {
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
      // Use Lovable AI to avoid needing an API key
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
      const aiMsg = data?.message || 'Olá! Vamos construir sua Narrativa Primária. Começando pela primeira pergunta...';
      setMessages([{ role: 'assistant', content: aiMsg }]);
    } catch (err) {
      console.error('Narrative start error:', err);
      // Fallback opening message
      setMessages([{
        role: 'assistant',
        content: 'Olá! 👋 Vamos construir sua Narrativa Primária — o posicionamento que vai guiar todo o seu conteúdo.\n\nPrimeira pergunta:\n\n**O que você sabe fazer de verdade?**\n\nNão é cargo, nem título. É o que você entrega na prática.\n\n💡 Modelo: "Eu sei fazer ___ para ___ através de ___."'
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

      // Check if narrative was generated
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
      // Find the narrative text from the last assistant message
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
      const narrativeText = lastAssistant?.content || '';

      // Save to user_narratives
      await supabase.from('user_narratives' as any).upsert({
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

  const ONBOARDING_STEPS = [
    { label: 'Perfil' }, { label: 'DNA de Voz' }, { label: 'Formato' }, { label: 'Narrativa' },
  ];
  const currentOnboardingStep = 3;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md [&>button.absolute]:hidden max-h-[90vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-1 shrink-0">
          {ONBOARDING_STEPS.map((s, i) => (
            <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-1 rounded-full transition-all duration-300 ${
                i < currentOnboardingStep ? 'bg-primary' :
                i === currentOnboardingStep ? 'bg-primary/50' : 'bg-muted'
              }`} />
              <span className={`text-[10px] font-medium hidden sm:block ${
                i === currentOnboardingStep ? 'text-primary' : 'text-muted-foreground/60'
              }`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="mt-2 shrink-0">
          <h2 className="text-lg font-bold text-foreground">
            {step === 'intro' ? '📝 Narrativa Primária' : '💬 Construindo sua Narrativa'}
          </h2>
        </div>

        {step === 'intro' ? (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {`Última etapa: vamos montar o seu posicionamento.\n\nA Narrativa Primária é o que faz seu conteúdo ter DIREÇÃO.\nÉ o que responde: por que alguém deveria te ouvir?\n\nSão algumas perguntas. Leva uns 5-8 minutos.\nE o resultado vai guiar todo roteiro que a IA gerar pra você.`}
            </p>
            <Button onClick={startChat} className="w-full rounded-xl">Começar</Button>
          </div>
        ) : (

          <>
            {/* Chat area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[300px] max-h-[400px]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted/40 text-foreground rounded-bl-md'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-4 [&>p:last-child]:mb-0 [&>ul]:mb-4 [&>li]:mb-1 [&>strong]:text-foreground [&>br+br]:block [&>br+br]:mt-3">
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
            <div className="border-t border-border/30 p-3 shrink-0 space-y-2">
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
