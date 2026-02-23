import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/error-utils";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login } = useAuth();

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
      navigate('/');
    } catch (error) {
      const errorMessage = getErrorMessage(error) || t('login.error');

      if (errorMessage.includes('Invalid login credentials')) {
        toast.error(t('login.error_credentials') || 'Invalid email or password');
      } else if (errorMessage.includes('Email not confirmed')) {
        toast.error(t('login.error_email_not_confirmed') || 'Please confirm your email first');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header — same structure as onboarding */}
      <header className="py-4 px-6 md:px-10 bg-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/onboarding" className="text-2xl font-bold flex items-center shrink-0">
            <span className="text-emerald-600 pr-0.5 tracking-tight">Kit</span>
            <span className="text-foreground tracking-wide">loop</span>
          </Link>
          <Link
            to="/onboarding"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">{t('login.welcome')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('login.instructions')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
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
                data-testid="login-email"
              />
            </div>

            <div className="space-y-1.5">
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
                data-testid="login-password"
              />
            </div>

            <Button
              type="submit"
              variant="cta"
              className="w-full mt-2"
              disabled={isLoggingIn}
              data-testid="login-submit"
            >
              {isLoggingIn ? t('login.signing_in') : t('login.sign_in')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('login.no_account')}{' '}
            <Link
              to="/signup"
              className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              {t('login.create_account')}
            </Link>
          </p>

        </div>
      </main>

    </div>
  );
};

export default Login;
