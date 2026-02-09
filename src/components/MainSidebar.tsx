import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageSquare, User, LogOut, LayoutGrid, Tag, ShieldCheck, Columns3 } from 'lucide-react';
import { LucideProps } from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Tag as TagType } from '@/types';

// Dynamic icon component for tags
interface DynamicIconProps extends Omit<LucideProps, 'ref'> {
  name: string;
}

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const kebabName = name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase() as keyof typeof dynamicIconImports;

  if (dynamicIconImports[kebabName]) {
    const LucideIcon = lazy(dynamicIconImports[kebabName]);
    return (
      <Suspense fallback={<Tag {...props} />}>
        <LucideIcon {...props} />
      </Suspense>
    );
  }

  return <Tag {...props} />;
};

interface MainSidebarProps {
  tags?: TagType[];
  activeTag?: string | null;
  onTagChange?: (tagId: string | null) => void;
  showTagFilter?: boolean;
}

export function MainSidebar({ tags = [], activeTag = null, onTagChange, showTagFilter = false }: MainSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const { balance, isLoading: creditsLoading } = useCredits();

  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/kanban', icon: Columns3, label: 'Kanban' },
    { path: '/history', icon: MessageSquare, label: 'Histórico' },
    { path: '/profile', icon: User, label: 'Perfil' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Credits card
  const totalCredits = balance.plan + balance.subscription + balance.bonus;
  const maxCredits = Math.max(totalCredits, balance.plan + balance.subscription + balance.bonus, 1);
  // For progress, we estimate max as total + consumed (rough guess from plan)
  const planMax = balance.plan > 0 ? 30 : (balance.bonus > 0 ? balance.bonus : 10);
  const estimatedMax = Math.max(planMax, totalCredits);
  const progressPercent = Math.round((totalCredits / estimatedMax) * 100);

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-secondary border-r border-border h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-border">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}

        {/* Tag filter (only on home) */}
        {showTagFilter && tags.length > 0 && (
          <>
            <div className="my-4 border-t border-border" />
            
            <button
              onClick={() => onTagChange?.(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                activeTag === null
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-5 h-5" />
              Todos os Agentes
            </button>

            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagChange?.(tag.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                  activeTag === tag.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <DynamicIcon name={tag.icon || 'Tag'} className="w-5 h-5" />
                {tag.name}
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Credits card */}
      {!creditsLoading && (
        <div className="px-3 pb-2">
          <button
            onClick={() => navigate('/profile/credits')}
            className="w-full bg-muted/50 rounded-xl p-3.5 hover:bg-muted transition-colors text-left"
          >
            <p className="text-xs text-muted-foreground mb-1">Créditos IA</p>
            <p className="text-2xl font-bold text-foreground mb-2">{totalCredits}</p>
            <Progress
              value={progressPercent}
              className="h-2 mb-1.5 [&>div]:bg-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              {totalCredits} de {estimatedMax} restantes
            </p>
          </button>
        </div>
      )}

      {/* User info section */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => navigate('/profile')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors mb-2"
        >
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold shrink-0">
            {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate text-foreground">
              {profile?.name || profile?.email?.split('@')[0] || 'Usuário'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </p>
          </div>
        </button>
        
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2",
              location.pathname.startsWith('/admin')
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <ShieldCheck className="w-5 h-5" />
            Admin
          </button>
        )}
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
}
