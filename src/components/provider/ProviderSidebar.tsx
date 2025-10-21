import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Home, Package, Calendar, BarChart3, Settings, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ProviderSidebar = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { path: '/provider/dashboard', label: 'provider.sidebar.nav.dashboard', icon: Home },
    { path: '/provider/inventory', label: 'provider.sidebar.nav.inventory', icon: Package },
    { path: '/provider/reservations', label: 'provider.sidebar.nav.reservations', icon: Calendar },
    { path: '/provider/reports', label: 'provider.sidebar.nav.reports', icon: BarChart3 },
    { path: '/provider/settings', label: 'provider.sidebar.nav.settings', icon: Settings },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-8 pb-6 border-b border-emerald-100/80">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-500/80 font-semibold">
          {t('provider.sidebar.headline')}
        </p>
        <p className="mt-2 text-lg font-semibold text-emerald-900">
          {t('provider.sidebar.welcome')}
        </p>
        <p className="text-sm text-emerald-700/80">
          {t('provider.sidebar.subtitle')}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(25,85,52,0.12)]'
                  : 'text-emerald-800/80 hover:bg-emerald-50/70'
              }`}
            >
              <span
                className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full transition-opacity ${
                  isActive ? 'bg-emerald-500 opacity-100' : 'opacity-0 group-hover:opacity-60'
                }`}
              />
              <Icon className="w-5 h-5" />
              {t(item.label)}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-6 pt-2">
        <Button
          variant="primary"
          className="w-full h-12 rounded-2xl"
          asChild
        >
          <Link to="/provider/reservations/new">
            <Plus className="w-4 h-4" />
            <span>{t('provider.sidebar.newReservation')}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ProviderSidebar;
