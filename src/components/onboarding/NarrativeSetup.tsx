import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
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
      const aiMsg = data?.message || 'Olá! Vamos construir sua Narrativa Primária.';
      setMessages([{ role: 'assistant', content: aiMsg }]);
    } catch {
      setMessages([{
        role: 'assistant',
        content: `${profile?.name || 'Usuário'}, me conta: o que você sabe fazer de verdade?`
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
        body: { action: 'narrative_chat', messages: newMessages, system_prompt: systemPromptWithContext, user_id: user.id },
      });
      if (error) throw error;
      const aiResponse = data?.message || '';
      const updatedMessages = [...newMessages, { role: 'assistant' as const, content: aiResponse }];
      setMessages(updatedMessages);
      if (aiResponse.includes('Eu sou uma pessoa que') && aiResponse.includes('Eu acredito que')) {
        setNarrativeDetected(true);
      }
    } catch {
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
      await supabase.from('user_narratives' as any).upsert({
        user_id: user.id,
        narrative_text: narrativeText,
        is_completed: true,
      } as any, { onConflict: 'user_id' });
      toast.success('Narrativa Primária salva!');
      onComplete();
    } catch {
      toast.error('Erro ao salvar narrativa');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="flex flex-col w-full animate-fade-in">
      {/* Header */}
      <div className="px-6 pt-7 pb-2 shrink-0">
        <div className="flex gap-1.5 mb-5">
          <div className="flex-1 h-1 rounded-sm bg-[#FAFC59]" />
          <div className="flex-1 h-1 rounded-sm bg-[#FAFC59]" />
          <div className="flex-1 h-1 rounded-sm bg-[#FAFC59]" />
        </div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[10px] bg-[#FAFC59]/15 flex items-center justify-center text-lg">📖</div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FAFC59]">
              Etapa 3 · Narrativa Primária
            </span>
          </div>
          <button onClick={onSkip} className="text-xs text-[#666] hover:text-[#999] transition-colors px-2 py-1 rounded-md">
            Pular
          </button>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#fafafa] mt-3 leading-tight">
          Vamos construir sua história
        </h2>
        <p className="text-sm text-[#999] mt-1 leading-relaxed">
          Uma conversa guiada de 6 perguntas pra extrair seu posicionamento único. No final, a IA gera sua Narrativa Primária — o fio condutor de todo o seu conteúdo.
        </p>
      </div>

      {step === 'intro' ? (
        <div className="px-6 pb-7 mt-6 space-y-3">
          <button
            onClick={startChat}
            className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 transition-all duration-200"
          >
            Começar conversa →
          </button>
          <button onClick={onSkip} className="w-full py-3 text-sm text-[#666] hover:text-[#999] transition-colors">
            Configurar depois
          </button>
        </div>
      ) : (
        <>
          {/* Chat area com altura máxima para o popup */}
          <div ref={scrollRef} className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: '300px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#FAFC59] text-[#141414] rounded-br-md'
                    : 'bg-white/[0.07] text-[#fafafa] rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 bg-[#FAFC59]/15 rounded text-[9px] font-bold uppercase tracking-wider text-[#FAFC59]">
                      🧲 MAG-IA
                    </div>
                  )}
                  <div className={`text-[13px] leading-relaxed ${msg.role === 'user' ? '' : 'prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0'}`}>
                    {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.07] px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#666] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#666] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#666] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {narrativeDetected && (
            <div className="px-5 pb-2">
              <button
                onClick={handleApproveNarrative}
                disabled={loading}
                className="w-full py-3 px-4 bg-[#22c55e] text-white rounded-full font-bold text-sm disabled:opacity-40 transition-all"
              >
                ✅ Aprovar Narrativa e Continuar
              </button>
            </div>
          )}

          <div className="px-5 pb-6 pt-2 shrink-0">
            <div className="flex items-center gap-2 bg-white/[0.07] border border-white/[0.06] rounded-full px-4 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua resposta..."
                className="flex-1 bg-transparent text-[#fafafa] text-sm placeholder:text-[#666] outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-full bg-[#FAFC59] flex items-center justify-center disabled:opacity-30 transition-opacity shrink-0"
              >
                <Send className="w-4 h-4 text-[#141414]" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
