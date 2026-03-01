import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/error-utils";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const { i18n, t } = useTranslation();
    const lang = i18n.language?.startsWith("cs") ? "cs" : "en";

    useEffect(() => {
        // Check if user has valid session from reset link
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast.error(lang === 'cs' ? 'Neplatný nebo vypršelý odkaz pro resetování' : 'Invalid or expired reset link');
                navigate('/login');
            }
        });
    }, [navigate, lang]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            toast.error(lang === 'cs' ? 'Vyplňte prosím všechna pole' : 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            toast.error(lang === 'cs' ? 'Heslo musí mít alespoň 6 znaků' : 'Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            toast.error(lang === 'cs' ? 'Hesla se neshodují' : 'Passwords do not match');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            toast.success(lang === 'cs' ? 'Heslo bylo úspěšně aktualizováno!' : 'Password updated successfully!');

            // Wait a moment then redirect to login
            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage || (lang === 'cs' ? 'Nepodařilo se aktualizovat heslo' : 'Failed to update password'));
        } finally {
            setIsSubmitting(false);
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
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <Card className="w-full max-w-[400px] shadow-lg border-0 bg-white">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-bold">{lang === 'cs' ? 'Nastavit nové heslo' : 'Set new password'}</CardTitle>
                        <CardDescription>
                            {lang === 'cs' ? 'Zadejte své nové heslo' : 'Enter your new password'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium">
                                    {lang === 'cs' ? 'Nové heslo' : 'New password'}
                                </label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder={lang === 'cs' ? "Minimálně 6 znaků" : "At least 6 characters"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoFocus
                                        className="h-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="text-sm font-medium">
                                    {lang === 'cs' ? 'Potvrdit heslo' : 'Confirm password'}
                                </label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder={lang === 'cs' ? "Zadejte heslo znovu" : "Enter password again"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="h-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="cta"
                                className="w-full h-10 mt-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? (lang === 'cs' ? 'Aktualizace hesla...' : 'Updating password...')
                                    : (lang === 'cs' ? 'Aktualizovat heslo' : 'Update password')
                                }
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default ResetPassword;
