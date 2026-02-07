import React from 'react';
import { useCredits } from '@/hooks/useCredits';
import { Coins } from 'lucide-react';

interface CreditBadgeProps {
  className?: string;
}

export function CreditBadge({ className = '' }: CreditBadgeProps) {
  const { balance, isLoading } = useCredits();

  if (isLoading) return null;

  const getColor = () => {
    if (balance.total === 0) return 'text-destructive bg-destructive/10';
    if (balance.total <= 5) return 'text-yellow-600 bg-yellow-500/10';
    return 'text-primary bg-primary/10';
  };

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getColor()} ${className}`}>
      <Coins className="w-3.5 h-3.5" />
      <span>{balance.total}</span>
    </div>
  );
}
