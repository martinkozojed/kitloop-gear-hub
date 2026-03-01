import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const lang = i18n.language?.startsWith("cs") ? "cs" : "en";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t('login.error_fields'));
      return;
    }

    setIsLoggingIn(true);

    try {
      await login(email.trim(), password);
      toast.success(t('login.success'));
      // The ProviderRoute will handle the final redirection (either Setup, Pending, or Dashboard)
      // We just send them to the dashboard entry point.
      navigate('/provider/dashboard');
    } catch (error) {
      const errorMessage = getErrorMessage(error) || '';

      if (errorMessage.includes('Invalid login credentials') || String(error).includes('Invalid login credentials')) {
        toast.error(t('login.error_credentials'));
      } else if (errorMessage.includes('Email not confirmed')) {
        toast.error(t('login.error_email_not_confirmed'));
      } else {
        console.error('Login error:', error);
        toast.error(t('login.error'));
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="light min-h-screen bg-subtle flex flex-col">

      {/* Header */}
      <header className="py-4 px-6 md:px-10 bg-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/onboarding" className="text-2xl font-bold flex items-center shrink-0">
            <span className="text-emerald-600 pr-0.5 tracking-tight">Kit</span>
            <span className="text-foreground tracking-wide">loop</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Language toggle — single button showing the other language */}
            <button
              onClick={() => i18n.changeLanguage(lang === "en" ? "cs" : "en")}
              aria-label={lang === "en" ? "Switch to Czech" : "Přepnout do angličtiny"}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 rounded px-0.5"
            >
              {lang === "en" ? "CS" : "EN"}
            </button>
            <Link
              to="/onboarding"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      {/* Centered card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-[400px] shadow-lg border-0 bg-white">
          <CardHeader className="text-center space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight">{t('login.welcome')}</CardTitle>
            <CardDescription>{t('login.instructions')}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  {t('login.email')}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10"
                  data-testid="login-email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    {t('login.password')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {t('login.forgot_password')}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('login.password_placeholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10"
                  data-testid="login-password"
                />
              </div>

              <Button
                type="submit"
                variant="cta"
                className="w-full h-10 mt-2"
                disabled={isLoggingIn}
                data-testid="login-submit"
              >
                {isLoggingIn ? t('login.signing_in') : t('login.sign_in')}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <div className="text-center text-sm text-muted-foreground">
              {t('login.no_account')}{' '}
              <Link
                to="/signup"
                className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                {t('login.create_account')}
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>

    </div>
  );
};

export default Login;
