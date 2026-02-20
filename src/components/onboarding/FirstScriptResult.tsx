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

function ScriptSection({ emoji, label, sections, borderColor }: {
  emoji: string;
  label: string;
  sections: { id: string; label: string; content: string }[];
  borderColor: string;
}) {
  return (
    <div className="p-4 bg-white/[0.03] rounded-xl mt-3" style={{ borderLeft: `3px solid ${borderColor}` }}>
      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: borderColor }}>
        {emoji} {label}
      </div>
      {sections.map((section) => (
        <div key={section.id} className="mb-2 last:mb-0">
          <p className="text-[13px] text-[#999] leading-relaxed italic">
            "{section.content}"
          </p>
        </div>
      ))}
    </div>
  );
}

export function FirstScriptResult({ script, suggestion, onGoToKanban, onGoToHome }: FirstScriptResultProps) {
  return (
    <div className="flex flex-col px-6 py-7 animate-fade-in">
      <div className="w-full flex flex-col">
        {/* Success header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🎬</div>
          <p className="text-sm text-[#4ade80] font-bold">
            Seu primeiro roteiro está pronto!
          </p>
          <p className="text-xs text-[#666] mt-1 max-w-[260px] mx-auto">
            Ele já foi salvo no seu Kanban. Você pode editar, ajustar e usar como base para todos os próximos.
          </p>
        </div>

        {/* Script card */}
        <div className="bg-[#1e1e1e] border border-white/[0.06] rounded-2xl overflow-hidden mt-5">
          <div className="px-5 pt-5 pb-3">
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

          <div className="px-4 pb-5">
            <ScriptSection
              emoji="🎯"
              label="Início — Gancho"
              sections={script.script_content.inicio.sections}
              borderColor="#ef4444"
            />
            <ScriptSection
              emoji="📖"
              label="Desenvolvimento"
              sections={script.script_content.desenvolvimento.sections}
              borderColor="#FAFC59"
            />
            <ScriptSection
              emoji="💬"
              label="Final — CTA"
              sections={script.script_content.final.sections}
              borderColor="#818cf8"
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTAs */}
        <div className="space-y-2.5 mt-6">
          <button
            onClick={onGoToKanban}
            className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            ✏️ Editar no Kanban
          </button>
          <button
            onClick={onGoToHome}
            className="w-full py-3.5 px-6 bg-transparent text-[#fafafa] font-semibold text-sm hover:text-[#999] transition-colors"
          >
            🏠 Ir para o início
          </button>
        </div>
      </div>
    </div>
  );
}
