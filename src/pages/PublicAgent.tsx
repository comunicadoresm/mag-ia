import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PublicAgentHeader } from '@/components/public/PublicAgentHeader';
import { PublicLeadForm } from '@/components/public/PublicLeadForm';
import { PublicChatBubble, PublicTypingIndicator } from '@/components/public/PublicChatBubble';
import { PublicChatInput } from '@/components/public/PublicChatInput';
import { PublicUpgradeModal } from '@/components/public/PublicUpgradeModal';
import { IceBreakers } from '@/components/IceBreakers';

interface PublicAgentData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_emoji: string | null;
  welcome_message: string | null;
  ice_breakers: string[] | null;
  public_message_limit: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function generateFingerprint(): string {
  const nav = navigator;
  const raw = `${nav.userAgent}|${screen.width}x${screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}|${nav.language}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

function getStorageKey(agentId: string, fingerprint: string) {
  return `public_session_${agentId}_${fingerprint}`;
}

export default function PublicAgent() {
  const { slug } = useParams<{ slug: string }>();
  const [agent, setAgent] = useState<PublicAgentData | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messagesRemaining, setMessagesRemaining] = useState<number>(20);
  const [showForm, setShowForm] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fingerprint = useRef(generateFingerprint());

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Load agent
  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data, error } = await supabase.rpc('get_public_agents', { p_slug: slug });
      if (error || !data || data.length === 0) {
        setNotFound(true);
        setLoadingAgent(false);
        return;
      }
      const a = data[0] as PublicAgentData;
      setAgent(a);
      setMessagesRemaining(a.public_message_limit);

      // Check for existing session
      const key = getStorageKey(a.id, fingerprint.current);
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.session_id && parsed.expires_at && new Date(parsed.expires_at) > new Date()) {
            // Restore session
            setSessionId(parsed.session_id);
            setShowForm(false);
            // Load existing messages
            const { data: msgs } = await supabase
              .from('public_messages')
              .select('id, role, content')
              .eq('session_id', parsed.session_id)
              .order('created_at', { ascending: true });
            if (msgs && msgs.length > 0) {
              setMessages(msgs as ChatMessage[]);
            } else if (a.welcome_message) {
              setMessages([{ id: 'welcome', role: 'assistant', content: a.welcome_message }]);
            }
            // Get remaining count
            const { data: sess } = await supabase
              .from('public_sessions')
              .select('messages_used, max_messages')
              .eq('id', parsed.session_id)
              .single();
            if (sess) {
              setMessagesRemaining(sess.max_messages - sess.messages_used);
            }
          }
        } catch {}
      }
      setLoadingAgent(false);
    };
    load();
  }, [slug]);

  // Set meta tags
  useEffect(() => {
    if (agent) {
      document.title = `${agent.name} — Magnetic.IA`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', agent.description || `Converse com ${agent.name}`);
      else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = agent.description || `Converse com ${agent.name}`;
        document.head.appendChild(meta);
      }
    }
  }, [agent]);

  const handleLeadSubmit = async (data: { name: string; email: string; phone: string }) => {
    if (!agent) return;
    setFormLoading(true);
    try {
      // Insert lead
      const { data: lead, error: leadErr } = await supabase
        .from('public_leads')
        .insert({ name: data.name, email: data.email, phone: data.phone, agent_id: agent.id, agent_slug: agent.slug })
        .select('id')
        .single();
      if (leadErr) throw leadErr;

      // Create session
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data: session, error: sessErr } = await supabase
        .from('public_sessions')
        .insert({
          lead_id: lead.id,
          fingerprint: fingerprint.current,
          agent_id: agent.id,
          max_messages: agent.public_message_limit,
        })
        .select('id, expires_at')
        .single();
      if (sessErr) throw sessErr;

      // Store in localStorage
      const key = getStorageKey(agent.id, fingerprint.current);
      localStorage.setItem(key, JSON.stringify({ session_id: session.id, expires_at: session.expires_at, lead_id: lead.id }));

      setSessionId(session.id);
      setMessagesRemaining(agent.public_message_limit);
      setShowForm(false);

      // Add welcome message
      if (agent.welcome_message) {
        setMessages([{ id: 'welcome', role: 'assistant', content: agent.welcome_message }]);
      }
    } catch (err) {
      console.error('Error creating lead/session:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSend = useCallback(async (text: string) => {
    if (!agent || !sessionId || sending || messagesRemaining <= 0) return;

    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          agent_id: agent.id,
          fingerprint: fingerprint.current,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        if (data.error === 'limit_reached' || data.limit_reached) {
          setMessagesRemaining(0);
          setShowUpgrade(true);
          return;
        }
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }

      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'assistant', content: data.reply }]);
      setMessagesRemaining(data.messages_remaining);

      if (data.limit_reached) {
        setShowUpgrade(true);
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => [...prev, { id: `err_${Date.now()}`, role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' }]);
    } finally {
      setSending(false);
    }
  }, [agent, sessionId, sending, messagesRemaining]);

  // Loading
  if (loadingAgent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Not found
  if (notFound || !agent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center space-y-4">
        <span className="text-5xl">🤖</span>
        <h1 className="text-2xl font-bold text-foreground">Agente não encontrado</h1>
        <p className="text-muted-foreground">Este link pode estar incorreto ou o agente não está mais disponível.</p>
      </div>
    );
  }

  // Lead form
  if (showForm) {
    return (
      <PublicLeadForm
        agentName={agent.name}
        agentEmoji={agent.icon_emoji}
        agentDescription={agent.description}
        onSubmit={handleLeadSubmit}
        loading={formLoading}
      />
    );
  }

  // Chat
  const iceBreakers = agent.ice_breakers?.filter(Boolean) || [];
  const showIceBreakers = messages.length <= 1 && iceBreakers.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      <PublicAgentHeader
        agentName={agent.name}
        agentEmoji={agent.icon_emoji}
        messagesRemaining={messagesRemaining}
        maxMessages={agent.public_message_limit}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <PublicChatBubble key={msg.id} role={msg.role} content={msg.content} agentEmoji={agent.icon_emoji || undefined} />
        ))}
        {sending && <PublicTypingIndicator agentEmoji={agent.icon_emoji || undefined} />}
        <div ref={chatEndRef} />
      </div>

      {showIceBreakers && (
        <IceBreakers suggestions={iceBreakers} onSelect={handleSend} disabled={sending || messagesRemaining <= 0} />
      )}

      <PublicChatInput
        onSend={handleSend}
        disabled={sending || messagesRemaining <= 0}
        placeholder={messagesRemaining <= 0 ? 'Limite de mensagens atingido' : 'Digite sua mensagem...'}
      />

      <PublicUpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}
