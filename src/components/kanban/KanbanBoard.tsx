import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KanbanColumn } from './KanbanColumn';
import { ScriptEditor } from './ScriptEditor';
import { MetricsModal } from './MetricsModal';
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

interface KanbanBoardProps {
  agents: Agent[];
}

export function KanbanBoard({ agents }: KanbanBoardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [userScripts, setUserScripts] = useState<UserScript[]>([]);
  
  // Editor state
  const [selectedScript, setSelectedScript] = useState<UserScript | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<ScriptStructure | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  // Metrics state
  const [metricsScript, setMetricsScript] = useState<UserScript | null>(null);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('script_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (templatesError) throw templatesError;

      // Fetch user scripts
      const { data: scriptsData, error: scriptsError } = await supabase
        .from('user_scripts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (scriptsError) throw scriptsError;

      // Parse templates with proper typing
      const parsedTemplates = (templatesData || []).map(t => ({
        ...t,
        script_structure: t.script_structure as unknown as ScriptStructure,
      })) as ScriptTemplate[];

      setTemplates(parsedTemplates);
      setUserScripts((scriptsData || []) as UserScript[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Build columns
  const columns: KanbanColumnType[] = KANBAN_COLUMNS.map((col) => {
    if (col.id === 'templates') {
      return { ...col, items: templates };
    }
    return {
      ...col,
      items: userScripts.filter((s) => s.status === col.id),
    };
  });

  // Handle duplicate template
  const handleDuplicate = async (template: ScriptTemplate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Faça login para continuar',
          variant: 'destructive',
        });
        return;
      }

      const newScript = {
        user_id: user.id,
        template_id: template.id,
        title: template.title,
        theme: template.theme,
        style: template.style,
        format: template.format,
        objective: template.objective,
        status: 'scripting' as const,
        script_content: {},
      };

      const { data, error } = await supabase
        .from('user_scripts')
        .insert(newScript)
        .select()
        .single();

      if (error) throw error;

      setUserScripts((prev) => [data as UserScript, ...prev]);
      toast({ title: 'Template duplicado para "Roterizando"' });

      // Open editor immediately
      setSelectedScript(data as UserScript);
      setSelectedStructure(template.script_structure);
      setSelectedAgentId(template.agent_id || undefined);
      setIsEditorOpen(true);
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: 'Erro ao duplicar',
        variant: 'destructive',
      });
    }
  };

  // Handle card click
  const handleCardClick = (item: ScriptTemplate | UserScript) => {
    // Only allow editing user scripts
    if ('status' in item) {
      const template = templates.find(t => t.id === item.template_id);
      setSelectedScript(item);
      setSelectedStructure(template?.script_structure || null);
      setSelectedAgentId(template?.agent_id || undefined);
      setIsEditorOpen(true);
    }
  };

  // Handle write with AI
  const handleWriteWithAI = (script: UserScript) => {
    const template = templates.find(t => t.id === script.template_id);
    setSelectedScript(script);
    setSelectedStructure(template?.script_structure || null);
    setSelectedAgentId(template?.agent_id || undefined);
    setIsEditorOpen(true);
  };

  // Handle open metrics
  const handleOpenMetrics = (script: UserScript) => {
    setMetricsScript(script);
    setIsMetricsOpen(true);
  };

  // Handle drop (move between columns)
  const handleDrop = async (script: UserScript, targetColumnId: string) => {
    if (targetColumnId === 'templates') return;
    
    const newStatus = targetColumnId as ScriptStatus;
    if (script.status === newStatus) return;

    try {
      const updates: Partial<UserScript> = {
        status: newStatus,
      };

      // Set posted_at when moving to posted
      if (newStatus === 'posted' && !script.posted_at) {
        updates.posted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('user_scripts')
        .update(updates)
        .eq('id', script.id);

      if (error) throw error;

      setUserScripts((prev) =>
        prev.map((s) =>
          s.id === script.id ? { ...s, ...updates } : s
        )
      );

      // Open metrics modal when moving to posted
      if (newStatus === 'posted') {
        setMetricsScript({ ...script, ...updates } as UserScript);
        setIsMetricsOpen(true);
      }

      toast({ title: 'Roteiro movido com sucesso!' });
    } catch (error) {
      console.error('Error moving script:', error);
      toast({
        title: 'Erro ao mover',
        variant: 'destructive',
      });
    }
  };

  // Handle save from editor
  const handleSaveScript = (updatedScript: UserScript) => {
    setUserScripts((prev) =>
      prev.map((s) => (s.id === updatedScript.id ? updatedScript : s))
    );
    setIsEditorOpen(false);
  };

  // Handle save metrics
  const handleSaveMetrics = (updatedScript: UserScript) => {
    setUserScripts((prev) =>
      prev.map((s) => (s.id === updatedScript.id ? updatedScript : s))
    );
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
              onDuplicate={handleDuplicate}
              onCardClick={handleCardClick}
              onWriteWithAI={handleWriteWithAI}
              onOpenMetrics={handleOpenMetrics}
              onDrop={handleDrop}
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
      />

      <MetricsModal
        script={metricsScript}
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        onSave={handleSaveMetrics}
      />
    </>
  );
}
