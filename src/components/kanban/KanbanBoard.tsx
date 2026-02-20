import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KanbanColumn } from './KanbanColumn';
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
import { TemplateFilters } from './TemplateFilters';

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

  // Template filter state
  const [filterObjectives, setFilterObjectives] = useState<string[]>([]);
  const [filterStyles, setFilterStyles] = useState<string[]>([]);
  const [filterFormats, setFilterFormats] = useState<string[]>([]);

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

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    if (filterObjectives.length > 0 && (!t.objective || !filterObjectives.includes(t.objective))) return false;
    if (filterStyles.length > 0 && !filterStyles.includes(t.style)) return false;
    if (filterFormats.length > 0) {
      const templateFormats = (t.format || '').split(',').map(f => f.trim()).filter(Boolean);
      if (!templateFormats.some(f => filterFormats.includes(f))) return false;
    }
    return true;
  });

  const columns: KanbanColumnType[] = KANBAN_COLUMNS.map((col) => {
    if (col.id === 'templates') return { ...col, items: filteredTemplates };
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-h-[70vh]">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              headerExtra={column.id === 'templates' ? (
                <TemplateFilters
                  selectedObjectives={filterObjectives}
                  selectedStyles={filterStyles}
                  selectedFormats={filterFormats}
                  onObjectivesChange={setFilterObjectives}
                  onStylesChange={setFilterStyles}
                  onFormatsChange={setFilterFormats}
                />
              ) : undefined}
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
