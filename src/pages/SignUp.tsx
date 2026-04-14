import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/error-utils";
import { Eye, EyeOff, Loader2, Warehouse, User } from "lucide-react";
import { cn } from "@/lib/utils";

const SignUp = () => {
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get('from') === 'onboarding';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(fromOnboarding ? 'provider' : 'customer');
  const [isRegistering, setIsRegistering] = useState(false);

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { signUp } = useAuth();
  const lang = i18n.language?.startsWith("cs") ? "cs" : "en";

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t('signup.error_fields') || 'Please enter email and password');
      return;
    }

    if (password.length < 6) {
      toast.error(t('signup.password_weak') || 'Password must be at least 6 characters');
      return;
    }

    setIsRegistering(true);

    try {
      await signUp(email, password, role);
      toast.success(t('signup.success') || 'Account created successfully!');

      if (role === 'provider') {
        navigate('/provider/setup');
      } else {
        navigate('/');
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error) || '';

      if (errorMessage.includes('User already registered') || String(error).includes('User already registered')) {
        toast.error(t('signup.error_email_exists'));
      } else {
        console.error('Signup error:', error);
        toast.error(t('signup.error'));
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="light min-h-screen flex flex-col" style={{
      background: `
        radial-gradient(circle at 30% 20%, rgba(0,150,136,0.08), transparent 50%),
        radial-gradient(circle at 70% 80%, rgba(0,150,136,0.05), transparent 50%),
        hsl(174, 5%, 97%)
      `
    }}>

      {/* Header */}
      <header className="py-4 px-6 md:px-10 border-b border-border" style={{ background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(20px) saturate(180%)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/onboarding" className="font-heading text-2xl font-bold flex items-center shrink-0 tracking-tight">
            <span className="text-brand-600 pr-0.5">Kit</span>
            <span className="text-foreground">loop</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => i18n.changeLanguage(lang === "en" ? "cs" : "en")}
              aria-label={lang === "en" ? "Switch to Czech" : "Přepnout do angličtiny"}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 rounded px-0.5"
            >
              {lang === "en" ? "CS" : "EN"}
            </button>
            <Link
              to="/onboarding"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-fast"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      {/* Centered card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card
          className="w-full max-w-[400px] rounded-token-xl border-0 animate-enter"
          style={{
            background: 'rgba(255, 255, 255, 0.78)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.30)',
            boxShadow: 'var(--shadow-elevated)'
          }}
        >
          <CardHeader className="text-center space-y-1 pb-6">
            {role === 'provider' && (
              <div className="mb-3 px-3 py-2 bg-brand-50 border border-brand-200 rounded-lg space-y-0.5">
                <p className="text-xs text-brand-700 font-semibold">
                  MVP Access — Free for outdoor rental providers
                </p>
                <p className="text-xs text-brand-700/80">
                  Access is enabled after manual approval. / Přístup je aktivován po ručním schválení.
                </p>
              </div>
            )}
            <CardTitle className="text-2xl font-bold tracking-tight">{t('signup.title')}</CardTitle>
            <CardDescription>{t('signup.description')}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Account type selector */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div
                  onClick={() => setRole('customer')}
                  className={cn(
                    "cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center gap-2 transition-all duration-fast hover:bg-subtle",
                    role === 'customer'
                      ? "border-brand-500 bg-brand-50"
                      : "border-border"
                  )}
                >
                  <User className={cn("w-5 h-5", role === 'customer' ? "text-brand-600" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", role === 'customer' ? "text-brand-700" : "text-muted-foreground")}>
                    {t('signup.account_type.customer')}
                  </span>
                  <span className="text-xxs text-center leading-tight text-muted-foreground">
                    Not used in MVP
                  </span>
                </div>

                <div
                  onClick={() => setRole('provider')}
                  className={cn(
                    "cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center gap-2 transition-all duration-fast hover:bg-subtle",
                    role === 'provider'
                      ? "border-brand-500 bg-brand-50"
                      : "border-border"
                  )}
                >
                  <Warehouse className={cn("w-5 h-5", role === 'provider' ? "text-brand-600" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", role === 'provider' ? "text-brand-700" : "text-muted-foreground")}>
                    {t('signup.account_type.provider')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('signup.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('signup.email_placeholder') || "hello@example.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('signup.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={t('signup.password_placeholder') || "Create a password"}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors duration-fast"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xxs text-muted-foreground ml-1">
                  {t('signup.password_weak') || 'Must be at least 6 characters'}
                </p>
              </div>

              <Button
                type="submit"
                variant="cta"
                className="w-full h-10 mt-2"
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('signup.creating_account')}
                  </>
                ) : (
                  t('signup.create_account')
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <div className="text-center text-sm text-muted-foreground">
              {t('signup.have_account')}{' '}
              <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium transition-colors duration-fast">
                {t('signup.sign_in')}
              </Link>
            </div>
            <div className="text-xxs text-center text-muted-foreground px-8">
              By clicking continue, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-foreground transition-colors duration-fast">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="underline hover:text-foreground transition-colors duration-fast">Privacy Policy</Link>.
            </div>
          </CardFooter>
        </Card>
      </main>

    </div>
  );
};

export default SignUp;
