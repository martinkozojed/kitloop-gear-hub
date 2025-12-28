import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/error-utils";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mountain } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
      await login(email, password);
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
    <div className="flex min-h-screen">
      {/* Left Panel - Branding (Hidden on mobile) */}
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
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-white/5 to-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          />
        </div>
        
        {/* Content */}
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
            Welcome back to<br />
            <span className="text-emerald-200">your basecamp</span>
          </h1>
          <p className="text-emerald-100/80 text-lg max-w-md leading-relaxed">
            Manage your outdoor gear rentals with the platform built for adventure businesses.
          </p>
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

      {/* Right Panel - Form */}
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
            <CardHeader className="space-y-1 text-center pb-2">
              <CardTitle className="text-2xl font-bold tracking-tight">{t('login.welcome')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t('login.instructions')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <motion.div 
                  className="space-y-2"
                  animate={{ scale: focusedField === 'email' ? 1.01 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    {t('login.email')}
                  </label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder={t('login.email_placeholder')} 
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
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                      {t('login.password')}
                    </label>
                    <Link 
                      to="/forgot-password" 
                      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
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
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </motion.div>
                
                <Button
                  type="submit"
                  className="w-full h-11 mt-2 group"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('login.signing_in')}
                    </>
                  ) : (
                    <>
                      {t('login.sign_in')}
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
                {t('login.no_account')}{' '}
                <Link 
                  to="/signup" 
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  {t('login.create_account')}
                </Link>
              </div>
            </CardFooter>
          </Card>
          
          {/* Trust indicators */}
          <motion.div 
            className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              SSL Secured
            </span>
            <span>•</span>
            <span>GDPR Compliant</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;