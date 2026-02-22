import React, { useState } from 'react';
import { Loader2, CheckCircle, Mic, LayoutGrid, BookOpen, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
    title: 'Áudio 1 — Falando com um AMIGO',
    // TODO: Revisar prompt de análise de voz — enviar para aprovação
    text: 'Imagina o seguinte: você tá indo encontrar um amigo e aconteceu um perrengue no caminho. Você vai atrasar uns 20 minutos.\n\nGrava um áudio como se tivesse mandando pra ele no WhatsApp — explicando o que aconteceu e que vai chegar atrasado.\n\nFala do jeito que você falaria de verdade. Sem filtro, sem pensar demais. Solta o áudio.',
    field: 'audio_casual_url',
  },
  {
    key: 'professional',
    title: 'Áudio 2 — Falando com um CLIENTE/SEGUIDOR',
    text: 'Agora muda o cenário. Imagina que alguém te mandou uma DM assim:\n\n"Oi, tô pensando em contratar você / comprar seu produto, mas ainda tô na dúvida se é pra mim."\n\nGrava um áudio respondendo essa pessoa. Como você responderia de verdade — no direct, sem roteiro, no improviso.',
    field: 'audio_professional_url',
  },
  {
    key: 'positioning',
    title: 'Áudio 3 — Falando com alguém que DISCORDA',
    text: 'Último áudio. Esse é o mais gostoso.\n\nImagina que alguém postou nos comentários algo tipo: "Isso aí não funciona, é tudo a mesma coisa, qualquer um faz isso."\n\nGrava um áudio como se fosse responder essa pessoa. Pode ser firme, pode ser irônico, pode ser didático — do jeito que VOCÊ responderia.\n\nNão segura. Fala o que pensa.',
    field: 'audio_positioning_url',
  },
];

const STEPS = [
  { id: 'profile',      icon: User,       label: 'Perfil' },
  { id: 'voice_dna',   icon: Mic,        label: 'DNA de Voz' },
  { id: 'format_quiz', icon: LayoutGrid, label: 'Formato' },
  { id: 'narrative',   icon: BookOpen,   label: 'Narrativa' },
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

  const currentOnboardingStep = 1; // voice_dna is index 1

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

      // Save the storage path (not public URL, since bucket is private)
      const newPaths = { ...uploadedPaths, [prompt.key]: path };
      setUploadedPaths(newPaths);

      // Also save public URL for display purposes
      const { data } = supabase.storage.from('voice-audios').getPublicUrl(path);
      const newUrls = { ...uploadedUrls, [prompt.key]: data.publicUrl };
      setUploadedUrls(newUrls);

      // Save URL to profile for reference
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

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md [&>button.absolute]:hidden overflow-y-auto max-h-[90vh]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">DNA de Voz</DialogTitle>
        {/* Progress bar — same as MagneticOnboarding step 1 */}
        <div className="flex items-center gap-1.5 mb-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                'w-full h-1 rounded-full transition-all duration-300',
                i < currentOnboardingStep ? 'bg-primary' :
                i === currentOnboardingStep ? 'bg-primary/50' : 'bg-muted'
              )} />
              <span className={cn(
                'text-[10px] font-medium hidden sm:block',
                i === currentOnboardingStep ? 'text-primary' : 'text-muted-foreground/60'
              )}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="mt-2">
          <h2 className="text-lg font-bold text-foreground">
            {step === 'intro' && '🎤 DNA de Voz'}
            {step === 'audio' && AUDIO_PROMPTS[audioStep].title}
            {step === 'uploading' && '⏫ Salvando áudio...'}
            {step === 'processing' && '⏳ Processando seus áudios...'}
            {step === 'validation' && '✅ Validação do DNA de Voz'}
          </h2>
        </div>

        <div className="space-y-4 mt-1">
          {/* INTRO */}
          {step === 'intro' && (
            <>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {`Agora vem a parte mais importante da sua Magnética.\n\nEu vou te pedir 3 áudios curtinhos — de no máximo 1 minuto cada.\nPode parecer estranho, mas confia: é assim que a IA vai aprender a escrever do SEU jeito, com as SUAS palavras.\n\nNão precisa pensar muito. Não precisa ser bonito.\nQuanto mais natural, melhor.\n\nBora pro primeiro?`}
              </p>
              <Button onClick={() => setStep('audio')} className="w-full rounded-xl">
                Começar
              </Button>
              <button
                onClick={onSkip}
                className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
              >
                Configurar depois
              </button>
            </>
          )}

          {/* AUDIO RECORDING */}
          {step === 'audio' && (
            <>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {AUDIO_PROMPTS[audioStep].text}
              </p>

              {/* Progress dots */}
              <div className="flex items-center gap-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      i < audioStep ? 'bg-primary' : i === audioStep ? 'bg-primary/50' : 'bg-muted'
                    )}
                  />
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Áudio {audioStep + 1} de 3
              </p>

              <AudioRecorder
                onAudioReady={handleAudioReady}
                maxDuration={60}
                key={audioStep}
              />
            </>
          )}

          {/* UPLOADING */}
          {step === 'uploading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground text-center">
                Salvando áudio {audioStep + 1}...
              </p>
            </div>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground text-center">
                Analisando seu tom de voz com IA...
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Isso pode levar até 1 minuto
              </p>
            </div>
          )}

          {/* VALIDATION */}
          {step === 'validation' && (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                Aqui está um parágrafo escrito com o seu tom de voz. Leia e avalie de 1 a 10:
              </p>
              <div className="bg-muted/30 border border-border/30 rounded-xl p-4 text-sm text-foreground italic">
                "{validationText}"
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Qual nota você dá? (1-10)</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => setScore(n)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-xs font-bold transition-colors',
                        n <= score
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {score < 7 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">O que soou estranho?</p>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Ex: não uso essas palavras, meu tom é mais direto..."
                    className="rounded-xl bg-muted/30 border-border/30"
                    rows={3}
                  />
                </div>
              )}

              <Button
                onClick={handleValidation}
                disabled={recalibrating}
                className="w-full rounded-xl"
              >
                {recalibrating ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Recalibrando...</>
                ) : score >= 7 ? (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Aprovar e continuar</>
                ) : (
                  'Recalibrar DNA'
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
