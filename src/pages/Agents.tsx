import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, LayoutGrid, BookOpen, Users, Tag } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { BottomNavigation } from '@/components/BottomNavigation';
import { MainSidebar } from '@/components/MainSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Agent, Tag as TagType } from '@/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [agentTags, setAgentTags] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, tagsRes, agentTagsRes] = await Promise.all([
          supabase.from('agents_public').select('*').order('display_order'),
          supabase.from('tags').select('*').order('display_order'),
          supabase.from('agent_tags').select('*'),
        ]);
        if (agentsRes.error) { console.error(agentsRes.error); return; }
        setAgents(agentsRes.data as Agent[]);
        setTags((tagsRes.data || []) as TagType[]);
        const tagsMap: Record<string, string[]> = {};
        (agentTagsRes.data || []).forEach((at: any) => {
          if (!tagsMap[at.agent_id]) tagsMap[at.agent_id] = [];
          tagsMap[at.agent_id].push(at.tag_id);
        });
        setAgentTags(tagsMap);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  const { showUpsell } = useCreditsModals();

  const handleAgentClick = async (agent: Agent) => {
    if (!user) return;

    // Check if user has access based on plan
    const userPlan = profile?.plan_type || 'none';
    const access = (agent as any).plan_access || 'magnetic';
    const hasAccess = access === 'all' || access === userPlan;

    if (!hasAccess && balance.total <= 0) {
      showUpsell();
      return;
    }

    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, agent_id: agent.id, title: `Conversa com ${agent.name}` })
        .select().single();
      if (error) { console.error(error); return; }
      navigate(`/chat/${conversation.id}`);
    } catch (error) { console.error(error); }
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === null || (agentTags[agent.id] && agentTags[agent.id].includes(activeTag));
    return matchesSearch && matchesTag;
  });

  const tagsWithAgents = new Set<string>();
  agents.forEach((agent) => { agentTags[agent.id]?.forEach((tagId) => tagsWithAgents.add(tagId)); });
  const visibleTags = tags.filter((tag) => tagsWithAgents.has(tag.id));

  const getTitle = () => {
    if (activeTag === null) return 'Todos os Agentes';
    const tag = tags.find((t) => t.id === activeTag);
    return tag ? tag.name : 'Todos os Agentes';
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <MainSidebar tags={visibleTags} activeTag={activeTag} onTagChange={setActiveTag} showTagFilter={true} />
      <main className="md:ml-64 min-h-screen pb-24 md:pb-8">
        <header className="md:hidden p-4 border-b border-border"><Logo size="sm" /></header>
        <div className="md:hidden px-4 py-3 border-b border-border overflow-x-auto">
          <div className="flex gap-2">
            <button onClick={() => setActiveTag(null)} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors", activeTag === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>Todos</button>
            {visibleTags.map((tag) => (
              <button key={tag.id} onClick={() => setActiveTag(tag.id)} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors", activeTag === tag.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{tag.name}</button>
            ))}
          </div>
        </div>
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">I.A's Magnéticas</h1>
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou descrição do agente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted border-border" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-4">{getTitle()}</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12"><p className="text-muted-foreground">Nenhum agente encontrado.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAgents.map((agent) => (
                <button key={agent.id} onClick={() => handleAgentClick(agent)} className="card-cm-interactive p-5 text-left group">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="icon-circle text-2xl shrink-0">{agent.icon_emoji || '🤖'}</div>
                    <div className="min-w-0 flex-1"><h3 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{agent.name}</h3></div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{agent.description || 'Sem descrição'}</p>
                  <div className="flex flex-wrap gap-2">
                    {agentTags[agent.id]?.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId);
                      return tag ? <span key={tagId} className="text-xs px-3 py-1 rounded-full border border-primary/40 text-primary font-medium">{tag.name}</span> : null;
                    })}
                    {(!agentTags[agent.id] || agentTags[agent.id].length === 0) && <span className="text-xs px-3 py-1 rounded-full border border-primary/40 text-primary font-medium">IA</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}
