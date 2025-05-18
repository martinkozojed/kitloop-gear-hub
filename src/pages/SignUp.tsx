
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const SignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (password !== confirmPassword) {
      toast.error(t('signup.password_mismatch'));
      return;
    }
    
    setIsRegistering(true);
    
    // Simulate registration API call
    setTimeout(() => {
      // Store user session in localStorage (simulating successful registration)
      localStorage.setItem('kitloop_user', JSON.stringify({ 
        email, 
        firstName,
        lastName,
        isLoggedIn: true 
      }));
      
      toast.success(t('signup.success'));
      navigate('/');
      setIsRegistering(false);
    }, 1500);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-kitloop-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{t('signup.title')}</CardTitle>
          <CardDescription>{t('signup.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium">{t('signup.first_name')}</label>
                <Input 
                  id="firstName" 
                  placeholder={t('signup.first_name_placeholder')}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium">{t('signup.last_name')}</label>
                <Input 
                  id="lastName" 
                  placeholder={t('signup.last_name_placeholder')}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">{t('signup.email')}</label>
              <Input 
                id="email" 
                type="email" 
                placeholder={t('signup.email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">{t('signup.password')}</label>
              <Input 
                id="password" 
                type="password" 
                placeholder={t('signup.password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">{t('signup.confirm_password')}</label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder={t('signup.confirm_password_placeholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-kitloop-accent hover:bg-kitloop-accent-hover text-white mt-6"
              disabled={isRegistering}
            >
              {isRegistering ? t('signup.creating_account') : t('signup.create_account')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <div className="text-center text-sm">
            {t('signup.have_account')}{' '}
            <Link to="/login" className="text-kitloop-accent hover:underline font-medium">
              {t('signup.sign_in')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUp;
