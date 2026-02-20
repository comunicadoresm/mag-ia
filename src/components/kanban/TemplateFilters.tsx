import React, { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

interface TemplateFiltersProps {
  selectedObjectives: string[];
  selectedStyles: string[];
  selectedFormats: string[];
  onObjectivesChange: (values: string[]) => void;
  onStylesChange: (values: string[]) => void;
  onFormatsChange: (values: string[]) => void;
}

export function TemplateFilters({
  selectedObjectives,
  selectedStyles,
  selectedFormats,
  onObjectivesChange,
  onStylesChange,
  onFormatsChange,
}: TemplateFiltersProps) {
  const [objectives, setObjectives] = useState<FilterOption[]>([]);
  const [styles, setStyles] = useState<FilterOption[]>([]);
  const [formats, setFormats] = useState<FilterOption[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      const [objRes, styRes, fmtRes] = await Promise.all([
        supabase.from('script_objectives').select('value, label, color').eq('is_active', true).order('display_order'),
        supabase.from('script_styles').select('value, label').eq('is_active', true).order('display_order'),
        supabase.from('script_formats').select('value, label').eq('is_active', true).order('display_order'),
      ]);
      setObjectives((objRes.data || []) as FilterOption[]);
      setStyles((styRes.data || []) as FilterOption[]);
      setFormats((fmtRes.data || []) as FilterOption[]);
    };
    fetchOptions();
  }, []);

  const toggleFilter = (
    current: string[],
    value: string,
    setter: (v: string[]) => void
  ) => {
    setter(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  };

  const activeCount = selectedObjectives.length + selectedStyles.length + selectedFormats.length;

  const clearAll = () => {
    onObjectivesChange([]);
    onStylesChange([]);
    onFormatsChange([]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground relative"
        >
          <Filter className="w-3.5 h-3.5 mr-1" />
          Filtrar
          {activeCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 z-50 bg-popover border border-border shadow-lg" align="start">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Filtros</span>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>

          {/* Objectives */}
          {objectives.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Objetivo</p>
              <div className="flex flex-wrap gap-1.5">
                {objectives.map((obj) => {
                  const active = selectedObjectives.includes(obj.value);
                  return (
                    <button
                      key={obj.value}
                      onClick={() => toggleFilter(selectedObjectives, obj.value, onObjectivesChange)}
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full tracking-wide transition-all border ${
                        active
                          ? 'text-white border-transparent'
                          : 'text-muted-foreground border-border bg-muted/50 hover:border-primary/30'
                      }`}
                      style={active && obj.color ? { backgroundColor: obj.color } : undefined}
                    >
                      {obj.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Styles */}
          {styles.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Estilo</p>
              <div className="flex flex-wrap gap-1.5">
                {styles.map((sty) => {
                  const active = selectedStyles.includes(sty.value);
                  return (
                    <button
                      key={sty.value}
                      onClick={() => toggleFilter(selectedStyles, sty.value, onStylesChange)}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-all border ${
                        active
                          ? 'bg-primary text-primary-foreground border-transparent'
                          : 'text-muted-foreground border-border bg-muted/50 hover:border-primary/30'
                      }`}
                    >
                      {sty.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formats */}
          {formats.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Formato</p>
              <div className="flex flex-wrap gap-1.5">
                {formats.map((fmt) => {
                  const active = selectedFormats.includes(fmt.value);
                  return (
                    <button
                      key={fmt.value}
                      onClick={() => toggleFilter(selectedFormats, fmt.value, onFormatsChange)}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-all border ${
                        active
                          ? 'bg-blue-600 text-white border-transparent'
                          : 'text-muted-foreground border-border bg-muted/50 hover:border-primary/30'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
