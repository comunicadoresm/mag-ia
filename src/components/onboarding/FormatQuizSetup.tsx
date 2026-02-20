import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FormatQuizSetupProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

// ── Simplified quiz: 5 questions with single-select each ──

const QUESTIONS = [
  {
    id: 'experience',
    label: 'Pergunta 1 de 5',
    question: 'Você já grava vídeos de si mesmo pra conteúdo?',
    options: [
      { value: 'never', label: 'Nunca gravei', score: 0 },
      { value: 'some_times', label: 'Já gravei algumas vezes', score: 1 },
      { value: 'frequent', label: 'Gravo com certa frequência', score: 2 },
      { value: 'weekly', label: 'Gravo toda semana', score: 3 },
    ],
  },
  {
    id: 'time_available',
    label: 'Pergunta 2 de 5',
    question: 'Quanto tempo você consegue dedicar por semana pra roteiro + gravação + edição?',
    options: [
      { value: 'up_to_2h', label: 'Até 2 horas por semana', score: 1 },
      { value: '2_to_5h', label: '2 a 5 horas por semana', score: 2 },
      { value: '5_to_10h', label: '5 a 10 horas por semana', score: 3 },
      { value: 'more_10h', label: 'Mais de 10 horas por semana', score: 4 },
    ],
  },
  {
    id: 'equipment',
    label: 'Pergunta 3 de 5',
    question: 'O que você tem disponível pra gravar?',
    options: [
      { value: 'phone_basic', label: 'Celular e só', score: 1 },
      { value: 'phone_mic', label: 'Celular + microfone externo', score: 2 },
      { value: 'phone_full', label: 'Celular + mic + iluminação', score: 3 },
      { value: 'camera', label: 'Câmera dedicada + setup completo', score: 4 },
    ],
  },
  {
    id: 'editing_level',
    label: 'Pergunta 4 de 5',
    question: 'Qual seu nível de edição de vídeo?',
    options: [
      { value: 'never', label: 'Nunca editei um vídeo', score: 0 },
      { value: 'basic', label: 'Sei o básico (cortar, legenda)', score: 1 },
      { value: 'good', label: 'Edito bem (transições, trilha)', score: 3 },
      { value: 'advanced', label: 'Edição avançada ou tenho editor', score: 5 },
    ],
  },
  {
    id: 'desired_frequency',
    label: 'Pergunta 5 de 5',
    question: 'Quantos conteúdos por semana você quer manter?',
    options: [
      { value: '1_to_2', label: '1 a 2 por semana', score: 1 },
      { value: '3_to_4', label: '3 a 4 por semana', score: 2 },
      { value: '5_to_7', label: '5 a 7 (quase diário)', score: 3 },
      { value: 'more_7', label: 'Mais de 7 por dia', score: 4 },
    ],
  },
];

export function FormatQuizSetup({ open, onComplete, onSkip }: FormatQuizSetupProps) {
  const { user } = useAuth();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const q = QUESTIONS[currentQ];
  const selectedValue = answers[q.id] || '';

  const handleSelect = (value: string) => {
    setAnswers(prev => ({ ...prev, [q.id]: value }));
  };

  const handleNext = async () => {
    if (!selectedValue) return;

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(prev => prev + 1);
      return;
    }

    // Last question — use latest answers (includes current selection already via selectedValue)
    const finalAnswers = { ...answers, [q.id]: selectedValue };
    setSaving(true);
    try {
      let totalScore = 0;
      QUESTIONS.forEach(question => {
        const answer = finalAnswers[question.id];
        const opt = question.options.find(o => o.value === answer);
        totalScore += opt?.score || 0;
      });

      let format: 'low_fi' | 'mid_fi' | 'hi_fi';
      if (finalAnswers.experience === 'never' || totalScore <= 6) format = 'low_fi';
      else if (totalScore <= 12) format = 'mid_fi';
      else format = 'hi_fi';

      const freq = finalAnswers.desired_frequency;
      const daysPerWeek = freq === '1_to_2' ? 2 : freq === '3_to_4' ? 4 : freq === '5_to_7' ? 5 : 7;
      const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].slice(0, daysPerWeek);
      const suggestions: Record<string, string[]> = {
        low_fi: ['Opinião Direta', 'Dica Rápida', 'Resposta de DM', 'Bastidores', 'Lista Rápida'],
        mid_fi: ['Case + Lição', 'Storytelling', 'Tutorial', 'Análise', 'Entrevista'],
        hi_fi: ['Documentário', 'Série', 'Produção Completa', 'Vlog Editado', 'Case Premium'],
      };
      const plan = days.map((day, i) => {
        let dayFormat = format;
        if ((format === 'mid_fi' || format === 'hi_fi') && i % 2 === 0 && i < days.length - 1) dayFormat = 'low_fi';
        const sugs = suggestions[dayFormat];
        return { day, format: dayFormat, suggestion: sugs[i % sugs.length], time: dayFormat === 'low_fi' ? '15 min' : dayFormat === 'mid_fi' ? '40 min' : '2h+' };
      });

      await supabase.from('user_format_profile' as any).upsert({
        user_id: user!.id,
        recommended_format: format,
        quiz_answers: finalAnswers,
        quiz_score: totalScore,
        weekly_plan: plan,
      } as any, { onConflict: 'user_id' });

      onComplete();
    } catch (err) {
      console.error('Save format error:', err);
      toast.error('Erro ao salvar resultado');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ(prev => prev - 1);
  };

  return (
    <div>
      <div className="flex flex-col px-6 py-7 max-w-md mx-auto animate-fade-in">
        {/* Progress bar — 3 segments */}
        <div className="flex gap-1.5 mb-5">
          <div className="flex-1 h-1 rounded-sm bg-[#FAFC59]" />
          <div className="flex-1 h-1 rounded-sm bg-[#FAFC59]" />
          <div className="flex-1 h-1 rounded-sm bg-white/[0.08]" />
        </div>

        {/* Step header */}
        <div className="flex items-center mb-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[10px] bg-[#FAFC59]/15 flex items-center justify-center text-lg">
              📁
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FAFC59]">
              Etapa 2 · Formato
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold tracking-tight text-[#fafafa] mt-3 leading-tight">
          Qual seu estilo de produzir?
        </h2>
        <p className="text-sm text-[#999] mt-2 leading-relaxed">
          5 perguntas rápidas pra IA entender o que faz sentido pra sua rotina. Assim ela só sugere formatos que você consegue executar de verdade — sem sobrecarregar.
        </p>

        {/* Question label */}
        <p className="text-[11px] font-semibold text-[#FAFC59] uppercase tracking-wider mt-6 mb-1">
          {q.label}
        </p>
        <p className="text-[15px] font-semibold text-[#fafafa] leading-snug mb-4">
          {q.question}
        </p>

        {/* Options */}
        <div className="space-y-2.5">
          {q.options.map(opt => {
            const isSelected = selectedValue === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm transition-all',
                  isSelected
                    ? 'border-[#FAFC59]/40 bg-[#FAFC59]/10 text-[#fafafa]'
                    : 'border-white/[0.06] bg-white/[0.03] text-[#999] hover:border-white/[0.12]'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                  isSelected ? 'border-[#FAFC59] bg-[#FAFC59]' : 'border-[#666]'
                )}>
                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-[#141414]" />}
                </div>
                <span className={cn(isSelected && 'font-medium text-[#fafafa]')}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Navigation */}
        <div className="mt-6 space-y-2">
          <button
            onClick={handleNext}
            disabled={!selectedValue || saving}
            className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-[#141414]/30 border-t-[#141414] rounded-full animate-spin" />
            ) : currentQ < QUESTIONS.length - 1 ? (
              'Próxima pergunta →'
            ) : (
              'Ver resultado →'
            )}
          </button>
          {currentQ > 0 && (
            <button
              onClick={handleBack}
              className="w-full py-3 text-sm text-[#666] hover:text-[#999] transition-colors"
            >
              ← Voltar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
