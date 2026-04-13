import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Package, Calendar, MoreHorizontal, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ScanDialog } from '@/components/warehouse/ScanDialog';
import { Icon as UiIcon } from "@/components/ui/icon";

const scanEnabled = import.meta.env.VITE_ENABLE_SCAN === 'true';

const ProviderBottomNav = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const [isScanOpen, setIsScanOpen] = useState(false);

  const navItems = [
    { path: '/provider/dashboard', label: 'provider.bottomNav.dashboard', icon: Home },
    { path: '/provider/reservations', label: 'provider.bottomNav.reservations', icon: Calendar },
    // Center Scan FAB — only shown when VITE_ENABLE_SCAN=true
    ...(scanEnabled ? [{ path: 'SCAN', label: 'warehouse.scan.action', icon: QrCode }] : []),
    { path: '/provider/inventory', label: 'provider.bottomNav.inventory', icon: Package },
    { path: '/provider/settings', label: 'provider.bottomNav.more', icon: MoreHorizontal },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto relative">
          {navItems.map((item) => {
            // Special case for Scan FAB
            if (item.path === 'SCAN') {
              return (
                <button
                  key="scan"
                  onClick={() => setIsScanOpen(true)}
                  className="flex flex-col items-center justify-center -mt-6 group"
                >
                  <div className="p-3.5 bg-primary rounded-full shadow-brand text-primary-foreground transform transition-all duration-fast ease-spring group-hover:shadow-elevated group-active:scale-95 group-active:shadow-sm">
                    <UiIcon icon={QrCode} size="lg" />
                  </div>
                  <span className="text-xs font-medium mt-1 tracking-tight text-foreground/80">{t(item.label, 'Scan')}</span>
                </button>
              );
            }

            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full transition-all duration-fast active:scale-95 ${isActive
                  ? 'text-brand-600 font-medium'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all duration-fast ${isActive ? 'bg-brand-50' : 'bg-transparent'}`}>
                  <UiIcon icon={item.icon} size="md" className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-500" />
                  )}
                </div>
                <span className="text-xs font-medium mt-0.5 tracking-tight">{t(item.label)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {scanEnabled && <ScanDialog open={isScanOpen} onOpenChange={setIsScanOpen} />}
    </>
  );
};

export default ProviderBottomNav;
