import { useState, useEffect } from 'react';

interface ProcessingStepProps {
  onComplete: () => void;
}

function StepItem({ done, active, label }: { done: boolean; active?: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-3 py-2.5 text-[14px] ${
      done ? 'text-[#22c55e]' : active ? 'text-[#FAFC59]' : 'text-[#666]'
    }`}>
      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-base">
        {done ? '✅' : active ? (
          <span className="animate-spin inline-block text-sm">⟳</span>
        ) : '○'}
      </span>
      {label}
    </div>
  );
}

export function ProcessingStep({ onComplete }: ProcessingStepProps) {
  const [steps, setSteps] = useState({
    voiceDna: false,
    format: false,
    narrative: false,
    generating: false,
  });

  useEffect(() => {
    const timers = [
      setTimeout(() => setSteps(p => ({ ...p, voiceDna: true })), 800),
      setTimeout(() => setSteps(p => ({ ...p, format: true })), 1600),
      setTimeout(() => setSteps(p => ({ ...p, narrative: true })), 2400),
      setTimeout(() => setSteps(p => ({ ...p, generating: true })), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (steps.generating) {
      const t = setTimeout(onComplete, 500);
      return () => clearTimeout(t);
    }
  }, [steps.generating, onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 animate-fade-in" style={{ background: '#0a0a0a' }}>
      {/* Progress bar — all filled */}
      <div className="w-full max-w-xs mb-12">
        <div className="flex gap-1.5">
          <div className="flex-1 h-1 rounded-sm bg-[#FAFC59]" />
          <div className="flex-1 h-1 rounded-sm bg-[#FAFC59]" />
          <div className="flex-1 h-1 rounded-sm bg-[#FAFC59]" />
        </div>
      </div>

      {/* Spinner */}
      <div className="w-14 h-14 rounded-full border-[3px] border-[#FAFC59]/20 border-t-[#FAFC59] animate-spin mb-6" />

      <h2 className="text-[22px] font-bold text-[#fafafa] text-center tracking-tight leading-tight">
        Criando sua Identidade
        <br />
        Magnética...
      </h2>
      <p className="text-sm text-[#999] text-center mt-3 max-w-[300px] leading-relaxed">
        A IA está analisando seu tom de voz, formato e narrativa para criar algo único pra você.
      </p>

      {/* Steps */}
      <div className="mt-8 w-full max-w-xs">
        <StepItem done={steps.voiceDna} active={!steps.voiceDna} label="DNA de Voz calibrado" />
        <StepItem done={steps.format} active={steps.voiceDna && !steps.format} label="Formato sustentável definido" />
        <StepItem done={steps.narrative} active={steps.format && !steps.narrative} label="Narrativa Primária construída" />
        <div className="border-t border-white/[0.06] my-2" />
        <StepItem done={false} active={steps.narrative} label="Gerando sugestão de primeiro roteiro..." />
      </div>
    </div>
  );
}
