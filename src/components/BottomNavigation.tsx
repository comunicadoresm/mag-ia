import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, User, LayoutGrid, Bot } from 'lucide-react';

export function BottomNavigation() {
  const location = useLocation();

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/agents', icon: Bot, label: 'Agentes' },
    { path: '/kanban', icon: LayoutGrid, label: 'Kanban' },
    { path: '/history', icon: MessageSquare, label: 'Histórico' },
    { path: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-border safe-bottom z-50 md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors duration-200 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
