import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import logoSymbol from '@/assets/logo-symbol.png';

interface BasicInfoFlowProps {
  onComplete: () => void;
}

export function BasicInfoFlow({ onComplete }: BasicInfoFlowProps) {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);

    try {
      // 1. Salvar nome no profiles
      await supabase
        .from('profiles')
        .update({ name: name.trim() } as any)
        .eq('id', user.id);

      // 2. Salvar/atualizar handle no user_metrics
      const { data: existingMetrics } = await supabase
        .from('user_metrics')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMetrics) {
        await supabase
          .from('user_metrics')
          .update({ handle: handle.trim(), display_name: name.trim() })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_metrics')
          .insert({
            user_id: user.id,
            handle: handle.trim(),
            display_name: name.trim(),
            initial_setup_done: true,
            current_followers: 0,
            current_revenue: 0,
            current_clients: 0,
            initial_followers: 0,
            initial_revenue: 0,
            initial_clients: 0,
            initial_views: 0,
          });
      }

      // 3. Marcar has_completed_setup = true
      await supabase
        .from('profiles')
        .update({ has_completed_setup: true } as any)
        .eq('id', user.id);

      await refreshProfile();
      onComplete();
    } catch (err) {
      console.error('BasicInfo save error:', err);
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 flex flex-col min-h-[55vh]">
      {/* Hero */}
      <div className="text-center space-y-3 pt-2">
        <img
          src={logoSymbol}
          alt="Comunicadores Magnéticos"
          className="w-14 h-14 mx-auto object-contain"
        />
        <h2 className="text-xl font-bold text-foreground">
          Bem-vindo(a) à Magnetic.IA
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Vamos configurar a sua identidade magnética para criar conteúdos com a sua{' '}
          <strong className="text-foreground">voz narrativa</strong>.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Como você quer ser chamado?
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Giullya"
            className="w-full px-4 py-3 bg-muted/10 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Qual seu @ principal? (Instagram, TikTok...)
          </label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="ex: @giubeckers"
            className="w-full px-4 py-3 bg-muted/10 border border-border/30 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTA */}
      <div className="space-y-2">
        <Button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="w-full h-12 rounded-xl text-base font-semibold gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Começar configuração →'}
        </Button>
        <p className="text-[11px] text-muted-foreground/60 text-center">
          Leva menos de 3 minutos
        </p>
      </div>
    </div>
  );
}
