import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, Bot, Lock, Filter, X } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCreditsModals } from '@/contexts/CreditsModalContext';
import { useCredits } from '@/hooks/useCredits';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';
import { Agent, Tag as TagType } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [agentTags, setAgentTags] = useState<Record<string, string[]>>({});
  const [agentPlanAccess, setAgentPlanAccess] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { balance } = useCredits();
  const { userPlan } = usePlanPermissions();

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, tagsRes, agentTagsRes, planAccessRes] = await Promise.all([
          supabase.from('agents_public').select('*').neq('slug', 'first-script-onboarding').order('display_order'),
          supabase.from('tags').select('*').order('display_order'),
          supabase.from('agent_tags').select('*'),
          supabase.from('agent_plan_access').select('agent_id, plan_type_id'),
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
        // Store plan access map
        const accessMap: Record<string, string[]> = {};
        (planAccessRes.data || []).forEach((pa: any) => {
          if (!accessMap[pa.agent_id]) accessMap[pa.agent_id] = [];
          accessMap[pa.agent_id].push(pa.plan_type_id);
        });
        setAgentPlanAccess(accessMap);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    if (user) fetchData();
  }, [user]);

  const { showUpsell, showBuyCredits } = useCreditsModals();

  const handleAgentClick = async (agent: Agent) => {
    if (!user) return;
    // Check plan access using agent_plan_access table
    const accessList = agentPlanAccess[agent.id];
    if (accessList && accessList.length > 0 && userPlan) {
      if (!accessList.includes(userPlan.id)) { showUpsell(); return; }
    }
    if (accessList && accessList.length > 0 && !userPlan) { showUpsell(); return; }
    // Check credits before starting conversation
    if (balance.total <= 0) {
      showBuyCredits();
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
    <AppLayout tags={visibleTags} activeTag={activeTag} onTagChange={setActiveTag} showTagFilter>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">I.A's Magnéticas</h1>
              <p className="text-xs text-muted-foreground">Escolha um agente para conversar</p>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile tag filter */}
      <div className="md:hidden px-4 py-3 border-b border-border overflow-x-auto">
        <div className="flex gap-2">
          <button onClick={() => setActiveTag(null)} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors", activeTag === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>Todos</button>
          {visibleTags.map((tag) => (
            <button key={tag.id} onClick={() => setActiveTag(tag.id)} className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors", activeTag === tag.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{tag.name}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-6 pb-24 md:pb-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Search + Filter */}
          <div className="mb-6 flex items-center gap-3">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou descrição do agente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-muted border-border" />
            </div>

            {/* Category filter popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-xs rounded-lg text-muted-foreground hover:text-foreground relative shrink-0"
                >
                  <Filter className="w-4 h-4 mr-1.5" />
                  Categorias
                  {activeTag !== null && (
                    <span className="ml-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      1
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 z-50 bg-popover border border-border shadow-lg" align="end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Categorias</span>
                    {activeTag !== null && (
                      <button
                        onClick={() => setActiveTag(null)}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setActiveTag(null)}
                      className={cn(
                        "text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide transition-all border",
                        activeTag === null
                          ? "bg-primary text-primary-foreground border-transparent"
                          : "text-muted-foreground border-border bg-muted/50 hover:border-primary/30"
                      )}
                    >
                      Todos
                    </button>
                    {visibleTags.map((tag) => {
                      const active = activeTag === tag.id;
                      const hex = (tag.color || '#6B7280').replace('#', '');
                      const r = parseInt(hex.substring(0, 2), 16);
                      const g = parseInt(hex.substring(2, 4), 16);
                      const b = parseInt(hex.substring(4, 6), 16);
                      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                      const textColor = luminance > 0.55 ? '#1a1a1a' : '#ffffff';
                      return (
                        <button
                          key={tag.id}
                          onClick={() => setActiveTag(active ? null : tag.id)}
                          className={cn(
                            "text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide transition-all border",
                            active
                              ? "border-transparent"
                              : "text-muted-foreground border-border bg-muted/50 hover:border-primary/30"
                          )}
                          style={active ? { backgroundColor: tag.color || '#6B7280', color: textColor } : undefined}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-4">{getTitle()}</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12"><p className="text-muted-foreground">Nenhum agente encontrado.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAgentClick(agent)}
                  className="relative bg-gradient-to-br from-muted/80 to-muted/30 border border-border/30 rounded-2xl p-4 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:border-primary/40 transition-all duration-200 group overflow-hidden text-left"
                >
                  {(() => {
                    const accessList = agentPlanAccess[agent.id];
                    const isLocked = accessList && accessList.length > 0 && (!userPlan || !accessList.includes(userPlan.id));
                    return isLocked ? (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    ) : null;
                  })()}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-2xl shrink-0">
                      {agent.icon_emoji || '🤖'}
                    </div>
                    <h4 className="font-bold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors min-w-0 flex-1">
                      {agent.name}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{agent.description || 'Sem descrição'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {agentTags[agent.id]?.map((tagId) => {
                      const tag = tags.find((t) => t.id === tagId);
                      if (!tag) return null;
                      const hex = (tag.color || '#6B7280').replace('#', '');
                      const r = parseInt(hex.substring(0, 2), 16);
                      const g = parseInt(hex.substring(2, 4), 16);
                      const b = parseInt(hex.substring(4, 6), 16);
                      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                      const textColor = luminance > 0.55 ? '#1a1a1a' : '#ffffff';
                      return (
                        <span key={tagId} className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide" style={{ backgroundColor: tag.color || '#6B7280', color: textColor }}>
                          {tag.name}
                        </span>
                      );
                    })}
                    {(!agentTags[agent.id] || agentTags[agent.id].length === 0) && (
                      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide bg-muted-foreground/30 text-foreground">IA</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
