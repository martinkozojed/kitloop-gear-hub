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
import { Eye, EyeOff, Loader2, Warehouse, User, ArrowRight, Mountain, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('customer');
  const [isRegistering, setIsRegistering] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const benefits = [
    "Free 14-day trial",
    "No credit card required",
    "Cancel anytime"
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left side - Hero/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute -bottom-20 -left-20 w-60 h-60 bg-emerald-400/20 rounded-full blur-2xl"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.15, 0.25, 0.15]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        <motion.div 
          className="relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link to="/" className="flex items-center gap-3 text-2xl font-bold mb-12 group">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Mountain className="w-5 h-5" />
            </div>
            <span className="tracking-tight">Kitloop</span>
          </Link>
          
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
            Start your<br />
            <span className="text-emerald-200">adventure today</span>
          </h1>
          <p className="text-emerald-100/80 text-lg max-w-md leading-relaxed mb-8">
            Join hundreds of outdoor gear rental businesses modernizing their operations.
          </p>

          {/* Benefits List */}
          <div className="space-y-3">
            {benefits.map((benefit, idx) => (
              <motion.div 
                key={benefit}
                className="flex items-center gap-3 text-emerald-100"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>{benefit}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          className="relative z-10 text-sm text-emerald-200/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          © {new Date().getFullYear()} Kitloop. All rights reserved.
        </motion.div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile Logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 text-xl font-bold mb-8 justify-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <Mountain className="w-4 h-4" />
            </div>
            <span className="tracking-tight text-foreground">Kitloop</span>
          </Link>

          <Card className="border-0 shadow-xl bg-card">
            <CardHeader className="text-center space-y-1 pb-2">
              <CardTitle className="text-2xl font-bold tracking-tight">{t('signup.title')}</CardTitle>
              <CardDescription>
                {t('signup.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSignUp} className="space-y-5">
                {/* Account Type Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    onClick={() => setRole('customer')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all",
                      role === 'customer'
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                    )}
                  >
                    <AnimatePresence>
                      {role === 'customer' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute top-2 right-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <User className={cn("w-6 h-6", role === 'customer' ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-medium", role === 'customer' ? "text-primary" : "text-muted-foreground")}>
                      {t('signup.account_type.customer')}
                    </span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setRole('provider')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all",
                      role === 'provider'
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                    )}
                  >
                    <AnimatePresence>
                      {role === 'provider' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute top-2 right-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Warehouse className={cn("w-6 h-6", role === 'provider' ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-medium", role === 'provider' ? "text-primary" : "text-muted-foreground")}>
                      {t('signup.account_type.provider')}
                    </span>
                  </motion.button>
                </div>

                <motion.div 
                  className="space-y-2"
                  animate={{ scale: focusedField === 'email' ? 1.01 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label htmlFor="email">{t('signup.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('signup.email_placeholder') || "hello@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  animate={{ scale: focusedField === 'password' ? 1.01 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label htmlFor="password">{t('signup.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      required
                      minLength={6}
                      placeholder={t('signup.password_placeholder') || "Create a password"}
                      className="h-11 pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {/* Password strength indicator */}
                  <div className="flex gap-1 pt-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          password.length === 0 ? "bg-muted" :
                          password.length >= level * 3 
                            ? level <= 2 ? "bg-amber-500" : "bg-emerald-500"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {password.length < 6 ? t('signup.password_weak') || 'Must be at least 6 characters' : 
                     password.length < 10 ? 'Good password' : 'Strong password'}
                  </p>
                </motion.div>

                <Button
                  type="submit"
                  className="w-full h-11 group"
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('signup.creating_account')}
                    </>
                  ) : (
                    <>
                      {t('signup.create_account')}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-2">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                {t('signup.have_account')}{' '}
                <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                  {t('signup.sign_in')}
                </Link>
              </div>
              
              <p className="text-[10px] text-center text-muted-foreground px-4">
                By clicking continue, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUp;