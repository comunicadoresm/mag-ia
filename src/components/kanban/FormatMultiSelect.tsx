import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface FormatOption {
  value: string;
  label: string;
}

interface FormatMultiSelectProps {
  options: FormatOption[];
  value: string | null | undefined; // comma-separated string stored in DB
  onChange: (newValue: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Parse comma-separated string → array
export function parseFormats(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((f) => f.trim()).filter(Boolean);
}

// Join array → comma-separated string
export function joinFormats(formats: string[]): string {
  return formats.join(',');
}

export function FormatMultiSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = 'Selecione formatos...',
}: FormatMultiSelectProps) {
  const selected = parseFormats(value);

  const toggle = (format: string) => {
    if (selected.includes(format)) {
      onChange(joinFormats(selected.filter((f) => f !== format)));
    } else {
      onChange(joinFormats([...selected, format]));
    }
  };

  const remove = (format: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(joinFormats(selected.filter((f) => f !== format)));
  };

  const getLabelFor = (val: string) =>
    options.find((o) => o.value === val)?.label || val;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          className={`w-full justify-between h-auto min-h-10 px-3 py-2 bg-input border-input font-normal ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          type="button"
        >
          <div className="flex flex-wrap gap-1 flex-1 text-left">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map((f) => (
                <Badge
                  key={f}
                  variant="secondary"
                  className="text-xs gap-1 pr-1"
                >
                  {getLabelFor(f)}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => remove(f, e)}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              ))
            )}
          </div>
          <ChevronDown className="w-4 h-4 ml-2 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full min-w-[200px]" align="start">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => toggle(option.value)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
