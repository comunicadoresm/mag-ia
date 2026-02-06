import React, { useState } from 'react';
import { ArrowUp, Plus } from 'lucide-react';
import { Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { AgentSelector } from './AgentSelector';

interface HomeInputProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

export function HomeInput({
  agents,
  selectedAgent,
  onSelectAgent,
  onSubmit,
  disabled,
}: HomeInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && selectedAgent) {
      onSubmit(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="bg-muted rounded-2xl border border-border shadow-lg">
        {/* Input area */}
        <div className="p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite / para comandos"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-base min-h-[60px]"
            rows={2}
            disabled={disabled}
          />
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <AgentSelector
              agents={agents}
              selectedAgent={selectedAgent}
              onSelect={onSelectAgent}
            />
          </div>

          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!message.trim() || !selectedAgent || disabled}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
