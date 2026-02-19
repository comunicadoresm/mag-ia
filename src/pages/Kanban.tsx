import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Agent } from '@/types';

export default function Kanban() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data } = await supabase.from('agents').select('*').eq('is_active', true);
        setAgents((data || []) as Agent[]);
      } catch (error) { console.error('Error fetching agents:', error); }
      finally { setIsLoading(false); }
    };
    if (user) fetchAgents();
  }, [user]);

  if (authLoading || isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Kanban</h1>
              <p className="text-xs text-muted-foreground">Gerencie seus roteiros</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-4 py-6 pb-24 md:pb-6">
        <div className="max-w-[1600px] mx-auto h-full">
          <KanbanBoard agents={agents} />
        </div>
      </div>
    </AppLayout>
  );
}
