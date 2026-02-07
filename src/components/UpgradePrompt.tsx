import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';

interface UpgradePromptProps {
  title?: string;
  description?: string;
  className?: string;
}

export function UpgradePrompt({
  title = 'Recurso exclusivo do plano Magnético',
  description = 'Faça upgrade para acessar a IA completa, agentes e muito mais.',
  className = '',
}: UpgradePromptProps) {
  const { showUpgradeModal } = usePlanPermissions();

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center space-y-4 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      <Button onClick={showUpgradeModal} className="gap-2">
        Fazer Upgrade
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
