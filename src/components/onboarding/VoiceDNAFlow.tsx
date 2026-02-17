import React, { useState } from 'react';
import { Loader2, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AudioRecorder } from './AudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface VoiceDNAFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

type FlowStep = 'intro' | 'audio_0' | 'uploading_0' | 'done_0'
  | 'audio_1' | 'uploading_1' | 'done_1'
  | 'audio_2' | 'uploading_2' | 'done_2'
  | 'processing' | 'validation';

const AUDIO_PROMPTS = [
  {
    key: 'casual',
    emoji: '1',
    title: 'Manda um áudio pro seu amigo',
    subtitle: 'Como se fosse no WhatsApp, sem filtro',
    prompt: `Cenário: você tá indo encontrar um amigo e aconteceu um perrengue no caminho. Vai atrasar uns 20 minutos.

Grava como se tivesse mandando pra ele no zap — explicando o que aconteceu e que vai chegar atrasado.

Fala do jeito que você falaria de VERDADE.
Sem pensar demais. Solta o verbo.`,
    tip: 'Quanto mais natural, melhor. A IA precisa do seu jeito REAL de falar.',
  },
  {
    key: 'professional',
    emoji: '2',
    title: 'Responde esse seguidor',
    subtitle: 'Alguém na DM querendo comprar de você',
    prompt: `Cenário: alguém te mandou uma DM assim:

"Oi, tô pensando em contratar você / comprar seu produto, mas ainda tô na dúvida se é pra mim."

Grava um áudio respondendo essa pessoa.
Como você responderia de verdade — no direct, sem roteiro, no improviso.`,
    tip: 'Essa é a versão "profissional" de você. Mas continua sendo VOCÊ.',
  },
  {
    key: 'positioning',
    emoji: '3',
    title: 'Alguém veio te criticar',
    subtitle: 'Esse é o mais gostoso de gravar',
    prompt: `Cenário: alguém postou nos comentários algo tipo:

"Isso aí não funciona, é tudo a mesma coisa, qualquer um faz isso."

Grava respondendo essa pessoa.
Pode ser firme, pode ser irônico, pode ser didático — do jeito que VOCÊ responderia.

Não segura. Fala o que pensa.`,
    tip: 'Aqui aparece o seu POSICIONAMENTO real. É isso que te diferencia de todo mundo.',
  },
];

export function VoiceDNAFlow({ onComplete, onSkip }: VoiceDNAFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<FlowStep>('intro');
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [validationText, setValidationText] = useState('');
  const [score, setScore] = useState(7);
  const [feedback, setFeedback] = useState('');
  const [recalibrating, setRecalibrating] = useState(false);

  const handleAudioReady = async (blob: Blob, audioIndex: number) => {
    if (!user) return;

    const key = AUDIO_PROMPTS[audioIndex].key;
    setStep(`uploading_${audioIndex}` as FlowStep);

    try {
      // Detect extension based on actual blob type
      const ext = blob.type.includes('mp4') ? 'mp4'
        : blob.type.includes('ogg') ? 'ogg'
        : blob.type.includes('wav') ? 'wav'
        : 'webm';

      const path = `${user.id}/${key}.${ext}`;

      const { error } = await supabase.storage
        .from('voice-audios')
        .upload(path, blob, { upsert: true, contentType: blob.type || 'audio/webm' });

      if (error) throw error;

      const { data } = supabase.storage.from('voice-audios').getPublicUrl(path);

      setAudioUrls(prev => ({ ...prev, [key]: data.publicUrl }));
      setStep(`done_${audioIndex}` as FlowStep);

      toast.success(`Áudio ${audioIndex + 1} salvo!`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar áudio. Tente novamente.');
      setStep(`audio_${audioIndex}` as FlowStep);
    }
  };

  const handleSkipAudio = (audioIndex: number) => {
    if (audioIndex < 2) {
      setStep(`audio_${audioIndex + 1}` as FlowStep);
    } else {
      if (Object.keys(audioUrls).length === 0) {
        onSkip();
      } else {
        processAllAudios();
      }
    }
  };

  const goToNextAudio = (currentIndex: number) => {
    if (currentIndex < 2) {
      setStep(`audio_${currentIndex + 1}` as FlowStep);
    } else {
      processAllAudios();
    }
  };

  const processAllAudios = async () => {
    if (!user) return;
    setStep('processing');
    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-voice-dna', {
        body: { audio_urls: audioUrls, user_id: user.id },
      });

      if (error) throw error;

      setValidationText(data.validation_paragraph || '');
      setStep('validation');
    } catch (err) {
      console.error('Process error:', err);
      toast.error('Erro ao processar áudios. Tente novamente.');
      setStep('audio_0');
    } finally {
      setProcessing(false);
    }
  };

  const handleValidation = async () => {
    if (!user) return;

    if (score >= 7) {
      await supabase
        .from('voice_profiles')
        .update({ is_calibrated: true, calibration_score: score } as any)
        .eq('user_id', user.id);

      toast.success('Seu DNA de Voz tá calibrado! Agora a IA escreve com a SUA voz.');
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
        toast.info('DNA recalibrado! Avalia esse novo parágrafo.');
      } catch (err) {
        toast.error('Erro na recalibração. Tenta de novo.');
      } finally {
        setRecalibrating(false);
      }
    }
  };

  // ===== INTRO =====
  if (step === 'intro') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="text-4xl">🎤</div>
          <h2 className="text-xl font-bold text-foreground">
            Bora descobrir o SEU tom de voz?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Eu vou te pedir 3 áudios curtinhos — de no máximo 1 minuto cada.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Pode parecer estranho, mas confia: é assim que a IA vai aprender a escrever
            do <strong className="text-foreground">SEU jeito</strong>, com as <strong className="text-foreground">SUAS palavras</strong>.
          </p>
          <p className="text-xs text-muted-foreground/70 italic">
            Não precisa pensar muito. Não precisa ser bonito. Quanto mais natural, melhor.
          </p>
        </div>

        <div className="space-y-2.5">
          {AUDIO_PROMPTS.map((prompt, i) => (
            <div key={i} className="flex items-center gap-3 bg-muted/20 border border-border/20 rounded-xl p-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {prompt.emoji}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{prompt.title}</p>
                <p className="text-xs text-muted-foreground">{prompt.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2">
          <Button onClick={() => setStep('audio_0')} className="w-full h-12 rounded-xl text-base font-semibold">
            Bora começar
          </Button>
          <Button variant="ghost" onClick={onSkip} className="w-full rounded-xl text-sm text-muted-foreground">
            Pular por enquanto
          </Button>
        </div>
      </div>
    );
  }

  // ===== GRAVAÇÃO DE ÁUDIO (1 por vez) =====
  if (step.startsWith('audio_')) {
    const audioIndex = parseInt(step.split('_')[1]);
    const prompt = AUDIO_PROMPTS[audioIndex];

    return (
      <div className="space-y-5">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={`
              h-1.5 flex-1 rounded-full transition-all duration-300
              ${i < audioIndex ? 'bg-primary' : i === audioIndex ? 'bg-primary/60' : 'bg-muted/30'}
            `} />
          ))}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-primary font-medium uppercase tracking-wide">
            Áudio {audioIndex + 1} de 3
          </p>
          <h2 className="text-lg font-bold text-foreground">
            {prompt.title}
          </h2>
        </div>

        <div className="bg-muted/20 border border-border/20 rounded-xl p-4">
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {prompt.prompt}
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
          <p className="text-xs text-primary/80 italic">
            💡 {prompt.tip}
          </p>
        </div>

        <AudioRecorder
          key={audioIndex}
          onAudioReady={(blob) => handleAudioReady(blob, audioIndex)}
          maxDuration={60}
        />

        <Button
          variant="ghost"
          onClick={() => handleSkipAudio(audioIndex)}
          className="w-full rounded-xl text-sm text-muted-foreground"
        >
          Pular este áudio
        </Button>
      </div>
    );
  }

  // ===== UPLOAD EM ANDAMENTO =====
  if (step.startsWith('uploading_')) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Salvando seu áudio...</p>
      </div>
    );
  }

  // ===== ÁUDIO SALVO — AVANÇAR =====
  if (step.startsWith('done_')) {
    const audioIndex = parseInt(step.split('_')[1]);
    const isLast = audioIndex === 2;

    return (
      <div className="flex flex-col items-center gap-5 py-8">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-primary" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-semibold text-foreground">
            Áudio {audioIndex + 1} salvo!
          </p>
          <p className="text-sm text-muted-foreground">
            {isLast
              ? 'Todos os áudios prontos. Vou analisar seu tom de voz agora.'
              : `Faltam ${2 - audioIndex} áudio${2 - audioIndex > 1 ? 's' : ''}.`
            }
          </p>
        </div>
        <Button
          onClick={() => goToNextAudio(audioIndex)}
          className="gap-2 rounded-xl px-6"
        >
          {isLast ? 'Analisar meu tom de voz' : 'Próximo áudio'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // ===== PROCESSAMENTO =====
  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center gap-5 py-12">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div className="text-center space-y-2">
          <p className="text-base font-semibold text-foreground">
            Analisando seu tom de voz...
          </p>
          <p className="text-sm text-muted-foreground">
            A IA tá ouvindo seus áudios e identificando seu jeito único de falar.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Isso pode levar até 1 minuto
          </p>
        </div>
      </div>
    );
  }

  // ===== VALIDAÇÃO =====
  if (step === 'validation') {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-foreground">
            Isso aqui soa como VOCÊ?
          </h2>
          <p className="text-sm text-muted-foreground">
            A IA escreveu esse parágrafo usando o seu tom de voz. Leia e me diz:
          </p>
        </div>

        <div className="bg-muted/20 border border-border/20 rounded-xl p-5">
          <p className="text-sm text-foreground leading-relaxed italic">
            "{validationText}"
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground text-center">
            De 1 a 10, quão parecido com você ficou?
          </p>
          <div className="flex gap-1.5 justify-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                onClick={() => setScore(n)}
                className={`
                  w-8 h-8 rounded-lg text-xs font-bold transition-all
                  ${n <= score
                    ? 'bg-primary text-primary-foreground scale-105'
                    : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  }
                `}
              >
                {n}
              </button>
            ))}
          </div>

          {score >= 7 && (
            <p className="text-xs text-center text-primary/80">
              Boa! Tá parecendo você mesmo.
            </p>
          )}
        </div>

        {score < 7 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Me conta o que ficou estranho — a IA vai ajustar:
            </p>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ex: não uso essas palavras, meu tom é mais direto, eu seria mais irônico..."
              className="rounded-xl bg-muted/10 border-border/20 text-sm"
              rows={3}
            />
          </div>
        )}

        <Button
          onClick={handleValidation}
          disabled={recalibrating}
          className="w-full h-11 rounded-xl text-sm font-semibold"
        >
          {recalibrating ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Recalibrando...</>
          ) : score >= 7 ? (
            <><CheckCircle className="w-4 h-4 mr-2" /> Tá ótimo, bora pro próximo</>
          ) : (
            <><RotateCcw className="w-4 h-4 mr-2" /> Recalibrar meu DNA</>
          )}
        </Button>
      </div>
    );
  }

  return null;
}
