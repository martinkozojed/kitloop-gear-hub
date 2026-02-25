import React, { useState, useEffect } from 'react';
import ProviderSidebar from './ProviderSidebar';
import ProviderBottomNav from './ProviderBottomNav';
import { FeedbackModal } from './FeedbackModal';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeft } from 'lucide-react';

interface ProviderLayoutProps {
  children: React.ReactNode;
}

const ProviderLayout = ({ children }: ProviderLayoutProps) => {
  // Sidebar collapse state (persisted in localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar.collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar.collapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

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
        <ProviderSidebar onToggleCollapse={toggleSidebar} isCollapsed={sidebarCollapsed} />
      </aside>

      {/* Show/Open Sidebar Button (when collapsed) - smooth fade in */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className={`hidden md:flex fixed left-3 top-[5.25rem] z-40 h-10 w-10 rounded-full border border-border bg-card hover:bg-accent transition-all duration-300 ${
          sidebarCollapsed ? 'opacity-100 translate-x-0 delay-300' : 'opacity-0 -translate-x-12 pointer-events-none'
        }`}
        title="Zobrazit menu"
      >
        <PanelLeft className="h-4 w-4" />
      </Button>

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
      <div className="md:hidden">
        <ProviderBottomNav />
      </div>

      <FeedbackModal />
    </div>
  );
};

export default ProviderLayout;
