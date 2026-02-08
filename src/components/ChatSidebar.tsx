import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Loader2, ArrowLeft, PanelLeftClose, PanelLeftOpen, Pencil, Check, X, Trash2, MoreHorizontal } from 'lucide-react';
import { isToday, isYesterday, isThisWeek } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, Agent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  thisWeek: Conversation[];
  older: Conversation[];
}

interface ChatSidebarProps {
  agent: Agent | null;
  onNewConversation: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function ChatSidebar({ agent, onNewConversation, collapsed, onToggleCollapse }: ChatSidebarProps) {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchConversations = async () => {
      if (!user || !agent) return;
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('agent_id', agent.id)
          .order('last_message_at', { ascending: false })
          .limit(50);
        if (!error) setConversations(data as Conversation[]);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, [user, agent]);

  const groupConversations = (conversations: Conversation[]): GroupedConversations => {
    const groups: GroupedConversations = { today: [], yesterday: [], thisWeek: [], older: [] };
    conversations.forEach((conv) => {
      const date = new Date(conv.last_message_at || conv.created_at);
      if (isToday(date)) groups.today.push(conv);
      else if (isYesterday(date)) groups.yesterday.push(conv);
      else if (isThisWeek(date)) groups.thisWeek.push(conv);
      else groups.older.push(conv);
    });
    return groups;
  };

  const handleRename = async (convId: string) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    await supabase.from('conversations').update({ title: editTitle.trim() }).eq('id', convId);
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, title: editTitle.trim() } : c)));
    setEditingId(null);
  };

  const handleDelete = async (convId: string) => {
    await supabase.from('messages').delete().eq('conversation_id', convId);
    await supabase.from('conversations').delete().eq('id', convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (convId === conversationId) navigate('/home');
  };

  const grouped = groupConversations(conversations);

  const renderConversationItem = (conv: Conversation) => {
    const isActive = conv.id === conversationId;
    const isEditing = editingId === conv.id;

    if (isEditing) {
      return (
        <div key={conv.id} className="flex items-center gap-1 px-2 py-1 mx-1">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(conv.id); if (e.key === 'Escape') setEditingId(null); }}
            className="h-7 text-xs bg-muted border-border flex-1"
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRename(conv.id)}>
            <Check className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEditingId(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div
        key={conv.id}
        className={cn(
          "group relative flex items-center rounded-lg mx-1 transition-colors cursor-pointer",
          isActive ? "bg-muted" : "hover:bg-muted/50"
        )}
      >
        <button
          onClick={() => navigate(`/chat/${conv.id}`)}
          className="flex-1 text-left py-2 pl-3 pr-8 min-w-0"
        >
          <span className={cn(
            "block text-sm leading-5 truncate",
            isActive ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {conv.title || 'Nova conversa'}
          </span>
        </button>

        {/* 3-dot menu - absolute positioned, visible on hover & active */}
        <div className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 transition-opacity",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-background/60"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom" className="w-40">
              <DropdownMenuItem onClick={() => { setEditingId(conv.id); setEditTitle(conv.title || ''); }}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(conv.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const renderGroup = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <h3 className="text-[11px] font-semibold text-muted-foreground/70 mb-1.5 px-3 uppercase tracking-wider">
          {title}
        </h3>
        <div className="space-y-0.5">
          {items.map(renderConversationItem)}
        </div>
      </div>
    );
  };

  // Collapsed state
  if (collapsed) {
    return (
      <aside className="hidden md:flex flex-col w-[52px] bg-sidebar-background border-r border-sidebar-border h-screen items-center py-3 gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onToggleCollapse}>
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onNewConversation}>
          <Plus className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-[260px] bg-sidebar-background h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onToggleCollapse}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onNewConversation}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Back to agent */}
      <div className="px-3 pb-3">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm w-full rounded-lg hover:bg-muted/50 px-2 py-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-xs font-medium">{agent?.name || 'Voltar'}</span>
        </button>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1 px-1 py-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-muted-foreground/60">Nenhuma conversa ainda</p>
          </div>
        ) : (
          <>
            {renderGroup('Hoje', grouped.today)}
            {renderGroup('Ontem', grouped.yesterday)}
            {renderGroup('Esta semana', grouped.thisWeek)}
            {renderGroup('Mais antigas', grouped.older)}
          </>
        )}
      </ScrollArea>
    </aside>
  );
}
