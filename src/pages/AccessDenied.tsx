import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, MessageCircle, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function AccessDenied() {
  const navigate = useNavigate();
  const [memberUrl, setMemberUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the lowest plan's upsell_hotmart_url to use as "Se Torne Membro" link
    const fetchMemberUrl = async () => {
      const { data } = await supabase
        .from('plan_types')
        .select('upsell_hotmart_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data?.upsell_hotmart_url) {
        setMemberUrl(data.upsell_hotmart_url);
      }
    };
    fetchMemberUrl();
  }, []);

  const handleSupport = () => {
    window.open('https://wa.me/5511999999999?text=Olá! Preciso de ajuda para acessar o CM Chat.', '_blank');
  };

  const handleBecomeMember = () => {
    if (memberUrl) {
      window.open(memberUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center animate-fade-in">
        <Logo size="lg" className="justify-center mb-6" />

        {/* Warning Icon */}
        <div className="w-20 h-20 bg-warning/20 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-10 h-10 text-warning" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            Acesso Negado
          </h1>
          <p className="text-muted-foreground">
            O email informado não está na nossa lista de alunos ativos.
          </p>
          <p className="text-sm text-muted-foreground">
            Se você é aluno e está vendo esta mensagem, entre em contato com nosso suporte.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {memberUrl && (
            <Button
              onClick={handleBecomeMember}
              className="w-full h-14 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Sparkles className="w-5 h-5" />
              Se Torne Membro
            </Button>
          )}

          <Button
            onClick={() => navigate('/login')}
            variant={memberUrl ? 'outline' : 'default'}
            className={`w-full h-14 gap-2 ${!memberUrl ? 'btn-cm-primary' : 'border-accent/20 text-foreground hover:bg-muted'}`}
          >
            <ArrowLeft className="w-5 h-5" />
            Tentar outro email
          </Button>

          <Button
            variant="outline"
            onClick={handleSupport}
            className="w-full h-14 gap-2 border-accent/20 text-foreground hover:bg-muted"
          >
            <MessageCircle className="w-5 h-5" />
            Falar com suporte
          </Button>
        </div>
      </div>
    </div>
  );
}
