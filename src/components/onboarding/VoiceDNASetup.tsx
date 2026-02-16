import React, { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AudioRecorder } from './AudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface VoiceDNASetupProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const AUDIO_PROMPTS = [
  {
    key: 'casual',
    title: 'Áudio 1 — Falando com um AMIGO',
    text: 'Imagina o seguinte: você tá indo encontrar um amigo e aconteceu um perrengue no caminho. Você vai atrasar uns 20 minutos.\n\nGrava um áudio como se tivesse mandando pra ele no WhatsApp — explicando o que aconteceu e que vai chegar atrasado.\n\nFala do jeito que você falaria de verdade. Sem filtro, sem pensar demais. Solta o áudio.',
  },
  {
    key: 'professional',
    title: 'Áudio 2 — Falando com um CLIENTE/SEGUIDOR',
    text: 'Agora muda o cenário. Imagina que alguém te mandou uma DM assim:\n\n"Oi, tô pensando em contratar você / comprar seu produto, mas ainda tô na dúvida se é pra mim."\n\nGrava um áudio respondendo essa pessoa. Como você responderia de verdade — no direct, sem roteiro, no improviso.',
  },
  {
    key: 'positioning',
    title: 'Áudio 3 — Falando com alguém que DISCORDA',
    text: 'Último áudio. Esse é o mais gostoso.\n\nImagina que alguém postou nos comentários algo tipo: "Isso aí não funciona, é tudo a mesma coisa, qualquer um faz isso."\n\nGrava um áudio como se fosse responder essa pessoa. Pode ser firme, pode ser irônico, pode ser didático — do jeito que VOCÊ responderia.\n\nNão segura. Fala o que pensa.',
  },
];

export function VoiceDNASetup({ open, onComplete, onSkip }: VoiceDNASetupProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'intro' | 'audio' | 'processing' | 'validation'>('intro');
  const [audioStep, setAudioStep] = useState(0);
  const [audios, setAudios] = useState<Record<string, Blob>>({});
  const [uploading, setUploading] = useState(false);
  
  const [validationText, setValidationText] = useState('');
  const [score, setScore] = useState(7);
  const [feedback, setFeedback] = useState('');
  const [recalibrating, setRecalibrating] = useState(false);

  const handleAudioReady = async (blob: Blob) => {
    const key = AUDIO_PROMPTS[audioStep].key;
    setAudios(prev => ({ ...prev, [key]: blob }));

    if (audioStep < 2) {
      setAudioStep(prev => prev + 1);
    } else {
      // All 3 audios done, upload and process
      const allAudios = { ...audios, [key]: blob };
      await uploadAndProcess(allAudios);
    }
  };

  const handleSkipAudio = () => {
    if (audioStep < 2) {
      setAudioStep(prev => prev + 1);
    } else {
      // If at least 1 audio recorded, process
      if (Object.keys(audios).length > 0) {
        uploadAndProcess(audios);
      } else {
        onSkip();
      }
    }
  };

  const uploadAndProcess = async (audioBlobs: Record<string, Blob>) => {
    if (!user) return;
    setStep('processing');
    setUploading(true);

    try {
      const urls: Record<string, string> = {};

      for (const [key, blob] of Object.entries(audioBlobs)) {
        const path = `${user.id}/${key}.webm`;
        const { error } = await supabase.storage.from('voice-audios').upload(path, blob, {
          upsert: true,
          contentType: 'audio/webm',
        });
        if (error) throw error;
        const { data } = supabase.storage.from('voice-audios').getPublicUrl(path);
        urls[key] = data.publicUrl;
      }

      setUploading(false);
      setProcessing(true);

      // Call process-voice-dna edge function
      const { data, error } = await supabase.functions.invoke('process-voice-dna', {
        body: {
          audio_urls: urls,
          user_id: user.id,
        },
      });

      if (error) throw error;

      setValidationText(data.validation_paragraph || '');
      setStep('validation');
    } catch (err) {
      console.error('Voice DNA error:', err);
      toast.error('Erro ao processar áudios. Tente novamente.');
      setStep('audio');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleValidation = async () => {
    if (!user) return;

    if (score >= 7) {
      // Accepted - mark as calibrated
      await supabase
        .from('voice_profiles' as any)
        .update({ is_calibrated: true, calibration_score: score } as any)
        .eq('user_id', user.id);
      toast.success('DNA de Voz calibrado!');
      onComplete();
    } else {
      // Need recalibration
      setRecalibrating(true);
      try {
        const { data, error } = await supabase.functions.invoke('recalibrate-voice', {
          body: { user_id: user.id, score, feedback },
        });
        if (error) throw error;
        setValidationText(data.validation_paragraph || '');
        setFeedback('');
        setScore(7);
      } catch (err) {
        toast.error('Erro na recalibração');
      } finally {
        setRecalibrating(false);
      }
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-card border-border/50 max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {step === 'intro' && '🎤 DNA de Voz'}
              {step === 'audio' && AUDIO_PROMPTS[audioStep].title}
              {step === 'processing' && '⏳ Processando seus áudios...'}
              {step === 'validation' && '✅ Validação do DNA de Voz'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-2 space-y-4">
          {step === 'intro' && (
            <>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {`Agora vem a parte mais importante da sua Magnética.

Eu vou te pedir 3 áudios curtinhos — de no máximo 1 minuto cada.
Pode parecer estranho, mas confia: é assim que a IA vai aprender a escrever do SEU jeito, com as SUAS palavras.

Não precisa pensar muito. Não precisa ser bonito.
Quanto mais natural, melhor.

Bora pro primeiro?`}
              </p>
              <Button onClick={() => setStep('audio')} className="w-full rounded-xl">
                Começar
              </Button>
              <Button variant="ghost" onClick={onSkip} className="w-full rounded-xl text-muted-foreground">
                Configurar Depois
              </Button>
            </>
          )}

          {step === 'audio' && (
            <>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {AUDIO_PROMPTS[audioStep].text}
              </p>

              <div className="flex items-center gap-2 mb-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < audioStep ? 'bg-primary' : i === audioStep ? 'bg-primary/50' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              <AudioRecorder onAudioReady={handleAudioReady} maxDuration={60} />

              <Button variant="ghost" onClick={handleSkipAudio} className="w-full rounded-xl text-muted-foreground text-sm">
                Pular este áudio
              </Button>
            </>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground text-center">
                {uploading ? 'Enviando áudios...' : 'Analisando seu tom de voz com IA...'}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Isso pode levar até 1 minuto
              </p>
            </div>
          )}

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
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        n <= score
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                      }`}
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
