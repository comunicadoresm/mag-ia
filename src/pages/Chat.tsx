import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatBubble, TypingIndicator } from '@/components/ChatBubble';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { IceBreakers } from '@/components/IceBreakers';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Agent, Message } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useCreditsModals } from '@/contexts/CreditsModalContext';
import { useCredits } from '@/hooks/useCredits';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MobileChatHistory } from '@/components/MobileChatHistory';

export default function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const location = useLocation();
  const [_conversation, setConversation] = useState<{ id: string; agent_id: string } | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { showUpsell, showBuyCredits } = useCreditsModals();
  const { balance } = useCredits();

  const initialMessage = (location.state as { initialMessage?: string })?.initialMessage;

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchConversationData = async () => {
      if (!conversationId || !user) return;
      try {
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (convError) { navigate('/home'); return; }
        setConversation(convData);

        const { data: agentData, error: agentError } = await supabase
          .from('agents_public')
          .select('*')
          .eq('id', convData.agent_id)
          .single();
        if (!agentError && agentData) setAgent(agentData as Agent);

        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at');
        if (!messagesError && messagesData) setMessages(messagesData as Message[]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConversationData();
  }, [conversationId, user, navigate]);

  useEffect(() => {
    if (initialMessage && !loading && agent && messages.length === 0) {
      handleSend(initialMessage);
      window.history.replaceState({}, document.title);
    }
  }, [initialMessage, loading, agent, messages.length]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [inputValue]);

  const refetchMessages = async () => {
    if (!conversationId) return;
    const { data, error } = await supabase
      .from('messages').select('*').eq('conversation_id', conversationId).order('created_at');
    if (!error && data) setMessages(data as Message[]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Validate size (20MB max)
    const validFiles = files.filter(f => {
      if (f.size > 20 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: `${f.name} excede 20MB`, variant: 'destructive' });
        return false;
      }
      return true;
    });
    setAttachedFiles(prev => [...prev, ...validFiles].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (content: string) => {
    if (!conversationId || !agent || sending || (!content.trim() && attachedFiles.length === 0)) return;

    // Pre-check credits before sending
    if (balance.total <= 0) {
      showBuyCredits();
      return;
    }

    setSending(true);
    setInputValue('');

    // Build message content with file names if attached
    let messageContent = content.trim();
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map(f => f.name).join(', ');
      messageContent = messageContent
        ? `${messageContent}\n\n📎 Arquivos: ${fileNames}`
        : `📎 Arquivos: ${fileNames}`;
    }
    setAttachedFiles([]);

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content: messageContent,
      tokens_used: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { error: userMsgError } = await supabase.from('messages').insert({
        conversation_id: conversationId, role: 'user', content: messageContent,
      });

      if (userMsgError) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        toast({ title: 'Erro ao enviar', description: 'Não foi possível enviar sua mensagem.', variant: 'destructive' });
        setSending(false);
        return;
      }

      // Get auth token for raw fetch
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: 'Sessão expirada', description: 'Faça login novamente.', variant: 'destructive' });
        setSending(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: messageContent,
          agent_id: agent.id,
          stream: true,
        }),
      });

      if (!response.ok) {
        let parsedError: any = null;
        try { parsedError = await response.json(); } catch {}
        if (parsedError?.error === 'insufficient_credits' || parsedError?.error === 'no_credits') {
          showUpsell();
          toast({ title: 'Créditos insuficientes', description: parsedError.message || 'Seus créditos acabaram!', variant: 'destructive' });
        } else {
          toast({ title: 'Erro do agente', description: 'O agente não conseguiu responder. Tente novamente.', variant: 'destructive' });
        }
        await refetchMessages();
        return;
      }

      const contentType = response.headers.get('Content-Type') || '';

      if (contentType.includes('text/event-stream') && response.body) {
        // STREAMING RESPONSE
        const streamingMsgId = `streaming-${Date.now()}`;
        setStreaming(true);
        setMessages(prev => [...prev, {
          id: streamingMsgId,
          conversation_id: conversationId!,
          role: 'assistant' as const,
          content: '',
          tokens_used: null,
          created_at: new Date().toISOString(),
        }]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        let streamedText = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const sseLines = sseBuffer.split('\n');
            sseBuffer = sseLines.pop() || '';

            for (const line of sseLines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.t) {
                    streamedText += data.t;
                    setMessages(prev => prev.map(m =>
                      m.id === streamingMsgId ? { ...m, content: streamedText } : m
                    ));
                  } else if (data.error) {
                    toast({ title: 'Erro', description: data.error, variant: 'destructive' });
                  }
                } catch {}
              }
            }
          }
        } catch (streamErr) {
          console.error('Stream read error:', streamErr);
        } finally {
          setStreaming(false);
        }

        await refetchMessages();
      } else {
        // NON-STREAMING FALLBACK (JSON response)
        try {
          const aiData = await response.json();
          if (aiData.error) {
            toast({ title: 'Erro do agente', description: 'O agente não conseguiu responder.', variant: 'destructive' });
          }
        } catch {}
        await refetchMessages();
      }

      const userMessages = messages.filter((m) => m.role === 'user');
      if (userMessages.length === 0) {
        const titlePreview = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await supabase.from('conversations').update({ title: titlePreview }).eq('id', conversationId);
      }
    } catch (error) {
      toast({ title: 'Erro inesperado', description: 'Tente novamente em alguns instantes.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = async () => {
    if (!agent || !user) return;
    try {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, agent_id: agent.id, title: `Conversa com ${agent.name}` })
        .select().single();
      if (!error) navigate(`/chat/${newConv.id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="hidden md:flex flex-col w-72 border-r border-border/50 p-4 gap-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-5/6 rounded-lg" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full space-y-6">
            <div className="flex gap-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-48 rounded-2xl" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
          <div className="p-4">
            <Skeleton className="h-12 w-full max-w-3xl mx-auto rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const displayMessages: Message[] = [];
  if (agent?.welcome_message && messages.length === 0) {
    displayMessages.push({
      id: 'welcome', conversation_id: conversationId || '', role: 'assistant',
      content: agent.welcome_message, tokens_used: null, created_at: new Date().toISOString(),
    });
  }
  displayMessages.push(...messages);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar - collapsible */}
      <ChatSidebar
        agent={agent}
        onNewConversation={handleNewConversation}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <ErrorBoundary>
      <main className="flex-1 flex flex-col h-screen">
        {/* Minimal Header */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="md:hidden shrink-0 h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-base">{agent?.icon_emoji || '🤖'}</span>
              <h1 className="font-medium text-foreground text-sm">{agent?.name || 'Chat'}</h1>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleNewConversation}>
              <Plus className="w-4 h-4" />
            </Button>
            <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-muted-foreground">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle>Histórico</SheetTitle>
                </SheetHeader>
                <MobileChatHistory
                  agent={agent}
                  currentConversationId={conversationId}
                  onConversationSelect={(id) => { setMobileHistoryOpen(false); navigate(`/chat/${id}`); }}
                  onNewConversation={() => { setMobileHistoryOpen(false); handleNewConversation(); }}
                />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Messages - centered like ChatGPT */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
            {displayMessages.map((message) => (
              <ChatBubble key={message.id} message={message} agentEmoji={agent?.icon_emoji} />
            ))}

            {messages.length === 0 && agent?.ice_breakers && agent.ice_breakers.length > 0 && (
              <IceBreakers
                suggestions={agent.ice_breakers as string[]}
                onSelect={(message) => handleSend(message)}
                disabled={sending}
              />
            )}

            {sending && !streaming && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - centered, floating style */}
        <div className="p-3 md:p-4 bg-background">
          <div className="max-w-3xl mx-auto">
            {/* Attached files preview */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-1">
                {attachedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-muted rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="hover:text-foreground ml-0.5">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 bg-muted/60 rounded-2xl border border-border/50 px-3 py-2 focus-within:border-primary/40 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Mensagem para ${agent?.name || 'o agente'}...`}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-sm min-h-[24px] max-h-[160px] py-1.5"
                rows={1}
                disabled={sending}
              />

              <Button
                onClick={() => handleSend(inputValue)}
                size="icon"
                className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 disabled:opacity-30"
                disabled={(!inputValue.trim() && attachedFiles.length === 0) || sending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
              Magnetic.IA pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </div>
      </main>
      </ErrorBoundary>
    </div>
  );
}
