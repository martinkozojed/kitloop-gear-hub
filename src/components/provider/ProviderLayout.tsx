import React, { useState, useEffect } from 'react';
import ProviderSidebar from './ProviderSidebar';
import ProviderBottomNav from './ProviderBottomNav';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft } from 'lucide-react';

interface ProviderLayoutProps {
  children: React.ReactNode;
  locked?: boolean;
}

const ProviderLayout = ({ children, locked = false }: ProviderLayoutProps) => {
  // Sidebar collapse state (persisted in localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (locked) return false;
    const saved = localStorage.getItem('sidebar.collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    if (!locked) {
      localStorage.setItem('sidebar.collapsed', sidebarCollapsed.toString());
    }
  }, [sidebarCollapsed, locked]);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Skip to main content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Sidebar - Desktop (Hidden on Mobile, Collapsible on Desktop) */}
      <aside 
        className={`hidden md:block fixed left-0 top-[4.5rem] bottom-0 border-r border-border bg-background z-30 overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? 'w-0 -translate-x-full' : 'w-64'
        }`}
      >
        <ProviderSidebar onToggleCollapse={toggleSidebar} isCollapsed={sidebarCollapsed} locked={locked} />
      </aside>

      {/* Show/Open Sidebar Button (when collapsed) - smooth fade in */}
      {!locked && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={`hidden md:flex fixed left-4 top-24 z-40 shadow-sm border border-border bg-background/95 backdrop-blur-sm hover:bg-accent transition-all duration-300 ${
            sidebarCollapsed ? 'opacity-100 translate-x-0 delay-300' : 'opacity-0 -translate-x-12 pointer-events-none'
          }`}
          title="Zobrazit menu"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Main Content */}
      <main 
        id="main-content" 
        className={`pt-[4.5rem] pb-24 md:pb-12 transition-all duration-300 min-h-screen ${
          sidebarCollapsed ? 'md:pl-0' : 'md:pl-64'
        }`}
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">
          {children}
        </div>
      </main>

      {/* Bottom Nav - Mobile (Hidden on Desktop) */}
      {!locked && (
        <div className="md:hidden">
          <ProviderBottomNav />
        </div>
      )}
    </div>
  );
};

export default ProviderLayout;
