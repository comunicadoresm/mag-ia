import React from 'react';
import ReactMarkdown from 'react-markdown';

interface PublicChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  agentEmoji?: string;
}

export function PublicChatBubble({ role, content, agentEmoji }: PublicChatBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="max-w-[85%] md:max-w-[60%] bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3">
          <p className="text-sm md:text-base whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-slide-up max-w-3xl mx-auto">
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm shrink-0 mt-1">
        {agentEmoji || '🤖'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm md:text-base prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export function PublicTypingIndicator({ agentEmoji }: { agentEmoji?: string }) {
  return (
    <div className="flex gap-3 animate-fade-in max-w-3xl mx-auto">
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
        {agentEmoji || '🤖'}
      </div>
      <div className="flex items-center gap-1.5 pt-2">
        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
