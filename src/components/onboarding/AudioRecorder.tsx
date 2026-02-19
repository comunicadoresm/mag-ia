import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onAudioReady: (blob: Blob) => void;
  maxDuration?: number; // seconds
  disabled?: boolean;
}

export function AudioRecorder({ onAudioReady, maxDuration = 60, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded' | 'playing'>('idle');
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => setState('recorded');
        setState('recorded');
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
    } catch (err) {
      console.error('Mic error:', err);
    }
  }, [maxDuration]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const playAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
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
    setState('idle');
  }, []);

  const confirmAudio = useCallback(() => {
    if (blobRef.current) onAudioReady(blobRef.current);
  }, [onAudioReady]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

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
