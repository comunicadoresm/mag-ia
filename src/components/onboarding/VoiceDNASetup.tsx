import React, { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { AudioRecorder } from './AudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoiceDNASetupProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const AUDIO_PROMPTS = [
  {
    key: 'casual',
    title: 'Áudio 1 de 3 — Tom Casual',
    text: '"Imagine que está mandando um áudio no WhatsApp pra um amigo explicando o que você faz de verdade."',
    field: 'audio_casual_url',
  },
  {
    key: 'professional',
    title: 'Áudio 2 de 3 — Tom Profissional',
    text: '"Alguém te mandou uma DM: \'Tô pensando em te contratar, mas ainda tô na dúvida.\' Responda como responderia de verdade."',
    field: 'audio_professional_url',
  },
  {
    key: 'positioning',
    title: 'Áudio 3 de 3 — Posicionamento',
    text: '"Alguém comentou: \'Isso aí não funciona, qualquer um faz isso.\' Responda o que pensa."',
    field: 'audio_positioning_url',
  },
];

export function VoiceDNASetup({ open, onComplete, onSkip }: VoiceDNASetupProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'intro' | 'audio' | 'uploading' | 'processing' | 'validation'>('intro');
  const [audioStep, setAudioStep] = useState(0);
  const [uploadedPaths, setUploadedPaths] = useState<Record<string, string>>({});
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});

  const [validationText, setValidationText] = useState('');
  const [score, setScore] = useState(7);
  const [feedback, setFeedback] = useState('');
  const [recalibrating, setRecalibrating] = useState(false);

  const handleAudioReady = async (blob: Blob) => {
    if (!user) return;
    const prompt = AUDIO_PROMPTS[audioStep];
    setStep('uploading');

    try {
      const mimeType = blob.type || 'audio/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm';
      const path = `${user.id}/${prompt.key}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('voice-audios')
        .upload(path, blob, { upsert: true, contentType: mimeType });

      if (uploadError) throw uploadError;

      const newPaths = { ...uploadedPaths, [prompt.key]: path };
      setUploadedPaths(newPaths);

      const { data } = supabase.storage.from('voice-audios').getPublicUrl(path);
      const newUrls = { ...uploadedUrls, [prompt.key]: data.publicUrl };
      setUploadedUrls(newUrls);

      const upsertData: Record<string, string> = { user_id: user.id, [prompt.field]: data.publicUrl };
      await supabase.from('voice_profiles' as any).upsert(upsertData as any, { onConflict: 'user_id' });

      toast.success(`Áudio ${audioStep + 1} salvo!`);

      if (audioStep < 2) {
        setAudioStep(prev => prev + 1);
        setStep('audio');
      } else {
        await processVoiceDNA(newPaths);
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao salvar áudio. Tente novamente.');
      setStep('audio');
    }
  };

  const processVoiceDNA = async (paths: Record<string, string>) => {
    if (!user) return;
    setStep('processing');

    try {
      const { data, error } = await supabase.functions.invoke('process-voice-dna', {
        body: { audio_paths: paths, user_id: user.id },
      });

      if (error) throw error;

      setValidationText(data.validation_paragraph || '');
      setStep('validation');
    } catch (err) {
      console.error('Voice DNA error:', err);
      toast.error('Erro ao processar áudios. Tente novamente.');
      setStep('audio');
    }
  };

  const handleValidation = async () => {
    if (!user) return;

    if (score >= 7) {
      await supabase
        .from('voice_profiles' as any)
        .update({ is_calibrated: true, calibration_score: score } as any)
        .eq('user_id', user.id);
      toast.success('DNA de Voz calibrado!');
      onComplete();
    } else {
      setRecalibrating(true);
      try {
        const { data, error } = await supabase.functions.invoke('recalibrate-voice', {
          body: { user_id: user.id, score, feedback },
        });
        if (error) throw error;
        setValidationText(data.validation_paragraph || '');
        setFeedback('');
        setScore(7);
      } catch {
        toast.error('Erro na recalibração');
      } finally {
        setRecalibrating(false);
      }
    }
  };

  if (!open) return null;

  return (
    <div>
      <div className="flex flex-col px-6 py-7 max-w-md mx-auto animate-fade-in">
        {/* Progress bar — 3 segments */}
        <div className="flex gap-1.5 mb-5">
          <div className="flex-1 h-1 rounded-sm bg-[#FAFC59]/40" />
          <div className="flex-1 h-1 rounded-sm bg-white/[0.08]" />
          <div className="flex-1 h-1 rounded-sm bg-white/[0.08]" />
        </div>

        {/* Step header */}
        <div className="flex items-center mb-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-[10px] bg-[#FAFC59]/15 flex items-center justify-center text-lg">
              🎙️
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FAFC59]">
              Etapa 1 · DNA de Voz
            </span>
          </div>
        </div>

        {/* INTRO */}
        {step === 'intro' && (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-[#fafafa] mt-3 leading-tight">
              Grave 3 áudios curtos
            </h2>
            <p className="text-sm text-[#999] mt-2 leading-relaxed">
              A IA vai analisar seu tom, vocabulário e energia para escrever conteúdo que soa exatamente como você — não como um robô.
            </p>

            <div className="mt-6 bg-[#292929] border border-white/[0.06] rounded-2xl p-5 text-center">
              <p className="text-[11px] font-semibold text-[#FAFC59] uppercase tracking-wider">
                {AUDIO_PROMPTS[0].title}
              </p>
              <div className="mt-3 p-3 bg-white/[0.03] rounded-[10px] text-left">
                <p className="text-[13px] text-[#999] leading-relaxed">
                  {AUDIO_PROMPTS[0].text}
                </p>
              </div>
              {/* Audio wave mock */}
              <div className="flex items-center justify-center gap-[3px] h-10 my-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-sm bg-[#FAFC59]"
                    style={{
                      height: [12, 24, 36, 20, 30, 16, 28, 22, 34, 14][i],
                      animation: `wave 1.2s ease-in-out ${i * 0.1}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1" />

            <div className="mt-6">
              <button
                onClick={() => setStep('audio')}
                className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 transition-all duration-200"
              >
                Começar gravação →
              </button>
            </div>
          </>
        )}

        {/* AUDIO RECORDING */}
        {step === 'audio' && (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-[#fafafa] mt-3 leading-tight">
              {AUDIO_PROMPTS[audioStep].title}
            </h2>

            {/* Audio step progress */}
            <div className="flex items-center gap-2 mt-3">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i < audioStep ? 'bg-[#FAFC59]' : i === audioStep ? 'bg-[#FAFC59]/40' : 'bg-white/[0.08]'
                  )}
                />
              ))}
            </div>

            <div className="mt-5 bg-[#292929] border border-white/[0.06] rounded-2xl p-5">
              <div className="p-3 bg-white/[0.03] rounded-[10px] text-left mb-4">
                <p className="text-[13px] text-[#999] leading-relaxed">
                  {AUDIO_PROMPTS[audioStep].text}
                </p>
              </div>

              <AudioRecorder
                onAudioReady={handleAudioReady}
                maxDuration={60}
                key={audioStep}
              />
            </div>

            <p className="text-xs text-[#666] text-center mt-3">
              Áudio {audioStep + 1} de 3 — todos os áudios são obrigatórios
            </p>
          </>
        )}

        {/* UPLOADING */}
        {step === 'uploading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-[#FAFC59] animate-spin" />
            <p className="text-sm text-[#999] text-center">
              Salvando áudio {audioStep + 1}...
            </p>
          </div>
        )}

        {/* PROCESSING */}
        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#FAFC59]/20 border-t-[#FAFC59] animate-spin" />
            <p className="text-sm text-[#999] text-center">
              Analisando seu tom de voz com IA...
            </p>
            <p className="text-xs text-[#666] text-center">
              Isso pode levar até 1 minuto
            </p>
          </div>
        )}

        {/* VALIDATION */}
        {step === 'validation' && (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-[#fafafa] mt-3 leading-tight">
              ✅ Validação do DNA de Voz
            </h2>
            <p className="text-sm text-[#999] mt-2 leading-relaxed">
              Aqui está um parágrafo escrito com o seu tom de voz. Leia e avalie de 1 a 10:
            </p>

            <div className="mt-4 bg-[#292929] border border-white/[0.06] rounded-2xl p-5">
              <p className="text-sm text-[#fafafa] italic leading-relaxed">
                "{validationText}"
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-[#fafafa]">Qual nota você dá? (1-10)</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setScore(n)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-colors',
                      n <= score
                        ? 'bg-[#FAFC59] text-[#141414]'
                        : 'bg-white/[0.06] text-[#666] hover:bg-white/[0.1]'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {score < 7 && (
              <div className="mt-3">
                <p className="text-sm text-[#999] mb-1">O que soou estranho?</p>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Ex: não uso essas palavras, meu tom é mais direto..."
                  className="rounded-xl bg-white/[0.05] border-white/[0.06] text-[#fafafa] placeholder:text-[#666]"
                  rows={3}
                />
              </div>
            )}

            <div className="flex-1" />

            <div className="mt-6">
              <button
                onClick={handleValidation}
                disabled={recalibrating}
                className="w-full py-4 px-6 bg-[#FAFC59] text-[#141414] rounded-full font-bold text-[15px] shadow-[0_0_40px_-10px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {recalibrating ? (
                  <div className="w-5 h-5 border-2 border-[#141414]/30 border-t-[#141414] rounded-full animate-spin" />
                ) : score >= 7 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Aprovar e continuar
                  </>
                ) : (
                  'Recalibrar DNA'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
