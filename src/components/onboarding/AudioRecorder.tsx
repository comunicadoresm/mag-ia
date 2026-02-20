import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Play, Pause, RotateCcw, Check } from 'lucide-react';

interface AudioRecorderProps {
  onAudioReady: (blob: Blob) => void;
  maxDuration?: number;
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

  // ── IDLE: Start button ──
  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={startRecording}
          disabled={disabled}
          className="w-16 h-16 rounded-full bg-[#FAFC59] flex items-center justify-center shadow-[0_0_30px_-5px_rgba(250,252,89,0.4)] hover:bg-[#e8ea40] disabled:opacity-40 transition-all"
        >
          <Mic className="w-7 h-7 text-[#141414]" />
        </button>
        <p className="text-xs text-[#666]">
          Toque para gravar (máx. {maxDuration}s)
        </p>
      </div>
    );
  }

  // ── RECORDING: Waveform + Timer + Stop ──
  if (state === 'recording') {
    return (
      <div className="flex flex-col items-center gap-3">
        {/* Waveform visualization */}
        <div className="flex items-center justify-center gap-[3px] h-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="w-[3px] rounded-sm bg-[#FAFC59]"
              style={{
                height: [12, 24, 36, 20, 30, 16, 28, 22, 34, 14, 26, 18][i],
                animation: `wave 1.2s ease-in-out ${i * 0.08}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Timer */}
        <span className="text-2xl font-bold font-mono text-[#fafafa]">
          {formatTime(duration)}
        </span>

        {/* Red stop button */}
        <button
          onClick={stopRecording}
          className="w-14 h-14 rounded-full bg-[#ef4444] flex items-center justify-center hover:bg-[#dc2626] transition-colors"
        >
          <div className="w-5 h-5 rounded-sm bg-white" />
        </button>

        <p className="text-xs text-[#666]">
          Gravando... toque para parar
        </p>
      </div>
    );
  }

  // ── RECORDED / PLAYING: Playback controls ──
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-[#999]">
        <span>Áudio gravado</span>
        <span className="font-mono font-semibold text-[#fafafa]">{formatTime(duration)}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={state === 'playing' ? pauseAudio : playAudio}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[#fafafa] text-sm hover:bg-white/[0.06] transition-colors"
        >
          {state === 'playing' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {state === 'playing' ? 'Pausar' : 'Ouvir'}
        </button>
        <button
          onClick={reRecord}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[#fafafa] text-sm hover:bg-white/[0.06] transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Regravar
        </button>
        <button
          onClick={confirmAudio}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAFC59] text-[#141414] text-sm font-semibold hover:bg-[#e8ea40] transition-colors"
        >
          <Check className="w-4 h-4" /> Usar
        </button>
      </div>
    </div>
  );
}
