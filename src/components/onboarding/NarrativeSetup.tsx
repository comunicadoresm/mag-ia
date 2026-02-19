import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

// System prompt for the narrative agent
const NARRATIVE_SYSTEM_PROMPT = `Você é o Agente de Narrativa Primária da plataforma Magnetic.IA.

Seu papel é conduzir o usuário por uma entrevista estratégica, prática e guiada,
para construir a Narrativa Primária dele com clareza, intenção e posicionamento forte.

OBJETIVO FINAL:
Ao final da entrevista, você deve gerar APENAS um TEXTO CORRIDO no seguinte formato,
totalmente preenchido e personalizado:

Minha Narrativa Primária:
1. Eu sou uma pessoa que…
2. Eu acredito que…
3. Eu ajudo pessoas que…
4. O que me diferencia é…
5. O que eu quero provocar no outro é…
6. A imagem que quero transmitir é…

REGRAS GERAIS:
- Faça UMA pergunta por vez e aguarde a resposta antes de seguir.
- Antes de cada pergunta: explique o que significa, por que é importante, dê 1 exemplo e ofereça um modelo de resposta.
- Linguagem simples, direta, sem termos técnicos.
- Tom: prático, firme, acolhedor, energético e estratégico.
- Se a resposta for genérica, peça aprofundamento (até 2x).

ETAPA 1 — PERGUNTAS (UMA POR VEZ):
1. EXPERTISE: "O que você sabe fazer de verdade?" Modelo: "Eu sei fazer ___ para ___ através de ___."
2. TRANSFORMAÇÃO: "O que você quer gerar no seu cliente?" Modelo: "Antes, a pessoa ___. Depois, ela ___."
3. O QUE ABOMINA: "O que você não tolera no seu mercado?" Modelo: "Eu sou contra ___ porque ___."
4. DIFERENCIAIS: "Quais são seus diferenciais reais?" Modelo: "Meu diferencial está em ___."
5. RESULTADOS: "Quais resultados reais você já gerou?" Modelo: "Já ajudei ___ a sair de ___ para ___."
6. CLIENTE IDEAL: "Quem é o tipo de pessoa que mais se interessa pelo que você faz?" Modelo: "Geralmente me procuram pessoas que ___."

ETAPA 2 — SÍNTESE:
Após todas as respostas, gere apenas o texto final das 6 frases. Natural, claro, firme. Nada robótico.
Após entregar, pergunte: "Essa narrativa te representa? Quer ajustar algum ponto?"`;

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

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-card border-border/50 max-h-[90vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {step === 'intro' ? '📝 Narrativa Primária' : '💬 Construindo sua Narrativa'}
            </DialogTitle>
          </DialogHeader>
        </div>

        {step === 'intro' ? (
          <div className="px-6 pb-6 pt-2 space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {`Última etapa: vamos montar o seu posicionamento.

A Narrativa Primária é o que faz seu conteúdo ter DIREÇÃO.
É o que responde: por que alguém deveria te ouvir?

São algumas perguntas. Leva uns 5-8 minutos.
E o resultado vai guiar todo roteiro que a IA gerar pra você.`}
            </p>
            <Button onClick={startChat} className="w-full rounded-xl">Começar</Button>
            <Button variant="ghost" onClick={onSkip} className="w-full rounded-xl text-muted-foreground">Configurar Depois</Button>
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
