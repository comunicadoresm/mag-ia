import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw, Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Verify() {
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signInWithOtp } = useAuth();

  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    setResending(true);

    try {
      const { error } = await signInWithOtp(email);

      if (error) {
        toast({
          title: 'Erro ao reenviar',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Link reenviado!',
        description: 'Verifique seu email novamente.',
      });

      setCountdown(60);
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => navigate('/login')}
        className="self-start gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-8 animate-fade-in">
        <Logo size="lg" className="justify-center" />

        {/* Email Icon */}
        <div className="icon-circle w-20 h-20 rounded-2xl">
          <Mail className="w-10 h-10" />
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            Link mágico enviado!
          </h1>
          <p className="text-muted-foreground">
            Enviamos um link de acesso para
          </p>
          <p className="text-primary font-semibold text-lg">{email}</p>
        </div>

        {/* Card with instructions */}
        <div className="card-cm p-6 w-full text-center space-y-4">
          <p className="text-foreground">
            Acesse seu e-mail e clique no link para fazer login automaticamente.
          </p>
          <p className="text-sm text-muted-foreground">
            O link expira em 1 hora.
          </p>
        </div>

        {/* Resend */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Não recebeu o e-mail?
          </p>
          <Button
            variant="ghost"
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="gap-2 text-primary hover:text-primary/80 hover:bg-primary/10"
          >
            {resending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reenviando...
              </>
            ) : countdown > 0 ? (
              `Reenviar em ${countdown}s`
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Reenviar link
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
