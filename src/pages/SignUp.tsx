
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/error-utils";

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signUp } = useAuth();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !password || !confirmPassword) {
      toast.error(t('signup.error_fields') || 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('signup.password_mismatch'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('signup.password_weak') || 'Password must be at least 6 characters');
      return;
    }

    setIsRegistering(true);

    try {
      await signUp(email, password, role);
      toast.success(t('signup.success'));

      // Redirect based on role
      if (role === 'provider') {
        navigate('/provider/setup'); // Redirect to provider onboarding
      } else {
        navigate('/'); // Redirect to homepage
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error) || t('signup.error');

      if (errorMessage.includes('User already registered')) {
        toast.error(t('signup.error_email_exists') || 'Email already registered');
      } else if (errorMessage.includes('Password should be at least')) {
        toast.error(t('signup.password_weak') || 'Password is too weak');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsRegistering(false);
    }
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
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('signup.account_type') || 'Account Type'}</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="customer" id="customer" />
                  <Label htmlFor="customer" className="cursor-pointer flex-1">
                    <div className="font-medium">{t('signup.customer') || 'Customer'}</div>
                    <div className="text-xs text-gray-500">{t('signup.customer_desc') || 'Rent gear for your adventures'}</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="provider" id="provider" />
                  <Label htmlFor="provider" className="cursor-pointer flex-1">
                    <div className="font-medium">{t('signup.provider') || 'Provider'}</div>
                    <div className="text-xs text-gray-500">{t('signup.provider_desc') || 'List your gear for rent'}</div>
                  </Label>
                </div>
              </RadioGroup>
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
                minLength={6}
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
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full mt-6"
              disabled={isRegistering}
            >
              {isRegistering ? t('signup.creating_account') : t('signup.create_account')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <div className="text-center text-sm">
            {t('signup.have_account')}{' '}
            <Link to="/login" className="text-green-600 hover:underline font-medium">
              {t('signup.sign_in')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUp;
