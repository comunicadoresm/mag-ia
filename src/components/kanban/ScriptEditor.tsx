import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Target, Palette, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { UserScript, ScriptStructure, DEFAULT_SCRIPT_STRUCTURE } from '@/types/kanban';
import { Agent } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCredits } from '@/hooks/useCredits';
import { useCreditsModals } from '@/contexts/CreditsModalContext';
import { AIScriptChat } from './AIScriptChat';
import { FormatMultiSelect } from './FormatMultiSelect';

interface ScriptEditorProps {
  script: UserScript | null;
  structure: ScriptStructure | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (script: UserScript) => void;
  agents: Agent[];
  selectedAgentId?: string;
  isFromTemplate?: boolean;
  isReadOnly?: boolean;
}

interface DynamicOption {
  value: string;
  label: string;
  color?: string;
}

export function ScriptEditor({
  script,
  structure,
  isOpen,
  onClose,
  onSave,
  agents,
  selectedAgentId,
  isFromTemplate = false,
  isReadOnly = false,
}: ScriptEditorProps) {
  const { toast } = useToast();
  const { balance } = useCredits();
  const { showBuyCredits } = useCreditsModals();
  const [isLoading, setIsLoading] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [editedScript, setEditedScript] = useState<UserScript | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});
  const [chosenAgentId, setChosenAgentId] = useState<string | undefined>(selectedAgentId);

  // Dynamic options from DB
  const [dbStyles, setDbStyles] = useState<DynamicOption[]>([]);
  const [dbFormats, setDbFormats] = useState<DynamicOption[]>([]);
  const [dbObjectives, setDbObjectives] = useState<DynamicOption[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchDynamicOptions();
    }
  }, [isOpen]);

  const fetchDynamicOptions = async () => {
    const [stylesRes, formatsRes, objectivesRes] = await Promise.all([
      supabase.from('script_styles').select('value, label').eq('is_active', true).order('display_order'),
      supabase.from('script_formats').select('value, label').eq('is_active', true).order('display_order'),
      supabase.from('script_objectives').select('value, label, color').eq('is_active', true).order('display_order'),
    ]);
    if (stylesRes.data) setDbStyles(stylesRes.data);
    if (formatsRes.data) setDbFormats(formatsRes.data);
    if (objectivesRes.data) setDbObjectives(objectivesRes.data);
  };

  useEffect(() => {
    if (script) {
      setEditedScript({ ...script });
      setContent(script.script_content || {});
      setChosenAgentId(selectedAgentId);
    }
  }, [script, selectedAgentId]);

  const isMetadataLocked = isFromTemplate;

  // Use template structure, or default structure for free cards
  const activeStructure = structure || DEFAULT_SCRIPT_STRUCTURE;

  const handleSave = async () => {
    if (!editedScript || isReadOnly) return;
    
    setIsLoading(true);
    try {
      const updatedScript = {
        ...editedScript,
        script_content: content,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_scripts')
        .update({
          title: updatedScript.title,
          theme: updatedScript.theme,
          style: updatedScript.style,
          format: updatedScript.format,
          objective: updatedScript.objective,
          script_content: updatedScript.script_content,
        })
        .eq('id', updatedScript.id);

      if (error) throw error;

      onSave(updatedScript);
      toast({ title: 'Roteiro salvo com sucesso!' });
    } catch (error) {
      console.error('Error saving script:', error);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWriteWithAI = () => {
    if (!editedScript) return;
    if (balance.total <= 0) {
      showBuyCredits();
      return;
    }
    setIsAIChatOpen(true);
  };

  const handleScriptGenerated = async (generatedContent: Record<string, string>) => {
    setContent(generatedContent);

    // Auto-save to DB so the script persists in the card
    if (editedScript) {
      try {
        const { error } = await supabase
          .from('user_scripts')
          .update({ script_content: generatedContent, updated_at: new Date().toISOString() })
          .eq('id', editedScript.id);

        if (error) throw error;

        const updatedScript = { ...editedScript, script_content: generatedContent, updated_at: new Date().toISOString() };
        onSave(updatedScript);
      } catch (error) {
        console.error('Error auto-saving script:', error);
        toast({ title: 'Roteiro preenchido, mas erro ao salvar automaticamente. Clique em Salvar.', variant: 'destructive' });
      }
    }
  };

  const selectedAgent = agents.find(a => a.id === chosenAgentId) || null;

  if (!editedScript) return null;

  const title = isReadOnly ? 'Visualizar Template' : 'Editar Roteiro';

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl">{title}</SheetTitle>
            </SheetHeader>

            {/* Basic Info Section */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Informações Básicas
              </h3>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Título</label>
                <Input
                  value={editedScript.title}
                  onChange={(e) => setEditedScript({ ...editedScript, title: e.target.value })}
                  className="bg-input"
                  disabled={isReadOnly}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Tema</label>
                  <Input
                    value={editedScript.theme || ''}
                    onChange={(e) => setEditedScript({ ...editedScript, theme: e.target.value })}
                    className="bg-input"
                    placeholder="Ex: Marketing, Lifestyle..."
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Estilo</label>
                  <Select
                    value={editedScript.style}
                    onValueChange={(value) => setEditedScript({ ...editedScript, style: value })}
                    disabled={isMetadataLocked || isReadOnly}
                  >
                    <SelectTrigger className={`bg-input ${isMetadataLocked || isReadOnly ? 'opacity-60' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dbStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-sm text-muted-foreground mb-1.5 block">Formato</label>
                   <FormatMultiSelect
                     options={dbFormats}
                     value={editedScript.format}
                     onChange={(val) => setEditedScript({ ...editedScript, format: val || null })}
                     disabled={isMetadataLocked || isReadOnly}
                     placeholder="Selecione formatos..."
                   />
                 </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Objetivo</label>
                  <Select
                    value={editedScript.objective || ''}
                    onValueChange={(value) => setEditedScript({ ...editedScript, objective: value })}
                    disabled={isMetadataLocked || isReadOnly}
                  >
                    <SelectTrigger className={`bg-input ${isMetadataLocked || isReadOnly ? 'opacity-60' : ''}`}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dbObjectives.map((obj) => (
                        <SelectItem key={obj.value} value={obj.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: obj.color }}
                            />
                            {obj.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Agent selector - only for custom (non-template) cards */}
              {!isMetadataLocked && !isReadOnly && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Agente IA</label>
                  <Select
                    value={chosenAgentId || ''}
                    onValueChange={(value) => setChosenAgentId(value)}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Selecione um agente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <span>{agent.icon_emoji || '🤖'}</span>
                            {agent.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Show locked agent info for template-based or read-only cards */}
              {(isMetadataLocked || isReadOnly) && selectedAgent && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Agente IA</label>
                  <div className="flex items-center gap-2 bg-input rounded-md px-3 py-2 opacity-60">
                    <span>{selectedAgent.icon_emoji || '🤖'}</span>
                    <span className="text-sm">{selectedAgent.name}</span>
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Script Structure */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  🎬 Roteiro IDF
                </h3>
                
                {!isReadOnly && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleWriteWithAI}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Escrever com IA
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-muted/30 rounded-xl p-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-destructive" />
                    {activeStructure.inicio.title}
                  </h4>
                  {activeStructure.inicio.sections.map((section) => (
                    <div key={section.id} className="mb-3">
                      <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        {section.label}
                      </label>
                      <Textarea
                        value={content[section.id] || ''}
                        onChange={(e) => setContent({ ...content, [section.id]: e.target.value })}
                        placeholder={section.placeholder}
                        className={`min-h-[100px] ${isReadOnly ? 'bg-muted/20 text-muted-foreground border-border/30' : 'bg-card'}`}
                        disabled={isReadOnly}
                      />
                    </div>
                  ))}
                </div>

                <div className="bg-muted/30 rounded-xl p-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    {activeStructure.desenvolvimento.title}
                  </h4>
                  {activeStructure.desenvolvimento.sections.map((section) => (
                    <div key={section.id} className="mb-3">
                      <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {section.label}
                      </label>
                      <Textarea
                        value={content[section.id] || ''}
                        onChange={(e) => setContent({ ...content, [section.id]: e.target.value })}
                        placeholder={section.placeholder}
                        className={`min-h-[100px] ${isReadOnly ? 'bg-muted/20 text-muted-foreground border-border/30' : 'bg-card'}`}
                        disabled={isReadOnly}
                      />
                    </div>
                  ))}
                </div>

                <div className="bg-muted/30 rounded-xl p-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-success" />
                    {activeStructure.final.title}
                  </h4>
                  {activeStructure.final.sections.map((section) => (
                    <div key={section.id} className="mb-3">
                      <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        {section.label}
                      </label>
                      <Textarea
                        value={content[section.id] || ''}
                        onChange={(e) => setContent({ ...content, [section.id]: e.target.value })}
                        placeholder={section.placeholder}
                        className={`min-h-[100px] ${isReadOnly ? 'bg-muted/20 text-muted-foreground border-border/30' : 'bg-card'}`}
                        disabled={isReadOnly}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-border">
              {isReadOnly ? (
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Fechar
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={isLoading} className="flex-1">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Salvar
                  </Button>
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>

      {/* AI Chat Modal */}
      {editedScript && !isReadOnly && (
        <AIScriptChat
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
          script={editedScript}
          structure={activeStructure}
          agent={selectedAgent}
          isFromTemplate={isFromTemplate}
          onScriptGenerated={handleScriptGenerated}
          onConversationCreated={(convId) => {
            setEditedScript(prev => prev ? { ...prev, conversation_id: convId } : prev);
          }}
        />
      )}
    </Sheet>
  );
}
