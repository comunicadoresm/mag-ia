import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Zap, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FirstScriptFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface ScriptSuggestion {
  title: string;
  style: string;
  style_label: string;
  format: string;
  duration: string;
  justification: string;
}

interface GeneratedScript {
  title: string;
  style: string;
  script_content: {
    inicio: { title: string; sections: { id: string; label: string; content: string }[] };
    desenvolvimento: { title: string; sections: { id: string; label: string; content: string }[] };
    final: { title: string; sections: { id: string; label: string; content: string }[] };
  };
}

type FlowState = 'processing' | 'suggestion' | 'generating' | 'result';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ProcessingStep({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-3 text-sm ${
      done ? 'text-green-400' : active ? 'text-primary' : 'text-muted-foreground/40'
    }`}>
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {done ? (
          <CheckCircle className="w-4 h-4" />
        ) : active ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-current opacity-40" />
        )}
      </div>
      <span>{label}</span>
    </div>
  );
}

function ScriptSection({ emoji, label, sections }: {
  emoji: string;
  label: string;
  sections: { id: string; label: string; content: string }[];
}) {
  return (
    <div className="bg-muted/10 rounded-xl p-3 border-l-[3px] border-primary">
      <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
        {emoji} {label}
      </p>
      {sections.map((section) => (
        <div key={section.id} className="mb-2 last:mb-0">
          {sections.length > 1 && (
            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
              {section.label}
            </p>
          )}
          <p className="text-sm text-foreground/80 leading-relaxed">
            {section.content}
          </p>
        </div>
      ))}
    </div>
  );
}

export function FirstScriptFlow({ onComplete, onSkip }: FirstScriptFlowProps) {
  const { user } = useAuth();
  const [state, setState] = useState<FlowState>('processing');
  const [suggestion, setSuggestion] = useState<ScriptSuggestion | null>(null);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [processingSteps, setProcessingSteps] = useState({
    voiceDna: false,
    format: false,
    narrative: false,
    generating: false,
  });

  useEffect(() => {
    if (!user) return;
    fetchSuggestion();
  }, [user]);

  const fetchSuggestion = async () => {
    if (!user) return;

    try {
      await delay(600);
      setProcessingSteps(p => ({ ...p, voiceDna: true }));
      await delay(500);
      setProcessingSteps(p => ({ ...p, format: true }));
      await delay(500);
      setProcessingSteps(p => ({ ...p, narrative: true }));
      await delay(400);
      setProcessingSteps(p => ({ ...p, generating: true }));

      const { data, error } = await supabase.functions.invoke('generate-first-script', {
        body: {
          user_id: user.id,
          action: 'suggest',
        },
      });

      if (error) throw error;

      setSuggestion(data.suggestion);
      setState('suggestion');
    } catch (err) {
      console.error('Suggest error:', err);
      toast.error('Erro ao gerar sugestão. Você pode criar seu primeiro roteiro no Kanban.');
      onSkip();
    }
  };

  const handleGenerate = async () => {
    if (!user || !suggestion) return;
    setState('generating');

    try {
      const { data, error } = await supabase.functions.invoke('generate-first-script', {
        body: {
          user_id: user.id,
          action: 'generate',
          suggestion: suggestion,
        },
      });

      if (error) throw error;

      setGeneratedScript(data.script);
      setState('result');
    } catch (err) {
      console.error('Generate error:', err);
      toast.error('Erro ao gerar roteiro. Tente novamente.');
      setState('suggestion');
    }
  };

  const handleGoToKanban = () => {
    onComplete();
    window.location.href = '/kanban';
  };

  const handleGoToHome = () => {
    onComplete();
  };

  // ═══ PROCESSING ═══
  if (state === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Criando sua Identidade Magnética...
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            A IA está analisando seu tom de voz, formato e narrativa para criar algo único pra você.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3 text-left">
          <ProcessingStep done={processingSteps.voiceDna} label="DNA de Voz calibrado" />
          <ProcessingStep done={processingSteps.format} label="Formato sustentável definido" />
          <ProcessingStep done={processingSteps.narrative} label="Narrativa Primária construída" />
          <div className="border-t border-border/30 pt-3">
            <ProcessingStep
              done={false}
              active={processingSteps.generating}
              label="Gerando sugestão de primeiro roteiro..."
            />
          </div>
        </div>
      </div>
    );
  }

  // ═══ SUGGESTION ═══
  if (state === 'suggestion' && suggestion) {
    return (
      <div className="space-y-6 flex flex-col min-h-[60vh]">
        <div className="text-center space-y-2 pt-2">
          <div className="text-4xl">🎯</div>
          <h2 className="text-xl font-bold text-foreground">
            Identidade configurada!
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Com base no seu tom de voz, formato e narrativa, a IA sugere seu primeiro conteúdo:
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary mb-3">
              <Sparkles className="w-3 h-3" />
              Sugerido pela IA
            </div>
            <h3 className="text-lg font-bold text-foreground leading-tight">
              "{suggestion.title}"
            </h3>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
              {suggestion.style_label}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted/30 text-muted-foreground font-semibold">
              {suggestion.format}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted/30 text-muted-foreground font-semibold">
              ~{suggestion.duration}
            </span>
          </div>

          <div className="border-t border-border/30 pt-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Por que esse roteiro?</strong>
              <br />
              {suggestion.justification}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="space-y-3 pt-2">
          <Button
            onClick={handleGenerate}
            className="w-full h-14 rounded-xl text-base font-bold gap-2"
          >
            <Zap className="w-5 h-5" />
            Gerar meu primeiro roteiro
          </Button>
        </div>
      </div>
    );
  }

  // ═══ GENERATING ═══
  if (state === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <Zap className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">
            Gerando seu roteiro...
          </h2>
          <p className="text-sm text-muted-foreground">
            A IA está escrevendo com a SUA voz. Isso leva alguns segundos.
          </p>
        </div>
      </div>
    );
  }

  // ═══ RESULT ═══
  if (state === 'result' && generatedScript) {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-1">
          <div className="text-3xl">🎬</div>
          <p className="text-sm text-green-400 font-semibold">
            Seu primeiro roteiro está pronto!
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border/30">
            <h3 className="text-base font-bold text-foreground leading-tight">
              {generatedScript.title}
            </h3>
            <div className="flex gap-1.5 mt-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                {suggestion?.style_label || generatedScript.style}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground font-semibold">
                ~{suggestion?.duration || '60s'}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <ScriptSection
              emoji="🎯"
              label="Início — Gancho"
              sections={generatedScript.script_content.inicio.sections}
            />
            <ScriptSection
              emoji="📚"
              label="Desenvolvimento"
              sections={generatedScript.script_content.desenvolvimento.sections}
            />
            <ScriptSection
              emoji="🎬"
              label="Final — CTA"
              sections={generatedScript.script_content.final.sections}
            />
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <Button
            onClick={handleGoToKanban}
            className="w-full h-12 rounded-xl text-sm font-semibold gap-2"
          >
            <FileText className="w-4 h-4" />
            Editar no Kanban
          </Button>
          <Button
            variant="ghost"
            onClick={handleGoToHome}
            className="w-full rounded-xl text-sm text-muted-foreground"
          >
            🏠 Ir para o início
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
