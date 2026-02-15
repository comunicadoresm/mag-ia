import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Save, Edit2, Trash2, ExternalLink } from 'lucide-react';

interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits_amount: number;
  package_type: string;
  credits_expire_days: number | null;
  price_brl: number;
  price_label: string | null;
  per_credit_label: string | null;
  hotmart_url: string | null;
  hotmart_product_id: string | null;
  badge_text: string | null;
  display_order: number;
  is_active: boolean;
  min_plan_order: number;
}

const defaultPkg: Omit<CreditPackage, 'id'> = {
  name: '', description: '', credits_amount: 10, package_type: 'one_time',
  credits_expire_days: null, price_brl: 19.90, price_label: '', per_credit_label: '',
  hotmart_url: '', hotmart_product_id: null, badge_text: null, display_order: 0,
  is_active: true, min_plan_order: 2,
};

export function AdminCreditPackages() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CreditPackage | null>(null);
  const [formData, setFormData] = useState<Omit<CreditPackage, 'id'>>(defaultPkg);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase.from('credit_packages').select('*').order('display_order');
    if (data) setPackages(data as CreditPackage[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openForm = (pkg?: CreditPackage) => {
    if (pkg) { setEditing(pkg); setFormData({ ...pkg }); }
    else { setEditing(null); setFormData({ ...defaultPkg, display_order: packages.length }); }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { ...formData };
      if (editing) {
        const { error } = await supabase.from('credit_packages').update(payload as any).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('credit_packages').insert(payload as any);
        if (error) throw error;
      }
      toast({ title: editing ? 'Pacote atualizado' : 'Pacote criado' });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('credit_packages').delete().eq('id', id);
    fetchData();
    toast({ title: 'Excluído' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const recurring = packages.filter(p => p.package_type === 'recurring');
  const oneTime = packages.filter(p => p.package_type === 'one_time');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{packages.length} pacote(s)</p>
        <Button onClick={() => openForm()} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Novo Pacote</Button>
      </div>

      {[{ title: '🔄 Assinaturas Mensais', items: recurring }, { title: '📦 Pacotes Avulsos', items: oneTime }].map(({ title, items }) => (
        <div key={title}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h3>
          <div className="space-y-2">
            {items.map(pkg => (
              <Card key={pkg.id} className={`border ${!pkg.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-sm">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">{pkg.credits_amount} créditos • R${Number(pkg.price_brl).toFixed(2)} • {pkg.per_credit_label}</p>
                    </div>
                    {pkg.badge_text && <Badge variant="outline" className="text-xs">{pkg.badge_text}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(pkg)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(pkg.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">Nenhum pacote deste tipo.</p>}
          </div>
        </div>
      ))}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Pacote' : 'Novo Pacote'}</DialogTitle>
            <DialogDescription>Configure o pacote de créditos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={formData.package_type} onValueChange={v => setFormData(p => ({ ...p, package_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">Avulso</SelectItem>
                    <SelectItem value="recurring">Assinatura Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Créditos</Label>
                <Input type="number" value={formData.credits_amount} onChange={e => setFormData(p => ({ ...p, credits_amount: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preço (R$)</Label>
                <Input type="number" step="0.01" value={formData.price_brl} onChange={e => setFormData(p => ({ ...p, price_brl: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Plano mínimo (ordem)</Label>
                <Input type="number" value={formData.min_plan_order} onChange={e => setFormData(p => ({ ...p, min_plan_order: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Label preço</Label><Input value={formData.price_label || ''} onChange={e => setFormData(p => ({ ...p, price_label: e.target.value }))} placeholder="R$ 27/mês" /></div>
              <div className="space-y-1"><Label className="text-xs">Preço/crédito</Label><Input value={formData.per_credit_label || ''} onChange={e => setFormData(p => ({ ...p, per_credit_label: e.target.value }))} placeholder="R$ 1,35/crédito" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Badge</Label><Input value={formData.badge_text || ''} onChange={e => setFormData(p => ({ ...p, badge_text: e.target.value || null }))} placeholder="MAIS POPULAR" /></div>
              <div className="space-y-1"><Label className="text-xs">Hotmart Product ID</Label><Input value={formData.hotmart_product_id || ''} onChange={e => setFormData(p => ({ ...p, hotmart_product_id: e.target.value || null }))} /></div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">URL Hotmart <ExternalLink className="w-3 h-3" /></Label>
              <Input value={formData.hotmart_url || ''} onChange={e => setFormData(p => ({ ...p, hotmart_url: e.target.value }))} placeholder="https://pay.hotmart.com/..." />
            </div>
            {formData.package_type === 'recurring' && (
              <div className="space-y-1">
                <Label className="text-xs">Expiração créditos (dias)</Label>
                <Input type="number" value={formData.credits_expire_days ?? 30} onChange={e => setFormData(p => ({ ...p, credits_expire_days: parseInt(e.target.value) || 30 }))} />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_active} onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))} />
              <Label className="text-xs">Ativo</Label>
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
