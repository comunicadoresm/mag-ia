import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScriptStructure, ScriptSection } from '@/types/kanban';

interface ScriptStructureEditorProps {
  structure: ScriptStructure;
  onChange: (structure: ScriptStructure) => void;
}

export function ScriptStructureEditor({ structure, onChange }: ScriptStructureEditorProps) {
  const updatePartTitle = (part: keyof ScriptStructure, title: string) => {
    onChange({
      ...structure,
      [part]: {
        ...structure[part],
        title,
      },
    });
  };

  const updateSection = (
    part: keyof ScriptStructure,
    sectionIndex: number,
    field: keyof ScriptSection,
    value: string
  ) => {
    const newSections = [...structure[part].sections];
    newSections[sectionIndex] = {
      ...newSections[sectionIndex],
      [field]: value,
    };
    onChange({
      ...structure,
      [part]: {
        ...structure[part],
        sections: newSections,
      },
    });
  };

  const addSection = (part: keyof ScriptStructure) => {
    const newSection: ScriptSection = {
      id: `section_${Date.now()}`,
      label: 'Nova Seção',
      placeholder: 'Descrição ou exemplo...',
    };
    onChange({
      ...structure,
      [part]: {
        ...structure[part],
        sections: [...structure[part].sections, newSection],
      },
    });
  };

  const removeSection = (part: keyof ScriptStructure, sectionIndex: number) => {
    if (structure[part].sections.length <= 1) return;
    const newSections = structure[part].sections.filter((_, i) => i !== sectionIndex);
    onChange({
      ...structure,
      [part]: {
        ...structure[part],
        sections: newSections,
      },
    });
  };

  const renderPart = (partKey: keyof ScriptStructure, partLabel: string, emoji: string) => {
    const part = structure[partKey];
    return (
      <Card key={partKey} className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <Input
              value={part.title}
              onChange={(e) => updatePartTitle(partKey, e.target.value)}
              className="font-semibold text-sm h-8"
              placeholder={`Título do ${partLabel}`}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {part.sections.map((section, index) => (
            <div key={section.id} className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={section.label}
                  onChange={(e) => updateSection(partKey, index, 'label', e.target.value)}
                  className="flex-1 h-8 text-sm font-medium"
                  placeholder="Nome da seção (ex: Gancho, Cenas, CTA)"
                />
                {part.sections.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => removeSection(partKey, index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Textarea
                value={section.placeholder}
                onChange={(e) => updateSection(partKey, index, 'placeholder', e.target.value)}
                className="text-sm min-h-[80px]"
                placeholder="Texto de exemplo ou instruções para esta seção..."
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => addSection(partKey)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Seção
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Estrutura do Roteiro</Label>
        <span className="text-xs text-muted-foreground">
          Configure as seções que aparecem no editor
        </span>
      </div>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {renderPart('inicio', 'Início', '🎯')}
        {renderPart('desenvolvimento', 'Desenvolvimento', '📚')}
        {renderPart('final', 'Final', '🎬')}
      </div>
    </div>
  );
}
