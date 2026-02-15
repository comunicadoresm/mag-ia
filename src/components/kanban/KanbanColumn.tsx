import React from 'react';
import { Plus } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard } from './KanbanCard';
import { ScriptTemplate, UserScript, KanbanColumn as KanbanColumnType } from '@/types/kanban';

interface KanbanColumnProps {
  column: KanbanColumnType;
  onDuplicate?: (template: ScriptTemplate) => void;
  onCardClick?: (item: ScriptTemplate | UserScript) => void;
  onWriteWithAI?: (script: UserScript) => void;
  onOpenMetrics?: (script: UserScript) => void;
  onDelete?: (script: UserScript) => void;
  onAddCard?: (columnId: string) => void;
  onDrop?: (item: UserScript, targetColumnId: string) => void;
  onDuplicateCard?: (script: UserScript) => void;
}

export function KanbanColumn({
  column,
  onDuplicate,
  onCardClick,
  onWriteWithAI,
  onOpenMetrics,
  onDelete,
  onAddCard,
  onDrop,
  onDuplicateCard,
}: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-primary/5');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-primary/5');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-primary/5');
    
    const scriptData = e.dataTransfer.getData('application/json');
    if (scriptData && onDrop && column.id !== 'templates') {
      const script = JSON.parse(scriptData) as UserScript;
      onDrop(script, column.id as string);
    }
  };

  const isTemplateColumn = column.id === 'templates';

  return (
    <div
      className="flex flex-col min-w-[280px] max-w-[320px] flex-shrink-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="font-semibold text-foreground">{column.title}</h3>
        <span className="text-sm text-muted-foreground ml-auto">
          {column.items.length}
        </span>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-3 pb-4">
          {column.items.map((item) => (
            <div
              key={item.id}
              draggable={!isTemplateColumn}
              onDragStart={(e) => {
                if (!isTemplateColumn) {
                  e.dataTransfer.setData('application/json', JSON.stringify(item));
                }
              }}
            >
              <KanbanCard
                item={item}
                isTemplate={isTemplateColumn}
                columnId={column.id}
                onDuplicate={onDuplicate}
                onClick={onCardClick}
                onWriteWithAI={onWriteWithAI}
                onOpenMetrics={onOpenMetrics}
                onDelete={onDelete}
                onDuplicateCard={onDuplicateCard}
              />
            </div>
          ))}

          {/* Add button for scripting column */}
          {column.id === 'scripting' && onAddCard && (
            <button
              onClick={() => onAddCard(column.id)}
              className="w-full py-4 border-2 border-dashed border-border/50 rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">Novo Roteiro</span>
            </button>
          )}

          {/* Empty state for other columns */}
          {column.canAdd && column.id !== 'scripting' && column.items.length === 0 && (
            <div className="w-full py-8 border-2 border-dashed border-border/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
              <span className="text-sm">Nenhum roteiro aqui</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
