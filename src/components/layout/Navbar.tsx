import React from 'react';
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, User, LogOut, Search } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
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
import { useCommand } from "@/context/CommandContext";
import { toast } from "sonner";

const Navbar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile, isAuthenticated, logout, isAdmin, isProvider } = useAuth();
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
    <header className="py-4 px-6 md:px-10 glass fixed top-0 left-0 right-0 z-50 shadow-sm/50 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <div className="flex-shrink-0">
          <Link to="/" className="text-2xl font-bold flex items-center">
            <span className="text-green-600 pr-0.5 tracking-tight">Kit</span>
            <span className="text-text tracking-wide">loop</span>
          </Link>
        </div>

        {/* Navigation */}
        {/* Navigation / Search */}
        <div className="flex-1 hidden md:flex justify-center items-center px-4">
          {isAuthenticated && profile?.role === 'provider' ? (
            <div className="w-full max-w-md relative group">
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground bg-muted/50 hover:bg-white border-transparent hover:border-gray-200 transition-all"
                onClick={() => setOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                <span className="inline-flex">Search...</span>
                <kbd className="pointer-events-none absolute right-2 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
          ) : (
            <nav className="flex justify-center items-center gap-8 text-text">
              <Link to="/how-it-works" className="hover:underline transition-colors duration-200">
                {t('navbar.how_it_works')}
              </Link>
              <Link to="/about" className="hover:underline transition-colors duration-200">
                {t('navbar.about_us')}
              </Link>
              <button
                onClick={() => scrollToSection('faq')}
                className="hover:underline transition-colors duration-200"
              >
                {t('navbar.faq')}
              </button>
            </nav>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hidden md:flex">
                  <User className="h-5 w-5" />
                  <span className="hidden lg:inline">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.email}</p>
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
          ) : (
            <>
              <Button variant="outline" className="hidden md:flex" asChild>
                <Link to="/login">{t('navbar.sign_in')}</Link>
              </Button>
              <Button variant="primary" className="hidden md:flex" asChild>
                <Link to="/signup">{t('navbar.sign_up')}</Link>
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
              <nav className="flex flex-col space-y-4 text-center text-text">
                <Link to="/how-it-works">{t('navbar.how_it_works')}</Link>
                {/* <Link to="/browse">{t('navbar.browse_gear')}</Link> */}
                <Link to="/about">{t('navbar.about_us')}</Link>
                <button onClick={() => scrollToSection('faq')}>{t('navbar.faq')}</button>
              </nav>

              {isAuthenticated ? (
                <div className="flex flex-col gap-3">
                  <div className="text-center py-2 border-b">
                    <p className="text-sm font-medium">{user?.email}</p>
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
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/login">{t('navbar.sign_in')}</Link>
                  </Button>
                  <Button variant="primary" asChild className="w-full">
                    <Link to="/signup">{t('navbar.sign_up')}</Link>
                  </Button>
                </div>
              )}
            </DrawerContent>
          </Drawer>

          {!isAuthenticated && (
            <Button variant="primary" className="md:hidden" asChild>
              <Link to="/signup">{t('navbar.sign_up')}</Link>
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
