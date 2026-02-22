import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AudioRecorderProps {
  onAudioReady: (blob: Blob) => void;
  maxDuration?: number; // seconds
  disabled?: boolean;
}

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
    '',
  ];
  for (const type of types) {
    if (!type) return ''; // fallback: let browser choose
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      // isTypeSupported may throw in some browsers
    }
  }
  return '';
}

export function AudioRecorder({ onAudioReady, maxDuration = 60, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded' | 'playing' | 'error'>('idle');
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setErrorMsg('');
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg('Seu navegador não suporta gravação de áudio. Tente usar Chrome ou Safari.');
        setState('error');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback: try without options
        console.warn('MediaRecorder with options failed, trying without:', e);
        mediaRecorder = new MediaRecorder(stream);
      }

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        cleanupStream();
        const recordedMime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: recordedMime });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => setState('recorded');
        setState('recorded');
      };

      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        cleanupStream();
        setErrorMsg('Erro durante a gravação. Tente novamente.');
        setState('error');
      };

      mediaRecorder.start(100);
      setState('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev + 1 >= maxDuration) {
            mediaRecorder.stop();
            if (timerRef.current) clearInterval(timerRef.current);
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Mic error:', err);
      cleanupStream();
      
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setErrorMsg('Permissão de microfone negada. Habilite o microfone nas configurações do seu navegador e tente novamente.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setErrorMsg('Nenhum microfone encontrado. Conecte um microfone e tente novamente.');
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setErrorMsg('O microfone está sendo usado por outro aplicativo. Feche outros apps e tente novamente.');
      } else {
        setErrorMsg('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
      }
      setState('error');
      toast.error('Erro ao acessar microfone');
    }
  }, [maxDuration, cleanupStream]);

  const stopRecording = useCallback(() => {
    try {
      mediaRecorderRef.current?.stop();
    } catch (e) {
      console.error('Error stopping recorder:', e);
      cleanupStream();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, [cleanupStream]);

  const playAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(err => {
      console.error('Play error:', err);
      toast.error('Erro ao reproduzir áudio');
    });
    setState('playing');
  }, []);

  const pauseAudio = useCallback(() => {
    audioRef.current?.pause();
    setState('recorded');
  }, []);

  const reRecord = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
    }
    blobRef.current = null;
    audioRef.current = null;
    setDuration(0);
    setErrorMsg('');
    setState('idle');
  }, []);

  const confirmAudio = useCallback(() => {
    if (blobRef.current) onAudioReady(blobRef.current);
  }, [onAudioReady]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupStream();
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, [cleanupStream]);

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 p-4 bg-destructive/10 rounded-2xl border border-destructive/20">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <p className="text-sm text-center text-destructive font-medium">{errorMsg}</p>
        <Button
          onClick={() => { setErrorMsg(''); setState('idle'); }}
          variant="outline"
          className="rounded-xl"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (state === 'idle') {
    return (
      <Button
        onClick={startRecording}
        disabled={disabled}
        className="w-full h-14 gap-3 rounded-2xl bg-primary text-primary-foreground text-base font-semibold"
      >
        <Mic className="w-5 h-5" />
        🎙️ Gravar áudio — máximo {maxDuration / 60} minuto
      </Button>
    );
  }

  if (state === 'recording') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-lg font-mono font-bold text-foreground">{formatTime(duration)}</span>
          <span className="text-xs text-muted-foreground">/ {formatTime(maxDuration)}</span>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-2">
          <div
            className="bg-red-500 h-2 rounded-full transition-all"
            style={{ width: `${(duration / maxDuration) * 100}%` }}
          />
        </div>
        <Button onClick={stopRecording} variant="destructive" className="gap-2 rounded-xl">
          <Square className="w-4 h-4" /> Parar gravação
        </Button>
      </div>
    );
  }

  // recorded or playing
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Áudio gravado</span>
        <span className="text-sm font-mono font-semibold text-foreground">{formatTime(duration)}</span>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={state === 'playing' ? pauseAudio : playAudio}
          className="gap-1.5 rounded-xl"
        >
          {state === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {state === 'playing' ? 'Pausar' : 'Ouvir'}
        </Button>
        <Button size="sm" variant="outline" onClick={reRecord} className="gap-1.5 rounded-xl">
          <RotateCcw className="w-4 h-4" /> Regravar
        </Button>
        <Button size="sm" onClick={confirmAudio} className="gap-1.5 rounded-xl">
          <Check className="w-4 h-4" /> Usar este áudio
        </Button>
      </div>
    </div>
  );
}
