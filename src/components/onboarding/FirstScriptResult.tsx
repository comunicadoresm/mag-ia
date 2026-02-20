import { FileText } from 'lucide-react';

interface ScriptSuggestion {
  title: string;
  style_label: string;
  duration: string;
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

interface FirstScriptResultProps {
  script: GeneratedScript;
  suggestion: ScriptSuggestion | null;
  onGoToKanban: () => void;
  onGoToHome: () => void;
}

function ScriptSection({ emoji, label, sections }: {
  emoji: string;
  label: string;
  sections: { id: string; label: string; content: string }[];
}) {
  return (
    <div className="p-3 bg-white/[0.03] rounded-[10px] border-l-[3px] border-l-[#FAFC59] mt-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#FAFC59] mb-1.5">
        {emoji} {label}
      </div>
      {sections.map((section) => (
        <div key={section.id} className="mb-2 last:mb-0">
          {sections.length > 1 && (
            <p className="text-[10px] font-semibold text-[#999] mb-0.5">
              {section.label}
            </p>
          )}
          <div className="text-[13px] text-[#999] leading-relaxed">
            {section.content}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FirstScriptResult({ script, suggestion, onGoToKanban, onGoToHome }: FirstScriptResultProps) {
  return (
    <div className="min-h-screen flex flex-col px-5 py-8 animate-fade-in" style={{ background: '#0a0a0a' }}>
      {/* Success header */}
      <div className="text-center animate-slide-up">
        <div className="text-4xl mb-1">🎬</div>
        <p className="text-sm text-[#4ade80] font-semibold">
          Seu primeiro roteiro está pronto!
        </p>
      </div>

      {/* Script card */}
      <div className="bg-[#292929] border border-white/[0.06] rounded-2xl overflow-hidden mt-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <h3 className="text-base font-bold text-[#fafafa] leading-tight">
            {script.title}
          </h3>
          <div className="flex gap-1.5 mt-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAFC59]/10 text-[#FAFC59] font-semibold">
              {suggestion?.style_label || script.style}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-[#999] font-semibold">
              ~{suggestion?.duration || '60s'}
            </span>
          </div>
        </div>

        <div className="p-4">
          <ScriptSection
            emoji="🎯"
            label="Início · Gancho"
            sections={script.script_content.inicio.sections}
          />
          <ScriptSection
            emoji="📖"
            label="Desenvolvimento"
            sections={script.script_content.desenvolvimento.sections}
          />
          <ScriptSection
            emoji="💬"
            label="Final · CTA"
            sections={script.script_content.final.sections}
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTAs */}
      <div className="space-y-2.5 mt-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <button
          onClick={onGoToKanban}
          className="
            w-full py-4 px-6
            bg-[#FAFC59] text-[#141414]
            rounded-full font-bold text-[15px]
            shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)]
            hover:bg-[#e8ea40] hover:-translate-y-0.5
            transition-all duration-200
            flex items-center justify-center gap-2
          "
        >
          <FileText className="w-4 h-4" />
          Editar no Kanban
        </button>
        <button
          onClick={onGoToHome}
          className="
            w-full py-3.5 px-6
            bg-transparent text-[#fafafa]
            border border-white/[0.06] rounded-full
            font-semibold text-sm
            hover:bg-white/5 hover:border-white/[0.15]
            transition-colors duration-200
          "
        >
          🏠 Ir para o início
        </button>
      </div>
    </div>
  );
}
