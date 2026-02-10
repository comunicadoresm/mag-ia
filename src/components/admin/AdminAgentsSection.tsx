import React, { useEffect, useState } from 'react';
import { 
  Loader2, Plus, Bot, FileText, X, Trash2, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { IconPicker } from '@/components/IconPicker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AdminAgent, Tag } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { AgentDocuments } from '@/components/admin/AgentDocuments';
import { SortableAgentList } from '@/components/admin/SortableAgentList';
import { ScriptTemplateManagement } from '@/components/admin/ScriptTemplateManagement';

const AI_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recomendado)', category: 'Claude', provider: 'anthropic' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', category: 'Claude', provider: 'anthropic' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Rápido)', category: 'Claude', provider: 'anthropic' },
  { value: 'gpt-4o', label: 'GPT-4o', category: 'OpenAI', provider: 'openai' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Econômico)', category: 'OpenAI', provider: 'openai' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', category: 'OpenAI', provider: 'openai' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', category: 'Gemini', provider: 'google' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', category: 'Gemini', provider: 'google' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Rápido)', category: 'Gemini', provider: 'google' },
];

interface AgentFormData {
  name: string;
  slug: string;
  description: string;
  icon_emoji: string;
  system_prompt: string;
  welcome_message: string;
  model: string;
  api_key: string;
  is_active: boolean;
  display_order: number;
  selectedTags: string[];
  ice_breakers: string[];
  billing_type: string;
  credit_cost: number;
  message_package_size: number;
  plan_access: string;
}

const defaultFormData: AgentFormData = {
  name: '',
  slug: '',
  description: '',
  icon_emoji: '🤖',
  system_prompt: '',
  welcome_message: '',
  model: 'claude-sonnet-4-20250514',
  api_key: '',
  is_active: true,
  display_order: 0,
  selectedTags: [],
  ice_breakers: ['', '', ''],
  billing_type: 'per_generation',
  credit_cost: 1,
  message_package_size: 5,
  plan_access: 'magnetic',
};

interface AdminAgentsSectionProps {
  section?: 'agents' | 'templates';
}

export default function AdminAgentsSection({ section = 'agents' }: AdminAgentsSectionProps) {
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [agentTags, setAgentTags] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AdminAgent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);
  const [newTagName, setNewTagName] = useState('');
  const [newTagIcon, setNewTagIcon] = useState('Tag');
  const [saving, setSaving] = useState(false);
  const [deleteAgent, setDeleteAgent] = useState<AdminAgent | null>(null);
  const [deleteTag, setDeleteTag] = useState<Tag | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [agentsRes, tagsRes, agentTagsRes] = await Promise.all([
          supabase.from('agents').select('*').order('display_order'),
          supabase.from('tags').select('*').order('display_order'),
          supabase.from('agent_tags').select('*'),
        ]);

        if (agentsRes.error) {
          console.error('Error fetching agents:', agentsRes.error);
          return;
        }

        setAgents(agentsRes.data as AdminAgent[]);
        setTags((tagsRes.data || []) as Tag[]);

        const tagsMap: Record<string, string[]> = {};
        (agentTagsRes.data || []).forEach((at: any) => {
          if (!tagsMap[at.agent_id]) tagsMap[at.agent_id] = [];
          tagsMap[at.agent_id].push(at.tag_id);
        });
        setAgentTags(tagsMap);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const generateSlug = (name: string) => {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleOpenForm = (agent?: AdminAgent) => {
    if (agent) {
      setEditingAgent(agent);
      const existingIceBreakers = (agent as any).ice_breakers || [];
      const paddedIceBreakers = [...existingIceBreakers, '', '', ''].slice(0, 3);
      setFormData({
        name: agent.name, slug: agent.slug, description: agent.description || '',
        icon_emoji: agent.icon_emoji || '🤖', system_prompt: agent.system_prompt,
        welcome_message: agent.welcome_message || '', model: agent.model,
        api_key: (agent as any).api_key || '', is_active: agent.is_active,
        display_order: agent.display_order, selectedTags: agentTags[agent.id] || [],
        ice_breakers: paddedIceBreakers, billing_type: (agent as any).billing_type || 'per_generation',
        credit_cost: (agent as any).credit_cost || 1, message_package_size: (agent as any).message_package_size || 5,
        plan_access: (agent as any).plan_access || 'magnetic',
      });
    } else {
      setEditingAgent(null);
      setFormData({ ...defaultFormData, display_order: agents.length });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => { setShowForm(false); setEditingAgent(null); setFormData(defaultFormData); };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name, slug: editingAgent ? prev.slug : generateSlug(name) }));
  };

  const handleToggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId) ? prev.selectedTags.filter((id) => id !== tagId) : [...prev.selectedTags, tagId],
    }));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const slug = generateSlug(newTagName);
      const { data, error } = await supabase.from('tags').insert({ name: newTagName.trim(), slug, icon: newTagIcon, display_order: tags.length }).select().single();
      if (error) throw error;
      setTags((prev) => [...prev, data as Tag]);
      setNewTagName(''); setNewTagIcon('Tag'); setShowTagForm(false);
      toast({ title: 'Tag criada', description: `A tag "${newTagName}" foi criada.` });
    } catch (error) {
      toast({ title: 'Erro ao criar tag', description: 'Não foi possível criar a tag.', variant: 'destructive' });
    }
  };

  const handleUpdateTag = async (tag: Tag, newIcon: string) => {
    try {
      const { error } = await supabase.from('tags').update({ icon: newIcon }).eq('id', tag.id);
      if (error) throw error;
      setTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, icon: newIcon } : t)));
      toast({ title: 'Tag atualizada' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar tag', variant: 'destructive' });
    }
  };

  const handleDeleteTag = async () => {
    if (!deleteTag) return;
    try {
      const { error } = await supabase.from('tags').delete().eq('id', deleteTag.id);
      if (error) throw error;
      setTags((prev) => prev.filter((t) => t.id !== deleteTag.id));
      setFormData((prev) => ({ ...prev, selectedTags: prev.selectedTags.filter((id) => id !== deleteTag.id) }));
      toast({ title: 'Tag excluída' });
    } catch (error) {
      toast({ title: 'Erro ao excluir tag', variant: 'destructive' });
    } finally {
      setDeleteTag(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.system_prompt) {
      toast({ title: 'Campos obrigatórios', description: 'Nome, slug e prompt são obrigatórios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let agentId: string;
      const filteredIceBreakers = formData.ice_breakers.filter(ib => ib.trim() !== '');
      const agentData = {
        name: formData.name, slug: formData.slug, description: formData.description,
        icon_emoji: formData.icon_emoji, system_prompt: formData.system_prompt,
        welcome_message: formData.welcome_message, model: formData.model,
        api_key: formData.api_key || null, is_active: formData.is_active,
        display_order: formData.display_order, ice_breakers: filteredIceBreakers,
        billing_type: formData.billing_type, credit_cost: formData.credit_cost,
        message_package_size: formData.message_package_size,
        plan_access: formData.plan_access,
      };

      if (editingAgent) {
        const { error } = await supabase.from('agents').update(agentData).eq('id', editingAgent.id);
        if (error) throw error;
        agentId = editingAgent.id;
        setAgents((prev) => prev.map((a) => a.id === editingAgent.id ? { ...a, ...formData, updated_at: new Date().toISOString() } : a));
        toast({ title: 'Agente atualizado', description: `${formData.name} foi atualizado.` });
      } else {
        const { data, error } = await supabase.from('agents').insert(agentData).select().single();
        if (error) throw error;
        agentId = data.id;
        setAgents((prev) => [...prev, data as AdminAgent]);
        toast({ title: 'Agente criado', description: `${formData.name} foi criado.` });
      }

      await supabase.from('agent_tags').delete().eq('agent_id', agentId);
      if (formData.selectedTags.length > 0) {
        await supabase.from('agent_tags').insert(formData.selectedTags.map((tagId) => ({ agent_id: agentId, tag_id: tagId })));
      }
      setAgentTags((prev) => ({ ...prev, [agentId]: formData.selectedTags }));
      handleCloseForm();
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar o agente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAgent) return;
    try {
      const { error } = await supabase.from('agents').delete().eq('id', deleteAgent.id);
      if (error) throw error;
      setAgents((prev) => prev.filter((a) => a.id !== deleteAgent.id));
      toast({ title: 'Agente excluído', description: `${deleteAgent.name} foi excluído.` });
    } catch (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } finally {
      setDeleteAgent(null);
    }
  };

  const handleReorderAgents = async (reorderedAgents: AdminAgent[]) => {
    setAgents(reorderedAgents);
    try {
      await Promise.all(reorderedAgents.map((agent, index) => supabase.from('agents').update({ display_order: index }).eq('id', agent.id)));
      toast({ title: 'Ordem atualizada' });
    } catch (error) {
      toast({ title: 'Erro ao salvar ordem', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Templates section
  if (section === 'templates') {
    return (
      <ScriptTemplateManagement agents={agents.map(a => ({
        id: a.id, name: a.name, slug: a.slug, description: a.description,
        icon_emoji: a.icon_emoji, icon_url: (a as any).icon_url || null,
        system_prompt: a.system_prompt, welcome_message: a.welcome_message,
        model: a.model, is_active: a.is_active, display_order: a.display_order,
        ice_breakers: (a as any).ice_breakers || [],
        created_at: a.created_at, updated_at: a.updated_at,
      }))} />
    );
  }

  // Agents section
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {agents.length} agente{agents.length !== 1 ? 's' : ''} cadastrado{agents.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Agente
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Nenhum agente cadastrado ainda.</p>
          <Button onClick={() => handleOpenForm()}>Criar primeiro agente</Button>
        </div>
      ) : (
        <SortableAgentList agents={agents} agentTags={agentTags} tags={tags} aiModels={AI_MODELS} onReorder={handleReorderAgents} onEdit={handleOpenForm} onDelete={setDeleteAgent} />
      )}

      {/* Agent Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Editar Agente' : 'Novo Agente'}</DialogTitle>
            <DialogDescription>Configure as informações e instruções do agente de IA.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={formData.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex: Assistente de Conteúdo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" value={formData.slug} onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))} placeholder="assistente-conteudo" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emoji">Emoji</Label>
                <Input id="emoji" value={formData.icon_emoji} onChange={(e) => setFormData((prev) => ({ ...prev, icon_emoji: e.target.value }))} placeholder="🤖" className="text-center text-2xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modelo de IA *</Label>
                <Select value={formData.model} onValueChange={(value) => setFormData((prev) => ({ ...prev, model: value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">OpenAI</div>
                    {AI_MODELS.filter(m => m.category === 'OpenAI').map((model) => (<SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>))}
                    <div className="px-2 py-1 text-xs text-muted-foreground font-semibold mt-2">Anthropic (Claude)</div>
                    {AI_MODELS.filter(m => m.category === 'Claude').map((model) => (<SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>))}
                    <div className="px-2 py-1 text-xs text-muted-foreground font-semibold mt-2">Google (Gemini)</div>
                    {AI_MODELS.filter(m => m.category === 'Gemini').map((model) => (<SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Billing / Credit Config */}
            <div className="space-y-4 border-t border-border pt-4">
              <Label className="text-base font-semibold">Consumo de Créditos</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_type">Tipo de Cobrança</Label>
                  <Select value={formData.billing_type} onValueChange={(value) => setFormData((prev) => ({ ...prev, billing_type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_generation">Por Geração</SelectItem>
                      <SelectItem value="per_messages">Por Mensagens</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{formData.billing_type === 'per_generation' ? 'Cobra a cada chamada de IA' : 'Cobra a cada N mensagens'}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credit_cost">{formData.billing_type === 'per_generation' ? 'Custo por geração' : 'Créditos cobrados'}</Label>
                  <Input id="credit_cost" type="number" min={1} value={formData.credit_cost} onChange={(e) => setFormData((prev) => ({ ...prev, credit_cost: Math.max(1, parseInt(e.target.value) || 1) }))} />
                  <p className="text-xs text-muted-foreground">
                    {formData.billing_type === 'per_generation' ? 'Créditos por chamada' : `${formData.credit_cost} crédito(s) a cada ${formData.message_package_size} msg(s)`}
                  </p>
                </div>
                {formData.billing_type === 'per_messages' && (
                  <div className="space-y-2">
                    <Label htmlFor="message_package_size">A cada quantas msgs</Label>
                    <Input id="message_package_size" type="number" min={1} value={formData.message_package_size} onChange={(e) => setFormData((prev) => ({ ...prev, message_package_size: Math.max(1, parseInt(e.target.value) || 1) }))} />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key do Provedor</Label>
              <Input id="api_key" type="password" value={formData.api_key} onChange={(e) => setFormData((prev) => ({ ...prev, api_key: e.target.value }))} placeholder="sk-... ou AIza..." />
              <p className="text-xs text-muted-foreground">Cada agente pode usar uma chave diferente.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} placeholder="Breve descrição..." rows={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system_prompt">Prompt do Sistema *</Label>
              <Textarea id="system_prompt" value={formData.system_prompt} onChange={(e) => setFormData((prev) => ({ ...prev, system_prompt: e.target.value }))} placeholder="Você é um assistente..." rows={6} className="font-mono text-sm" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
              <Textarea id="welcome_message" value={formData.welcome_message} onChange={(e) => setFormData((prev) => ({ ...prev, welcome_message: e.target.value }))} placeholder="Olá! Como posso ajudar?" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Quebra-gelos (Sugestões)</Label>
              <div className="space-y-2">
                {formData.ice_breakers.map((ib, i) => (
                  <Input key={i} value={ib} onChange={(e) => { const arr = [...formData.ice_breakers]; arr[i] = e.target.value; setFormData((prev) => ({ ...prev, ice_breakers: arr })); }} placeholder={`Sugestão ${i + 1}`} />
                ))}
              </div>
            </div>

            {editingAgent && (
              <div className="border-t border-border pt-4">
                <AgentDocuments agentId={editingAgent.id} agentName={editingAgent.name} />
              </div>
            )}
            {!editingAgent && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <p className="text-sm">Salve o agente primeiro para adicionar documentos.</p>
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Categorias (Tags)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowTagForm(true)} className="text-xs gap-1"><Plus className="w-3 h-3" /> Nova Tag</Button>
              </div>
              {showTagForm && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <IconPicker value={newTagIcon} onChange={setNewTagIcon} className="w-auto shrink-0" />
                  <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Nome da tag..." className="flex-1" />
                  <Button size="sm" onClick={handleCreateTag}>Criar</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowTagForm(false); setNewTagName(''); setNewTagIcon('Tag'); }}><X className="w-4 h-4" /></Button>
                </div>
              )}
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <IconPicker value={tag.icon || 'Tag'} onChange={(newIcon) => handleUpdateTag(tag, newIcon)} className="w-auto shrink-0" />
                    <button type="button" onClick={() => handleToggleTag(tag.id)} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium text-left transition-all ${formData.selectedTags.includes(tag.id) ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-muted'}`}>{tag.name}</button>
                    <button type="button" onClick={() => setDeleteTag(tag)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {tags.length === 0 && !showTagForm && <p className="text-sm text-muted-foreground">Nenhuma tag criada.</p>}
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))} />
                <Label htmlFor="is_active" className="font-normal cursor-pointer">Agente ativo</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}><X className="w-4 h-4 mr-2" /> Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Agent Confirmation */}
      <AlertDialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir "{deleteAgent?.name}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Tag Confirmation */}
      <AlertDialog open={!!deleteTag} onOpenChange={() => setDeleteTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tag?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir a tag "{deleteTag?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTag} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
