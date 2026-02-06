import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Agent } from '@/types';
import { Button } from '@/components/ui/button';

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  return (
    <div className="card-cm-interactive p-5 animate-slide-up">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
          {agent.icon_emoji || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-foreground mb-1">
            {agent.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {agent.description}
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          onClick={() => onSelect(agent)}
          className="btn-cm-primary gap-2"
          size="sm"
        >
          Usar
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
