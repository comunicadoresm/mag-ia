import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminAgent, Tag } from '@/types';

interface SortableAgentItemProps {
  agent: AdminAgent;
  agentTags: string[];
  tags: Tag[];
  aiModels: { value: string; label: string }[];
  onEdit: (agent: AdminAgent) => void;
  onDelete: (agent: AdminAgent) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  selectionMode: boolean;
}

function SortableAgentItem({
  agent,
  agentTags,
  tags,
  aiModels,
  onEdit,
  onDelete,
  isSelected,
  onToggleSelect,
  selectionMode,
}: SortableAgentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-xl p-4 flex items-center gap-4 transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}
    >
      {selectionMode ? (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(agent.id)}
          className="shrink-0"
        />
      ) : (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="w-5 h-5" />
        </button>
      )}

      <div
        className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl shrink-0 cursor-pointer"
        onClick={() => selectionMode && onToggleSelect(agent.id)}
      >
        {agent.icon_emoji || '🤖'}
      </div>

      <div className="flex-1 min-w-0" onClick={() => selectionMode && onToggleSelect(agent.id)} role={selectionMode ? 'button' : undefined}>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-foreground">{agent.name}</h3>
          {!agent.is_active && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Inativo
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {agent.description || 'Sem descrição'}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            Modelo: {aiModels.find((m) => m.value === agent.model)?.label || agent.model}
          </p>
          {(agent as any).api_key ? (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
              API Key ✓
            </span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              Sem API Key
            </span>
          )}
        </div>
        {agentTags?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {agentTags.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              return tag ? (
                <span
                  key={tagId}
                  className="text-xs px-2 py-0.5 rounded-full border border-primary/40 text-primary"
                >
                  {tag.name}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {!selectionMode && (
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(agent)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(agent)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface SortableAgentListProps {
  agents: AdminAgent[];
  agentTags: Record<string, string[]>;
  tags: Tag[];
  aiModels: { value: string; label: string }[];
  onReorder: (agents: AdminAgent[]) => void;
  onEdit: (agent: AdminAgent) => void;
  onDelete: (agent: AdminAgent) => void;
}

export function SortableAgentList({
  agents,
  agentTags,
  tags,
  aiModels,
  onReorder,
  onEdit,
  onDelete,
}: SortableAgentListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === agents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(agents.map((a) => a.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const moveSelected = (direction: 'up' | 'down') => {
    const ordered = [...agents];
    const selectedIndices = ordered
      .map((a, i) => (selectedIds.has(a.id) ? i : -1))
      .filter((i) => i !== -1)
      .sort((a, b) => (direction === 'up' ? a - b : b - a));

    for (const idx of selectedIndices) {
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= ordered.length) continue;
      if (selectedIds.has(ordered[targetIdx].id)) continue;
      [ordered[idx], ordered[targetIdx]] = [ordered[targetIdx], ordered[idx]];
    }

    onReorder(ordered);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = agents.findIndex((a) => a.id === active.id);
      const newIndex = agents.findIndex((a) => a.id === over.id);
      const newAgents = arrayMove(agents, oldIndex, newIndex);
      onReorder(newAgents);
    }
  };

  return (
    <div className="space-y-3">
      {/* Bulk toolbar */}
      <div className="flex items-center gap-2 min-h-[40px]">
        <Checkbox
          checked={agents.length > 0 && selectedIds.size === agents.length}
          onCheckedChange={selectAll}
        />
        <span className="text-sm text-muted-foreground">
          {selectionMode ? `${selectedIds.size} selecionado${selectedIds.size > 1 ? 's' : ''}` : 'Selecionar'}
        </span>
        {selectionMode && (
          <>
            <Button variant="outline" size="sm" className="gap-1 ml-2" onClick={() => moveSelected('up')}>
              <ArrowUp className="w-4 h-4" /> Subir
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => moveSelected('down')}>
              <ArrowDown className="w-4 h-4" /> Descer
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 ml-auto" onClick={clearSelection}>
              <X className="w-4 h-4" /> Limpar
            </Button>
          </>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={agents.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-4">
            {agents.map((agent) => (
              <SortableAgentItem
                key={agent.id}
                agent={agent}
                agentTags={agentTags[agent.id] || []}
                tags={tags}
                aiModels={aiModels}
                onEdit={onEdit}
                onDelete={onDelete}
                isSelected={selectedIds.has(agent.id)}
                onToggleSelect={toggleSelect}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
