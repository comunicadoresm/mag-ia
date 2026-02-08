import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Agent } from '@/types';
import { UserScript, ScriptStructure } from '@/types/kanban';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCreditsModals } from '@/contexts/CreditsModalContext';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIScriptChatProps {
  isOpen: boolean;
  onClose: () => void;
  script: UserScript;
  structure: ScriptStructure | null;
  agent: Agent | null;
  onScriptGenerated: (content: Record<string, string>) => void;
}

export function AIScriptChat({
  isOpen,
  onClose,
  script,
  structure,
  agent,
  onScriptGenerated,
}: AIScriptChatProps) {
  const { toast } = useToast();
  const { showUpsell } = useCreditsModals();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize chat with agent's welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const initializeChat = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      // Call edge function to start the conversation
      const { data, error } = await supabase.functions.invoke('generate-script-chat', {
        body: {
          action: 'start',
          script: {
            title: script.title,
            theme: script.theme,
            style: script.style,
            format: script.format,
            objective: script.objective,
          },
          agent_id: agent?.id,
          messages: [],
        },
      });

      if (error) throw error;

      if (data?.message) {
        setMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message,
        }]);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      // Fallback welcome message
      const welcomeMessage = agent?.welcome_message || 
        `Olá! Vou te ajudar a criar o roteiro "${script.title}". Para começar, me conte um pouco mais sobre o que você quer comunicar nesse vídeo.`;
      
      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: welcomeMessage,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      const allMessages = [...messages, userMessage];

      const { data, error } = await supabase.functions.invoke('generate-script-chat', {
        body: {
          action: 'chat',
          script: {
            title: script.title,
            theme: script.theme,
            style: script.style,
            format: script.format,
            objective: script.objective,
          },
          structure: structure,
          agent_id: agent?.id,
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) {
        // Check for insufficient credits
        const errorBody = typeof error === 'object' && error !== null ? (error as any) : null;
        const errorMessage = errorBody?.context?.body ? (() => { try { return JSON.parse(errorBody.context.body); } catch { return null; } })() : null;
        if (errorMessage?.error === 'insufficient_credits') {
          showUpsell();
          toast({ title: 'Créditos insuficientes', description: errorMessage.message || 'Seus créditos acabaram!', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      if (data?.message) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message,
        }]);
      }

      // Check if script was generated
      if (data?.script_content) {
        setGeneratedContent(data.script_content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleApplyScript = () => {
    if (generatedContent) {
      onScriptGenerated(generatedContent);
      handleClose();
      toast({ title: 'Roteiro aplicado com sucesso!' });
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInput('');
    setGeneratedContent(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] max-h-[700px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              {agent?.icon_emoji ? (
                <span className="text-lg">{agent.icon_emoji}</span>
              ) : (
                <Sparkles className="w-4 h-4 text-primary" />
              )}
            </div>
            <div>
              <span className="text-base font-semibold">
                {agent?.name || 'Assistente de Roteiros'}
              </span>
              <p className="text-xs text-muted-foreground font-normal">
                Gerando: {script.title}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Generated Script Preview */}
            {generatedContent && (
              <div className="bg-success/10 border border-success/30 rounded-xl p-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-success" />
                  <span className="font-semibold text-success">Roteiro Gerado!</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  O roteiro foi criado com base na nossa conversa. Clique em "Aplicar" para preencher os campos automaticamente.
                </p>
                <Button onClick={handleApplyScript} className="w-full gap-2">
                  <Check className="w-4 h-4" />
                  Aplicar Roteiro
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="px-6 py-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              disabled={isLoading || !!generatedContent}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading || !!generatedContent}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Responda as perguntas para gerar seu roteiro personalizado
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
