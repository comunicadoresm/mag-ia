import React from 'react';
import { User, Mic, LayoutGrid, BookOpen, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'profile',      icon: User,       label: 'Perfil' },
  { id: 'voice_dna',   icon: Mic,        label: 'DNA de Voz' },
  { id: 'format_quiz', icon: LayoutGrid, label: 'Formato' },
  { id: 'narrative',   icon: BookOpen,   label: 'Narrativa' },
];

interface OnboardingStepBarProps {
  currentStep: 'profile' | 'voice_dna' | 'format_quiz' | 'narrative';
  completedSteps?: string[];
}

export function OnboardingStepBar({ currentStep, completedSteps = [] }: OnboardingStepBarProps) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-1.5 mb-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isDone = i < currentIndex || completedSteps.includes(s.id);
        const isActive = i === currentIndex;
        return (
          <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
            <div className={cn(
              'w-full h-1 rounded-full transition-all duration-300',
              isDone ? 'bg-primary' :
              isActive ? 'bg-primary/50' : 'bg-muted'
            )} />
            <div className="flex items-center gap-1">
              {isDone ? (
                <CheckCircle2 className="w-2.5 h-2.5 text-primary hidden sm:block" />
              ) : (
                <Icon className={cn(
                  'w-2.5 h-2.5 hidden sm:block',
                  isActive ? 'text-primary' : 'text-muted-foreground/40'
                )} />
              )}
              <span className={cn(
                'text-[10px] font-medium hidden sm:block',
                isActive ? 'text-primary' : isDone ? 'text-primary/70' : 'text-muted-foreground/50'
              )}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
