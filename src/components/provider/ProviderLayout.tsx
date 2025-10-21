import React, { useState, useEffect } from 'react';
import ProviderSidebar from './ProviderSidebar';
import ProviderBottomNav from './ProviderBottomNav';

interface ProviderLayoutProps {
  children: React.ReactNode;
}

const ProviderLayout = ({ children }: ProviderLayoutProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -top-40 right-[-160px] h-96 w-96 rounded-full bg-emerald-200/35 blur-3xl" />
        <span className="absolute top-1/3 left-[-180px] h-96 w-96 rounded-full bg-lime-200/30 blur-3xl" />
      </div>

      {/* Sidebar - Desktop */}
      {!isMobile && (
        <aside className="fixed left-0 top-20 bottom-6 w-64 rounded-3xl border border-emerald-100/70 bg-white/95 shadow-[0_28px_60px_-40px_rgba(28,86,52,0.55)] backdrop-blur-sm overflow-hidden">
          <ProviderSidebar />
        </aside>
      )}

      {/* Main Content */}
      <main
        className={`${!isMobile ? 'ml-64' : ''} ${isMobile ? 'pb-24' : 'pb-12'} pt-28 transition-all`}
      >
        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 space-y-8">
          {children}
        </div>
      </main>

      {/* Bottom Nav - Mobile */}
      {isMobile && <ProviderBottomNav />}
    </div>
  );
};

export default ProviderLayout;
