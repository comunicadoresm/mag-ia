import React from 'react';
import { Message } from '@/types';
import ReactMarkdown from 'react-markdown';

interface ChatBubbleProps {
  message: Message;
  agentEmoji?: string;
}

export function ChatBubble({ message, agentEmoji }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3 animate-slide-up`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-base shrink-0 mt-1">
          {agentEmoji || '🤖'}
        </div>
      )}
      
      <div
        className={`max-w-[85%] md:max-w-[70%] ${
          isUser ? 'bubble-user' : 'bubble-assistant'
        }`}
      >
        {isUser ? (
          <p className="text-sm md:text-base whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm md:text-base prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-base shrink-0">
        🤖
      </div>
      <div className="bubble-assistant flex items-center gap-1">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
