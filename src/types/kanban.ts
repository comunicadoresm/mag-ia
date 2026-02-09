export type ScriptStatus = 'idea' | 'scripting' | 'recording' | 'editing' | 'posted';

export interface ScriptSection {
  id: string;
  label: string;
  placeholder: string;
}

export interface ScriptStructurePart {
  title: string;
  sections: ScriptSection[];
}

export interface ScriptStructure {
  inicio: ScriptStructurePart;
  desenvolvimento: ScriptStructurePart;
  final: ScriptStructurePart;
}

export interface ScriptTemplate {
  id: string;
  title: string;
  theme: string | null;
  style: string;
  format: string | null;
  objective: string | null;
  agent_id: string | null;
  script_structure: ScriptStructure;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserScript {
  id: string;
  user_id: string;
  template_id: string | null;
  title: string;
  theme: string | null;
  style: string;
  format: string | null;
  objective: string | null;
  status: ScriptStatus;
  script_content: Record<string, string>;
  views: number | null;
  likes: number | null;
  comments: number | null;
  followers: number | null;
  shares: number | null;
  saves: number | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: ScriptStatus | 'templates';
  title: string;
  color: string;
  items: (ScriptTemplate | UserScript)[];
  canAdd: boolean;
}

export const KANBAN_COLUMNS: Omit<KanbanColumn, 'items'>[] = [
  { id: 'templates', title: 'Ideia Magnética', color: '#FAFC59', canAdd: false },
  { id: 'scripting', title: 'Roterizando', color: '#F97316', canAdd: true },
  { id: 'recording', title: 'Gravando', color: '#3B82F6', canAdd: true },
  { id: 'editing', title: 'Editando', color: '#A855F7', canAdd: true },
  { id: 'posted', title: 'Postado', color: '#22C55E', canAdd: false },
];

export const OBJECTIVES: { value: string; label: string; color: string }[] = [
  { value: 'attraction', label: 'A - Atração', color: '#EF4444' },
  { value: 'connection', label: 'C - Conexão', color: '#3B82F6' },
  { value: 'conversion', label: 'V - Conversão', color: '#22C55E' },
  { value: 'retention', label: 'R - Retenção', color: '#A855F7' },
];

export const STYLES: { value: string; label: string }[] = [
  { value: 'storytelling_looping', label: 'Storytelling Looping' },
  { value: 'analysis', label: 'Análise' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'list', label: 'Lista' },
  { value: 'comparison', label: 'Comparação' },
];

export const FORMATS: { value: string; label: string }[] = [
  { value: 'falado_camera', label: 'Falado para câmera' },
  { value: 'voice_over', label: 'Voice Over' },
  { value: 'texto_tela', label: 'Texto na Tela' },
  { value: 'misto', label: 'Misto' },
];

export const DEFAULT_SCRIPT_STRUCTURE: ScriptStructure = {
  inicio: {
    title: '🎯 INÍCIO (Gancho)',
    sections: [
      { id: 'hook', label: 'Gancho', placeholder: 'Primeira frase que prende a atenção...' },
    ],
  },
  desenvolvimento: {
    title: '📚 DESENVOLVIMENTO',
    sections: [
      { id: 'content', label: 'Conteúdo Principal', placeholder: 'Desenvolva o tema com exemplos práticos...' },
    ],
  },
  final: {
    title: '🎬 FINAL (CTA)',
    sections: [
      { id: 'cta', label: 'Call-to-Action', placeholder: 'Fechamento com chamada para ação...' },
    ],
  },
};
