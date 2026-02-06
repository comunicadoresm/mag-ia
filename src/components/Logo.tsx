import React from 'react';
import logoSymbol from '@/assets/logo-symbol.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${iconSizes[size]} rounded-lg bg-primary flex items-center justify-center p-1`}>
        <img 
          src={logoSymbol} 
          alt="Magnetic.IA" 
          className="w-full h-full object-contain"
        />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-bold ${sizes[size]} text-foreground`}>
          Magnetic
        </span>
        <span className={`font-bold ${sizes[size]} text-primary`}>
          .IA
        </span>
      </div>
    </div>
  );
}
