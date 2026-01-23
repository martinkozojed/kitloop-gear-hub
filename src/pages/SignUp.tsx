import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('customer');
  const [isRegistering, setIsRegistering] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signUp } = useAuth();

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

      // Redirect logic
      if (role === 'provider') {
        // New providers must complete setup
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
    <div className="flex min-h-screen bg-gray-50/50">
      {/* Left side - Hero/Branding (Optional, hides on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-kitloop-dark text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-2xl font-bold mb-8">
            <div className="w-8 h-8 bg-kitloop-primary rounded-lg flex items-center justify-center">
              K
            </div>
            Kitloop
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            {t('signup.hero.title')}
          </h1>
          <p className="text-gray-400 text-lg max-w-md">
            {t('signup.hero.description')}
          </p>
        </div>

        {/* Abstract shapes/bg */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-kitloop-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 text-sm text-gray-500">
          {t('signup.hero.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-[400px] shadow-lg border-0 bg-white">
          <CardHeader className="text-center space-y-1 pb-6">
            <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-xs text-emerald-700 font-medium">
                MVP Access — Free for outdoor rental providers
              </p>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">{t('signup.title')}</CardTitle>
            <CardDescription>
              {t('signup.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Account Type Selector */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div
                  onClick={() => setRole('customer')}
                  className={cn(
                    "cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center gap-2 transition-all hover:bg-gray-50",
                    role === 'customer'
                      ? "border-kitloop-primary bg-green-50/50"
                      : "border-gray-200"
                  )}
                >
                  <User className={cn("w-5 h-5", role === 'customer' ? "text-kitloop-primary" : "text-gray-500")} />
                  <span className={cn("text-xs font-medium", role === 'customer' ? "text-kitloop-primary" : "text-gray-600")}>
                    {t('signup.account_type.customer')}
                  </span>
                </div>

                <div
                  onClick={() => setRole('provider')}
                  className={cn(
                    "cursor-pointer rounded-lg border-2 p-3 flex flex-col items-center gap-2 transition-all hover:bg-gray-50",
                    role === 'provider'
                      ? "border-kitloop-primary bg-green-50/50"
                      : "border-gray-200"
                  )}
                >
                  <Warehouse className={cn("w-5 h-5", role === 'provider' ? "text-kitloop-primary" : "text-gray-500")} />
                  <span className={cn("text-xs font-medium", role === 'provider' ? "text-kitloop-primary" : "text-gray-600")}>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
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
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <div className="text-center text-sm text-gray-500">
              {t('signup.have_account')}{' '}
              <Link to="/login" className="text-kitloop-primary hover:underline font-medium">
                {t('signup.sign_in')}
              </Link>
            </div>
            <div className="text-[10px] text-center text-gray-400 px-8">
              By clicking continue, you agree to our Terms of Service and Privacy Policy.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
