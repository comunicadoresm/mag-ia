import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Conversation } from '@/types';
import { ChevronRight } from 'lucide-react';

interface ConversationItemProps {
  conversation: Conversation;
  onClick: (conversation: Conversation) => void;
}

export function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(conversation.last_message_at), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <button
      onClick={() => onClick(conversation)}
      className="w-full card-cm-interactive p-4 text-left animate-slide-up"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
          {conversation.agent?.icon_emoji || '💬'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">
            {conversation.title || 'Nova conversa'}
          </h4>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{conversation.agent?.name}</span>
            <span>•</span>
            <span>{timeAgo}</span>
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  );
}
