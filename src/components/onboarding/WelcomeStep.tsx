import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);

  const canContinue = name.trim().length >= 2 && handle.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canContinue || !user) return;
    setSaving(true);

    try {
      await supabase
        .from('profiles')
        .update({ name: name.trim(), onboarding_step: 'voice_dna' } as any)
        .eq('id', user.id);

      const { data: existingMetrics } = await supabase
        .from('user_metrics')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMetrics) {
        await supabase
          .from('user_metrics')
          .update({ handle: handle.trim().replace(/^@/, ''), display_name: name.trim() })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_metrics')
          .insert({
            user_id: user.id,
            handle: handle.trim().replace(/^@/, ''),
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

      await refreshProfile();
      onNext();
    } catch (err) {
      console.error('Erro ao salvar boas-vindas:', err);
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col px-6 py-7 animate-fade-in">
      <div className="w-full flex flex-col">
        {/* Hero */}
        <div className="text-center mt-10">
          <div className="text-5xl mb-3">✨</div>
          <h2 className="text-[26px] font-bold tracking-tight text-[#fafafa] leading-tight">
            Bem-vindo à
            <br />
            <span className="text-[#fafafa]">Magnetic.IA</span>
          </h2>
          <p className="text-sm text-[#999] mt-3 max-w-[300px] mx-auto leading-relaxed">
            Vamos configurar sua identidade para que a IA crie conteúdo com a{' '}
            <strong className="text-[#FAFC59]">sua voz</strong>.
          </p>
        </div>

        {/* Inputs */}
        <div className="mt-8 space-y-5">
          <div>
            <label className="text-xs font-semibold text-[#999] mb-2 block">
              Como você quer ser chamado?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full py-3.5 px-4 bg-white/[0.05] text-[#fafafa] border border-white/[0.06] rounded-xl text-sm placeholder:text-[#666] focus:border-[#FAFC59]/40 focus:outline-none focus:ring-[3px] focus:ring-[#FAFC59]/[0.08] transition-colors duration-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#999] mb-2 block">
              Qual seu @ principal? (Instagram, TikTok...)
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@seuarroba_"
              className="w-full py-3.5 px-4 bg-white/[0.05] text-[#fafafa] border border-white/[0.06] rounded-xl text-sm placeholder:text-[#666] focus:border-[#FAFC59]/40 focus:outline-none focus:ring-[3px] focus:ring-[#FAFC59]/[0.08] transition-colors duration-200"
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        <div className="mt-6 pb-4">
          <button
            onClick={handleSubmit}
            disabled={!canContinue || saving}
            className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-[#141414]/30 border-t-[#141414] rounded-full animate-spin" />
            ) : (
              'Começar configuração →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
