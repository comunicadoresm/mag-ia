import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare } from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BottomNavigation } from '@/components/BottomNavigation';
import { MainSidebar } from '@/components/MainSidebar';
import { ConversationItem } from '@/components/ConversationItem';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, Agent } from '@/types';

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  thisWeek: Conversation[];
  older: Conversation[];
}

export default function History() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;

      try {
        // Fetch conversations
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('last_message_at', { ascending: false });

        if (convError) {
          console.error('Error fetching conversations:', convError);
          return;
        }

        // Fetch agents for each conversation
        const agentIds = [...new Set(convData.map((c) => c.agent_id))];
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
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user]);

  const handleConversationClick = (conversation: Conversation) => {
    navigate(`/chat/${conversation.id}`);
  };

  const groupConversations = (conversations: Conversation[]): GroupedConversations => {
    const groups: GroupedConversations = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    conversations.forEach((conv) => {
      const date = new Date(conv.last_message_at);
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const grouped = groupConversations(conversations);

  const renderGroup = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
          {title}
        </h3>
        <div className="space-y-2">
          {items.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              onClick={handleConversationClick}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <MainSidebar />

      <main className="md:ml-64 pb-24 md:pb-8">
        {/* Mobile Header */}
        <header className="md:hidden p-4 border-b border-border">
          <Logo size="sm" />
        </header>

        {/* Content */}
        <div className="p-4 md:p-8 max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Suas conversas
          </h1>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma conversa ainda
              </h3>
              <p className="text-muted-foreground">
                Comece uma conversa com um dos agentes na página inicial.
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
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
