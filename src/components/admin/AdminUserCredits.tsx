import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Coins, Plus, Minus, Loader2 } from 'lucide-react';

interface UserCreditRow {
  user_id: string;
  email: string;
  name: string | null;
  plan_type: string | null;
  plan_credits: number;
  subscription_credits: number;
  bonus_credits: number;
  total: number;
}

interface AdjustForm {
  userId: string;
  email: string;
  amount: number;
  type: 'plan_credits' | 'subscription_credits' | 'bonus_credits';
  reason: string;
}

export function AdminUserCredits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserCreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustForm, setAdjustForm] = useState<AdjustForm | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name, plan_type')
        .order('email');

      if (profilesError) throw profilesError;

      // Get all credits
      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('user_id, plan_credits, subscription_credits, bonus_credits');

      if (creditsError) throw creditsError;

      const creditsMap = new Map(credits?.map(c => [c.user_id, c]) || []);

      const rows: UserCreditRow[] = (profiles || []).map(p => {
        const c = creditsMap.get(p.id);
        const plan = c?.plan_credits || 0;
        const sub = c?.subscription_credits || 0;
        const bonus = c?.bonus_credits || 0;
        return {
          user_id: p.id,
          email: p.email,
          name: p.name,
          plan_type: p.plan_type,
          plan_credits: plan,
          subscription_credits: sub,
          bonus_credits: bonus,
          total: plan + sub + bonus,
        };
      });

      setUsers(rows);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = users.filter(u =>
    !searchQuery ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdjust = async () => {
    if (!adjustForm || !adjustForm.reason.trim() || adjustForm.amount === 0) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Get current credits
      const { data: current, error: fetchErr } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', adjustForm.userId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const currentVal = current ? (current as any)[adjustForm.type] || 0 : 0;
      const newVal = Math.max(0, currentVal + adjustForm.amount);

      if (current) {
        const { error } = await supabase
          .from('user_credits')
          .update({ [adjustForm.type]: newVal })
          .eq('user_id', adjustForm.userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_credits')
          .insert({
            user_id: adjustForm.userId,
            [adjustForm.type]: newVal,
          });
        if (error) throw error;
      }

      // Log transaction
      const totalAfter = (current?.plan_credits || 0) + (current?.subscription_credits || 0) + (current?.bonus_credits || 0) + adjustForm.amount;
      await supabase.from('credit_transactions').insert({
        user_id: adjustForm.userId,
        type: 'admin_adjustment',
        amount: adjustForm.amount,
        source: 'admin_adjustment',
        balance_after: Math.max(0, totalAfter),
        metadata: { reason: adjustForm.reason, adjusted_by: user?.id, field: adjustForm.type },
      });

      toast({ title: 'Créditos ajustados com sucesso' });
      setAdjustForm(null);
      fetchUsers();
    } catch (err) {
      console.error('Error adjusting credits:', err);
      toast({ title: 'Erro ao ajustar créditos', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const planBadge = (plan: string | null) => {
    if (plan === 'magnetic') return <Badge className="bg-primary text-primary-foreground">Magnético</Badge>;
    if (plan === 'basic') return <Badge variant="secondary">Básico</Badge>;
    return <Badge variant="outline">Nenhum</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou nome..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Plano</TableHead>
                <TableHead className="text-right">Assinatura</TableHead>
                <TableHead className="text-right">Bônus</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground text-sm">{u.name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{planBadge(u.plan_type)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{u.plan_credits}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{u.subscription_credits}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{u.bonus_credits}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold">{u.total}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAdjustForm({
                        userId: u.user_id,
                        email: u.email,
                        amount: 0,
                        type: 'bonus_credits',
                        reason: '',
                      })}
                    >
                      <Coins className="w-3.5 h-3.5 mr-1" />
                      Ajustar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Adjust Modal */}
      <Dialog open={!!adjustForm} onOpenChange={open => !open && setAdjustForm(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Ajustar Créditos</DialogTitle>
          </DialogHeader>
          {adjustForm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{adjustForm.email}</p>

              <div className="space-y-2">
                <Label>Tipo de crédito</Label>
                <select
                  className="w-full rounded-lg border border-border bg-input p-2 text-foreground text-sm"
                  value={adjustForm.type}
                  onChange={e => setAdjustForm({ ...adjustForm, type: e.target.value as any })}
                >
                  <option value="bonus_credits">Bônus (não expiram)</option>
                  <option value="plan_credits">Plano</option>
                  <option value="subscription_credits">Assinatura</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade (positivo = adicionar, negativo = remover)</Label>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={() => setAdjustForm({ ...adjustForm, amount: adjustForm.amount - 1 })}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustForm.amount}
                    onChange={e => setAdjustForm({ ...adjustForm, amount: parseInt(e.target.value) || 0 })}
                    className="text-center"
                  />
                  <Button size="icon" variant="outline" onClick={() => setAdjustForm({ ...adjustForm, amount: adjustForm.amount + 1 })}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivo (obrigatório)</Label>
                <Textarea
                  placeholder="Ex: Compensação por erro, bônus de teste..."
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustForm(null)}>Cancelar</Button>
            <Button onClick={handleAdjust} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
