import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Loader2, MapPin, Package, Store, ArrowRight, Upload, PlusCircle, Sparkles, Check } from "lucide-react";
import { getErrorMessage } from '@/lib/error-utils';
import { track } from '@/lib/telemetry';
import { GlowLayer } from '@/components/ui/GlowLayer';
import { workspaceSchema, locationSchema, type WorkspaceFormData, type LocationFormData } from '@/lib/schemas/onboarding';

type InventoryPath = 'csv_import' | 'manual' | 'demo';

interface FormData extends WorkspaceFormData, LocationFormData {
  inventoryPath?: InventoryPath;
}

const ProviderSetup = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1); // Track furthest step reached
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    rental_name: '',
    contact_phone: '',
    contact_email: user?.email || '',
    currency: 'CZK',
    time_zone: 'Europe/Prague',
    location: '',
    address: '',
    business_hours_display: '',
    pickup_instructions: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    track('onboarding.started', { step: 1 });

    // Auto-detect timezone from browser
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const supportedTimezones = ['Europe/Prague', 'Europe/Berlin', 'Europe/London', 'America/New_York'];
      if (supportedTimezones.includes(browserTimezone)) {
        setFormData(prev => ({ ...prev, time_zone: browserTimezone }));
      }
    } catch (e) {
      // Fallback to default
    }
  }, []);

  useEffect(() => {
    if (user?.email && !formData.contact_email) {
      setFormData(prev => ({ ...prev, contact_email: user.email || '' }));
    }
  }, [user?.email, formData.contact_email]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  };

  const validateStep1 = (): boolean => {
    const result = workspaceSchema.safeParse({
      rental_name: formData.rental_name,
      contact_phone: formData.contact_phone,
      contact_email: formData.contact_email,
      currency: formData.currency,
      time_zone: formData.time_zone,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        newErrors[err.path[0] as string] = err.message;
      });
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const result = locationSchema.safeParse({
      location: formData.location,
      address: formData.address,
      business_hours_display: formData.business_hours_display,
      pickup_instructions: formData.pickup_instructions,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        newErrors[err.path[0] as string] = err.message;
      });
      setErrors(newErrors);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) {
        toast.error(t('onboarding.wizard.validation.nameRequired'));
        return;
      }
      track('onboarding.workspace_completed', {
        currency: formData.currency,
        timezone: formData.time_zone
      });
    }

    if (step === 2) {
      if (!validateStep2()) {
        toast.error(t('onboarding.wizard.validation.cityRequired'));
        return;
      }
      track('onboarding.location_completed', {
        has_hours: !!formData.business_hours_display,
        has_instructions: !!formData.pickup_instructions
      });
    }

    setStep(prev => {
      const newStep = prev + 1;
      setMaxStep(current => Math.max(current, newStep));
      return newStep;
    });
  };

  // Navigate to step (can go back freely, forward only up to maxStep)
  const goToStep = (targetStep: number) => {
    if (targetStep <= maxStep) {
      setStep(targetStep);
    }
  };

  const handleInventoryChoice = async (path: InventoryPath) => {
    // If not logged in, redirect to auth with return URL
    if (!user?.id) {
      toast.error('Pro dokončení se musíte přihlásit nebo zaregistrovat.');
      navigate('/login?returnTo=/provider/setup');
      return;
    }

    setIsSubmitting(true);

    try {
      const providerData = {
        user_id: user.id,
        rental_name: formData.rental_name,
        name: formData.rental_name,
        contact_name: formData.rental_name,
        email: formData.contact_email,
        phone: formData.contact_phone,
        location: formData.location,
        address: formData.address || null,
        currency: formData.currency,
        time_zone: formData.time_zone,
        business_hours_display: formData.business_hours_display || null,
        pickup_instructions: formData.pickup_instructions || null,
        onboarding_completed: true,
        onboarding_step: 3,
        verified: false,
        status: 'approved', // Auto-approve in MVP so they can complete the checklist
        country: 'CZ',
        category: 'outdoor-gear',
      };

      const { data: provider, error: insertError } = await supabase
        .from('providers')
        .insert(providerData)
        .select()
        .single();

      if (insertError) throw insertError;

      if (provider) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('onboarding_progress').insert({
          provider_id: provider.id,
          step_workspace_completed_at: new Date().toISOString(),
          step_location_completed_at: new Date().toISOString(),
        });
      }

      track('onboarding.inventory_completed', { path });
      await refreshProfile();

      if (path === 'csv_import') {
        toast.success('Nastavení dokončeno! Přesměrovávám na import...');
        navigate('/provider/inventory?import=true');
      } else if (path === 'manual') {
        toast.success('Nastavení dokončeno! Přidejte první položku...');
        navigate('/provider/inventory?addAsset=true');
      } else {
        toast.success('Nastavení dokončeno! Načítám demo data...');
        navigate('/provider/dashboard');
      }
    } catch (error) {
      console.error('Error during setup:', error);
      toast.error(getErrorMessage(error) || 'Nastala neočekávaná chyba.');
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, icon: Store, label: 'Workspace' },
    { num: 2, icon: MapPin, label: 'Lokace' },
    { num: 3, icon: Package, label: 'Inventář' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t('onboarding.wizard.loadingText') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="relative min-h-screen bg-background py-8 px-4 flex items-center justify-center overflow-hidden z-0">
      <GlowLayer />
      <div className="relative z-10 max-w-lg w-full">
        {/* Step Indicators */}
        <div className="flex justify-center items-center gap-2 mb-8">
          {steps.map((s, idx) => {
            const StepIcon = s.icon;
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            const isAccessible = s.num <= maxStep;
            return (
              <React.Fragment key={s.num}>
                <button
                  type="button"
                  onClick={() => goToStep(s.num)}
                  disabled={!isAccessible}
                  className={`
                    w-14 h-10 rounded-xl flex items-center justify-center transition-all duration-200 font-medium text-sm
                    ${isCompleted ? 'bg-primary text-primary-foreground cursor-pointer hover:brightness-105' : ''}
                    ${isCurrent ? 'bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2' : ''}
                    ${!isCompleted && !isCurrent && isAccessible ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30' : ''}
                    ${!isAccessible ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}
                  `}
                  aria-label={`Krok ${s.num}: ${s.label}`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </button>
                {idx < steps.length - 1 && (
                  <div className={`
                    w-8 h-0.5 rounded-full transition-colors
                    ${step > s.num ? 'bg-primary' : 'bg-muted'}
                  `} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Card className="border border-border bg-card overflow-hidden">
          {/* Subtle header */}
          <CardHeader className="text-center pb-4 border-b border-border">
            <CardTitle className="text-xl font-bold mb-1 text-foreground">
              {step === 1 && t('onboarding.wizard.step1Title')}
              {step === 2 && t('onboarding.wizard.step2Title')}
              {step === 3 && t('onboarding.wizard.step3Title')}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 1 && t('onboarding.wizard.step1Desc')}
              {step === 2 && t('onboarding.wizard.step2Desc')}
              {step === 3 && t('onboarding.wizard.step3Desc')}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 min-h-[340px]">
            {/* Step 1: Workspace - always rendered, visibility controlled */}
            <div className={step === 1 ? 'block' : 'hidden'}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rental_name">
                    {t('onboarding.wizard.labels.rentalName')} *
                  </Label>
                  <Input
                    id="rental_name"
                    placeholder={t('onboarding.wizard.placeholders.rentalName')}
                    value={formData.rental_name}
                    onChange={(e) => updateField('rental_name', e.target.value)}
                    className={`h-11 ${errors.rental_name ? 'border-destructive focus:ring-destructive' : 'focus:ring-ring'}`}
                  />
                  {errors.rental_name && <p className="text-sm text-destructive">{errors.rental_name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">
                      {t('onboarding.wizard.labels.contactPhone')} *
                    </Label>
                    <Input
                      id="contact_phone"
                      placeholder={t('onboarding.wizard.placeholders.phone')}
                      value={formData.contact_phone}
                      onChange={(e) => updateField('contact_phone', e.target.value)}
                      className={`h-11 ${errors.contact_phone ? 'border-destructive' : ''}`}
                    />
                    {errors.contact_phone && <p className="text-xs text-destructive">{errors.contact_phone}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">
                      {t('onboarding.wizard.labels.contactEmail')} *
                    </Label>
                    <Input
                      id="contact_email"
                      type="email"
                      placeholder={t('onboarding.wizard.placeholders.email')}
                      value={formData.contact_email}
                      onChange={(e) => updateField('contact_email', e.target.value)}
                      className={`h-11 ${errors.contact_email ? 'border-destructive' : ''}`}
                    />
                    {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="currency">{t('onboarding.wizard.labels.currency')}</Label>
                    <Select value={formData.currency} onValueChange={(v) => updateField('currency', v as 'CZK' | 'EUR' | 'USD')}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CZK">🇨🇿 CZK</SelectItem>
                        <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                        <SelectItem value="USD">🇺🇸 USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time_zone">{t('onboarding.wizard.labels.timezone')}</Label>
                    <Select value={formData.time_zone} onValueChange={(v) => updateField('time_zone', v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Prague">Europe/Prague</SelectItem>
                        <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Location */}
            <div className={step === 2 ? 'block' : 'hidden'}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="location">{t('onboarding.wizard.labels.city')} *</Label>
                    <Input
                      id="location"
                      placeholder={t('onboarding.wizard.placeholders.city')}
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      className={`h-11 ${errors.location ? 'border-destructive' : ''}`}
                    />
                    {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">{t('onboarding.wizard.labels.address')}</Label>
                    <Input
                      id="address"
                      placeholder={t('onboarding.wizard.placeholders.address')}
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_hours">{t('onboarding.wizard.labels.businessHours')}</Label>
                  <Input
                    id="business_hours"
                    placeholder={t('onboarding.wizard.placeholders.businessHours')}
                    value={formData.business_hours_display}
                    onChange={(e) => updateField('business_hours_display', e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickup_instructions">{t('onboarding.wizard.labels.pickupInstructions')}</Label>
                  <Textarea
                    id="pickup_instructions"
                    placeholder={t('onboarding.wizard.placeholders.pickupInstructions')}
                    value={formData.pickup_instructions}
                    onChange={(e) => updateField('pickup_instructions', e.target.value)}
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.pickup_instructions?.length || 0}/500
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Inventory Choice */}
            <div className={step === 3 ? 'block' : 'hidden'}>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleInventoryChoice('csv_import')}
                  disabled={isSubmitting}
                  className="w-full flex items-center gap-4 p-4 bg-muted border-2 border-transparent rounded-xl hover:border-primary hover:bg-accent transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all shadow-sm">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{t('onboarding.wizard.inventoryOptions.csvImport')}</p>
                    <p className="text-sm text-muted-foreground">Otevřeme import a dáme vám šablonu</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handleInventoryChoice('manual')}
                  disabled={isSubmitting}
                  className="w-full flex items-center gap-4 p-4 bg-muted border-2 border-transparent rounded-xl hover:border-primary hover:bg-accent transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all shadow-sm">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{t('onboarding.wizard.inventoryOptions.manual')}</p>
                    <p className="text-sm text-muted-foreground">Hned přidáte první kus (30 sekund)</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handleInventoryChoice('demo')}
                  disabled={isSubmitting}
                  className="w-full flex items-center gap-4 p-4 bg-muted border-2 border-dashed border-muted rounded-xl hover:bg-accent transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-muted-foreground/20 flex items-center justify-center transition-all">
                    <Sparkles className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{t('onboarding.wizard.inventoryOptions.demo')}</p>
                    <p className="text-sm text-muted-foreground">Ukázková data, jedním klikem je smažete</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                </button>

                {isSubmitting && (
                  <div className="flex items-center justify-center gap-2 text-primary mt-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Vytvářím váš účet...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            {step < 3 && (
              <div className="flex justify-end pt-6 mt-6 border-t border-border">
                <Button
                  type="button"
                  onClick={handleNext}
                  size="lg"
                  className="gap-2 shadow-md hover:shadow-lg transition-shadow"
                >
                  {t('onboarding.wizard.buttons.continue')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer hint + skip link */}
        <div className="text-center mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            Všechna data můžete později upravit v nastavení.
          </p>
          <Link
            to="/provider/dashboard"
            className="text-xs text-muted-foreground hover:text-primary underline"
          >
            Přeskočit a nastavit později
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProviderSetup;
