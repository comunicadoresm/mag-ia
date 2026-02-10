import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Check } from 'lucide-react';
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
  isFromTemplate?: boolean;
  onScriptGenerated: (content: Record<string, string>) => void;
  onConversationCreated?: (conversationId: string) => void;
}

export function AIScriptChat({
  isOpen,
  onClose,
  script,
  structure,
  agent,
  isFromTemplate = false,
  onScriptGenerated,
  onConversationCreated,
}: AIScriptChatProps) {
  const { toast } = useToast();
  const { showUpsell } = useCreditsModals();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<string, string> | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(script.conversation_id || null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing conversation messages when opened
  useEffect(() => {
    if (isOpen && !hasLoaded) {
      loadConversation();
    }
  }, [isOpen]);

  // Reset loaded state when script changes
  useEffect(() => {
    setHasLoaded(false);
    setMessages([]);
    setConversationId(script.conversation_id || null);
    setGeneratedContent(null);
  }, [script.id]);

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

  const loadConversation = async () => {
    setIsLoading(true);
    try {
      const existingConvId = script.conversation_id;

      if (existingConvId) {
        // Load existing messages
        const { data: dbMessages, error } = await supabase
          .from('messages')
          .select('id, role, content')
          .eq('conversation_id', existingConvId)
          .order('created_at', { ascending: true });

        if (!error && dbMessages && dbMessages.length > 0) {
          setMessages(dbMessages.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })));
          setConversationId(existingConvId);
          setHasLoaded(true);
          setIsLoading(false);
          return;
        }
      }

      // No existing conversation — initialize with AI
      await initializeChat();
    } catch (error) {
      console.error('Error loading conversation:', error);
      await initializeChat();
    } finally {
      setHasLoaded(true);
      setIsLoading(false);
    }
  };

  const createConversation = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !agent) return null;

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          agent_id: agent.id,
          title: `Roteiro: ${script.title}`,
        })
        .select('id')
        .single();

      if (error) throw error;

      const convId = data.id;

      // Link conversation to script
      await supabase
        .from('user_scripts')
        .update({ conversation_id: convId })
        .eq('id', script.id);

      setConversationId(convId);
      onConversationCreated?.(convId);
      return convId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const saveMessage = async (convId: string, role: 'user' | 'assistant', content: string) => {
    try {
      await supabase.from('messages').insert({
        conversation_id: convId,
        role,
        content,
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const initializeChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');

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
          is_from_template: isFromTemplate,
          messages: [],
        },
      });

      if (error) throw error;

      if (data?.message) {
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message,
        };
        setMessages([assistantMsg]);

        // Create conversation and save the first message
        const convId = await createConversation();
        if (convId) {
          await saveMessage(convId, 'assistant', data.message);
        }
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      const welcomeMessage = agent?.welcome_message ||
        `Olá! Vou te ajudar a criar o roteiro "${script.title}". Para começar, me conte um pouco mais sobre o que você quer comunicar nesse vídeo.`;

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: welcomeMessage,
      };
      setMessages([assistantMsg]);

      const convId = await createConversation();
      if (convId) {
        await saveMessage(convId, 'assistant', welcomeMessage);
      }
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

    // Save user message
    let activeConvId = conversationId;
    if (!activeConvId) {
      activeConvId = await createConversation();
    }
    if (activeConvId) {
      await saveMessage(activeConvId, 'user', userMessage.content);
    }

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
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message,
        };
        setMessages(prev => [...prev, assistantMsg]);

        // Save assistant message
        if (activeConvId) {
          await saveMessage(activeConvId, 'assistant', data.message);
        }
      }

      if (data?.script_content) {
        setGeneratedContent(data.script_content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMsg = error instanceof Error ? error.message : 'Tente novamente.';
      const isTimeout = errorMsg.includes('demorou') || errorMsg.includes('timeout') || errorMsg.includes('Failed to fetch');
      toast({
        title: isTimeout ? 'A IA demorou para responder' : 'Erro ao enviar mensagem',
        description: isTimeout ? 'Tente novamente com uma mensagem mais curta.' : errorMsg,
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
      onClose(); // Don't reset messages — they persist in DB
      toast({ title: 'Roteiro aplicado com sucesso!' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
