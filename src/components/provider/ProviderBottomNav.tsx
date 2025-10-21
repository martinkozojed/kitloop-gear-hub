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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs">{t(item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default ProviderBottomNav;
