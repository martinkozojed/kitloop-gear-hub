import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from "@/components/ui/button";
import {
  Home,
  Package,
  Calendar,
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

interface ProviderSidebarProps {
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

const ProviderSidebar = ({ onToggleCollapse, isCollapsed }: ProviderSidebarProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { canViewFinancials, canEditSettings } = usePermissions();

  // Use Desktop Density by default for Sidebar
  const d = DENSITY.desktop;

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { path: '/provider/dashboard', label: 'provider.sidebar.nav.dashboard', icon: Home },
        { path: '/provider/calendar', label: 'Kalendář', icon: CalendarDays },
        // Only show Analytics if permitted
        ...(canViewFinancials ? [{ path: '/provider/analytics', label: 'provider.sidebar.nav.analytics', icon: BarChart3 }] : []),
      ]
    },
    {
      title: 'Operations',
      items: [
        { path: '/provider/reservations', label: 'provider.sidebar.nav.reservations', icon: List },
        { path: '/provider/inventory', label: 'provider.sidebar.nav.inventory', icon: Package },
        { path: '/provider/maintenance', label: 'Servis', icon: Wrench },
        { path: '/provider/customers', label: 'Zákazníci (CRM)', icon: Users },
        { path: '/provider/accounts', label: 'Organizace (B2B)', icon: Building2 },
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
        { path: '/admin/providers', label: 'Approvals', icon: ShieldAlert },
        { path: '/admin/audit', label: 'Audit log', icon: List }
      ]
    });
  }


  return (
    <div className="flex h-full flex-col bg-muted/30 border-r border-border">
      {/* Header & Command Trigger */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between gap-2 mb-4 px-2">
          <span className="font-heading font-semibold text-lg tracking-tight">Kitloop</span>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 hover:bg-accent"
              title="Skrýt menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
        </div>

        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-background border border-input text-sm text-muted-foreground hover:border-primary/50 transition-colors group shadow-sm"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 opacity-50 group-hover:opacity-100" />
            <span>Search...</span>
          </span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
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
                    ? 'bg-primary/10 text-primary-900 shadow-sm'
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
            Logged in as <span className="font-medium text-foreground">Provider Admin</span>
          </p>
        </div>
        <Button
          className="w-full gap-2 shadow-md hover:shadow-lg transition-all"
          style={{ height: d.buttonHeight }}
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
