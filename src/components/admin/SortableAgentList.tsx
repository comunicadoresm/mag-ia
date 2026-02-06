import React from 'react';
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
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminAgent, Tag } from '@/types';

interface SortableAgentItemProps {
  agent: AdminAgent;
  agentTags: string[];
  tags: Tag[];
  aiModels: { value: string; label: string }[];
  onEdit: (agent: AdminAgent) => void;
  onDelete: (agent: AdminAgent) => void;
}

function SortableAgentItem({
  agent,
  agentTags,
  tags,
  aiModels,
  onEdit,
  onDelete,
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
      className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl shrink-0">
        {agent.icon_emoji || '🤖'}
      </div>

      <div className="flex-1 min-w-0">
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
        {/* Agent Tags */}
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

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(agent)}
        >
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
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
