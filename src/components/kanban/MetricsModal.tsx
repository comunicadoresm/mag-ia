import React, { useState, useEffect } from 'react';
import { Eye, MessageCircle, Users, Share2, Bookmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const metricFields = [
    { key: 'views', label: 'Views', icon: Eye, color: 'text-blue-400' },
    { key: 'comments', label: 'Comentários', icon: MessageCircle, color: 'text-green-400' },
    { key: 'followers', label: 'Novos Seguidores', icon: Users, color: 'text-purple-400' },
    { key: 'shares', label: 'Compartilhamentos', icon: Share2, color: 'text-orange-400' },
    { key: 'saves', label: 'Salvamentos', icon: Bookmark, color: 'text-primary' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border/50">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              📊 Métricas do Post
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {script?.title}
            </p>
          </DialogHeader>
        </div>

        {/* Metrics grid */}
        <div className="px-6 py-4 space-y-3">
          {metricFields.map((field) => (
            <div
              key={field.key}
              className="flex items-center gap-3 bg-muted/30 rounded-xl p-3 transition-colors hover:bg-muted/50"
            >
              <div className={`w-9 h-9 rounded-xl bg-background/50 flex items-center justify-center ${field.color}`}>
                <field.icon className="w-4 h-4" />
              </div>
              <label className="text-sm font-medium text-foreground flex-1">
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
                className="w-24 h-9 text-right bg-background/50 border-border/30 rounded-xl text-sm font-semibold"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="flex-1 rounded-xl">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
