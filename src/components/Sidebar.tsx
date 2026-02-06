import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, User, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/history', icon: MessageSquare, label: 'Histórico' },
    { path: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-secondary border-r border-border h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-border">
        <Logo size="md" />
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
            {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.name || 'Usuário'}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
