import React from 'react';
import { MainSidebar } from './MainSidebar';
import { BottomNavigation } from './BottomNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { Tag as TagType } from '@/types';

interface AppLayoutProps {
  children: React.ReactNode;
  tags?: TagType[];
  activeTag?: string | null;
  onTagChange?: (tagId: string | null) => void;
  showTagFilter?: boolean;
}

export function AppLayout({ children, tags, activeTag, onTagChange, showTagFilter }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const { collapsed } = useSidebarContext();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainSidebar
        tags={tags}
        activeTag={activeTag}
        onTagChange={onTagChange}
        showTagFilter={showTagFilter}
      />

      <main
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 64 : 256 }}
      >
        {children}
      </main>

      {isMobile && <BottomNavigation />}
    </div>
  );
}
