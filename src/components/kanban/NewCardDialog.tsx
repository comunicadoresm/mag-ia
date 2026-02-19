import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormatMultiSelect } from './FormatMultiSelect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserScript } from '@/types/kanban';
import { Agent } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NewCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (script: UserScript, agentId?: string) => void;
  agents: Agent[];
}

interface DynamicOption {
  value: string;
  label: string;
  color?: string;
}

export function NewCardDialog({ isOpen, onClose, onCreated, agents }: NewCardDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [style, setStyle] = useState('');
  const [format, setFormat] = useState('');
  const [objective, setObjective] = useState('');
  const [agentId, setAgentId] = useState('');

  const [dbStyles, setDbStyles] = useState<DynamicOption[]>([]);
  const [dbFormats, setDbFormats] = useState<DynamicOption[]>([]);
  const [dbObjectives, setDbObjectives] = useState<DynamicOption[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen]);

  const fetchOptions = async () => {
    const [stylesRes, formatsRes, objectivesRes] = await Promise.all([
      supabase.from('script_styles').select('value, label').eq('is_active', true).order('display_order'),
      supabase.from('script_formats').select('value, label').eq('is_active', true).order('display_order'),
      supabase.from('script_objectives').select('value, label, color').eq('is_active', true).order('display_order'),
    ]);
    if (stylesRes.data) setDbStyles(stylesRes.data);
    if (formatsRes.data) setDbFormats(formatsRes.data);
    if (objectivesRes.data) setDbObjectives(objectivesRes.data);
  };

  const resetForm = () => {
    setTitle('');
    setTheme('');
    setStyle('');
    setFormat('');
    setObjective('');
    setAgentId('');
  };

  const handleCreate = async () => {
    if (!title.trim() || !style) {
      toast({ title: 'Preencha pelo menos o título e o estilo', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_scripts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          theme: theme || null,
          style,
          format: format || null,
          objective: objective || null,
          status: 'scripting' as const,
          script_content: {},
        })
        .select()
        .single();

      if (error) throw error;

      resetForm();
      onCreated(data as UserScript, agentId || undefined);
      toast({ title: 'Novo roteiro criado!' });
    } catch (error) {
      console.error('Error creating card:', error);
      toast({ title: 'Erro ao criar roteiro', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">✍️ Novo Roteiro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Título *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Dicas de produtividade..." className="bg-input" />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Tema</label>
            <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ex: Marketing, Lifestyle..." className="bg-input" />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Estilo *</label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {dbStyles.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Formato</label>
            <FormatMultiSelect
              options={dbFormats}
              value={format}
              onChange={setFormat}
              placeholder="Selecione formatos..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Objetivo</label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {dbObjectives.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: o.color }} />
                        {o.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Agente IA</label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        <span>{a.icon_emoji || '🤖'}</span>
                        {a.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }} className="flex-1 rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isLoading} className="flex-1 rounded-xl">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Criar Roteiro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
