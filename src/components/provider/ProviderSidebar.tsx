import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from "@/components/ui/button";
import {
  Home,
  Package,
  BarChart3,
  Settings,
  Plus,
  Users,
  List,
  CalendarDays,
  Search,
  ChevronDown,
  ShieldAlert,
  Wrench,
  Building2,
  PanelLeftClose
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DENSITY } from '@/components/ui/density';
import { Icon as UiIcon } from "@/components/ui/icon";

interface ProviderSidebarProps {
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

const ProviderSidebar = ({ onToggleCollapse, isCollapsed }: ProviderSidebarProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, provider, isAdmin } = useAuth();
  const { canViewFinancials, canEditSettings } = usePermissions();

  // Use Desktop Density by default for Sidebar
  const d = DENSITY.desktop;

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { path: '/provider/dashboard', label: 'provider.sidebar.nav.dashboard', icon: Home },
        // Only show Analytics if permitted AND feature enabled
        ...(canViewFinancials && import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
          ? [{ path: '/provider/analytics', label: 'provider.sidebar.nav.analytics', icon: BarChart3 }]
          : []),
      ]
    },
    {
      title: 'Operations',
      items: [
        { path: '/provider/reservations', label: 'provider.sidebar.nav.reservations', icon: List },
        { path: '/provider/inventory', label: 'provider.sidebar.nav.inventory', icon: Package },
        // Only show Maintenance if feature enabled
        ...(import.meta.env.VITE_ENABLE_MAINTENANCE === 'true'
          ? [{ path: '/provider/maintenance', label: 'provider.sidebar.nav.maintenance', icon: Wrench }]
          : []),
        // Only show Customers (CRM) if feature enabled
        ...(import.meta.env.VITE_ENABLE_CRM === 'true'
          ? [{ path: '/provider/customers', label: 'provider.sidebar.nav.crm', icon: Users }]
          : []),
        // Only show Accounts if feature enabled
        ...(import.meta.env.VITE_ENABLE_ACCOUNTS === 'true'
          ? [{ path: '/provider/accounts', label: 'provider.sidebar.nav.accounts', icon: Building2 }]
          : []),
      ]
    },
    {
      title: 'System',
      items: [
        // Only show Settings if permitted
        ...(canEditSettings ? [{ path: '/provider/settings', label: 'provider.sidebar.nav.settings', icon: Settings }] : []),
      ]
    }
  ];


  if (isAdmin) {
    navGroups.push({
      title: 'Admin',
      items: [
        { path: '/admin/providers', label: 'provider.sidebar.nav.approvals', icon: ShieldAlert },
        { path: '/admin/audit', label: 'provider.sidebar.nav.auditLog', icon: List }
      ]
    });
  }


  return (
    <div className="flex h-full flex-col bg-muted border-r border-border">
      {/* Header & Command Trigger */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-background border border-input text-sm text-muted-foreground hover:border-primary/50 transition-colors group"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 opacity-50 group-hover:opacity-100" />
              <span>Search...</span>
            </span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-xs font-medium opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-9 w-9 hover:bg-accent shrink-0"
              title="Skrýt menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {group.title}
            </h4>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{ height: d.rowHeight, paddingLeft: d.paddingX, paddingRight: d.paddingX }}
                  className={`group flex items-center gap-3 rounded-md text-sm font-medium transition-all ${isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <Icon style={{ width: d.iconSize, height: d.iconSize }} className={isActive ? 'text-primary' : 'opacity-70 group-hover:opacity-100'} />
                  {t(item.label)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 pb-6 pt-2 border-t border-border mt-auto">
        <div className="mb-4 px-2">
          <p className="text-xs text-muted-foreground truncate">
            {t('provider.sidebar.loggedIn')} <span className="font-medium text-foreground">{provider?.rental_name || user?.email}</span>
          </p>
        </div>
        <Button
          variant="secondary"
          className="w-full gap-2"
          style={{ height: d.buttonHeight }}
          asChild
        >
          <Link to="/provider/reservations/new">
            <UiIcon icon={Plus} />
            <span>{t('provider.sidebar.newReservation')}</span>
          </Link>
        </Button>
      </div>

    </div>
  );
};

export default ProviderSidebar;
