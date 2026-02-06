import React from 'react';
import { MessageSquare } from 'lucide-react';

interface IceBreakersProps {
  suggestions: string[];
  onSelect: (message: string) => void;
  disabled?: boolean;
}

export function IceBreakers({ suggestions, onSelect, disabled }: IceBreakersProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl mx-auto px-4 mb-4">
      <p className="text-xs text-muted-foreground text-center mb-1">
        Sugestões para começar
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.slice(0, 3).map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
            className="group flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-primary/10 border border-border hover:border-primary/30 rounded-xl text-sm text-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed max-w-[280px]"
          >
            <MessageSquare className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
            <span className="text-left line-clamp-2">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
