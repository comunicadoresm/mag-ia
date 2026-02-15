import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare } from 'lucide-react';
import { isToday, isYesterday, isThisWeek } from 'date-fns';
import { AppLayout } from '@/components/AppLayout';
import { ConversationItem } from '@/components/ConversationItem';
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
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;
      try {
        const { data: convData, error: convError } = await supabase
          .from('conversations').select('*').eq('user_id', user.id).order('last_message_at', { ascending: false });
        if (convError) { console.error(convError); return; }
        const agentIds = [...new Set(convData.map((c) => c.agent_id))];
        const { data: agentsData } = await supabase.from('agents_public').select('*').in('id', agentIds);
        const agentsMap = new Map(agentsData?.map((a) => [a.id, a as Agent]));
        setConversations(convData.map((conv) => ({ ...conv, agent: agentsMap.get(conv.agent_id) })) as Conversation[]);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchConversations();
  }, [user]);

  const handleConversationClick = (conversation: Conversation) => navigate(`/chat/${conversation.id}`);

  const groupConversations = (convs: Conversation[]): GroupedConversations => {
    const groups: GroupedConversations = { today: [], yesterday: [], thisWeek: [], older: [] };
    convs.forEach((conv) => {
      const date = new Date(conv.last_message_at);
      if (isToday(date)) groups.today.push(conv);
      else if (isYesterday(date)) groups.yesterday.push(conv);
      else if (isThisWeek(date)) groups.thisWeek.push(conv);
      else groups.older.push(conv);
    });
    return groups;
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  const grouped = groupConversations(conversations);

  const renderGroup = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">{title}</h3>
        <div className="space-y-2">
          {items.map((conv) => <ConversationItem key={conv.id} conversation={conv} onClick={handleConversationClick} />)}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Histórico</h1>
              <p className="text-xs text-muted-foreground">Suas conversas anteriores</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-6 pb-24 md:pb-6">
        <div className="max-w-[1600px] mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma conversa ainda</h3>
              <p className="text-muted-foreground">Comece uma conversa com um dos agentes na página de agentes.</p>
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
      </div>
    </AppLayout>
  );
}
