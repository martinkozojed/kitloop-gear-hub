import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/error-utils";
import { ArrowLeft, Mail } from "lucide-react";

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { i18n, t } = useTranslation();
    const lang = i18n.language?.startsWith("cs") ? "cs" : "en";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error(lang === 'cs' ? 'Zadejte prosím svou e-mailovou adresu' : 'Please enter your email address');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setEmailSent(true);
            toast.success(lang === 'cs' ? 'E-mail pro obnovení hesla byl odeslán!' : 'Recovery email sent!');
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage || (lang === 'cs' ? 'Nepodařilo se odeslat e-mail' : 'Failed to send email'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const Header = () => (
        <header className="py-4 px-6 md:px-10 border-b border-border" style={{ background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(20px) saturate(180%)' }}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link to="/onboarding" className="font-heading text-2xl font-bold flex items-center shrink-0 tracking-tight">
                    <span className="text-brand-600 pr-0.5">Kit</span>
                    <span className="text-foreground">loop</span>
                </Link>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => i18n.changeLanguage(lang === "en" ? "cs" : "en")}
                        className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 rounded px-0.5"
                    >
                        {lang === "en" ? "CS" : "EN"}
                    </button>
                    <Link
                        to="/login"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-fast"
                    >
                        {lang === 'cs' ? '← Zpět' : '← Back'}
                    </Link>
                </div>
            </div>
        </header>
    );

    if (emailSent) {
        return (
            <div className="light min-h-screen flex flex-col" style={{
                background: `radial-gradient(circle at 30% 20%, rgba(0,150,136,0.08), transparent 50%), radial-gradient(circle at 70% 80%, rgba(0,150,136,0.05), transparent 50%), hsl(174, 5%, 97%)`
            }}>
                <Header />
                <main className="flex-1 flex items-center justify-center px-4 py-12">
                    <Card className="w-full max-w-[400px] rounded-token-xl border-0 animate-enter" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.30)', boxShadow: 'var(--shadow-elevated)' }}>
                        <CardHeader className="space-y-1 text-center">
                            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
                                <Mail className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-2xl font-bold">{lang === 'cs' ? 'Email odeslaný' : 'Email sent'}</CardTitle>
                            <CardDescription>
                                {lang === 'cs'
                                    ? <>Odeslali jsme vám odkaz pro obnovení hesla na adresu <strong>{email}</strong></>
                                    : <>We've sent a password reset link to <strong>{email}</strong></>
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground text-center">
                                {lang === 'cs'
                                    ? 'Zkontrolujte svou e-mailovou schránku a klikněte na odkaz pro obnovení hesla. Odkaz vyprší za 1 hodinu.'
                                    : 'Please check your inbox and click the reset link. The link expires in 1 hour.'
                                }
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" asChild>
                                <Link to="/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    {lang === 'cs' ? 'Zpět na přihlášení' : 'Back to login'}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="light min-h-screen flex flex-col" style={{
                background: `radial-gradient(circle at 30% 20%, rgba(0,150,136,0.08), transparent 50%), radial-gradient(circle at 70% 80%, rgba(0,150,136,0.05), transparent 50%), hsl(174, 5%, 97%)`
            }}>
            <Header />
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <Card className="w-full max-w-[400px] shadow-elevated border-0 bg-white/90 backdrop-blur-xl rounded-token-xl">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-bold">{lang === 'cs' ? 'Zapomenuté heslo' : 'Forgot password'}</CardTitle>
                        <CardDescription>
                            {lang === 'cs'
                                ? 'Zadejte svou e-mailovou adresu a my vám pošleme odkaz pro obnovení hesla'
                                : 'Enter your email address and we\'ll send you a recovery link'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">
                                    {lang === 'cs' ? 'E-mailová adresa' : 'Email address'}
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="vas-email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    className="h-10"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="cta"
                                className="w-full h-10 mt-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? (lang === 'cs' ? 'Odesílání...' : 'Sending...')
                                    : (lang === 'cs' ? 'Odeslat odkaz pro obnovení' : 'Send recovery link')
                                }
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <div className="text-center w-full text-sm text-muted-foreground">
                            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium transition-colors duration-fast flex items-center justify-center">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {lang === 'cs' ? 'Zpět na přihlášení' : 'Back to login'}
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </main>
        </div>
    );
};

export default ForgotPassword;
