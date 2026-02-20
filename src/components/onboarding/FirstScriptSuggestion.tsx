import { Zap } from 'lucide-react';

interface ScriptSuggestion {
  title: string;
  style: string;
  style_label: string;
  format: string;
  duration: string;
  justification: string;
}

interface FirstScriptSuggestionProps {
  suggestion: ScriptSuggestion;
  onGenerate: () => void;
  onSkip: () => void;
  generating: boolean;
}

export function FirstScriptSuggestion({ suggestion, onGenerate, onSkip, generating }: FirstScriptSuggestionProps) {
  return (
    <div className="min-h-screen flex flex-col px-5 py-8 animate-fade-in" style={{ background: '#0a0a0a' }}>
      <div className="max-w-md mx-auto w-full flex flex-col flex-1">
        {/* Celebration */}
        <div className="text-center mt-6">
          <div className="text-5xl mb-3">🎯</div>
          <h2 className="text-[22px] font-bold text-[#fafafa] tracking-tight">
            Identidade configurada!
          </h2>
          <p className="text-sm text-[#999] mt-2 max-w-[280px] mx-auto leading-relaxed">
            Com base no seu tom de voz, formato e narrativa, a IA sugere seu primeiro conteúdo:
          </p>
        </div>

        {/* Suggestion Card */}
        <div className="bg-[#1e1e1e] border border-white/[0.06] rounded-2xl p-5 mt-5">
          {/* AI Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 bg-purple-500/15 text-purple-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
            ✨ Sugerido pela IA
          </span>

          <h3 className="text-[17px] font-bold text-[#fafafa] leading-tight">
            "{suggestion.title}"
          </h3>

          <div className="flex gap-2 flex-wrap mt-3">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#FAFC59]/10 text-[#FAFC59] font-semibold">
              {suggestion.style_label}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.06] text-[#999] font-semibold">
              {suggestion.format}
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.06] text-[#999] font-semibold">
              ~{suggestion.duration}
            </span>
          </div>

          <div className="border-t border-white/[0.06] mt-4 pt-3">
            <p className="text-[13px] text-[#999] leading-relaxed">
              <strong className="text-[#fafafa]">Por que esse roteiro?</strong>
              <br />
              {suggestion.justification}
            </p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTAs */}
        <div className="space-y-3 mt-6">
          <button
            onClick={onGenerate}
            disabled={generating}
            className="w-full py-[18px] px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[16px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {generating ? (
              <div className="w-5 h-5 border-2 border-[#141414]/30 border-t-[#141414] rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Gerar meu primeiro roteiro
              </>
            )}
          </button>

          <button
            onClick={onSkip}
            disabled={generating}
            className="w-full py-3.5 px-6 bg-transparent text-[#fafafa] font-semibold text-sm hover:text-[#999] transition-colors"
          >
            Ir para o início (gerar depois)
          </button>
        </div>
      </div>
    </div>
  );
}
