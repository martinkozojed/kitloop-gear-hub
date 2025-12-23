import React, { useState, useEffect } from 'react';
import ProviderSidebar from './ProviderSidebar';
import ProviderBottomNav from './ProviderBottomNav';

interface ProviderLayoutProps {
  children: React.ReactNode;
}

const ProviderLayout = ({ children }: ProviderLayoutProps) => {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Sidebar - Desktop (Hidden on Mobile) */}
      <aside className="hidden md:block fixed left-0 top-[4.5rem] bottom-0 w-64 border-r border-border bg-background z-30 overflow-y-auto">
        <ProviderSidebar />
      </aside>

      {/* Main Content */}
      <main className="md:pl-64 pt-[4.5rem] pb-24 md:pb-12 transition-all min-h-screen">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6">
          {children}
        </div>
      </main>

      {/* Bottom Nav - Mobile (Hidden on Desktop) */}
      <div className="md:hidden">
        <ProviderBottomNav />
      </div>
    </div>
  );
};

export default ProviderLayout;
