import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Save, Edit2, ExternalLink, Crown } from 'lucide-react';

const ALL_FEATURES = [
  { slug: 'kanban_full', label: 'Kanban completo' },
  { slug: 'dashboard', label: 'Dashboard' },
  { slug: 'agents_page', label: 'Página de agentes' },
  { slug: 'ai_generation', label: 'Gerar com IA' },
  { slug: 'ai_chat', label: 'Chat com agentes' },
  { slug: 'script_ai_write', label: 'Escrever com IA (Kanban)' },
  { slug: 'script_ai_adjust', label: 'Ajustar com IA (Kanban)' },
  { slug: 'chat_history', label: 'Histórico de conversas' },
];

interface PlanType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  ac_tag: string;
  initial_credits: number;
  credits_expire_days: number | null;
  has_monthly_renewal: boolean;
  monthly_credits: number;
  can_buy_extra_credits: boolean;
  show_as_upsell: boolean;
  upsell_price_label: string | null;
  upsell_badge_text: string | null;
  upsell_button_text: string;
  upsell_hotmart_url: string | null;
  upsell_features: string[];
  hotmart_product_id: string | null;
  color: string;
  icon: string | null;
}

interface PlanFeature {
  id: string;
  plan_type_id: string;
  feature_slug: string;
  is_enabled: boolean;
}

const defaultPlan: Omit<PlanType, 'id'> = {
  slug: '', name: '', description: '', display_order: 0, is_active: true,
  ac_tag: '', initial_credits: 0, credits_expire_days: null,
  has_monthly_renewal: false, monthly_credits: 0, can_buy_extra_credits: false,
  show_as_upsell: false, upsell_price_label: '', upsell_badge_text: '',
  upsell_button_text: 'Fazer Upgrade', upsell_hotmart_url: '',
  upsell_features: [], hotmart_product_id: null, color: '#6366f1', icon: null,
};

export function AdminPlanTypes() {
  const [plans, setPlans] = useState<PlanType[]>([]);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanType | null>(null);
  const [formData, setFormData] = useState<Omit<PlanType, 'id'>>(defaultPlan);
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const [plansRes, featuresRes] = await Promise.all([
      supabase.from('plan_types').select('*').order('display_order'),
      supabase.from('plan_features').select('*'),
    ]);
    if (plansRes.data) {
      setPlans(plansRes.data.map(p => ({
        ...p,
        upsell_features: Array.isArray(p.upsell_features) ? p.upsell_features as string[] : [],
      })));
    }
    if (featuresRes.data) setFeatures(featuresRes.data as PlanFeature[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

  const openForm = (plan?: PlanType) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({ ...plan });
      const planFeats = features.filter(f => f.plan_type_id === plan.id && f.is_enabled).map(f => f.feature_slug);
      setFormFeatures(planFeats);
    } else {
      setEditingPlan(null);
      setFormData({ ...defaultPlan, display_order: plans.length + 1 });
      setFormFeatures([]);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.ac_tag) {
      toast({ title: 'Campos obrigatórios', description: 'Nome, slug e tag AC são obrigatórios.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: formData.slug, name: formData.name, description: formData.description,
        display_order: formData.display_order, is_active: formData.is_active,
        ac_tag: formData.ac_tag, initial_credits: formData.initial_credits,
        credits_expire_days: formData.credits_expire_days,
        has_monthly_renewal: formData.has_monthly_renewal, monthly_credits: formData.monthly_credits,
        can_buy_extra_credits: formData.can_buy_extra_credits, show_as_upsell: formData.show_as_upsell,
        upsell_price_label: formData.upsell_price_label, upsell_badge_text: formData.upsell_badge_text,
        upsell_button_text: formData.upsell_button_text, upsell_hotmart_url: formData.upsell_hotmart_url,
        upsell_features: formData.upsell_features as any, hotmart_product_id: formData.hotmart_product_id,
        color: formData.color, icon: formData.icon,
      };

      let planId: string;
      if (editingPlan) {
        const { error } = await supabase.from('plan_types').update(payload).eq('id', editingPlan.id);
        if (error) throw error;
        planId = editingPlan.id;
      } else {
        const { data, error } = await supabase.from('plan_types').insert(payload).select().single();
        if (error) throw error;
        planId = data.id;
      }

      // Sync features
      await supabase.from('plan_features').delete().eq('plan_type_id', planId);
      if (formFeatures.length > 0) {
        await supabase.from('plan_features').insert(
          formFeatures.map(slug => ({ plan_type_id: planId, feature_slug: slug, is_enabled: true }))
        );
      }

      toast({ title: editingPlan ? 'Plano atualizado' : 'Plano criado' });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (slug: string) => {
    setFormFeatures(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{plans.length} plano(s) cadastrado(s)</p>
        <Button onClick={() => openForm()} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Novo Plano</Button>
      </div>

      <div className="space-y-3">
        {plans.map(plan => {
          const planFeats = features.filter(f => f.plan_type_id === plan.id && f.is_enabled);
          return (
            <Card key={plan.id} className={`border ${!plan.is_active ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: plan.color }}>
                      {plan.icon || plan.display_order}
                    </div>
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">slug: {plan.slug} | tag: {plan.ac_tag}</p>
                    </div>
                    {plan.show_as_upsell && <Badge variant="outline" className="text-xs">Upsell</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-xs">
                      {plan.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(plan)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Créditos iniciais:</span> <strong>{plan.initial_credits}</strong></div>
                  <div><span className="text-muted-foreground">Expira em:</span> <strong>{plan.credits_expire_days ? `${plan.credits_expire_days} dias` : 'Não'}</strong></div>
                  <div><span className="text-muted-foreground">Renova/mês:</span> <strong>{plan.has_monthly_renewal ? `${plan.monthly_credits}/mês` : 'Não'}</strong></div>
                  <div><span className="text-muted-foreground">Compra extras:</span> <strong>{plan.can_buy_extra_credits ? 'Sim' : 'Não'}</strong></div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {planFeats.map(f => (
                    <Badge key={f.feature_slug} variant="secondary" className="text-[10px]">{f.feature_slug}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
            <DialogDescription>Configure todas as propriedades do plano.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Identification */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value, slug: editingPlan ? p.slug : generateSlug(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Slug *</Label>
                <Input value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ordem hierarquia</Label>
                <Input type="number" value={formData.display_order} onChange={e => setFormData(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={formData.description || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>

            {/* ActiveCampaign */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tag ActiveCampaign *</Label>
                <Input value={formData.ac_tag} onChange={e => setFormData(p => ({ ...p, ac_tag: e.target.value }))} placeholder="MAGNETIC-IA-BASICO" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hotmart Product ID</Label>
                <Input value={formData.hotmart_product_id || ''} onChange={e => setFormData(p => ({ ...p, hotmart_product_id: e.target.value || null }))} />
              </div>
            </div>

            {/* Credits */}
            <div className="border-t pt-3 space-y-3">
              <Label className="text-sm font-semibold">Créditos</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Créditos iniciais</Label>
                  <Input type="number" value={formData.initial_credits} onChange={e => setFormData(p => ({ ...p, initial_credits: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expira em (dias)</Label>
                  <Input type="number" value={formData.credits_expire_days ?? ''} placeholder="Não expira" onChange={e => setFormData(p => ({ ...p, credits_expire_days: e.target.value ? parseInt(e.target.value) : null }))} />
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.has_monthly_renewal} onCheckedChange={v => setFormData(p => ({ ...p, has_monthly_renewal: v }))} />
                    <Label className="text-xs">Renova mensalmente</Label>
                  </div>
                </div>
              </div>
              {formData.has_monthly_renewal && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Créditos mensais</Label>
                    <Input type="number" value={formData.monthly_credits} onChange={e => setFormData(p => ({ ...p, monthly_credits: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Switch checked={formData.can_buy_extra_credits} onCheckedChange={v => setFormData(p => ({ ...p, can_buy_extra_credits: v }))} />
                <Label className="text-xs">Pode comprar créditos extras</Label>
              </div>
            </div>

            {/* Upsell */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={formData.show_as_upsell} onCheckedChange={v => setFormData(p => ({ ...p, show_as_upsell: v }))} />
                <Label className="text-sm font-semibold">Mostrar como opção de upgrade</Label>
              </div>
              {formData.show_as_upsell && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Label preço</Label>
                      <Input value={formData.upsell_price_label || ''} onChange={e => setFormData(p => ({ ...p, upsell_price_label: e.target.value }))} placeholder="R$ 197/ano" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Badge</Label>
                      <Input value={formData.upsell_badge_text || ''} onChange={e => setFormData(p => ({ ...p, upsell_badge_text: e.target.value }))} placeholder="MAIS POPULAR" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Texto botão</Label>
                      <Input value={formData.upsell_button_text} onChange={e => setFormData(p => ({ ...p, upsell_button_text: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">URL Hotmart <ExternalLink className="w-3 h-3" /></Label>
                    <Input value={formData.upsell_hotmart_url || ''} onChange={e => setFormData(p => ({ ...p, upsell_hotmart_url: e.target.value }))} placeholder="https://pay.hotmart.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Benefícios (features do upsell)</Label>
                    {formData.upsell_features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input className="h-8 text-sm" value={f} onChange={e => {
                          const arr = [...formData.upsell_features]; arr[i] = e.target.value;
                          setFormData(p => ({ ...p, upsell_features: arr }));
                        }} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setFormData(p => ({ ...p, upsell_features: p.upsell_features.filter((_, idx) => idx !== i) }))}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setFormData(p => ({ ...p, upsell_features: [...p.upsell_features, ''] }))}>+ Adicionar</Button>
                  </div>
                </>
              )}
            </div>

            {/* Visual */}
            <div className="border-t pt-3 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cor</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={formData.color} onChange={e => setFormData(p => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                  <Input value={formData.color} onChange={e => setFormData(p => ({ ...p, color: e.target.value }))} className="h-8" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ícone/Emoji</Label>
                <Input value={formData.icon || ''} onChange={e => setFormData(p => ({ ...p, icon: e.target.value || null }))} placeholder="👑" />
              </div>
            </div>

            {/* Features */}
            <div className="border-t pt-3 space-y-2">
              <Label className="text-sm font-semibold">Funcionalidades habilitadas</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_FEATURES.map(f => (
                  <div key={f.slug} className="flex items-center gap-2">
                    <Checkbox checked={formFeatures.includes(f.slug)} onCheckedChange={() => toggleFeature(f.slug)} />
                    <Label className="text-xs font-normal cursor-pointer">{f.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t">
              <Switch checked={formData.is_active} onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))} />
              <Label className="text-xs">Plano ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
