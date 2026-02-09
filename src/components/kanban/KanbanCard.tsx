import React from 'react';
import { Copy, Sparkles, BarChart3, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScriptTemplate, UserScript, OBJECTIVES, STYLES, FORMATS } from '@/types/kanban';

interface KanbanCardProps {
  item: ScriptTemplate | UserScript;
  isTemplate: boolean;
  columnId: string;
  onDuplicate?: (item: ScriptTemplate) => void;
  onClick?: (item: ScriptTemplate | UserScript) => void;
  onWriteWithAI?: (item: UserScript) => void;
  onOpenMetrics?: (item: UserScript) => void;
}

// Color palette for cards based on column
const COLUMN_COLORS: Record<string, { bg: string; accent: string }> = {
  templates: { bg: 'from-primary/20 to-primary/5', accent: 'bg-primary text-primary-foreground' },
  scripting: { bg: 'from-orange-500/20 to-orange-500/5', accent: 'bg-orange-500 text-white' },
  recording: { bg: 'from-blue-500/20 to-blue-500/5', accent: 'bg-blue-500 text-white' },
  editing: { bg: 'from-purple-500/20 to-purple-500/5', accent: 'bg-purple-500 text-white' },
  posted: { bg: 'from-green-500/20 to-green-500/5', accent: 'bg-green-500 text-white' },
};

export function KanbanCard({
  item,
  isTemplate,
  columnId,
  onDuplicate,
  onClick,
  onWriteWithAI,
  onOpenMetrics,
}: KanbanCardProps) {
  const objective = OBJECTIVES.find(o => o.value === item.objective);
  const styleObj = STYLES.find(s => s.value === item.style);
  const formatObj = FORMATS.find(f => f.value === item.format);
  const colors = COLUMN_COLORS[columnId] || COLUMN_COLORS.templates;

  const isPosted = columnId === 'posted';
  const userScript = item as UserScript;

  return (
    <div
      className={`relative bg-gradient-to-br ${colors.bg} border border-border/30 rounded-2xl p-4 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200 group overflow-hidden`}
      onClick={() => onClick?.(item)}
    >
      {/* Top row: Title + Arrow */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-bold text-foreground text-sm leading-tight line-clamp-2 flex-1">
          {item.title}
        </h4>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {objective && (
          <span
            className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide"
            style={{
              backgroundColor: objective.color,
              color: '#000',
            }}
          >
            {objective.label.split(' - ')[0]}
          </span>
        )}
        {styleObj && (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide bg-primary text-primary-foreground">
            {styleObj.label}
          </span>
        )}
        {formatObj && (
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-muted/80 text-muted-foreground">
            {formatObj.label}
          </span>
        )}
      </div>

      {/* Theme subtitle */}
      {item.theme && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{item.theme}</p>
      )}

      {/* Metrics mini-preview for posted */}
      {isPosted && userScript.views !== null && (
        <div className="grid grid-cols-3 gap-2 mb-3 bg-background/30 rounded-xl p-2.5">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Views</p>
            <p className="text-sm font-bold text-foreground">{(userScript.views || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Coments</p>
            <p className="text-sm font-bold text-foreground">{(userScript.comments || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Saves</p>
            <p className="text-sm font-bold text-foreground">{(userScript.saves || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Action button - always visible */}
      <div className="flex items-center gap-2">
        {isTemplate && onDuplicate && (
          <Button
            size="sm"
            className="flex-1 text-xs h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(item as ScriptTemplate);
            }}
          >
            <Copy className="w-3 h-3 mr-1.5" />
            Duplicar
          </Button>
        )}

        {!isTemplate && !isPosted && onWriteWithAI && (
          <Button
            size="sm"
            className="flex-1 text-xs h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              onWriteWithAI(userScript);
            }}
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            Escrever com IA
          </Button>
        )}

        {isPosted && onOpenMetrics && (
          <Button
            size="sm"
            className="flex-1 text-xs h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMetrics(userScript);
            }}
          >
            <BarChart3 className="w-3 h-3 mr-1.5" />
            Métricas
          </Button>
        )}
      </div>
    </div>
  );
}
