import React, { useState } from 'react';
import { X, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';


interface FormatQuizSetupProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

// Quiz question definitions
const EXPERIENCE_OPTIONS = [
  { value: 'never', label: 'Nunca gravei', score: 0 },
  { value: 'some_times', label: 'Já gravei algumas vezes mas não tenho rotina', score: 1 },
  { value: 'frequent', label: 'Gravo com certa frequência', score: 2 },
  { value: 'weekly', label: 'Gravo toda semana, faz parte da minha rotina', score: 3 },
];

const TIME_SCRIPT = [
  { value: 'up_to_5', label: 'Até 5 min (só quer o roteiro pronto)', score: 1 },
  { value: '5_to_15', label: '5 a 15 min (revisa e ajusta)', score: 2 },
  { value: '15_to_30', label: '15 a 30 min (gosta de construir junto com a IA)', score: 3 },
];

const TIME_RECORDING = [
  { value: 'up_to_10', label: 'Até 10 min (grava direto, sem repetir)', score: 1 },
  { value: '10_to_30', label: '10 a 30 min (grava 2-3 takes)', score: 2 },
  { value: '30_to_60', label: '30 min a 1h (monta setup, múltiplos takes)', score: 3 },
  { value: 'more_60', label: 'Mais de 1h (produção completa)', score: 4 },
];

const TIME_EDITING = [
  { value: 'zero', label: 'Zero — não quero editar, só publicar', score: 0 },
  { value: 'up_to_10', label: 'Até 10 min (legenda automática e pronto)', score: 1 },
  { value: '10_to_30', label: '10 a 30 min (cortes, legenda, trilha)', score: 2 },
  { value: '30_plus', label: '30 min a 1h+ (edição elaborada)', score: 3 },
];

const EQUIPMENT_CATEGORIES = {
  camera: {
    label: '📷 CÂMERA',
    items: [
      { value: 'basic_phone', label: 'Celular (câmera padrão)', score: 1 },
      { value: 'good_phone', label: 'Celular com câmera boa (iPhone 13+, Samsung S21+)', score: 2 },
      { value: 'dedicated_camera', label: 'Câmera dedicada (mirrorless, DSLR)', score: 4 },
      { value: 'webcam', label: 'Webcam', score: 1 },
    ],
  },
  audio: {
    label: '🎙️ ÁUDIO',
    items: [
      { value: 'phone_mic', label: 'Só o microfone do celular', score: 0 },
      { value: 'lapel_mic', label: 'Microfone de lapela', score: 2 },
      { value: 'desk_mic', label: 'Microfone de mesa (USB, condensador)', score: 3 },
      { value: 'boom_mic', label: 'Microfone boom / shotgun', score: 4 },
      { value: 'audio_interface', label: 'Interface de áudio', score: 4 },
    ],
  },
  lighting: {
    label: '💡 ILUMINAÇÃO',
    items: [
      { value: 'natural', label: 'Só luz natural (janela)', score: 0 },
      { value: 'ring_light', label: 'Ring light', score: 2 },
      { value: 'led_panel', label: 'LED portátil / painel LED', score: 3 },
      { value: 'softbox', label: 'Softbox', score: 4 },
      { value: 'light_kit', label: 'Kit de iluminação (2+ fontes)', score: 5 },
    ],
  },
  support: {
    label: '📐 SUPORTE',
    items: [
      { value: 'handheld', label: 'Segura na mão / apoia em algo', score: 0 },
      { value: 'phone_tripod', label: 'Tripé de celular', score: 1 },
      { value: 'pro_tripod', label: 'Tripé profissional', score: 3 },
      { value: 'gimbal', label: 'Gimbal / estabilizador', score: 4 },
    ],
  },
  extras: {
    label: '✨ EXTRAS',
    items: [
      { value: 'teleprompter', label: 'Teleprompter (app ou físico)', score: 1 },
      { value: 'home_studio', label: 'Cenário/fundo dedicado (home studio)', score: 3 },
      { value: 'chroma_key', label: 'Tela verde / chroma key', score: 3 },
      { value: 'crew', label: 'Alguém que filma pra mim (equipe)', score: 5 },
    ],
  },
};

const RECORDING_APPS = [
  { value: 'native_camera', label: 'Câmera nativa do celular', score: 0 },
  { value: 'blackmagic_camera', label: 'Blackmagic Camera', score: 1 },
  { value: 'filmic_pro', label: 'Filmic Pro / similar', score: 1 },
];

const EDITING_APPS = [
  { value: 'capcut', label: 'CapCut', type: 'mobile' },
  { value: 'inshot', label: 'InShot', type: 'mobile' },
  { value: 'vn', label: 'VN Editor', type: 'mobile' },
  { value: 'premiere', label: 'Premiere Pro', type: 'desktop' },
  { value: 'davinci', label: 'DaVinci Resolve', type: 'desktop' },
  { value: 'final_cut', label: 'Final Cut Pro', type: 'desktop' },
  { value: 'after_effects', label: 'After Effects', type: 'desktop' },
  { value: 'none', label: 'Nunca editei um vídeo', type: 'none' },
];

const EDITING_LEVELS = [
  { value: 'never', label: 'Nunca editei', score: 0 },
  { value: 'basic', label: 'Sei o básico (cortar, legenda, exportar)', score: 1 },
  { value: 'good', label: 'Edito bem (transições, trilha, color grading)', score: 3 },
  { value: 'advanced', label: 'Edição avançada (motion, efeitos)', score: 5 },
  { value: 'team', label: 'Tenho editor/equipe que faz pra mim', score: 5 },
];

const FREQUENCY_OPTIONS = [
  { value: '1_to_2', label: '1 a 2 por semana' },
  { value: '3_to_4', label: '3 a 4 por semana' },
  { value: '5_to_7', label: '5 a 7 (quase diário)' },
  { value: 'more_7', label: 'Mais de 7 (múltiplos por dia)' },
];

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
        selected
          ? 'border-primary bg-primary/10 text-foreground font-medium'
          : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-primary/40'
      }`}
    >
      {children}
    </button>
  );
}

function CheckboxButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-center gap-2 ${
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-primary/40'
      }`}
    >
      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-primary border-primary' : 'border-border'}`}>
        {selected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
      </div>
      {children}
    </button>
  );
}

export function FormatQuizSetup({ open, onComplete, onSkip }: FormatQuizSetupProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'intro' | number | 'result'>('intro');
  const [answers, setAnswers] = useState<any>({
    experience: '',
    time_script: '',
    time_recording: '',
    time_editing: '',
    equipment: [] as string[],
    recording_apps: [] as string[],
    editing_apps: [] as string[],
    editing_level: '',
    desired_frequency: '',
  });
  const [result, setResult] = useState<{ format: string; plan: any[]; score: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleArray = (key: string, value: string) => {
    setAnswers((prev: any) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v: string) => v !== value) : [...prev[key], value],
    }));
  };

  const calculateResult = () => {
    // Experience lock
    const experience = EXPERIENCE_OPTIONS.find(o => o.value === answers.experience)?.score || 0;

    // Time scores
    const scriptScore = TIME_SCRIPT.find(o => o.value === answers.time_script)?.score || 1;
    const recordingScore = TIME_RECORDING.find(o => o.value === answers.time_recording)?.score || 1;
    const editingScore = TIME_EDITING.find(o => o.value === answers.time_editing)?.score || 0;
    const timeTotal = scriptScore + recordingScore + editingScore;

    // Equipment - max per category
    const equipCategories = Object.entries(EQUIPMENT_CATEGORIES);
    let equipTotal = 0;
    const selectedEquip = answers.equipment as string[];
    for (const [, cat] of equipCategories) {
      const catScores = cat.items.filter(i => selectedEquip.includes(i.value)).map(i => i.score);
      equipTotal += catScores.length > 0 ? Math.max(...catScores) : 0;
    }

    // Editing apps
    const selectedEditApps = answers.editing_apps as string[];
    const hasMobile = selectedEditApps.some(a => EDITING_APPS.find(e => e.value === a)?.type === 'mobile');
    const hasDesktop = selectedEditApps.some(a => EDITING_APPS.find(e => e.value === a)?.type === 'desktop');
    const recAppScore = (answers.recording_apps as string[]).some(a => a !== 'native_camera') ? 1 : 0;
    let editAppsScore = 0;
    if (hasDesktop && hasMobile) editAppsScore = 5;
    else if (hasDesktop) editAppsScore = 4;
    else if (hasMobile) editAppsScore = 2;

    const editLevelScore = EDITING_LEVELS.find(o => o.value === answers.editing_level)?.score || 0;
    const editTotal = recAppScore + editAppsScore + editLevelScore;

    const totalScore = timeTotal + equipTotal + editTotal;

    // Locks
    let format: 'low_fi' | 'mid_fi' | 'hi_fi';
    if (answers.experience === 'never') {
      format = 'low_fi';
    } else if (recordingScore <= 1 && editingScore === 0) {
      format = 'low_fi';
    } else if (totalScore <= 8) {
      format = 'low_fi';
    } else if (totalScore <= 18) {
      format = 'mid_fi';
    } else {
      format = 'hi_fi';
    }

    // Overrides for minimum MID-FI
    const hasDedicatedCamera = selectedEquip.includes('dedicated_camera');
    const hasExternalMic = selectedEquip.some(v => ['lapel_mic', 'desk_mic', 'boom_mic', 'audio_interface'].includes(v));
    const hasDedicatedLight = selectedEquip.some(v => ['ring_light', 'led_panel', 'softbox', 'light_kit'].includes(v));
    const hasDesktopEditor = hasDesktop && ['good', 'advanced', 'team'].includes(answers.editing_level);
    const hasCrew = selectedEquip.includes('crew');

    if (format === 'low_fi') {
      if ((hasDedicatedCamera && hasExternalMic && hasDedicatedLight) || hasDesktopEditor || hasCrew) {
        format = 'mid_fi';
      }
    }

    // Generate weekly plan
    const freq = answers.desired_frequency;
    const daysPerWeek = freq === '1_to_2' ? 2 : freq === '3_to_4' ? 4 : freq === '5_to_7' ? 5 : 7;
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].slice(0, daysPerWeek);

    const suggestions = {
      low_fi: ['Opinião Direta', 'Dica Rápida', 'Resposta de DM', 'Bastidores', 'Lista Rápida'],
      mid_fi: ['Case + Lição', 'Storytelling', 'Tutorial', 'Análise', 'Entrevista'],
      hi_fi: ['Documentário', 'Série', 'Produção Completa', 'Vlog Editado', 'Case Premium'],
    };

    const plan = days.map((day, i) => {
      let dayFormat = format;
      // Even mid/hi-fi users should have low-fi days
      if ((format === 'mid_fi' || format === 'hi_fi') && i % 2 === 0 && i < days.length - 1) {
        dayFormat = 'low_fi';
      }
      const sugs = suggestions[dayFormat];
      return {
        day,
        format: dayFormat,
        suggestion: sugs[i % sugs.length],
        time: dayFormat === 'low_fi' ? '15 min' : dayFormat === 'mid_fi' ? '40 min' : '2h+',
      };
    });

    return { format, plan, score: totalScore };
  };

  const handleFinish = async () => {
    if (!user) return;
    const res = calculateResult();
    setResult(res);
    setStep('result');

    setSaving(true);
    try {
      // Upsert format profile
      const { error } = await supabase.from('user_format_profile' as any).upsert({
        user_id: user.id,
        recommended_format: res.format,
        quiz_answers: answers,
        quiz_score: res.score,
        weekly_plan: res.plan,
      } as any, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (err) {
      console.error('Save format error:', err);
      toast.error('Erro ao salvar resultado');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (typeof step === 'number') {
      switch (step) {
        case 0: return !!answers.experience;
        case 1: return !!answers.time_script && !!answers.time_recording && !!answers.time_editing;
        case 2: return answers.equipment.length > 0;
        case 3: return !!answers.editing_level;
        case 4: return !!answers.desired_frequency;
      }
    }
    return true;
  };

  const formatLabels: Record<string, { emoji: string; name: string; desc: string }> = {
    low_fi: { emoji: '📱', name: 'LOW-FI Magnético', desc: 'Conteúdo simples com estrutura profissional. O roteiro faz o trabalho pesado, não a edição.' },
    mid_fi: { emoji: '🎬', name: 'MID-FI Magnético', desc: 'Conteúdo com qualidade visual e sonora elevada, edição leve mas intencional.' },
    hi_fi: { emoji: '🎥', name: 'HI-FI Magnético', desc: 'Conteúdo com produção completa. Qualidade de canal grande.' },
  };

  const ONBOARDING_STEPS = [
    { label: 'Perfil' }, { label: 'DNA de Voz' }, { label: 'Formato' }, { label: 'Narrativa' },
  ];
  const currentOnboardingStep = 2; // format_quiz is index 2

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md [&>button.absolute]:hidden max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-1">
          {ONBOARDING_STEPS.map((s, i) => (
            <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-1 rounded-full transition-all duration-300 ${
                i < currentOnboardingStep ? 'bg-primary' :
                i === currentOnboardingStep ? 'bg-primary/50' : 'bg-muted'
              }`} />
              <span className={`text-[10px] font-medium hidden sm:block ${
                i === currentOnboardingStep ? 'text-primary' : 'text-muted-foreground/60'
              }`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mt-2">
          <h2 className="text-lg font-bold text-foreground">
            {step === 'intro' && '🎯 Quiz de Formato Sustentável'}
            {step === 0 && '📹 Experiência com Gravação'}
            {step === 1 && '⏱️ Tempo de Roteiro'}
            {step === 2 && '🎬 Tempo de Gravação'}
            {step === 3 && '✂️ Tempo de Edição'}
            {step === 4 && '📅 Frequência'}
            {step === 'result' && '🎉 Seu Formato Sustentável'}
          </h2>
          <button
            onClick={onSkip}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0 ml-2"
            title="Configurar depois"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mt-1">

          {step === 'intro' && (
            <>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {`Vou te ajudar a descobrir o seu formato sustentável — aquele que você consegue manter sem sofrer.

São 5 perguntas rápidas. Menos de 1 minuto.`}
              </p>
              <Button onClick={() => setStep(0)} className="w-full rounded-xl">Começar</Button>
              <Button variant="ghost" onClick={onSkip} className="w-full rounded-xl text-muted-foreground">Configurar Depois</Button>
            </>
          )}

          {typeof step === 'number' && (
            <>
              {/* Progress */}
              <div className="flex gap-1 mb-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>

              {/* Question 0: Experience */}
              {step === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Você já grava vídeos de si mesmo pra conteúdo?</p>
                  {EXPERIENCE_OPTIONS.map(o => (
                    <OptionButton key={o.value} selected={answers.experience === o.value} onClick={() => setAnswers((p: any) => ({ ...p, experience: o.value }))}>
                      {o.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Question 1: Time */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Quanto tempo por dia você consegue dedicar a conteúdo?</p>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">ROTEIRO:</p>
                    {TIME_SCRIPT.map(o => (
                      <div key={o.value} className="mb-1.5">
                        <OptionButton selected={answers.time_script === o.value} onClick={() => setAnswers((p: any) => ({ ...p, time_script: o.value }))}>{o.label}</OptionButton>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">GRAVAÇÃO:</p>
                    {TIME_RECORDING.map(o => (
                      <div key={o.value} className="mb-1.5">
                        <OptionButton selected={answers.time_recording === o.value} onClick={() => setAnswers((p: any) => ({ ...p, time_recording: o.value }))}>{o.label}</OptionButton>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">EDIÇÃO:</p>
                    {TIME_EDITING.map(o => (
                      <div key={o.value} className="mb-1.5">
                        <OptionButton selected={answers.time_editing === o.value} onClick={() => setAnswers((p: any) => ({ ...p, time_editing: o.value }))}>{o.label}</OptionButton>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question 2: Equipment */}
              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">O que você tem disponível pra gravar? Marca tudo que tiver:</p>
                  {Object.entries(EQUIPMENT_CATEGORIES).map(([catKey, cat]) => (
                    <div key={catKey}>
                      <p className="text-xs font-semibold text-foreground mb-1.5">{cat.label}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {cat.items.map(item => (
                          <CheckboxButton key={item.value} selected={answers.equipment.includes(item.value)} onClick={() => toggleArray('equipment', item.value)}>
                            {item.label}
                          </CheckboxButton>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Question 3: Editing */}
              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Quais apps de gravação e edição você usa?</p>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">GRAVAÇÃO:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {RECORDING_APPS.map(a => (
                        <CheckboxButton key={a.value} selected={answers.recording_apps.includes(a.value)} onClick={() => toggleArray('recording_apps', a.value)}>
                          {a.label}
                        </CheckboxButton>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">EDIÇÃO:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {EDITING_APPS.map(a => (
                        <CheckboxButton key={a.value} selected={answers.editing_apps.includes(a.value)} onClick={() => toggleArray('editing_apps', a.value)}>
                          {a.label}
                        </CheckboxButton>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">SEU NÍVEL DE EDIÇÃO:</p>
                    {EDITING_LEVELS.map(o => (
                      <div key={o.value} className="mb-1.5">
                        <OptionButton selected={answers.editing_level === o.value} onClick={() => setAnswers((p: any) => ({ ...p, editing_level: o.value }))}>{o.label}</OptionButton>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question 4: Frequency */}
              {step === 4 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Quantos conteúdos por semana você QUER publicar? Não o ideal — o que você vai conseguir manter.</p>
                  {FREQUENCY_OPTIONS.map(o => (
                    <OptionButton key={o.value} selected={answers.desired_frequency === o.value} onClick={() => setAnswers((p: any) => ({ ...p, desired_frequency: o.value }))}>
                      {o.label}
                    </OptionButton>
                  ))}
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-2 pt-2">
                {step > 0 && (
                  <Button variant="outline" onClick={() => setStep((s) => typeof s === 'number' ? s - 1 : s)} className="flex-1 rounded-xl">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                )}
                {step < 4 ? (
                  <Button onClick={() => setStep((s) => typeof s === 'number' ? s + 1 : s)} disabled={!canProceed()} className="flex-1 rounded-xl">
                    Próximo <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleFinish} disabled={!canProceed()} className="flex-1 rounded-xl">
                    Ver resultado
                  </Button>
                )}
              </div>
            </>
          )}

          {step === 'result' && result && (
            <>
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
                <p className="text-3xl mb-2">{formatLabels[result.format].emoji}</p>
                <h3 className="text-lg font-bold text-foreground">{formatLabels[result.format].name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{formatLabels[result.format].desc}</p>
                <p className="text-xs text-muted-foreground mt-2">Score: {result.score} pontos</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">📅 Seu Plano Semanal Sugerido</h4>
                {result.plan.map((day, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 bg-muted/20 border border-border/20 rounded-xl">
                    <span className="text-xs font-semibold text-foreground w-16">{day.day}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      day.format === 'low_fi' ? 'bg-green-500/20 text-green-600' :
                      day.format === 'mid_fi' ? 'bg-blue-500/20 text-blue-600' :
                      'bg-purple-500/20 text-purple-600'
                    }`}>
                      {day.format.replace('_', '-').toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground flex-1">{day.suggestion}</span>
                    <span className="text-[10px] text-muted-foreground">{day.time}</span>
                  </div>
                ))}
              </div>

              <Button onClick={onComplete} className="w-full rounded-xl" disabled={saving}>
                {saving ? 'Salvando...' : 'Continuar'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
