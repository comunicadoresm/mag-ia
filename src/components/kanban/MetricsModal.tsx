import React, { useState, useEffect } from 'react';
import { Eye, MessageCircle, Users, Share2, Bookmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { UserScript } from '@/types/kanban';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MetricsModalProps {
  script: UserScript | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (script: UserScript) => void;
}

export function MetricsModal({ script, isOpen, onClose, onSave }: MetricsModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    views: 0,
    comments: 0,
    followers: 0,
    shares: 0,
    saves: 0,
  });

  useEffect(() => {
    if (script) {
      setMetrics({
        views: script.views || 0,
        comments: script.comments || 0,
        followers: script.followers || 0,
        shares: script.shares || 0,
        saves: script.saves || 0,
      });
    }
  }, [script]);

  const handleSave = async () => {
    if (!script) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_scripts')
        .update({
          views: metrics.views,
          comments: metrics.comments,
          followers: metrics.followers,
          shares: metrics.shares,
          saves: metrics.saves,
          posted_at: script.posted_at || new Date().toISOString(),
        })
        .eq('id', script.id);

      if (error) throw error;

      onSave({
        ...script,
        ...metrics,
        posted_at: script.posted_at || new Date().toISOString(),
      });
      toast({ title: 'Métricas salvas com sucesso!' });
      onClose();
    } catch (error) {
      console.error('Error saving metrics:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as métricas.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const metricFields = [
    { key: 'views', label: 'Views', icon: Eye },
    { key: 'comments', label: 'Comentários', icon: MessageCircle },
    { key: 'followers', label: 'Novos Seguidores', icon: Users },
    { key: 'shares', label: 'Compartilhamentos', icon: Share2 },
    { key: 'saves', label: 'Salvamentos', icon: Bookmark },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>📊 Métricas do Post</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Preencha as métricas do seu conteúdo postado:
          </p>

          {metricFields.map((field) => (
            <div key={field.key} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <field.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground">
                  {field.label}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={metrics[field.key as keyof typeof metrics]}
                  onChange={(e) =>
                    setMetrics({
                      ...metrics,
                      [field.key]: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar Métricas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
