import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type InternalStep = 'intro' | 'tempo' | 'equipment' | 'editing' | 'frequency' | 'result';

interface FormatQuizSetupProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface TempoAnswers {
  roteiro: string;
  gravacao: string;
  edicao: string;
}

interface EditingAnswers {
  apps: string[];
  nivel: string;
}

interface WeeklyPlanItem {
  day: string;
  format: string;
  suggestion: string;
  time: string;
}

interface FormatResult {
  format: 'low_fi' | 'mid_fi' | 'hi_fi';
  formatLabel: string;
  description: string;
  score: number;
  weeklyPlan: WeeklyPlanItem[];
}

// ── Equipment items ──
const EQUIPMENT_CATEGORIES = [
  {
    id: 'camera',
    label: '📷 CÂMERA',
    items: [
      { value: 'celular_basico', label: 'Celular (câmera padrão)', score: 1 },
      { value: 'celular_bom', label: 'Celular com câmera boa\n(iPhone 13+, Samsung S21+)', score: 2 },
      { value: 'camera_dedicada', label: 'Câmera dedicada\n(mirrorless, DSLR)', score: 3 },
      { value: 'webcam', label: 'Webcam', score: 1 },
    ],
  },
  {
    id: 'audio',
    label: '🎙 ÁUDIO',
    items: [
      { value: 'mic_celular', label: 'Só o microfone do celular', score: 0 },
      { value: 'mic_lapela', label: 'Microfone de lapela', score: 1 },
      { value: 'mic_mesa', label: 'Microfone de mesa\n(USB, condensador)', score: 2 },
      { value: 'mic_boom', label: 'Microfone boom /\nshotgun', score: 2 },
      { value: 'interface_audio', label: 'Interface de áudio', score: 2 },
    ],
  },
  {
    id: 'lighting',
    label: '💡 ILUMINAÇÃO',
    items: [
      { value: 'luz_natural', label: 'Só luz natural (janela)', score: 0 },
      { value: 'ring_light', label: 'Ring light', score: 1 },
      { value: 'led_portatil', label: 'LED portátil / painel LED', score: 1 },
      { value: 'softbox', label: 'Softbox', score: 2 },
      { value: 'kit_iluminacao', label: 'Kit de iluminação (2+\nfontes)', score: 3 },
    ],
  },
  {
    id: 'support',
    label: '📐 SUPORTE',
    items: [
      { value: 'mao', label: 'Segura na mão / apoia\nem algo', score: 0 },
      { value: 'tripe_celular', label: 'Tripé de celular', score: 1 },
      { value: 'tripe_pro', label: 'Tripé profissional', score: 2 },
      { value: 'gimbal', label: 'Gimbal / estabilizador', score: 2 },
    ],
  },
  {
    id: 'extras',
    label: '✨ EXTRAS',
    items: [
      { value: 'teleprompter', label: 'Teleprompter (app ou\nfísico)', score: 1 },
      { value: 'cenario_dedicado', label: 'Cenário/fundo dedicado\n(home studio)', score: 1 },
      { value: 'chroma_key', label: 'Tela verde / chroma key', score: 1 },
      { value: 'equipe', label: 'Alguém que filma pra\nmim (equipe)', score: 3 },
    ],
  },
];

// ── Editing apps ──
const RECORDING_APPS = [
  { value: 'camera_nativa', label: 'Câmera nativa do celular' },
  { value: 'blackmagic', label: 'Blackmagic Camera' },
  { value: 'filmic_pro', label: 'Filmic Pro / similar' },
];

const EDITING_APPS = [
  { value: 'capcut', label: 'CapCut' },
  { value: 'inshot', label: 'InShot' },
  { value: 'vn_editor', label: 'VN Editor' },
  { value: 'premiere', label: 'Premiere Pro' },
  { value: 'davinci', label: 'DaVinci Resolve' },
  { value: 'final_cut', label: 'Final Cut Pro' },
  { value: 'after_effects', label: 'After Effects' },
  { value: 'nunca_editei', label: 'Nunca editei um vídeo' },
];

const EDITING_LEVELS = [
  { value: 'nunca', label: 'Nunca editei', score: 0 },
  { value: 'basico', label: 'Sei o básico (cortar, legenda, exportar)', score: 1 },
  { value: 'bem', label: 'Edito bem (transições, trilha, color grading)', score: 3 },
  { value: 'avancado', label: 'Edição avançada (motion, efeitos)', score: 5 },
  { value: 'editor', label: 'Tenho editor/equipe que faz pra mim', score: 5 },
];

// ── Scoring ──
function calculateResult(
  tempo: TempoAnswers,
  equipment: string[],
  editing: EditingAnswers,
  frequency: string
): FormatResult {
  let score = 0;

  // Tempo scores
  const roteiroScore: Record<string, number> = { ate_5min: 0, '5_15min': 1, '15_30min': 2 };
  const gravacaoScore: Record<string, number> = { ate_10min: 0, '10_30min': 1, '30_60min': 2, mais_60min: 3 };
  const edicaoScore: Record<string, number> = { zero: 0, ate_10min: 1, '10_30min': 2, '30min_plus': 3 };
  score += (roteiroScore[tempo.roteiro] ?? 0) + (gravacaoScore[tempo.gravacao] ?? 0) + (edicaoScore[tempo.edicao] ?? 0);

  // Equipment scores — max per category
  EQUIPMENT_CATEGORIES.forEach(cat => {
    const catScores = cat.items
      .filter(item => equipment.includes(item.value))
      .map(item => item.score);
    if (catScores.length > 0) score += Math.max(...catScores);
  });

  // Editing level
  const levelScore = EDITING_LEVELS.find(l => l.value === editing.nivel)?.score ?? 0;
  score += levelScore;

  // Frequency
  const freqScore: Record<string, number> = { '1_2': 1, '3_4': 2, '5_7': 3, mais_7: 4 };
  score += freqScore[frequency] ?? 0;

  // Format determination
  let format: 'low_fi' | 'mid_fi' | 'hi_fi';
  let formatLabel: string;
  let description: string;

  if (score <= 8) {
    format = 'low_fi';
    formatLabel = 'LOW-FI Magnético';
    description = 'Conteúdo simples com estrutura profissional. O roteiro faz o trabalho pesado, não a edição.';
  } else if (score <= 18) {
    format = 'mid_fi';
    formatLabel = 'MID-FI Magnético';
    description = 'Produção moderada com equipamento acessível. Você consegue consistência sem depender de edição pesada.';
  } else {
    format = 'hi_fi';
    formatLabel = 'HI-FI Magnético';
    description = 'Alta produção com setup completo. Você tem o equipamento e as habilidades para criar vídeos de alto impacto.';
  }

  // Weekly plan
  const freqMap: Record<string, number> = { '1_2': 2, '3_4': 4, '5_7': 5, mais_7: 7 };
  const daysPerWeek = freqMap[frequency] ?? 2;
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].slice(0, daysPerWeek);
  const suggestions: Record<string, string[]> = {
    low_fi: ['Opinião Direta', 'Dica Rápida', 'Resposta de DM', 'Bastidores', 'Lista Rápida'],
    mid_fi: ['Case + Lição', 'Storytelling', 'Tutorial', 'Análise', 'Entrevista'],
    hi_fi: ['Documentário', 'Série', 'Produção Completa', 'Vlog Editado', 'Case Premium'],
  };
  const timeMap: Record<string, string> = { low_fi: '15 min', mid_fi: '40 min', hi_fi: '2h+' };

  const weeklyPlan = days.map((day, i) => {
    let dayFormat = format;
    if ((format === 'mid_fi' || format === 'hi_fi') && i % 2 === 0 && i < days.length - 1) {
      dayFormat = 'low_fi';
    }
    const sugs = suggestions[dayFormat];
    return { day, format: dayFormat, suggestion: sugs[i % sugs.length], time: timeMap[dayFormat] };
  });

  return { format, formatLabel, description, score, weeklyPlan };
}

// ── Progress bar ──
const STEP_ORDER: InternalStep[] = ['intro', 'tempo', 'equipment', 'editing', 'frequency', 'result'];
function getProgress(step: InternalStep) {
  const idx = STEP_ORDER.indexOf(step);
  // intro=1/5, tempo=2/5, equipment=3/5, editing=4/5, frequency=5/5, result=5/5
  return Math.min(idx, 5);
}

// ── Radio option ──
function RadioOption({
  label, selected, onClick
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm transition-all',
        selected
          ? 'border-[#FAFC59]/40 bg-[#FAFC59]/10 text-[#fafafa]'
          : 'border-white/[0.06] bg-white/[0.03] text-[#999] hover:border-white/[0.12]'
      )}
    >
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
        selected ? 'border-[#FAFC59] bg-[#FAFC59]' : 'border-[#666]'
      )}>
        {selected && <CheckCircle className="w-3.5 h-3.5 text-[#141414]" />}
      </div>
      <span className={cn('leading-tight', selected && 'font-medium text-[#fafafa]')}>{label}</span>
    </button>
  );
}

// ── Checkbox option ──
function CheckboxOption({
  label, checked, onClick
}: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-2.5 px-3 py-3 rounded-xl border text-left text-xs transition-all',
        checked
          ? 'border-[#FAFC59]/40 bg-[#FAFC59]/10 text-[#fafafa]'
          : 'border-white/[0.06] bg-white/[0.03] text-[#999] hover:border-white/[0.12]'
      )}
    >
      <div className={cn(
        'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
        checked ? 'border-[#FAFC59] bg-[#FAFC59]' : 'border-[#666]'
      )}>
        {checked && <CheckCircle className="w-2.5 h-2.5 text-[#141414]" />}
      </div>
      <span className={cn('leading-tight', checked && 'font-medium text-[#fafafa]')}>{label}</span>
    </button>
  );
}

// ── Section label ──
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[#666] mt-5 mb-2">{children}</p>
  );
}

export function FormatQuizSetup({ open, onComplete }: FormatQuizSetupProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<InternalStep>('intro');
  const [tempo, setTempo] = useState<TempoAnswers>({ roteiro: '', gravacao: '', edicao: '' });
  const [equipment, setEquipment] = useState<string[]>([]);
  const [editing, setEditing] = useState<EditingAnswers>({ apps: [], nivel: '' });
  const [frequency, setFrequency] = useState('');
  const [result, setResult] = useState<FormatResult | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const progress = getProgress(step);

  const toggleEquipment = (val: string) => {
    setEquipment(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const toggleApp = (val: string) => {
    setEditing(prev => ({
      ...prev,
      apps: prev.apps.includes(val) ? prev.apps.filter(v => v !== val) : [...prev.apps, val],
    }));
  };

  // ── Progress bar ──
  const ProgressBar = () => (
    <div className="flex gap-1.5 mb-5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={cn('flex-1 h-1 rounded-full transition-all duration-300', i <= progress ? 'bg-[#FAFC59]' : 'bg-white/[0.08]')}
        />
      ))}
    </div>
  );

  // ── Step header ──
  const StepHeader = ({ emoji, label, title, subtitle }: { emoji: string; label: string; title: string; subtitle: string }) => (
    <>
      <ProgressBar />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-9 h-9 rounded-[10px] bg-[#FAFC59]/15 flex items-center justify-center text-lg">{emoji}</div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FAFC59]">{label}</span>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-[#fafafa] mt-3 leading-tight">{title}</h2>
      <p className="text-sm text-[#999] mt-1.5 leading-relaxed">{subtitle}</p>
    </>
  );

  // ── INTRO ──
  if (step === 'intro') {
    return (
      <div className="flex flex-col px-6 py-7 max-w-md mx-auto animate-fade-in">
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex-1 h-1 rounded-full bg-white/[0.08]" />
          ))}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-[10px] bg-[#FAFC59]/15 flex items-center justify-center text-lg">📁</div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FAFC59]">Etapa 2 · Formato</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#fafafa] leading-tight">Quiz de Formato Sustentável</h2>
        <p className="text-sm text-[#999] mt-3 leading-relaxed">
          Vou te ajudar a descobrir o seu formato sustentável — aquele que você consegue manter sem sofrer.
        </p>
        <p className="text-sm text-[#999] mt-3 leading-relaxed">
          São 5 perguntas rápidas. Menos de 1 minuto.
        </p>
        <div className="mt-8">
          <button
            onClick={() => setStep('tempo')}
            className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 transition-all duration-200"
          >
            Começar
          </button>
        </div>
      </div>
    );
  }

  // ── TEMPO DE ROTEIRO ──
  if (step === 'tempo') {
    const canProceed = tempo.roteiro && tempo.gravacao && tempo.edicao;
    return (
      <div className="flex flex-col px-6 py-7 max-w-md mx-auto animate-fade-in">
        <StepHeader
          emoji="⏱"
          label="Pergunta 1 de 5 · Tempo"
          title="Tempo de Roteiro"
          subtitle="Quanto tempo por dia você consegue dedicar a conteúdo?"
        />

        <SectionLabel>ROTEIRO:</SectionLabel>
        <div className="space-y-2">
          {[
            { value: 'ate_5min', label: 'Até 5 min (só quer o roteiro pronto)' },
            { value: '5_15min', label: '5 a 15 min (revisa e ajusta)' },
            { value: '15_30min', label: '15 a 30 min (gosta de construir junto com a IA)' },
          ].map(opt => (
            <RadioOption
              key={opt.value}
              label={opt.label}
              selected={tempo.roteiro === opt.value}
              onClick={() => setTempo(prev => ({ ...prev, roteiro: opt.value }))}
            />
          ))}
        </div>

        <SectionLabel>GRAVAÇÃO:</SectionLabel>
        <div className="space-y-2">
          {[
            { value: 'ate_10min', label: 'Até 10 min (grava direto, sem repetir)' },
            { value: '10_30min', label: '10 a 30 min (grava 2-3 takes)' },
            { value: '30_60min', label: '30 min a 1h (monta setup, múltiplos takes)' },
            { value: 'mais_60min', label: 'Mais de 1h (produção completa)' },
          ].map(opt => (
            <RadioOption
              key={opt.value}
              label={opt.label}
              selected={tempo.gravacao === opt.value}
              onClick={() => setTempo(prev => ({ ...prev, gravacao: opt.value }))}
            />
          ))}
        </div>

        <SectionLabel>EDIÇÃO:</SectionLabel>
        <div className="space-y-2">
          {[
            { value: 'zero', label: 'Zero — não quero editar, só publicar' },
            { value: 'ate_10min', label: 'Até 10 min (legenda automática e pronto)' },
            { value: '10_30min', label: '10 a 30 min (cortes, legenda, trilha)' },
            { value: '30min_plus', label: '30 min a 1h+ (edição elaborada)' },
          ].map(opt => (
            <RadioOption
              key={opt.value}
              label={opt.label}
              selected={tempo.edicao === opt.value}
              onClick={() => setTempo(prev => ({ ...prev, edicao: opt.value }))}
            />
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={() => setStep('equipment')}
            disabled={!canProceed}
            className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 transition-all duration-200"
          >
            Próxima →
          </button>
          <button onClick={() => setStep('intro')} className="w-full py-3 text-sm text-[#666] hover:text-[#999] transition-colors mt-1">
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  // ── EQUIPAMENTO ──
  if (step === 'equipment') {
    return (
      <div className="flex flex-col px-6 py-7 max-w-md mx-auto animate-fade-in">
        <StepHeader
          emoji="🎬"
          label="Pergunta 2 de 5 · Equipamento"
          title="Tempo de Gravação"
          subtitle="O que você tem disponível pra gravar? Marca tudo que tiver:"
        />

        {EQUIPMENT_CATEGORIES.map(cat => (
          <div key={cat.id}>
            <SectionLabel>{cat.label}</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {cat.items.map(item => (
                <CheckboxOption
                  key={item.value}
                  label={item.label.replace(/\n/g, ' ')}
                  checked={equipment.includes(item.value)}
                  onClick={() => toggleEquipment(item.value)}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-6">
          <button
            onClick={() => setStep('editing')}
            className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 transition-all duration-200"
          >
            Próxima →
          </button>
          <button onClick={() => setStep('tempo')} className="w-full py-3 text-sm text-[#666] hover:text-[#999] transition-colors mt-1">
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  // ── EDIÇÃO ──
  if (step === 'editing') {
    const canProceed = !!editing.nivel;
    return (
      <div className="flex flex-col px-6 py-7 max-w-md mx-auto animate-fade-in">
        <StepHeader
          emoji="✂️"
          label="Pergunta 3 de 5 · Edição"
          title="Tempo de Edição"
          subtitle="Quais apps de gravação e edição você usa?"
        />

        <SectionLabel>GRAVAÇÃO:</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {RECORDING_APPS.map(app => (
            <CheckboxOption
              key={app.value}
              label={app.label}
              checked={editing.apps.includes(app.value)}
              onClick={() => toggleApp(app.value)}
            />
          ))}
        </div>

        <SectionLabel>EDIÇÃO:</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {EDITING_APPS.map(app => (
            <CheckboxOption
              key={app.value}
              label={app.label}
              checked={editing.apps.includes(app.value)}
              onClick={() => toggleApp(app.value)}
            />
          ))}
        </div>

        <SectionLabel>SEU NÍVEL DE EDIÇÃO:</SectionLabel>
        <div className="space-y-2">
          {EDITING_LEVELS.map(level => (
            <RadioOption
              key={level.value}
              label={level.label}
              selected={editing.nivel === level.value}
              onClick={() => setEditing(prev => ({ ...prev, nivel: level.value }))}
            />
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={() => setStep('frequency')}
            disabled={!canProceed}
            className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 transition-all duration-200"
          >
            Próxima →
          </button>
          <button onClick={() => setStep('equipment')} className="w-full py-3 text-sm text-[#666] hover:text-[#999] transition-colors mt-1">
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  // ── FREQUÊNCIA ──
  if (step === 'frequency') {
    const handleFinish = () => {
      if (!frequency) return;
      const r = calculateResult(tempo, equipment, editing, frequency);
      setResult(r);
      setStep('result');
    };
    return (
      <div className="flex flex-col px-6 py-7 max-w-md mx-auto animate-fade-in">
        <StepHeader
          emoji="📅"
          label="Pergunta 4 de 5 · Frequência"
          title="Frequência"
          subtitle="Quantos conteúdos por semana você QUER publicar? Não o ideal — o que você vai conseguir manter."
        />

        <div className="space-y-2.5 mt-4">
          {[
            { value: '1_2', label: '1 a 2 por semana' },
            { value: '3_4', label: '3 a 4 por semana' },
            { value: '5_7', label: '5 a 7 (quase diário)' },
            { value: 'mais_7', label: 'Mais de 7 (múltiplos por dia)' },
          ].map(opt => (
            <RadioOption
              key={opt.value}
              label={opt.label}
              selected={frequency === opt.value}
              onClick={() => setFrequency(opt.value)}
            />
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={handleFinish}
            disabled={!frequency}
            className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 transition-all duration-200"
          >
            Ver resultado →
          </button>
          <button onClick={() => setStep('editing')} className="w-full py-3 text-sm text-[#666] hover:text-[#999] transition-colors mt-1">
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  // ── RESULTADO ──
  if (step === 'result' && result) {
    const formatColors: Record<string, string> = {
      low_fi: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      mid_fi: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      hi_fi: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    const formatIcons: Record<string, string> = { low_fi: '📱', mid_fi: '🎥', hi_fi: '🎬' };

    const handleSave = async () => {
      setSaving(true);
      try {
        await supabase.from('user_format_profile' as any).upsert({
          user_id: user!.id,
          recommended_format: result.format,
          quiz_answers: { tempo, equipment, editing, frequency },
          quiz_score: result.score,
          weekly_plan: result.weeklyPlan,
        } as any, { onConflict: 'user_id' });
        onComplete();
      } catch (err) {
        console.error('Save format error:', err);
        toast.error('Erro ao salvar resultado');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="flex flex-col px-6 py-7 max-w-md mx-auto animate-fade-in">
        <ProgressBar />
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-[10px] bg-[#FAFC59]/15 flex items-center justify-center text-lg">🎉</div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FAFC59]">Etapa 2 · Resultado</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#fafafa] leading-tight mb-4">Seu Formato Sustentável</h2>

        {/* Format card */}
        <div className="rounded-2xl bg-[#1a1a1a] border border-white/[0.07] p-5 text-center mb-5">
          <div className="text-4xl mb-3">{formatIcons[result.format]}</div>
          <h3 className="text-xl font-bold text-[#fafafa] mb-2">{result.formatLabel}</h3>
          <p className="text-sm text-[#999] leading-relaxed mb-3">{result.description}</p>
          <span className="text-xs text-[#666]">Score: {result.score} pontos</span>
        </div>

        {/* Weekly plan */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📅</span>
          <span className="text-sm font-bold text-[#fafafa]">Seu Plano Semanal Sugerido</span>
        </div>
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          {result.weeklyPlan.map((item, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm',
                i < result.weeklyPlan.length - 1 && 'border-b border-white/[0.04]'
              )}
            >
              <span className="w-16 font-semibold text-[#fafafa] text-xs shrink-0">{item.day}</span>
              <span className={cn(
                'text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0',
                formatColors[item.format]
              )}>
                {item.format === 'low_fi' ? 'LOW-FI' : item.format === 'mid_fi' ? 'MID-FI' : 'HI-FI'}
              </span>
              <span className="text-[#999] text-xs flex-1">{item.suggestion}</span>
              <span className="text-[#555] text-xs shrink-0">{item.time}</span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-[#141414]/30 border-t-[#141414] rounded-full animate-spin" />
            ) : (
              'Continuar →'
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
