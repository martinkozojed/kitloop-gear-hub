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
      const errorMessage = getErrorMessage(error);

      if (errorMessage.includes('User already registered')) {
        toast.error(t('signup.error_email_exists') || 'This email is already registered. Please login.');
      } else {
        toast.error(errorMessage || t('signup.error') || 'Registration failed');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header — same as Login */}
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
            {role === 'provider' && (
              <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg space-y-0.5">
                <p className="text-xs text-emerald-700 font-semibold">
                  MVP Access — Free for outdoor rental providers
                </p>
                <p className="text-xs text-emerald-700/80">
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
                    "cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center gap-2 transition-all hover:bg-slate-50",
                    role === 'customer'
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-slate-200"
                  )}
                >
                  <User className={cn("w-5 h-5", role === 'customer' ? "text-emerald-600" : "text-slate-400")} />
                  <span className={cn("text-xs font-medium", role === 'customer' ? "text-emerald-700" : "text-slate-500")}>
                    {t('signup.account_type.customer')}
                  </span>
                  <span className="text-[10px] text-center leading-tight text-slate-400">
                    Not used in MVP
                  </span>
                </div>

                <div
                  onClick={() => setRole('provider')}
                  className={cn(
                    "cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center gap-2 transition-all hover:bg-slate-50",
                    role === 'provider'
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-slate-200"
                  )}
                >
                  <Warehouse className={cn("w-5 h-5", role === 'provider' ? "text-emerald-600" : "text-slate-400")} />
                  <span className={cn("text-xs font-medium", role === 'provider' ? "text-emerald-700" : "text-slate-500")}>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground ml-1">
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
              <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                {t('signup.sign_in')}
              </Link>
            </div>
            <div className="text-[10px] text-center text-slate-400 px-8">
              By clicking continue, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-slate-600 transition-colors">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="underline hover:text-slate-600 transition-colors">Privacy Policy</Link>.
            </div>
          </CardFooter>
        </Card>
      </main>

    </div>
  );
};

export default SignUp;
