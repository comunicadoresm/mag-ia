import React from 'react';
import { Copy, Sparkles, BarChart3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScriptTemplate, UserScript } from '@/types/kanban';

interface KanbanCardProps {
  item: ScriptTemplate | UserScript;
  isTemplate: boolean;
  columnId: string;
  onDuplicate?: (item: ScriptTemplate) => void;
  onClick?: (item: ScriptTemplate | UserScript) => void;
  onWriteWithAI?: (item: UserScript) => void;
  onOpenMetrics?: (item: UserScript) => void;
  onDelete?: (item: UserScript) => void;
  onDuplicateCard?: (item: UserScript) => void;
}

const COLUMN_COLORS: Record<string, string> = {
  templates: 'from-primary/20 to-primary/5',
  scripting: 'from-orange-500/20 to-orange-500/5',
  recording: 'from-blue-500/20 to-blue-500/5',
  editing: 'from-purple-500/20 to-purple-500/5',
  posted: 'from-green-500/20 to-green-500/5',
};

function getFormatColor(format: string): string {
  const key = format.toLowerCase().replace(/[\s-]/g, '');
  if (key.includes('lofi') || key.includes('lo_fi')) return 'bg-violet-500 text-white';
  if (key.includes('hifi') || key.includes('hi_fi') || key.includes('highfi')) return 'bg-emerald-500 text-white';
  // mid-fi and anything else: blue (current)
  return 'bg-blue-600 text-white';
}

// Capitalize first letter of each word
function formatLabel(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

export function KanbanCard({
  item,
  isTemplate,
  columnId,
  onDuplicate,
  onClick,
  onWriteWithAI,
  onOpenMetrics,
  onDelete,
  onDuplicateCard,
}: KanbanCardProps) {
  const bg = COLUMN_COLORS[columnId] || COLUMN_COLORS.templates;
  const isPosted = columnId === 'posted';
  const userScript = item as UserScript;

  return (
    <div
      className={`relative bg-gradient-to-br ${bg} border border-border/30 rounded-2xl p-4 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200 group overflow-hidden`}
      onClick={() => onClick?.(item)}
    >
      {/* Delete button - top right, hover only */}
      {!isTemplate && onDelete && (
        <button
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => { e.stopPropagation(); onDelete(userScript); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Title */}
      <div className="flex items-start gap-2 mb-3 pr-6">
        <h4 className="font-bold text-foreground text-sm leading-tight line-clamp-2 flex-1">
          {item.title}
        </h4>
      </div>

      {/* Tags: Objetivo, Estilo, Formato */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {item.objective && (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide bg-red-500 text-white">
            {formatLabel(item.objective)}
          </span>
        )}
        {item.style && (
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide bg-primary text-primary-foreground">
            {formatLabel(item.style)}
          </span>
        )}
        {item.format && item.format.split(',').map(f => f.trim()).filter(Boolean).map(f => (
          <span key={f} className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${getFormatColor(f)}`}>
            {formatLabel(f)}
          </span>
        ))}
      </div>

      {/* Theme */}
      {item.theme && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{item.theme}</p>
      )}

      {/* Metrics for posted */}
      {isPosted && userScript.views !== null && (
        <div className="grid grid-cols-4 gap-1.5 mb-3 bg-background/30 rounded-xl p-2.5">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Views</p>
            <p className="text-xs font-bold text-foreground">{(userScript.views || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Curtidas</p>
            <p className="text-xs font-bold text-foreground">{(userScript.likes || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Coments</p>
            <p className="text-xs font-bold text-foreground">{(userScript.comments || 0).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Saves</p>
            <p className="text-xs font-bold text-foreground">{(userScript.saves || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-2">
        {isTemplate && onDuplicate && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8 rounded-xl text-muted-foreground opacity-70 hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
            onClick={(e) => { e.stopPropagation(); onDuplicate(item as ScriptTemplate); }}
          >
            <Copy className="w-3 h-3 mr-1.5" />
            Usar Template
          </Button>
        )}
        {!isTemplate && (columnId === 'scripting' || columnId === 'recording' || columnId === 'editing') && onWriteWithAI && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8 rounded-xl text-muted-foreground opacity-50 hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
            onClick={(e) => { e.stopPropagation(); onWriteWithAI(userScript); }}
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            {/* AJUSTE 5: Show "Ajustar com IA" if script already has content */}
            {Object.keys(userScript.script_content || {}).length > 0 ? 'Ajustar com IA' : 'Escrever com IA'}
          </Button>
        )}
        {/* AJUSTE 16: Duplicate button for user cards */}
        {!isTemplate && (columnId === 'scripting' || columnId === 'recording' || columnId === 'editing') && onDuplicateCard && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8 rounded-xl text-muted-foreground opacity-50 hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
            onClick={(e) => { e.stopPropagation(); onDuplicateCard(userScript); }}
          >
            <Copy className="w-3 h-3 mr-1.5" />
            Duplicar
          </Button>
        )}
        {isPosted && onOpenMetrics && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8 rounded-xl text-muted-foreground opacity-70 hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
            onClick={(e) => { e.stopPropagation(); onOpenMetrics(userScript); }}
          >
            <BarChart3 className="w-3 h-3 mr-1.5" />
            Métricas
          </Button>
        )}
      </div>
    </div>
  );
}
