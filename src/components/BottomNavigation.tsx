import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, User, BarChart3, Plus } from 'lucide-react';

export function BottomNavigation() {
  const location = useLocation();

  const navItems = [
    { path: '/home', icon: Home, label: 'Início' },
    { path: '/history', icon: MessageSquare, label: 'Chat' },
    { path: '/kanban', icon: Plus, label: 'Criar', isCenter: true },
    { path: '/dashboard', icon: BarChart3, label: 'Métricas' },
    { path: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="
      fixed bottom-0 left-0 right-0
      bg-[#141414]/90 backdrop-blur-xl
      border-t border-white/[0.06]
      px-4 py-2 pb-[env(safe-area-inset-bottom)]
      flex items-center justify-around
      z-50 md:hidden
    ">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path === '/home' && location.pathname === '/');
        const Icon = item.icon;

        // Center button (Criar)
        if (item.isCenter) {
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-0.5 py-1 px-3">
              <div className="
                w-12 h-12 rounded-full
                bg-[#FAFC59]
                flex items-center justify-center
                shadow-[0_0_24px_-4px_rgba(250,252,89,0.5)]
                -mt-4
              ">
                <Plus className="w-6 h-6 text-[#141414]" />
              </div>
              <span className="text-[10px] font-medium text-[#FAFC59]">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex flex-col items-center gap-0.5 py-1 px-3
              transition-colors duration-200
              ${isActive ? 'text-[#FAFC59]' : 'text-[#666] hover:text-[#999]'}
            `}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
