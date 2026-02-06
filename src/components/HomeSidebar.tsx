import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Loader2, LayoutGrid } from 'lucide-react';
import { isToday, isYesterday, isThisWeek } from 'date-fns';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  thisWeek: Conversation[];
  older: Conversation[];
}

interface HomeSidebarProps {
  onNewChat: () => void;
}

export function HomeSidebar({ onNewChat }: HomeSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;

      try {
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('last_message_at', { ascending: false })
          .limit(50);

        if (convError) {
          console.error('Error fetching conversations:', convError);
          return;
        }

        // Fetch agents for each conversation
        const agentIds = [...new Set(convData.map((c) => c.agent_id))];
        if (agentIds.length > 0) {
          const { data: agentsData } = await supabase
            .from('agents_public')
            .select('*')
            .in('id', agentIds);

          const agentsMap = new Map(agentsData?.map((a) => [a.id, a as Agent]));

          const conversationsWithAgents = convData.map((conv) => ({
            ...conv,
            agent: agentsMap.get(conv.agent_id),
          })) as Conversation[];

          setConversations(conversationsWithAgents);
        } else {
          setConversations([]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

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
              className="w-full text-left px-3 py-2 text-sm text-foreground/80 hover:bg-muted rounded-lg transition-colors truncate"
            >
              {conv.title || conv.agent?.name || 'Nova conversa'}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-secondary border-r border-border h-screen fixed left-0 top-0">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <Logo size="sm" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-border">
        <button
          onClick={() => navigate('/kanban')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card hover:bg-muted transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground">Kanban</span>
        </button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
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
