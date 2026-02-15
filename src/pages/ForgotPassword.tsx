import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error('Zadejte prosím svou e-mailovou adresu');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setEmailSent(true);
            toast.success('E-mail pro obnovení hesla byl odeslán!');
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            toast.error(errorMessage || 'Nepodařilo se odeslat e-mail');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (emailSent) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-kitloop-background px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="space-y-1 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Email odeslaný</CardTitle>
                        <CardDescription>
                            Odeslali jsme vám odkaz pro obnovení hesla na adresu <strong>{email}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                            Zkontrolujte svou e-mailovou schránku a klikněte na odkaz pro obnovení hesla.
                            Odkaz vyprší za 1 hodinu.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" className="w-full" asChild>
                            <Link to="/login">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Zpět na přihlášení
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-kitloop-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">Zapomenuté heslo</CardTitle>
                    <CardDescription>
                        Zadejte svou e-mailovou adresu a my vám pošleme odkaz pro obnovení hesla
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                E-mailová adresa
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="vas-email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="cta"
                            className="w-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Odesílání...' : 'Odeslat odkaz pro obnovení'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter>
                    <Button variant="ghost" className="w-full" asChild>
                        <Link to="/login">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Zpět na přihlášení
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ForgotPassword;
