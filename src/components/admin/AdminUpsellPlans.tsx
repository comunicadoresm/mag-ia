import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Save, GripVertical, ExternalLink } from 'lucide-react';

interface UpsellPlan {
  id: string;
  type: string;
  name: string;
  description: string | null;
  credits: number;
  credits_label: string | null;
  price_brl: number;
  price_label: string | null;
  per_credit_label: string | null;
  hotmart_url: string;
  button_text: string;
  badge_text: string | null;
  features: string[];
  display_order: number;
  is_active: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  magnetic: '🏆 Plano Principal',
  subscription: '🔄 Assinatura Mensal',
  package: '📦 Pacote Avulso',
};

export function AdminUpsellPlans() {
  const [plans, setPlans] = useState<UpsellPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('upsell_plans')
      .select('*')
      .order('display_order');

    if (!error && data) {
      setPlans(data.map(p => ({
        ...p,
        features: Array.isArray(p.features) ? p.features as string[] : [],
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleSave = async (plan: UpsellPlan) => {
    setSaving(plan.id);
    const { error } = await supabase
      .from('upsell_plans')
      .update({
        type: plan.type,
        name: plan.name,
        description: plan.description,
        credits: plan.credits,
        credits_label: plan.credits_label,
        price_brl: plan.price_brl,
        price_label: plan.price_label,
        per_credit_label: plan.per_credit_label,
        hotmart_url: plan.hotmart_url,
        button_text: plan.button_text,
        badge_text: plan.badge_text,
        features: plan.features as any,
        display_order: plan.display_order,
        is_active: plan.is_active,
      })
      .eq('id', plan.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Salvo!', description: `${plan.name} atualizado com sucesso.` });
    }
    setSaving(null);
  };

  const handleAdd = async () => {
    const maxOrder = plans.reduce((max, p) => Math.max(max, p.display_order), 0);
    const { data, error } = await supabase
      .from('upsell_plans')
      .insert({
        type: 'package',
        name: 'Novo Pacote',
        description: 'Descrição do pacote',
        credits: 10,
        price_brl: 19.90,
        price_label: 'único',
        hotmart_url: '',
        button_text: 'Comprar',
        display_order: maxOrder + 1,
      })
      .select()
      .single();

    if (!error && data) {
      setPlans(prev => [...prev, { ...data, features: [] }]);
      toast({ title: 'Plano criado', description: 'Edite os campos e salve.' });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('upsell_plans').delete().eq('id', id);
    if (!error) {
      setPlans(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Excluído' });
    }
  };

  const updatePlan = (id: string, field: keyof UpsellPlan, value: any) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const updateFeature = (planId: string, index: number, value: string) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      const newFeatures = [...p.features];
      newFeatures[index] = value;
      return { ...p, features: newFeatures };
    }));
  };

  const addFeature = (planId: string) => {
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, features: [...p.features, ''] } : p
    ));
  };

  const removeFeature = (planId: string, index: number) => {
    setPlans(prev => prev.map(p => {
      if (p.id !== planId) return p;
      return { ...p, features: p.features.filter((_, i) => i !== index) };
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const grouped = {
    magnetic: plans.filter(p => p.type === 'magnetic'),
    subscription: plans.filter(p => p.type === 'subscription'),
    package: plans.filter(p => p.type === 'package'),
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure nomes, preços, créditos, links da Hotmart e textos de cada plano/pacote.
        </p>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar Plano
        </Button>
      </div>

      {Object.entries(grouped).map(([type, typePlans]) => (
        <div key={type}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            {TYPE_LABELS[type] || type}
          </h3>
          <div className="space-y-4">
            {typePlans.map((plan) => (
              <Card key={plan.id} className={`border ${!plan.is_active ? 'opacity-50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      {plan.badge_text && (
                        <Badge variant="outline" className="text-xs">{plan.badge_text}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Ativo</Label>
                        <Switch
                          checked={plan.is_active}
                          onCheckedChange={(v) => updatePlan(plan.id, 'is_active', v)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(plan.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Row 1: Type, Name, Badge */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Select value={plan.type} onValueChange={(v) => updatePlan(plan.id, 'type', v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="magnetic">Plano Principal</SelectItem>
                          <SelectItem value="subscription">Assinatura</SelectItem>
                          <SelectItem value="package">Pacote Avulso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Nome</Label>
                      <Input className="h-9" value={plan.name} onChange={(e) => updatePlan(plan.id, 'name', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Badge (opcional)</Label>
                      <Input className="h-9" value={plan.badge_text || ''} placeholder="Ex: Mais popular"
                        onChange={(e) => updatePlan(plan.id, 'badge_text', e.target.value || null)} />
                    </div>
                  </div>

                  {/* Row 2: Description */}
                  <div>
                    <Label className="text-xs">Descrição</Label>
                    <Input className="h-9" value={plan.description || ''} placeholder="Descrição curta"
                      onChange={(e) => updatePlan(plan.id, 'description', e.target.value)} />
                  </div>

                  {/* Row 3: Credits, Price, Labels */}
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <Label className="text-xs">Créditos</Label>
                      <Input type="number" className="h-9" value={plan.credits}
                        onChange={(e) => updatePlan(plan.id, 'credits', parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">Label créditos</Label>
                      <Input className="h-9" value={plan.credits_label || ''} placeholder="/mês"
                        onChange={(e) => updatePlan(plan.id, 'credits_label', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Preço (R$)</Label>
                      <Input type="number" step="0.01" className="h-9" value={plan.price_brl}
                        onChange={(e) => updatePlan(plan.id, 'price_brl', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label className="text-xs">Label preço</Label>
                      <Input className="h-9" value={plan.price_label || ''} placeholder="/ano"
                        onChange={(e) => updatePlan(plan.id, 'price_label', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Preço/crédito</Label>
                      <Input className="h-9" value={plan.per_credit_label || ''} placeholder="R$1,35/cred"
                        onChange={(e) => updatePlan(plan.id, 'per_credit_label', e.target.value)} />
                    </div>
                  </div>

                  {/* Row 4: Hotmart URL and Button text */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs flex items-center gap-1">
                        Link Hotmart <ExternalLink className="w-3 h-3" />
                      </Label>
                      <Input className="h-9" value={plan.hotmart_url} placeholder="https://pay.hotmart.com/..."
                        onChange={(e) => updatePlan(plan.id, 'hotmart_url', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Texto do botão</Label>
                      <Input className="h-9" value={plan.button_text}
                        onChange={(e) => updatePlan(plan.id, 'button_text', e.target.value)} />
                    </div>
                  </div>

                  {/* Row 5: Display order */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Ordem</Label>
                      <Input type="number" className="h-9" value={plan.display_order}
                        onChange={(e) => updatePlan(plan.id, 'display_order', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>

                  {/* Features (for magnetic plan) */}
                  {plan.type === 'magnetic' && (
                    <div>
                      <Label className="text-xs">Features (bullet points)</Label>
                      <div className="space-y-2 mt-1">
                        {plan.features.map((feat, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input className="h-8 text-sm" value={feat}
                              onChange={(e) => updateFeature(plan.id, i, e.target.value)} />
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                              onClick={() => removeFeature(plan.id, i)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addFeature(plan.id)} className="text-xs">
                          + Adicionar feature
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Save button */}
                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={() => handleSave(plan)} disabled={saving === plan.id} className="gap-2">
                      {saving === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {typePlans.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum plano deste tipo.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
