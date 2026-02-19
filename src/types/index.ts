export interface Profile {
  id: string;
  email: string;
  name: string | null;
  plan_type: string | null;
  plan_type_id: string | null;
  plan_activated_at: string | null;
  ac_tags: string[] | null;
  last_ac_verification: string | null;
  has_completed_setup: boolean;
  onboarding_step: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  icon_emoji: string | null;
  system_prompt: string;
  welcome_message: string | null;
  model: string;
  is_active: boolean;
  display_order: number;
  ice_breakers: string[] | null;
  plan_access: string | null;
  created_at: string;
  updated_at: string;
}

// Extended Agent type for admin operations (includes sensitive api_key)
export interface AdminAgent extends Agent {
  api_key: string | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  agent_id: string;
  title: string | null;
  last_message_at: string;
  message_count: number;
  created_at: string;
  agent?: Agent;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_used: number | null;
  created_at: string;
}

export interface AccessLog {
  id: string;
  user_id: string | null;
  email: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string;
  display_order: number;
  created_at: string;
}

export interface AgentTag {
  id: string;
  agent_id: string;
  tag_id: string;
  created_at: string;
}

export interface AgentDocument {
  id: string;
  agent_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  agent_id: string;
  content: string;
  chunk_index: number;
  created_at: string;
}
