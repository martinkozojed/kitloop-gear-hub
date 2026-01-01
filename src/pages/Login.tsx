
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex items-center justify-center min-h-screen bg-kitloop-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{t('login.welcome')}</CardTitle>
          <CardDescription>{t('login.instructions')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">{t('login.email')}</label>
              <Input 
                id="email" 
                type="email" 
                placeholder={t('login.email_placeholder')} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">{t('login.password')}</label>
                <Link to="/forgot-password" className="text-sm font-medium text-green-600 hover:underline">
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
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? t('login.signing_in') : t('login.sign_in')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <div className="text-center text-sm">
            {t('login.no_account')}{' '}
            <Link to="/signup" className="text-green-600 hover:underline font-medium">
              {t('login.create_account')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
