import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Loader2, Copy, ArrowLeft } from 'lucide-react';
import { isToday, isYesterday, isThisWeek } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  thisWeek: Conversation[];
  older: Conversation[];
}

interface ChatSidebarProps {
  agent: Agent | null;
  onNewConversation: () => void;
}

export function ChatSidebar({ agent, onNewConversation }: ChatSidebarProps) {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user || !agent) return;

      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('agent_id', agent.id)
          .order('last_message_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching conversations:', error);
          return;
        }

        setConversations(data as Conversation[]);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, agent]);

  const groupConversations = (conversations: Conversation[]): GroupedConversations => {
    const groups: GroupedConversations = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    conversations.forEach((conv) => {
      const date = new Date(conv.last_message_at || conv.created_at);
      if (isToday(date)) {
        groups.today.push(conv);
      } else if (isYesterday(date)) {
        groups.yesterday.push(conv);
      } else if (isThisWeek(date)) {
        groups.thisWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  const handleConversationClick = (conversation: Conversation) => {
    navigate(`/chat/${conversation.id}`);
  };

  const grouped = groupConversations(conversations);

  const renderGroup = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="text-xs font-medium text-muted-foreground mb-2 px-3">
          {title}
        </h3>
        <div className="space-y-0.5">
          {items.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleConversationClick(conv)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors truncate",
                conv.id === conversationId
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {conv.title || 'Nova conversa'}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-secondary border-r border-border h-screen">
      {/* Back to Home */}
      <div className="p-3 border-b border-border">
        <Button
          variant="ghost"
          onClick={() => navigate('/home')}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos Agentes
        </Button>
      </div>

      {/* Agent Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl shrink-0">
            {agent?.icon_emoji || '🤖'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">
              {agent?.name || 'Agente'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New Conversation Button */}
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNewConversation}
          variant="outline"
          className="w-full justify-start gap-2 bg-muted/50 border-border"
        >
          <Plus className="h-4 w-4" />
          Nova conversa
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma conversa ainda
            </p>
          </div>
        ) : (
          <>
            {renderGroup('Hoje', grouped.today)}
            {renderGroup('Ontem', grouped.yesterday)}
            {renderGroup('Esta semana', grouped.thisWeek)}
            {renderGroup('Mais antigas', grouped.older)}
          </>
        )}
      </ScrollArea>
    </aside>
  );
}
