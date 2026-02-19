import React, { useState } from 'react';
import { Loader2, Link as LinkIcon, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserScript } from '@/types/kanban';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PostedModalProps {
  script: UserScript | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (script: UserScript) => void;
  onCancel: () => void;
}

export function PostedModal({ script, isOpen, onClose, onSave, onCancel }: PostedModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const now = new Date();
  const [date, setDate] = useState(now.toISOString().split('T')[0]);
  const [time, setTime] = useState(now.toTimeString().slice(0, 5));
  const [postUrl, setPostUrl] = useState((script as any)?.post_url || '');

  const handleSave = async () => {
    if (!script) return;
    setIsLoading(true);
    try {
      const postedAt = new Date(`${date}T${time}`).toISOString();
      const { error } = await supabase
        .from('user_scripts')
        .update({ status: 'posted', posted_at: postedAt, post_url: postUrl } as any)
        .eq('id', script.id);

      if (error) throw error;

      onSave({ ...script, posted_at: postedAt, post_url: postUrl } as UserScript);
      toast({ title: 'Publicação registrada!' });
      onClose();
    } catch (error) {
      console.error('Error saving post data:', error);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border/50">
        <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              📱 Registrar Publicação
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{script?.title}</p>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" /> Data
              </label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-muted/30 border-border/30 rounded-xl" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Horário
              </label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-muted/30 border-border/30 rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" /> Link do post
            </label>
            <Input type="url" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://instagram.com/p/..." className="bg-muted/30 border-border/30 rounded-xl" />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" onClick={handleCancel} className="flex-1 rounded-xl">Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading} className="flex-1 rounded-xl">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
