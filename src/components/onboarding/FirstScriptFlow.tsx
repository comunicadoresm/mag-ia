import React, { useState, useEffect } from 'react';
import { Play, Zap, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import logoSymbol from '@/assets/logo-symbol.png';

// TODO: Verificar modelo usado na geração de roteiro

interface FirstScriptFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface ScriptSuggestion {
  title: string;
  style: string;
  style_label: string;
  format: string;
  production_level: string; // low-fi | mid-fi | high-fi
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

const tutorialLinks: Record<string, string> = {
  'low-fi': 'https://placeholder.com/tutorial-lowfi',
  'mid-fi': 'https://placeholder.com/tutorial-midfi',
  'high-fi': 'https://placeholder.com/tutorial-highfi',
};

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
          <img src={logoSymbol} alt="" className="w-4 h-4 animate-spin opacity-80" />
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

/** Normaliza o nível de produção: nunca retorna high-fi para o primeiro roteiro */
function normalizeProductionLevel(raw: string): string {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('high') || lower.includes('hi-fi') || lower.includes('hifi')) return 'mid-fi';
  if (lower.includes('low')) return 'low-fi';
  return 'mid-fi';
}

const PRODUCTION_LABELS: Record<string, string> = {
  'low-fi': 'Low-fi',
  'mid-fi': 'Mid-fi',
  'high-fi': 'High-fi',
};

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

      // Normalize production level — never high-fi for first script
      const raw = data.suggestion;
      const productionLevel = normalizeProductionLevel(raw.production_level || raw.format || '');
      setSuggestion({ ...raw, production_level: productionLevel });
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

  const handleOpenTutorial = () => {
    const level = suggestion?.production_level || 'mid-fi';
    const url = tutorialLinks[level] || tutorialLinks['mid-fi'];
    window.open(url, '_blank');
  };

  // ═══ PROCESSING ═══
  if (state === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        {/* Ímã CM animado no lugar do spinner */}
        <img
          src={logoSymbol}
          alt="Magnetic.IA"
          className="w-16 h-16 object-contain animate-pulse"
        />

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
    const productionLabel = PRODUCTION_LABELS[suggestion.production_level] || 'Mid-fi';
    const isHighFiCapped = suggestion.production_level === 'mid-fi' &&
      (suggestion.format || '').toLowerCase().includes('high');

    return (
      <div className="space-y-6 flex flex-col min-h-[60vh]">
        <div className="text-center space-y-2 pt-2">
          <div className="text-4xl">🎯</div>
          <h2 className="text-xl font-bold text-foreground">
            Identidade configurada!
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Com base no seu tom de voz, formato e narrativa, a IA sugere seu primeiro conteúdo de <strong className="text-primary">Atração</strong>:
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
          <div>
            <div className="flex gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                ✨ Sugerido pela IA
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400">
                🎯 Atração
              </div>
            </div>
            <h3 className="text-lg font-bold text-foreground leading-tight">
              "{suggestion.title}"
            </h3>
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
              {suggestion.style_label}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
              {productionLabel}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted/30 text-muted-foreground font-semibold">
              ~{suggestion.duration}
            </span>
          </div>

          {isHighFiCapped && (
            <p className="text-xs text-muted-foreground italic">
              💡 Quando quiser elevar a produção, experimente o formato High-fi.
            </p>
          )}

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
        {/* Ímã CM animado */}
        <img
          src={logoSymbol}
          alt="Magnetic.IA"
          className="w-14 h-14 object-contain animate-pulse"
        />
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
    const productionLabel = PRODUCTION_LABELS[suggestion?.production_level || 'mid-fi'] || 'Mid-fi';

    return (
      <div className="space-y-5">
        <div className="text-center space-y-1">
          <div className="text-3xl">🎬</div>
          <p className="text-sm font-semibold">
            Seu primeiro roteiro{' '}
            <strong className="text-primary">magnético</strong> está pronto!
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border/30">
            <h3 className="text-base font-bold text-foreground leading-tight">
              {generatedScript.title}
            </h3>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                {suggestion?.style_label || generatedScript.style}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
                {productionLabel}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-semibold">
                🎯 Atração
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
            variant="outline"
            onClick={handleOpenTutorial}
            className="w-full rounded-xl text-sm gap-2 border-border/50"
          >
            <Play className="w-4 h-4" />
            Assistir Tutorial de Gravação desse Formato
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
