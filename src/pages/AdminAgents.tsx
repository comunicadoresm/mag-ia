import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Loader2, 
  Plus, 
  ArrowLeft,
  Bot,
  Users,
  FileText,
  X,
  Trash2,
  Save,
  LayoutGrid,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { IconPicker } from '@/components/IconPicker';

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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AdminAgent, Tag } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/Logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserManagement from '@/components/admin/UserManagement';
import { AgentDocuments } from '@/components/admin/AgentDocuments';
import { SortableAgentList } from '@/components/admin/SortableAgentList';
import { ScriptTemplateManagement } from '@/components/admin/ScriptTemplateManagement';
import { ScriptOptionsManagement } from '@/components/admin/ScriptOptionsManagement';

const AI_MODELS = [
  // Anthropic models (requires ANTHROPIC_API_KEY)
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recomendado)', category: 'Claude', provider: 'anthropic' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', category: 'Claude', provider: 'anthropic' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Rápido)', category: 'Claude', provider: 'anthropic' },
  // OpenAI models (requires OPENAI_API_KEY)
  { value: 'gpt-4o', label: 'GPT-4o', category: 'OpenAI', provider: 'openai' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Econômico)', category: 'OpenAI', provider: 'openai' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', category: 'OpenAI', provider: 'openai' },
  // Google models (requires GOOGLE_AI_API_KEY)
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
  billing_type: 'per_messages',
  credit_cost: 1,
  message_package_size: 5,
};

export default function AdminAgents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'agents';
  
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [agentTags, setAgentTags] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AdminAgent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);
  const [newTagName, setNewTagName] = useState('');
  const [newTagIcon, setNewTagIcon] = useState('Tag');
  const [saving, setSaving] = useState(false);
  const [deleteAgent, setDeleteAgent] = useState<AdminAgent | null>(null);
  const [deleteTag, setDeleteTag] = useState<Tag | null>(null);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      if (!user) return;

      try {
        // Check if user is admin
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (roleError || !roleData) {
          setIsAdmin(false);
          navigate('/home');
          return;
        }

        setIsAdmin(true);

        // Fetch all agents, tags, and agent_tags
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

        // Build agent tags map
        const tagsMap: Record<string, string[]> = {};
        (agentTagsRes.data || []).forEach((at: any) => {
          if (!tagsMap[at.agent_id]) {
            tagsMap[at.agent_id] = [];
          }
          tagsMap[at.agent_id].push(at.tag_id);
        });
        setAgentTags(tagsMap);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, [user, navigate]);

  const handleOpenForm = (agent?: AdminAgent) => {
    if (agent) {
      setEditingAgent(agent);
      const existingIceBreakers = (agent as any).ice_breakers || [];
      // Ensure we always have 3 slots for ice breakers
      const paddedIceBreakers = [...existingIceBreakers, '', '', ''].slice(0, 3);
      setFormData({
        name: agent.name,
        slug: agent.slug,
        description: agent.description || '',
        icon_emoji: agent.icon_emoji || '🤖',
        system_prompt: agent.system_prompt,
        welcome_message: agent.welcome_message || '',
        model: agent.model,
        api_key: (agent as any).api_key || '',
        is_active: agent.is_active,
        display_order: agent.display_order,
        selectedTags: agentTags[agent.id] || [],
        ice_breakers: paddedIceBreakers,
        billing_type: (agent as any).billing_type || 'per_messages',
        credit_cost: (agent as any).credit_cost || 1,
        message_package_size: (agent as any).message_package_size || 5,
      });
    } else {
      setEditingAgent(null);
      setFormData({
        ...defaultFormData,
        display_order: agents.length,
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAgent(null);
    setFormData(defaultFormData);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingAgent ? prev.slug : generateSlug(name),
    }));
  };

  const handleToggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter((id) => id !== tagId)
        : [...prev.selectedTags, tagId],
    }));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const slug = generateSlug(newTagName);
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: newTagName.trim(),
          slug,
          icon: newTagIcon,
          display_order: tags.length,
        })
        .select()
        .single();

      if (error) throw error;

      setTags((prev) => [...prev, data as Tag]);
      setNewTagName('');
      setNewTagIcon('Tag');
      setShowTagForm(false);

      toast({
        title: 'Tag criada',
        description: `A tag "${newTagName}" foi criada com sucesso.`,
      });
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Erro ao criar tag',
        description: 'Não foi possível criar a tag.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTag = async (tag: Tag, newIcon: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .update({ icon: newIcon })
        .eq('id', tag.id);

      if (error) throw error;

      setTags((prev) =>
        prev.map((t) => (t.id === tag.id ? { ...t, icon: newIcon } : t))
      );

      toast({
        title: 'Tag atualizada',
        description: `O ícone da tag "${tag.name}" foi atualizado.`,
      });
    } catch (error) {
      console.error('Error updating tag:', error);
      toast({
        title: 'Erro ao atualizar tag',
        description: 'Não foi possível atualizar a tag.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTag = async () => {
    if (!deleteTag) return;

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', deleteTag.id);

      if (error) throw error;

      setTags((prev) => prev.filter((t) => t.id !== deleteTag.id));
      
      // Remove from selectedTags if present
      setFormData((prev) => ({
        ...prev,
        selectedTags: prev.selectedTags.filter((id) => id !== deleteTag.id),
      }));

      toast({
        title: 'Tag excluída',
        description: `A tag "${deleteTag.name}" foi excluída com sucesso.`,
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'Erro ao excluir tag',
        description: 'Não foi possível excluir a tag.',
        variant: 'destructive',
      });
    } finally {
      setDeleteTag(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.system_prompt) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome, slug e prompt do sistema são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      let agentId: string;

      if (editingAgent) {
        // Update existing agent
        // Filter out empty ice breakers
        const filteredIceBreakers = formData.ice_breakers.filter(ib => ib.trim() !== '');
        const { error } = await supabase
          .from('agents')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            icon_emoji: formData.icon_emoji,
            system_prompt: formData.system_prompt,
            welcome_message: formData.welcome_message,
            model: formData.model,
            api_key: formData.api_key || null,
            is_active: formData.is_active,
            display_order: formData.display_order,
            ice_breakers: filteredIceBreakers,
            billing_type: formData.billing_type,
            credit_cost: formData.credit_cost,
            message_package_size: formData.message_package_size,
          })
          .eq('id', editingAgent.id);

        if (error) throw error;

        agentId = editingAgent.id;

        setAgents((prev) =>
          prev.map((a) =>
            a.id === editingAgent.id
              ? { ...a, ...formData, updated_at: new Date().toISOString() }
              : a
          )
        );

        toast({
          title: 'Agente atualizado',
          description: `${formData.name} foi atualizado com sucesso.`,
        });
      } else {
        // Create new agent
        // Filter out empty ice breakers
        const filteredIceBreakers = formData.ice_breakers.filter(ib => ib.trim() !== '');
        const { data, error } = await supabase
          .from('agents')
          .insert({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            icon_emoji: formData.icon_emoji,
            system_prompt: formData.system_prompt,
            welcome_message: formData.welcome_message,
            model: formData.model,
            api_key: formData.api_key || null,
            is_active: formData.is_active,
            display_order: formData.display_order,
            ice_breakers: filteredIceBreakers,
            billing_type: formData.billing_type,
            credit_cost: formData.credit_cost,
            message_package_size: formData.message_package_size,
          })
          .select()
          .single();

        if (error) throw error;

        agentId = data.id;
        setAgents((prev) => [...prev, data as AdminAgent]);

        toast({
          title: 'Agente criado',
          description: `${formData.name} foi criado com sucesso.`,
        });
      }

      // Update agent tags
      // First, delete existing tags for this agent
      await supabase.from('agent_tags').delete().eq('agent_id', agentId);

      // Then, insert new tags
      if (formData.selectedTags.length > 0) {
        const tagInserts = formData.selectedTags.map((tagId) => ({
          agent_id: agentId,
          tag_id: tagId,
        }));
        await supabase.from('agent_tags').insert(tagInserts);
      }

      // Update local state
      setAgentTags((prev) => ({
        ...prev,
        [agentId]: formData.selectedTags,
      }));

      handleCloseForm();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o agente. Verifique suas permissões.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAgent) return;

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', deleteAgent.id);

      if (error) throw error;

      setAgents((prev) => prev.filter((a) => a.id !== deleteAgent.id));

      toast({
        title: 'Agente excluído',
        description: `${deleteAgent.name} foi excluído com sucesso.`,
      });
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o agente.',
        variant: 'destructive',
      });
    } finally {
      setDeleteAgent(null);
    }
  };

  const handleReorderAgents = async (reorderedAgents: AdminAgent[]) => {
    // Update local state immediately for smooth UX
    setAgents(reorderedAgents);

    // Batch update display_order in database
    try {
      const updates = reorderedAgents.map((agent, index) => 
        supabase
          .from('agents')
          .update({ display_order: index })
          .eq('id', agent.id)
      );
      
      await Promise.all(updates);

      toast({
        title: 'Ordem atualizada',
        description: 'A ordem dos agentes foi salva com sucesso.',
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: 'Erro ao salvar ordem',
        description: 'Não foi possível salvar a nova ordem dos agentes.',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-4">Você não tem permissão para acessar esta página.</p>
          <Button onClick={() => navigate('/home')}>Voltar à Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-secondary">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo size="sm" />
            <h1 className="text-xl font-semibold text-foreground">Administração</h1>
          </div>
          {activeTab === 'agents' && (
            <Button onClick={() => handleOpenForm()} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Agente
            </Button>
          )}
        </div>
      </header>

      {/* Content with Tabs */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="agents" className="gap-2">
              <Bot className="w-4 h-4" />
              Agentes
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="options" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Opções
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents">
        {agents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum agente cadastrado ainda.</p>
            <Button onClick={() => handleOpenForm()}>Criar primeiro agente</Button>
          </div>
        ) : (
          <SortableAgentList
            agents={agents}
            agentTags={agentTags}
            tags={tags}
            aiModels={AI_MODELS}
            onReorder={handleReorderAgents}
            onEdit={handleOpenForm}
            onDelete={setDeleteAgent}
          />
        )}
          </TabsContent>

          <TabsContent value="templates">
            <ScriptTemplateManagement agents={agents.map(a => ({
              id: a.id,
              name: a.name,
              slug: a.slug,
              description: a.description,
              icon_emoji: a.icon_emoji,
              icon_url: (a as any).icon_url || null,
              system_prompt: a.system_prompt,
              welcome_message: a.welcome_message,
              model: a.model,
              is_active: a.is_active,
              display_order: a.display_order,
              ice_breakers: (a as any).ice_breakers || [],
              plan_access: (a as any).plan_access || 'magnetic',
              created_at: a.created_at,
              updated_at: a.updated_at,
            }))} />
          </TabsContent>

          <TabsContent value="options">
            <ScriptOptionsManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Editar Agente' : 'Novo Agente'}
            </DialogTitle>
            <DialogDescription>
              Configure as informações e instruções do agente de IA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Assistente de Conteúdo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="assistente-conteudo"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emoji">Emoji</Label>
                <Input
                  id="emoji"
                  value={formData.icon_emoji}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, icon_emoji: e.target.value }))
                  }
                  placeholder="🤖"
                  className="text-center text-2xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo de IA *</Label>
                <Select
                  value={formData.model}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, model: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">OpenAI</div>
                    {AI_MODELS.filter(m => m.category === 'OpenAI').map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs text-muted-foreground font-semibold mt-2">Anthropic (Claude)</div>
                    {AI_MODELS.filter(m => m.category === 'Claude').map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs text-muted-foreground font-semibold mt-2">Google (Gemini)</div>
                    {AI_MODELS.filter(m => m.category === 'Gemini').map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
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
                  <Select
                    value={formData.billing_type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, billing_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_messages">Por Mensagens (a cada N msgs)</SelectItem>
                      <SelectItem value="per_output">Por Output/Roteiro Gerado</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.billing_type === 'per_output'
                      ? 'Cobra apenas quando a IA gera um roteiro/output estruturado'
                      : 'Cobra a cada N mensagens do usuário'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit_cost">
                    {formData.billing_type === 'per_output' ? 'Custo por output (créditos)' : 'Créditos cobrados'}
                  </Label>
                  <Input
                    id="credit_cost"
                    type="number"
                    min={1}
                    value={formData.credit_cost}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, credit_cost: Math.max(1, parseInt(e.target.value) || 1) }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.billing_type === 'per_output'
                      ? `${formData.credit_cost} crédito(s) por roteiro gerado`
                      : `Cobra ${formData.credit_cost} crédito(s) a cada ${formData.message_package_size} msg(s)`}
                  </p>
                </div>

                {formData.billing_type === 'per_messages' && (
                  <div className="space-y-2">
                    <Label htmlFor="message_package_size">A cada quantas mensagens</Label>
                    <Input
                      id="message_package_size"
                      type="number"
                      min={1}
                      value={formData.message_package_size}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, message_package_size: Math.max(1, parseInt(e.target.value) || 1) }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Ex: 1 = cobra a cada msg, 5 = cobra a cada 5 msgs
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key do Provedor</Label>
              <Input
                id="api_key"
                type="password"
                value={formData.api_key}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, api_key: e.target.value }))
                }
                placeholder="sk-... ou AIza... (dependendo do provedor)"
              />
              <p className="text-xs text-muted-foreground">
                Insira a API Key do provedor selecionado. Cada agente pode usar uma chave diferente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Breve descrição do que o agente faz..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="system_prompt">Prompt do Sistema (Instruções) *</Label>
              <Textarea
                id="system_prompt"
                value={formData.system_prompt}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, system_prompt: e.target.value }))
                }
                placeholder="Você é um assistente especializado em..."
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Este prompt define a personalidade e comportamento do agente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
              <Textarea
                id="welcome_message"
                value={formData.welcome_message}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    welcome_message: e.target.value,
                  }))
                }
                placeholder="Olá! Como posso ajudar você hoje?"
                rows={2}
              />
            </div>

            {/* Ice Breakers Section */}
            <div className="space-y-2">
              <Label>Quebra-gelos (Sugestões de início)</Label>
              <p className="text-xs text-muted-foreground">
                Configure até 3 sugestões de mensagens que aparecem no início do chat.
              </p>
              <div className="space-y-2">
                {formData.ice_breakers.map((iceBreaker, index) => (
                  <Input
                    key={index}
                    value={iceBreaker}
                    onChange={(e) => {
                      const newIceBreakers = [...formData.ice_breakers];
                      newIceBreakers[index] = e.target.value;
                      setFormData((prev) => ({ ...prev, ice_breakers: newIceBreakers }));
                    }}
                    placeholder={`Sugestão ${index + 1}: Ex: "Me ajude a criar um plano de..."`}
                  />
                ))}
              </div>
            </div>

            {/* Knowledge Base Section */}
            {editingAgent && (
              <div className="border-t border-border pt-4">
                <AgentDocuments 
                  agentId={editingAgent.id} 
                  agentName={editingAgent.name} 
                />
              </div>
            )}
            {!editingAgent && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <p className="text-sm">
                    Salve o agente primeiro para adicionar documentos à base de conhecimento.
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Categorias (Tags)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTagForm(true)}
                  className="text-xs gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Nova Tag
                </Button>
              </div>
              
              {showTagForm && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <IconPicker
                    value={newTagIcon}
                    onChange={setNewTagIcon}
                    className="w-auto shrink-0"
                  />
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nome da tag..."
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleCreateTag}>
                    Criar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowTagForm(false);
                      setNewTagName('');
                      setNewTagIcon('Tag');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <IconPicker
                      value={tag.icon || 'Tag'}
                      onChange={(newIcon) => handleUpdateTag(tag, newIcon)}
                      className="w-auto shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium text-left transition-all ${
                        formData.selectedTags.includes(tag.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      {tag.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTag(tag)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Excluir tag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {tags.length === 0 && !showTagForm && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma tag criada ainda.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="is_active" className="font-normal cursor-pointer">
                  Agente ativo
                </Label>
              </div>

              <p className="text-xs text-muted-foreground">
                Use arrastar e soltar na lista para alterar a ordem de exibição.
              </p>
            </div>
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
      <AlertDialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteAgent?.name}"? Esta ação não
              pode ser desfeita e todas as conversas relacionadas podem ser
              afetadas.
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

      {/* Delete Tag Confirmation */}
      <AlertDialog open={!!deleteTag} onOpenChange={() => setDeleteTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tag "{deleteTag?.name}"? Ela será removida de todos os agentes que a utilizam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
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
