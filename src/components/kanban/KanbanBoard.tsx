import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { KanbanColumn } from './KanbanColumn';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScriptEditor } from './ScriptEditor';
import { MetricsModal } from './MetricsModal';
import { PostedModal } from './PostedModal';
import { NewCardDialog } from './NewCardDialog';
import { 
  ScriptTemplate, 
  UserScript, 
  KanbanColumn as KanbanColumnType,
  KANBAN_COLUMNS,
  ScriptStatus,
  ScriptStructure 
} from '@/types/kanban';
import { Agent } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCredits } from '@/hooks/useCredits';
import { useCreditsModals } from '@/contexts/CreditsModalContext';

interface KanbanBoardProps {
  agents: Agent[];
}

export function KanbanBoard({ agents }: KanbanBoardProps) {
  const { toast } = useToast();
  const { balance } = useCredits();
  const { showBuyCredits } = useCreditsModals();
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [userScripts, setUserScripts] = useState<UserScript[]>([]);
  
  // Editor state
  const [selectedScript, setSelectedScript] = useState<UserScript | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<ScriptStructure | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isFromTemplate, setIsFromTemplate] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Metrics state
  const [metricsScript, setMetricsScript] = useState<UserScript | null>(null);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  // Posted modal state
  const [postedScript, setPostedScript] = useState<UserScript | null>(null);
  const [postedPrevStatus, setPostedPrevStatus] = useState<ScriptStatus | null>(null);
  const [isPostedModalOpen, setIsPostedModalOpen] = useState(false);

  // New card dialog state
  const [isNewCardOpen, setIsNewCardOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [templatesRes, scriptsRes] = await Promise.all([
        supabase.from('script_templates').select('*').eq('is_active', true).order('display_order'),
        supabase.from('user_scripts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (scriptsRes.error) throw scriptsRes.error;

      const parsedTemplates = (templatesRes.data || []).map(t => ({
        ...t,
        script_structure: t.script_structure as unknown as ScriptStructure,
      })) as ScriptTemplate[];

      setTemplates(parsedTemplates);
      setUserScripts((scriptsRes.data || []) as UserScript[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const columns: KanbanColumnType[] = KANBAN_COLUMNS.map((col) => {
    if (col.id === 'templates') return { ...col, items: templates };
    return { ...col, items: userScripts.filter((s) => s.status === col.id) };
  });

  const handleDuplicate = async (template: ScriptTemplate) => {
    console.log('[KanbanBoard] handleDuplicate called', template.id, template.title);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('[KanbanBoard] auth result', { userId: user?.id, authError });
      if (!user) {
        toast({ title: 'Erro de autenticação. Faça login novamente.', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase
        .from('user_scripts')
        .insert({
          user_id: user.id,
          template_id: template.id,
          title: template.title,
          theme: template.theme,
          style: template.style,
          format: template.format,
          objective: template.objective,
          status: 'scripting' as const,
          script_content: {},
        })
        .select()
        .single();

      if (error) throw error;

      setUserScripts((prev) => [data as UserScript, ...prev]);
      toast({ title: 'Template duplicado para "Roterizando"' });

      // Open editor with locked metadata
      setSelectedScript(data as UserScript);
      setSelectedStructure(template.script_structure);
      setSelectedAgentId(template.agent_id || undefined);
      setIsFromTemplate(true);
      setIsEditorOpen(true);
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({ title: 'Erro ao duplicar', variant: 'destructive' });
    }
  };

  const handleCardClick = (item: ScriptTemplate | UserScript) => {
    if ('status' in item) {
      // UserScript - open editor
      const template = templates.find(t => t.id === item.template_id);
      const fromTemplate = !!item.template_id;
      setSelectedScript(item);
      setSelectedStructure(template?.script_structure || null);
      setSelectedAgentId(template?.agent_id || undefined);
      setIsFromTemplate(fromTemplate);
      setIsReadOnly(false);
      setIsEditorOpen(true);
    } else {
      // ScriptTemplate - open in read-only mode
      const tpl = item as ScriptTemplate;
      // Create a fake UserScript for viewing
      const viewScript: UserScript = {
        id: tpl.id,
        user_id: '',
        template_id: tpl.id,
        title: tpl.title,
        theme: tpl.theme,
        style: tpl.style,
        format: tpl.format,
        objective: tpl.objective,
        status: 'scripting',
        script_content: {},
        views: null,
        likes: null,
        comments: null,
        followers: null,
        shares: null,
        saves: null,
        posted_at: null,
        created_at: tpl.created_at,
        updated_at: tpl.updated_at,
        post_url: null,
        conversation_id: null,
      };
      setSelectedScript(viewScript);
      setSelectedStructure(tpl.script_structure);
      setSelectedAgentId(tpl.agent_id || undefined);
      setIsFromTemplate(true);
      setIsReadOnly(true);
      setIsEditorOpen(true);
    }
  };

  const handleWriteWithAI = (script: UserScript) => {
    if (balance.total <= 0) {
      showBuyCredits();
      return;
    }
    const template = templates.find(t => t.id === script.template_id);
    const fromTemplate = !!script.template_id;
    setSelectedScript(script);
    setSelectedStructure(template?.script_structure || null);
    setSelectedAgentId(template?.agent_id || undefined);
    setIsFromTemplate(fromTemplate);
    setIsReadOnly(false);
    setIsEditorOpen(true);
  };

  const handleOpenMetrics = (script: UserScript) => {
    setMetricsScript(script);
    setIsMetricsOpen(true);
  };

  const handleDrop = async (script: UserScript, targetColumnId: string) => {
    if (targetColumnId === 'templates') return;
    const newStatus = targetColumnId as ScriptStatus;
    if (script.status === newStatus) return;

    // AJUSTE 12: Validate movement — no skipping columns
    const statusOrder: ScriptStatus[] = ['scripting', 'recording', 'editing', 'posted'];
    const currentIdx = statusOrder.indexOf(script.status);
    const targetIdx = statusOrder.indexOf(newStatus);
    if (currentIdx >= 0 && targetIdx >= 0 && Math.abs(targetIdx - currentIdx) > 1) {
      toast({ title: 'Mova o card para a próxima coluna antes', variant: 'destructive' });
      return;
    }

    // AJUSTE 4: If moving to "posted", open PostedModal first
    if (newStatus === 'posted') {
      setPostedScript(script);
      setPostedPrevStatus(script.status);
      setIsPostedModalOpen(true);
      // Optimistically move
      setUserScripts((prev) =>
        prev.map((s) => (s.id === script.id ? { ...s, status: newStatus } : s))
      );
      return;
    }

    try {
      const updates: Partial<UserScript> = { status: newStatus };

      const { error } = await supabase
        .from('user_scripts')
        .update(updates)
        .eq('id', script.id);

      if (error) throw error;

      setUserScripts((prev) =>
        prev.map((s) => (s.id === script.id ? { ...s, ...updates } : s))
      );

      toast({ title: 'Roteiro movido com sucesso!' });
    } catch (error) {
      console.error('Error moving script:', error);
      toast({ title: 'Erro ao mover', variant: 'destructive' });
    }
  };

  const handlePostedSave = (updatedScript: UserScript) => {
    setUserScripts((prev) =>
      prev.map((s) => (s.id === updatedScript.id ? { ...updatedScript, status: 'posted' as ScriptStatus } : s))
    );
  };

  const handlePostedCancel = () => {
    // Revert optimistic move
    if (postedScript && postedPrevStatus) {
      setUserScripts((prev) =>
        prev.map((s) => (s.id === postedScript.id ? { ...s, status: postedPrevStatus } : s))
      );
      // Also revert in DB
      supabase.from('user_scripts').update({ status: postedPrevStatus }).eq('id', postedScript.id);
    }
  };

  // AJUSTE 16: Duplicate user card
  const handleDuplicateCard = async (script: UserScript) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_scripts')
        .insert({
          user_id: user.id,
          template_id: script.template_id,
          title: `${script.title} (cópia)`,
          theme: script.theme,
          style: script.style,
          format: script.format,
          objective: script.objective,
          status: 'scripting' as const,
          script_content: {},
        })
        .select()
        .single();

      if (error) throw error;
      setUserScripts((prev) => [data as UserScript, ...prev]);
      toast({ title: 'Roteiro duplicado!' });
    } catch (error) {
      console.error('Error duplicating card:', error);
      toast({ title: 'Erro ao duplicar', variant: 'destructive' });
    }
  };

  const handleSaveScript = (updatedScript: UserScript) => {
    setUserScripts((prev) =>
      prev.map((s) => (s.id === updatedScript.id ? updatedScript : s))
    );
    setIsEditorOpen(false);
  };

  const handleSaveMetrics = (updatedScript: UserScript) => {
    setUserScripts((prev) =>
      prev.map((s) => (s.id === updatedScript.id ? updatedScript : s))
    );
  };

  const handleNewCardCreated = (newScript: UserScript, agentId?: string) => {
    setUserScripts((prev) => [newScript, ...prev]);
    setIsNewCardOpen(false);
    setSelectedScript(newScript);
    setSelectedStructure(null);
    setSelectedAgentId(agentId);
    setIsFromTemplate(false);
    setIsReadOnly(false);
    setIsEditorOpen(true);
  };

  const handleDelete = async (script: UserScript) => {
    try {
      const { error } = await supabase
        .from('user_scripts')
        .delete()
        .eq('id', script.id);

      if (error) throw error;

      setUserScripts((prev) => prev.filter((s) => s.id !== script.id));
      toast({ title: 'Roteiro excluído com sucesso!' });
    } catch (error) {
      console.error('Error deleting script:', error);
      toast({ title: 'Erro ao excluir roteiro', variant: 'destructive' });
    }
  };

  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(0);

  if (isLoading) {
    return (
      <div className="flex gap-4 pb-4">
        {[...Array(isMobile ? 1 : 5)].map((_, i) => (
          <div key={i} className="min-w-[280px] max-w-[320px] flex-shrink-0 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-6 ml-auto" />
            </div>
            {[...Array(3)].map((_, j) => (
              <Skeleton key={j} className="h-32 rounded-2xl" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Tab-based view */}
      {isMobile ? (
        <div className="flex flex-col h-full">
          {/* Tab headers */}
          <div className="flex overflow-x-auto gap-1 pb-3 scrollbar-hide">
            {columns.map((col, idx) => (
              <button
                key={col.id}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${
                  activeTab === idx
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: col.color }}
                />
                {col.title}
                <span className={`text-xs ${activeTab === idx ? 'text-primary-foreground/70' : 'text-muted-foreground/50'}`}>
                  {col.items.length}
                </span>
              </button>
            ))}
          </div>

          {/* Active column content */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3 pb-4">
              {columns[activeTab]?.items.map((item) => {
                const col = columns[activeTab];
                const isTemplateColumn = col.id === 'templates';
                return (
                  <div
                    key={item.id}
                    draggable={!isTemplateColumn}
                    onDragStart={(e) => {
                      if (!isTemplateColumn) {
                        e.dataTransfer.setData('application/json', JSON.stringify(item));
                      }
                    }}
                  >
                    <KanbanCard
                      item={item}
                      isTemplate={isTemplateColumn}
                      columnId={col.id}
                      onDuplicate={handleDuplicate}
                      onClick={handleCardClick}
                      onWriteWithAI={handleWriteWithAI}
                      onOpenMetrics={handleOpenMetrics}
                      onDelete={handleDelete}
                      onDuplicateCard={handleDuplicateCard}
                    />
                  </div>
                );
              })}

              {/* Add button for scripting */}
              {columns[activeTab]?.id === 'scripting' && (
                <button
                  onClick={() => setIsNewCardOpen(true)}
                  className="w-full py-4 border-2 border-dashed border-border/50 rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <span className="text-sm font-medium">+ Novo Roteiro</span>
                </button>
              )}

              {/* Empty state */}
              {columns[activeTab]?.items.length === 0 && columns[activeTab]?.id !== 'scripting' && (
                <div className="w-full py-12 border-2 border-dashed border-border/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                  <span className="text-sm">Nenhum roteiro aqui</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Desktop: Original horizontal scroll */
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-h-[70vh]">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onDuplicate={handleDuplicate}
                onCardClick={handleCardClick}
                onWriteWithAI={handleWriteWithAI}
                onOpenMetrics={handleOpenMetrics}
                onDelete={handleDelete}
                onDrop={handleDrop}
                onDuplicateCard={handleDuplicateCard}
                onAddCard={column.id === 'scripting' ? () => setIsNewCardOpen(true) : undefined}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <ScriptEditor
        script={selectedScript}
        structure={selectedStructure}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveScript}
        agents={agents}
        selectedAgentId={selectedAgentId}
        isFromTemplate={isFromTemplate}
        isReadOnly={isReadOnly}
      />

      <MetricsModal
        script={metricsScript}
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        onSave={handleSaveMetrics}
      />

      <PostedModal
        script={postedScript}
        isOpen={isPostedModalOpen}
        onClose={() => setIsPostedModalOpen(false)}
        onSave={handlePostedSave}
        onCancel={handlePostedCancel}
      />

      <NewCardDialog
        isOpen={isNewCardOpen}
        onClose={() => setIsNewCardOpen(false)}
        onCreated={handleNewCardCreated}
        agents={agents}
      />
    </>
  );
}
