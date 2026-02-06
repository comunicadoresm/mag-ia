import React from 'react';
import { Copy, Sparkles, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScriptTemplate, UserScript, OBJECTIVES } from '@/types/kanban';

interface KanbanCardProps {
  item: ScriptTemplate | UserScript;
  isTemplate: boolean;
  columnId: string;
  onDuplicate?: (item: ScriptTemplate) => void;
  onClick?: (item: ScriptTemplate | UserScript) => void;
  onWriteWithAI?: (item: UserScript) => void;
  onOpenMetrics?: (item: UserScript) => void;
}

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
  const styleLabel = item.style?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const isPosted = columnId === 'posted';
  const userScript = item as UserScript;

  return (
    <div
      className="bg-card border border-border/50 rounded-xl p-4 cursor-pointer hover:border-primary/40 transition-all group"
      onClick={() => onClick?.(item)}
    >
      {/* Header with objective and template badge */}
      <div className="flex items-center justify-between mb-3">
        {objective && (
          <Badge
            className="text-xs font-medium"
            style={{ 
              backgroundColor: `${objective.color}20`,
              color: objective.color,
              borderColor: objective.color
            }}
          >
            {objective.label}
          </Badge>
        )}
        {!objective && <div />}
        
        {isTemplate && (
          <div className="flex items-center gap-1 text-primary text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            <span>Template</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="font-semibold text-foreground mb-2 line-clamp-2">
        {item.title}
      </h4>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {item.theme && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {item.theme}
          </span>
        )}
        {styleLabel && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {styleLabel}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        {isTemplate && onDuplicate && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(item as ScriptTemplate);
            }}
          >
            <Copy className="w-3 h-3 mr-1" />
            Duplicar
          </Button>
        )}
        
        {!isTemplate && !isPosted && onWriteWithAI && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onWriteWithAI(userScript);
            }}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Escrever com IA
          </Button>
        )}

        {isPosted && onOpenMetrics && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMetrics(userScript);
            }}
          >
            <BarChart3 className="w-3 h-3 mr-1" />
            Métricas
          </Button>
        )}
      </div>

      {/* Metrics preview for posted */}
      {isPosted && userScript.views !== null && (
        <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Views</p>
            <p className="text-sm font-semibold text-foreground">{userScript.views || 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Coments</p>
            <p className="text-sm font-semibold text-foreground">{userScript.comments || 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saves</p>
            <p className="text-sm font-semibold text-foreground">{userScript.saves || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
