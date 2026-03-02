import React from 'react';
import { Logo } from '@/components/Logo';

interface PublicAgentHeaderProps {
  agentName: string;
  agentEmoji?: string | null;
  messagesRemaining?: number;
  maxMessages?: number;
}

export function PublicAgentHeader({ agentName, agentEmoji, messagesRemaining, maxMessages }: PublicAgentHeaderProps) {
  const showCounter = messagesRemaining !== undefined && maxMessages !== undefined;
  const pct = showCounter ? ((maxMessages - messagesRemaining) / maxMessages) * 100 : 0;
  const counterColor = pct > 80 ? 'text-destructive' : pct > 50 ? 'text-warning' : 'text-muted-foreground';

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2">
          {agentEmoji && <span className="text-lg">{agentEmoji}</span>}
          <span className="font-semibold text-foreground text-sm">{agentName}</span>
        </div>
      </div>
      {showCounter && (
        <span className={`text-xs font-medium ${counterColor}`}>
          {messagesRemaining} msg restante{messagesRemaining !== 1 ? 's' : ''}
        </span>
      )}
    </header>
  );
}
