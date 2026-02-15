import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithOtp, user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/home', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Verify if student is authorized
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'verify-student',
        {
          body: { email: email.toLowerCase().trim() },
        }
      );

      if (verifyError) {
        console.error('Verification error:', verifyError);
        toast({
          title: 'Erro na verificação',
          description: 'Não foi possível verificar seu acesso. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      // Step 2: Check verification result
      if (!verifyData.isVerified) {
        console.log('Student not verified:', verifyData.message);
        navigate('/access-denied');
        return;
      }

      // Store detected plan type and ID for post-login setup
      const detectedPlanType = verifyData.planType || 'basic';
      const detectedPlanId = verifyData.planId || null;
      localStorage.setItem('pending_plan_type', detectedPlanType);
      if (detectedPlanId) {
        localStorage.setItem('pending_plan_id', detectedPlanId);
      }
      console.log(`Detected plan: ${detectedPlanType}, id: ${detectedPlanId}`);

      // Step 3: Student is verified, send magic link
      const { error } = await signInWithOtp(email);

      if (error) {
        toast({
          title: 'Erro ao enviar código',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Código enviado!',
        description: 'Verifique seu email para obter o código de acesso.',
      });

      navigate('/verify', { state: { email } });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <Logo size="lg" className="justify-center mb-8" />
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Acesse a Magnetic.IA
          </h1>
          <p className="text-muted-foreground text-base">
            Seus agentes de IA para criar conteúdo magnético
          </p>
        </div>

        {/* Form Card */}
        <div className="card-cm p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="input-cm pl-12 h-14 text-base"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full btn-cm-primary h-14 text-base gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Receber link
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Acesso exclusivo para alunos da<br />
          <span className="text-primary font-semibold">Comunicadores Magnéticos</span>
        </p>
      </div>
    </div>
  );
}
