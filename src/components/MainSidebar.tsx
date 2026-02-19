import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageSquare, User, LogOut, LayoutGrid, Tag, ShieldCheck, Columns3, Bot, PanelLeftClose, PanelLeft, BarChart3 } from 'lucide-react';
import { LucideProps } from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { Logo } from './Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Tag as TagType } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const [photoUrl, setPhotoUrl] = useState('');
  const { balance, isLoading: creditsLoading } = useCredits();
  const { collapsed, toggle } = useSidebarContext();

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle(),
      supabase.from('user_metrics').select('profile_photo_url').eq('user_id', user.id).maybeSingle(),
    ]).then(([roleRes, metricsRes]) => {
      setIsAdmin(!!roleRes.data);
      if (metricsRes.data?.profile_photo_url) setPhotoUrl(metricsRes.data.profile_photo_url);
    });
  }, [user]);

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/agents', icon: Bot, label: 'Agentes IA' },
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
  const planMax = balance.plan > 0 ? 30 : (balance.bonus > 0 ? balance.bonus : 10);
  const estimatedMax = Math.max(planMax, totalCredits);
  const progressPercent = Math.round((totalCredits / estimatedMax) * 100);

  const NavButton = ({ path, icon: Icon, label }: { path: string; icon: React.ElementType; label: string }) => {
    const isActive = location.pathname === path;

    const btn = (
      <button
        onClick={() => navigate(path)}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors mb-1",
          collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
          isActive
            ? "bg-primary/20 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!collapsed && <span>{label}</span>}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
        </Tooltip>
      );
    }

    return btn;
  };

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col bg-secondary border-r border-border h-screen fixed left-0 top-0 z-40 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center border-b border-border", collapsed ? "justify-center p-3" : "justify-between p-4")}>
        {!collapsed && <Logo size="sm" />}
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
        {navItems.map((item) => (
          <NavButton key={item.path} {...item} />
        ))}

        {/* Tag filter (only on agents page) */}
        {showTagFilter && tags.length > 0 && !collapsed && (
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
        <div className={cn("pb-2", collapsed ? "px-2" : "px-3")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/profile/credits')}
                  className="w-full flex items-center justify-center bg-muted/50 rounded-xl p-2 hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-bold text-foreground">{totalCredits}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {totalCredits} créditos restantes
              </TooltipContent>
            </Tooltip>
          ) : (
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
          )}
        </div>
      )}

      {/* User info section */}
      <div className={cn("border-t border-border", collapsed ? "p-2" : "p-3")}>
        {collapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-muted transition-colors mb-1"
                >
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={photoUrl} className="object-cover" />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                      {profile?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {profile?.name || profile?.email?.split('@')[0] || 'Perfil'}
              </TooltipContent>
            </Tooltip>

            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate('/admin')}
                    className={cn(
                      "w-full flex items-center justify-center py-2 rounded-lg text-sm font-medium transition-colors mb-1",
                      location.pathname.startsWith('/admin')
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Admin</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Sair</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors mb-2"
            >
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={photoUrl} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
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
          </>
        )}
      </div>
    </aside>
  );
}
