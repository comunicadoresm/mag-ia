import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare, Search } from 'lucide-react';
import { isToday, isYesterday, isThisWeek } from 'date-fns';
import { AppLayout } from '@/components/AppLayout';
import { ConversationItem } from '@/components/ConversationItem';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [agents, setAgents] = useState<Agent[]>([]);
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
        const uniqueAgents = Array.from(agentsMap.values());
        setAgents(uniqueAgents);
        setConversations(convData.map((conv) => ({ ...conv, agent: agentsMap.get(conv.agent_id) })) as Conversation[]);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchConversations();
  }, [user]);

  const handleConversationClick = (conversation: Conversation) => navigate(`/chat/${conversation.id}`);

  // AJUSTE 11: Filter conversations by search and agent
  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    if (agentFilter !== 'all') {
      filtered = filtered.filter(c => c.agent_id === agentFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        (c.title?.toLowerCase().includes(q)) ||
        (c.agent?.name?.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [conversations, searchQuery, agentFilter]);

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

  const grouped = groupConversations(filteredConversations);

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
          {/* AJUSTE 11: Search and filter */}
          {conversations.length > 0 && (
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar conversa..."
                  className="pl-9 bg-muted/30 border-border/30 rounded-xl"
                />
              </div>
              {agents.length > 1 && (
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="w-48 bg-muted/30 border-border/30 rounded-xl">
                    <SelectValue placeholder="Todos os agentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os agentes</SelectItem>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.icon_emoji || '🤖'} {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

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
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma conversa encontrada para essa busca.</p>
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
