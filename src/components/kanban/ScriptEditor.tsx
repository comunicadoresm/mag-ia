import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Target, Palette, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { UserScript, ScriptStructure, OBJECTIVES, STYLES, FORMATS } from '@/types/kanban';
import { Agent } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AIScriptChat } from './AIScriptChat';

interface ScriptEditorProps {
  script: UserScript | null;
  structure: ScriptStructure | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (script: UserScript) => void;
  agents: Agent[];
  selectedAgentId?: string;
}

export function ScriptEditor({
  script,
  structure,
  isOpen,
  onClose,
  onSave,
  agents,
  selectedAgentId,
}: ScriptEditorProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [editedScript, setEditedScript] = useState<UserScript | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});

  useEffect(() => {
    if (script) {
      setEditedScript({ ...script });
      setContent(script.script_content || {});
    }
  }, [script]);

  const handleSave = async () => {
    if (!editedScript) return;
    
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
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o roteiro.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWriteWithAI = () => {
    if (!editedScript) {
      toast({
        title: 'Erro',
        description: 'Nenhum roteiro selecionado.',
        variant: 'destructive',
      });
      return;
    }
    setIsAIChatOpen(true);
  };

  const handleScriptGenerated = (generatedContent: Record<string, string>) => {
    setContent(generatedContent);
  };

  // Get the selected agent
  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

  if (!editedScript) return null;

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl">Editar Roteiro</SheetTitle>
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
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Estilo</label>
                  <Select
                    value={editedScript.style}
                    onValueChange={(value) => setEditedScript({ ...editedScript, style: value })}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map((style) => (
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
                  <Select
                    value={editedScript.format || ''}
                    onValueChange={(value) => setEditedScript({ ...editedScript, format: value })}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Objetivo</label>
                  <Select
                    value={editedScript.objective || ''}
                    onValueChange={(value) => setEditedScript({ ...editedScript, objective: value as any })}
                  >
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECTIVES.map((obj) => (
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
            </div>

            <Separator className="my-6" />

            {/* Script Structure */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  🎬 Roteiro IDF
                </h3>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleWriteWithAI}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Escrever com IA
                </Button>
              </div>

              {/* IDF Sections */}
              {structure && (
                <div className="space-y-6">
                  {/* Início */}
                  <div className="bg-muted/30 rounded-xl p-4">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-destructive" />
                      {structure.inicio.title}
                    </h4>
                    {structure.inicio.sections.map((section) => (
                      <div key={section.id} className="mb-3">
                        <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-warning" />
                          {section.label}
                        </label>
                        <Textarea
                          value={content[section.id] || ''}
                          onChange={(e) => setContent({ ...content, [section.id]: e.target.value })}
                          placeholder={section.placeholder}
                          className="bg-card min-h-[100px]"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Desenvolvimento */}
                  <div className="bg-muted/30 rounded-xl p-4">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />
                      {structure.desenvolvimento.title}
                    </h4>
                    {structure.desenvolvimento.sections.map((section) => (
                      <div key={section.id} className="mb-3">
                        <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          {section.label}
                        </label>
                        <Textarea
                          value={content[section.id] || ''}
                          onChange={(e) => setContent({ ...content, [section.id]: e.target.value })}
                          placeholder={section.placeholder}
                          className="bg-card min-h-[100px]"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Final */}
                  <div className="bg-muted/30 rounded-xl p-4">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-success" />
                      {structure.final.title}
                    </h4>
                    {structure.final.sections.map((section) => (
                      <div key={section.id} className="mb-3">
                        <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-success" />
                          {section.label}
                        </label>
                        <Textarea
                          value={content[section.id] || ''}
                          onChange={(e) => setContent({ ...content, [section.id]: e.target.value })}
                          placeholder={section.placeholder}
                          className="bg-card min-h-[100px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-border">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isLoading} className="flex-1">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>

      {/* AI Chat Modal */}
      {editedScript && (
        <AIScriptChat
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
          script={editedScript}
          structure={structure}
          agent={selectedAgent}
          onScriptGenerated={handleScriptGenerated}
        />
      )}
    </Sheet>
  );
}
