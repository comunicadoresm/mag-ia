import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RequireSetupModalProps {
  open: boolean;
}

export function RequireSetupModal({ open }: RequireSetupModalProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ name: name.trim(), has_completed_setup: true } as any)
        .eq('id', user.id);

      // Also ensure user_metrics row exists
      await supabase.from('user_metrics').upsert(
        { user_id: user.id, initial_setup_done: true },
        { onConflict: 'user_id' }
      );

      await refreshProfile();
      toast({ title: 'Pronto!', description: 'Perfil configurado com sucesso.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    // Mark a temporary skip — modal will show again next time (has_completed_setup stays false)
    // We just close by marking a session flag, not persisting to DB
    setSkipping(true);
    try {
      // We still save the name if they typed it, but DON'T mark has_completed_setup = true
      if (user && name.trim()) {
        await supabase
          .from('profiles')
          .update({ name: name.trim() } as any)
          .eq('id', user.id);
        await refreshProfile();
      }
      // Store session flag so the modal doesn't reappear this session
      sessionStorage.setItem('setup_skipped_this_session', '1');
      // Force a re-render by refreshing profile
      await refreshProfile();
    } finally {
      setSkipping(false);
    }
  };

  return (
    <Dialog open={open} modal>
      <DialogContent
        className="max-w-md [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="text-center mb-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Bem-vindo à Magnetic.IA!</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Antes de começar, precisamos saber como te chamar.
          </p>
        </div>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="setup-name" className="text-sm font-medium">
              Qual é o seu nome?
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="setup-name"
                placeholder="Ex: Maria Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleSave()}
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!name.trim() || loading}
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
            ) : (
              'Continuar'
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={loading || skipping}
            className="w-full text-muted-foreground text-sm"
          >
            {skipping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Preencher depois'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
