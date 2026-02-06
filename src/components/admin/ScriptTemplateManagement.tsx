import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Save, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Agent } from '@/types';
import { ScriptTemplate, ScriptStructure, DEFAULT_SCRIPT_STRUCTURE } from '@/types/kanban';
import { ScriptStructureEditor } from './ScriptStructureEditor';

interface ScriptStyle {
  id: string;
  value: string;
  label: string;
  is_active: boolean;
}

interface ScriptFormat {
  id: string;
  value: string;
  label: string;
  is_active: boolean;
}

interface ScriptObjectiveOption {
  id: string;
  value: string;
  label: string;
  color: string;
  is_active: boolean;
}

interface ScriptTemplateManagementProps {
  agents: Agent[];
}

interface TemplateFormData {
  title: string;
  theme: string;
  style: string;
  format: string;
  objective: string;
  agent_id: string;
  is_active: boolean;
  script_structure: ScriptStructure;
}

const defaultFormData: TemplateFormData = {
  title: '',
  theme: '',
  style: 'storytelling_looping',
  format: 'falado_camera',
  objective: 'attraction',
  agent_id: '',
  is_active: true,
  script_structure: JSON.parse(JSON.stringify(DEFAULT_SCRIPT_STRUCTURE)),
};

export function ScriptTemplateManagement({ agents }: ScriptTemplateManagementProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ScriptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScriptTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<ScriptTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);
  
  // Dynamic options from database
  const [styles, setStyles] = useState<ScriptStyle[]>([]);
  const [formats, setFormats] = useState<ScriptFormat[]>([]);
  const [objectives, setObjectives] = useState<ScriptObjectiveOption[]>([]);

  useEffect(() => {
    fetchTemplates();
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    const [stylesRes, formatsRes, objectivesRes] = await Promise.all([
      supabase.from('script_styles').select('*').eq('is_active', true).order('display_order'),
      supabase.from('script_formats').select('*').eq('is_active', true).order('display_order'),
      supabase.from('script_objectives').select('*').eq('is_active', true).order('display_order'),
    ]);

    if (stylesRes.data) setStyles(stylesRes.data);
    if (formatsRes.data) setFormats(formatsRes.data);
    if (objectivesRes.data) setObjectives(objectivesRes.data);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('script_templates')
        .select('*')
        .order('display_order');

      if (error) throw error;
      
      const parsed = (data || []).map(t => ({
        ...t,
        script_structure: t.script_structure as unknown as ScriptStructure,
        objective: t.objective as string | null,
      }));
      setTemplates(parsed);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Erro ao carregar templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (template?: ScriptTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        title: template.title,
        theme: template.theme || '',
        style: template.style,
        format: template.format || 'falado_camera',
        objective: template.objective || 'attraction',
        agent_id: template.agent_id || '',
        is_active: template.is_active,
        script_structure: template.script_structure || JSON.parse(JSON.stringify(DEFAULT_SCRIPT_STRUCTURE)),
      });
    } else {
      setEditingTemplate(null);
      setFormData({ ...defaultFormData, script_structure: JSON.parse(JSON.stringify(DEFAULT_SCRIPT_STRUCTURE)) });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData(defaultFormData);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.style) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Título e estilo são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.agent_id) {
      toast({
        title: 'Agente obrigatório',
        description: 'Selecione um agente para gerar roteiros com IA.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('script_templates')
          .update({
            title: formData.title,
            theme: formData.theme || null,
            style: formData.style,
            format: formData.format || null,
            objective: formData.objective as any || null,
            agent_id: formData.agent_id || null,
            is_active: formData.is_active,
            script_structure: JSON.parse(JSON.stringify(formData.script_structure)),
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingTemplate.id
              ? { 
                  ...t, 
                  ...formData, 
                  objective: formData.objective || null,
                  updated_at: new Date().toISOString() 
                }
              : t
          )
        );

        toast({ title: 'Template atualizado com sucesso!' });
      } else {
        const { data, error } = await supabase
          .from('script_templates')
          .insert([{
            title: formData.title,
            theme: formData.theme || null,
            style: formData.style,
            format: formData.format || null,
            objective: formData.objective || null,
            agent_id: formData.agent_id || null,
            is_active: formData.is_active,
            display_order: templates.length,
            script_structure: JSON.parse(JSON.stringify(formData.script_structure)),
          }])
          .select()
          .single();

        if (error) throw error;

        const parsedData: ScriptTemplate = {
          ...data,
          script_structure: data.script_structure as unknown as ScriptStructure,
          objective: data.objective as string | null,
        };
        setTemplates((prev) => [...prev, parsedData]);
        toast({ title: 'Template criado com sucesso!' });
      }

      handleCloseForm();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o template.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;

    try {
      const { error } = await supabase
        .from('script_templates')
        .delete()
        .eq('id', deleteTemplate.id);

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== deleteTemplate.id));
      toast({ title: 'Template excluído com sucesso!' });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o template.',
        variant: 'destructive',
      });
    } finally {
      setDeleteTemplate(null);
    }
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'Nenhum';
    const agent = agents.find((a) => a.id === agentId);
    return agent ? `${agent.icon_emoji || '🤖'} ${agent.name}` : 'Agente não encontrado';
  };

  const getStyleLabel = (style: string) => {
    return styles.find((s) => s.value === style)?.label || style;
  };

  const getObjectiveInfo = (objective: string | null) => {
    const found = objectives.find((o) => o.value === objective);
    return found || { value: 'attraction', label: 'Atração', color: '#EF4444' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Templates de Roteiros</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os templates disponíveis na coluna "Ideias Magnéticas" do Kanban.
          </p>
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Nenhum template cadastrado ainda.</p>
          <Button onClick={() => handleOpenForm()}>Criar primeiro template</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const objectiveInfo = getObjectiveInfo(template.objective);
            return (
              <Card key={template.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{template.title}</CardTitle>
                      {template.theme && (
                        <CardDescription className="mt-1">
                          Tema: {template.theme}
                        </CardDescription>
                      )}
                    </div>
                    <Badge
                      variant={template.is_active ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {template.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{getStyleLabel(template.style)}</Badge>
                    <Badge
                      variant="outline"
                      style={{ borderColor: objectiveInfo.color, color: objectiveInfo.color }}
                    >
                      {objectiveInfo.label}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Agente:</span>{' '}
                    {getAgentName(template.agent_id)}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenForm(template)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTemplate(template)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
            <DialogDescription>
              Configure o template que aparecerá como ideia magnética no Kanban.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Story de Bastidor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Tema</Label>
              <Input
                id="theme"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                placeholder="Ex: Marketing, Lifestyle, Educação..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="style">Estilo *</Label>
                <Select
                  value={formData.style}
                  onValueChange={(value) => setFormData({ ...formData, style: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">Formato</Label>
                <Select
                  value={formData.format}
                  onValueChange={(value) => setFormData({ ...formData, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo</Label>
              <Select
                value={formData.objective}
                onValueChange={(value) => setFormData({ ...formData, objective: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {objectives.map((obj) => (
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

            <div className="space-y-2">
              <Label htmlFor="agent">Agente de IA *</Label>
              <Select
                value={formData.agent_id}
                onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o agente..." />
                </SelectTrigger>
                <SelectContent>
                  {agents.filter(a => a.is_active).map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <span>{agent.icon_emoji || '🤖'}</span>
                        {agent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Este agente será usado para gerar roteiros com IA.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active" className="font-normal cursor-pointer">
                Template ativo
              </Label>
            </div>

            {/* Script Structure Editor */}
            <ScriptStructureEditor
              structure={formData.script_structure}
              onChange={(newStructure) =>
                setFormData({ ...formData, script_structure: newStructure })
              }
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTemplate?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
