import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, RotateCcw, Send, Paperclip, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatBubble, TypingIndicator } from '@/components/ChatBubble';
import { ChatSidebar } from '@/components/ChatSidebar';
import { IceBreakers } from '@/components/IceBreakers';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Agent, Message } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useCreditsModals } from '@/contexts/CreditsModalContext';
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
  const [inputValue, setInputValue] = useState('');
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { showUpsell } = useCreditsModals();

  // Handle initial message from Home page
  const initialMessage = (location.state as { initialMessage?: string })?.initialMessage;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchConversationData = async () => {
      if (!conversationId || !user) return;

      try {
        // Fetch conversation
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (convError) {
          console.error('Error fetching conversation:', convError);
          navigate('/home');
          return;
        }

        setConversation(convData);

        // Fetch agent
        const { data: agentData, error: agentError } = await supabase
          .from('agents_public')
          .select('*')
          .eq('id', convData.agent_id)
          .single();

        if (!agentError && agentData) {
          setAgent(agentData as Agent);
        }

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at');

        if (!messagesError && messagesData) {
          setMessages(messagesData as Message[]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversationData();
  }, [conversationId, user, navigate]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && !loading && agent && messages.length === 0) {
      handleSend(initialMessage);
      // Clear the state to prevent re-sending
      window.history.replaceState({}, document.title);
    }
  }, [initialMessage, loading, agent, messages.length]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async (content: string) => {
    if (!conversationId || !agent || sending || !content.trim()) return;

    setSending(true);
    setInputValue('');

    try {
      // Insert user message
      const { error: userMsgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: content.trim(),
      });

      if (userMsgError) {
        console.error('Error sending message:', userMsgError);
        toast({
          title: 'Erro ao enviar',
          description: 'Não foi possível enviar sua mensagem.',
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      // Optimistic UI: add the user message immediately
      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content: content.trim(),
        tokens_used: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      // Call AI edge function
      const { error: aiError } = await supabase.functions.invoke('chat', {
        body: {
          conversation_id: conversationId,
          message: content.trim(),
          agent_id: agent.id,
        },
      });

      if (aiError) {
        console.error('Error from AI:', aiError);
        // Check if it's a credits error (402)
        const errorBody = typeof aiError === 'object' && aiError !== null ? (aiError as any) : null;
        const errorMessage = errorBody?.context?.body ? (() => { try { return JSON.parse(errorBody.context.body); } catch { return null; } })() : null;
        
        if (errorMessage?.error === 'insufficient_credits') {
          showUpsell();
          toast({
            title: 'Créditos insuficientes',
            description: errorMessage.message || 'Seus créditos acabaram!',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erro do agente',
            description: 'O agente não conseguiu responder. Tente novamente.',
            variant: 'destructive',
          });
        }
      }

      // Update conversation title if it's the first message
      const userMessages = messages.filter((m) => m.role === 'user');
      if (userMessages.length === 0) {
        const titlePreview = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await supabase
          .from('conversations')
          .update({ title: titlePreview })
          .eq('id', conversationId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = async () => {
    if (!agent || !user) return;

    try {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          agent_id: agent.id,
          title: `Conversa com ${agent.name}`,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }

      navigate(`/chat/${newConv.id}`);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Build display messages including welcome message
  const displayMessages: Message[] = [];
  if (agent?.welcome_message && messages.length === 0) {
    displayMessages.push({
      id: 'welcome',
      conversation_id: conversationId || '',
      role: 'assistant',
      content: agent.welcome_message,
      tokens_used: null,
      created_at: new Date().toISOString(),
    });
  }
  displayMessages.push(...messages);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <ChatSidebar agent={agent} onNewConversation={handleNewConversation} />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-screen md:h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            {/* Mobile back button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/home')}
              className="md:hidden shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <h1 className="font-semibold text-foreground">
              {agent?.name || 'Chat'}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <RotateCcw className="w-5 h-5" />
            </Button>
            
            {/* Mobile history button */}
            <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden text-muted-foreground"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle>Histórico</SheetTitle>
                </SheetHeader>
                <MobileChatHistory 
                  agent={agent} 
                  currentConversationId={conversationId}
                  onConversationSelect={(id) => {
                    setMobileHistoryOpen(false);
                    navigate(`/chat/${id}`);
                  }}
                  onNewConversation={() => {
                    setMobileHistoryOpen(false);
                    handleNewConversation();
                  }}
                />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin pb-4">
          {displayMessages.map((message) => (
            <ChatBubble 
              key={message.id} 
              message={message}
              agentEmoji={agent?.icon_emoji}
            />
          ))}
          
          {/* Ice Breakers - show when no user messages yet */}
          {messages.length === 0 && agent?.ice_breakers && agent.ice_breakers.length > 0 && (
            <IceBreakers
              suggestions={agent.ice_breakers as string[]}
              onSelect={(message) => handleSend(message)}
              disabled={sending}
            />
          )}
          
          {sending && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-background pb-safe">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-muted rounded-xl border border-border p-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Fale com ${agent?.name || 'o agente'}...`}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-sm min-h-[40px] max-h-[120px] py-2 px-2"
                rows={1}
                disabled={sending}
              />
              
              <div className="flex items-center gap-1 shrink-0 pb-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                
                <Button
                  onClick={() => handleSend(inputValue)}
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!inputValue.trim() || sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
