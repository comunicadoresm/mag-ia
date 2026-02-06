import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Agent } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelect: (agent: Agent) => void;
}

export function AgentSelector({ agents, selectedAgent, onSelect }: AgentSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          {selectedAgent ? (
            <>
              <span className="text-base">{selectedAgent.icon_emoji || '🤖'}</span>
              <span className="text-sm">{selectedAgent.name}</span>
            </>
          ) : (
            <span className="text-sm">Selecionar agente</span>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {agents.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={() => onSelect(agent)}
            className="flex items-center gap-3 py-2"
          >
            <span className="text-lg">{agent.icon_emoji || '🤖'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{agent.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {agent.description}
              </p>
            </div>
            {selectedAgent?.id === agent.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
