import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Package, Calendar, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ProviderBottomNav = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { path: '/provider/dashboard', label: 'provider.bottomNav.dashboard', icon: Home },
    { path: '/provider/inventory', label: 'provider.bottomNav.inventory', icon: Package },
    { path: '/provider/reservations', label: 'provider.bottomNav.reservations', icon: Calendar },
    { path: '/provider/settings', label: 'provider.bottomNav.more', icon: MoreHorizontal },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border z-50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path; // Simple match for now

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 active:scale-95 ${isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary/10' : 'bg-transparent'}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] font-medium mt-0.5 tracking-tight">{t(item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default ProviderBottomNav;
