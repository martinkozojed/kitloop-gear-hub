import React from 'react';
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, User, LogOut, Search } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/AuthContext';
import { useProvider } from '@/context/ProviderContext';
import { useCommand } from "@/context/CommandContext";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

const Navbar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile, isAuthenticated, logout, isAdmin } = useAuth();
  const { provider, isProvider } = useProvider();
  const { setOpen } = useCommand();

  const scrollToSection = (sectionId: string) => {
    if (window.location.pathname !== '/') {
      // Redirect to homepage with section hash
      window.location.href = `/#${sectionId}`;
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="py-4 px-6 md:px-10 border-b border-border fixed top-0 left-0 right-0 z-50 transition-colors duration-fast" style={{ background: 'hsla(174, 5%, 99%, 0.80)', backdropFilter: 'blur(20px) saturate(180%)' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <div className="flex-shrink-0">
          <Link to="/" className="font-heading text-2xl font-bold flex items-center tracking-tight hover:opacity-80 transition-opacity duration-fast">
            <span className="text-brand-600 dark:text-brand-400 pr-0.5">Kit</span>
            <span className="text-foreground dark:text-white">loop</span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 hidden md:flex justify-center items-center px-4">
          {!isAuthenticated && (
            <nav className="flex justify-center items-center gap-8">
              <button
                onClick={() => scrollToSection('product')}
                className="text-muted-foreground hover:text-brand-600 transition-colors duration-fast"
              >
                {t('navbar.product')}
              </button>
              <Link to="/" className="text-muted-foreground hover:text-brand-600 transition-colors duration-fast">
                {t('navbar.about_us')}
              </Link>
              <button
                onClick={() => scrollToSection('faq')}
                className="text-muted-foreground hover:text-brand-600 transition-colors duration-fast"
              >
                {t('navbar.faq')}
              </button>
            </nav>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LanguageSwitcher />

          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              {/* Only show notifications to Providers and Admins (in MVP) */}
              {(isProvider || isAdmin) && <NotificationInbox />}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 hidden md:flex">
                    <User className="h-5 w-5" />
                    <span className="hidden lg:inline">
                      {provider?.rental_name || user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {provider?.rental_name || user?.email}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {isAdmin ? 'Administrator' : isProvider ? 'Provider' : 'Customer'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {(isProvider || isAdmin) && (
                    <DropdownMenuItem asChild>
                      <Link to="/provider/dashboard" className="cursor-pointer">
                        {isAdmin ? 'Admin Dashboard' : 'Provider Dashboard'}
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button variant="ghost" className="hidden md:flex" asChild>
                <Link to="/login">{t('navbar.sign_in')}</Link>
              </Button>
              <Button variant="primary" className="hidden md:flex" asChild>
                <Link to="/signup">{t('navbar.sign_up') || 'Sign up'}</Link>
              </Button>
            </>
          )}

          {/* Mobile menu */}
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="p-6 space-y-6">
              <nav className="flex flex-col space-y-4 text-center">
                <Link to="/" className="text-muted-foreground hover:text-brand-600 transition-colors duration-fast">{t('navbar.how_it_works')}</Link>
                <Link to="/" className="text-muted-foreground hover:text-brand-600 transition-colors duration-fast">{t('navbar.about_us')}</Link>
                <button onClick={() => scrollToSection('faq')} className="text-muted-foreground hover:text-brand-600 transition-colors duration-fast">{t('navbar.faq')}</button>
              </nav>

              {isAuthenticated ? (
                <div className="flex flex-col gap-3">
                  <div className="text-center py-2 border-b border-border">
                    <p className="text-sm font-medium">
                      {provider?.rental_name || user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {isAdmin ? 'Administrator' : isProvider ? 'Provider' : 'Customer'}
                    </p>
                  </div>

                  {(isProvider || isAdmin) && (
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/provider/dashboard">
                        {isAdmin ? 'Admin Dashboard' : 'Provider Dashboard'}
                      </Link>
                    </Button>
                  )}

                  <Button variant="destructive" onClick={handleLogout} className="w-full">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button variant="ghost" asChild className="w-full">
                    <Link to="/login">{t('navbar.sign_in')}</Link>
                  </Button>
                  <Button variant="primary" asChild className="w-full">
                    <Link to="/signup">{t('navbar.sign_up') || 'Sign up'}</Link>
                  </Button>
                </div>
              )}
            </DrawerContent>
          </Drawer>

          {!isAuthenticated && (
            <Button variant="primary" className="md:hidden" asChild>
              <Link to="/">{t('navbar.contact')}</Link>
            </Button>
          )}

          {isAuthenticated && (
            <Button variant="ghost" size="icon" className="md:hidden">
              <User className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
