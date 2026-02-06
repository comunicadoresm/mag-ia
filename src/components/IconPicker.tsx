import { useState, useMemo } from 'react';
import { icons } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Popular icons to show first
const POPULAR_ICONS = [
  'Tag', 'Star', 'Heart', 'Bookmark', 'Folder', 'File', 'MessageCircle',
  'Lightbulb', 'Zap', 'Sparkles', 'Trophy', 'Target', 'Flag', 'Bell',
  'Clock', 'Calendar', 'CheckCircle', 'AlertCircle', 'Info', 'HelpCircle',
  'User', 'Users', 'Settings', 'Home', 'Search', 'Filter', 'List',
  'Grid', 'Layout', 'Layers', 'Box', 'Package', 'Gift', 'ShoppingCart',
  'CreditCard', 'Wallet', 'DollarSign', 'TrendingUp', 'BarChart', 'PieChart',
  'Globe', 'Map', 'MapPin', 'Navigation', 'Compass', 'Send', 'Mail',
  'Phone', 'Video', 'Camera', 'Image', 'Music', 'Headphones', 'Mic',
  'Play', 'Pause', 'Volume2', 'Wifi', 'Cloud', 'Download', 'Upload',
  'Link', 'ExternalLink', 'Share', 'Copy', 'Clipboard', 'Edit', 'Pencil',
  'Trash2', 'Archive', 'Save', 'RefreshCw', 'RotateCw', 'Repeat',
  'Shuffle', 'Terminal', 'Code', 'Database', 'Server', 'Cpu', 'Monitor',
  'Smartphone', 'Tablet', 'Laptop', 'Watch', 'Printer', 'Key', 'Lock',
  'Unlock', 'Shield', 'Eye', 'EyeOff', 'Sun', 'Moon', 'CloudSun',
  'Flame', 'Droplet', 'Leaf', 'Tree', 'Flower', 'Bug', 'Rocket',
  'Plane', 'Car', 'Bike', 'Ship', 'Train', 'Bus', 'Coffee', 'Pizza',
  'Utensils', 'Wine', 'Beer', 'Cake', 'Cookie', 'Apple', 'Banana',
  'Graduation', 'Book', 'BookOpen', 'Newspaper', 'FileText', 'Notebook',
  'PenTool', 'Highlighter', 'Ruler', 'Scissors', 'Wrench', 'Hammer',
  'Briefcase', 'Building', 'Factory', 'Store', 'Hospital', 'School',
];

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    const iconNames = Object.keys(icons);
    
    if (!search) {
      // Show popular icons first, then the rest
      const popularSet = new Set(POPULAR_ICONS);
      const popular = POPULAR_ICONS.filter(name => iconNames.includes(name));
      const others = iconNames.filter(name => !popularSet.has(name)).slice(0, 100);
      return [...popular, ...others];
    }
    
    const searchLower = search.toLowerCase();
    return iconNames
      .filter(name => name.toLowerCase().includes(searchLower))
      .slice(0, 100);
  }, [search]);

  const SelectedIcon = value && icons[value as keyof typeof icons] 
    ? icons[value as keyof typeof icons] 
    : icons.Tag;

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-start gap-2", className)}
        >
          <SelectedIcon className="h-4 w-4" />
          <span className="truncate">{value || 'Tag'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Buscar ícone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-6 gap-1 p-2">
            {filteredIcons.map((iconName) => {
              const Icon = icons[iconName as keyof typeof icons];
              if (!Icon) return null;
              
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => handleSelect(iconName)}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors",
                    value === iconName && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  title={iconName}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          {filteredIcons.length === 0 && (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Nenhum ícone encontrado
            </p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Helper component to render an icon by name
interface DynamicIconProps {
  name: string;
  className?: string;
}

export function DynamicIcon({ name, className }: DynamicIconProps) {
  const Icon = icons[name as keyof typeof icons] || icons.Tag;
  return <Icon className={className} />;
}
