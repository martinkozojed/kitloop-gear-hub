import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Loader2, ShieldCheck } from "lucide-react";
import { getErrorMessage } from '@/lib/error-utils';
import { logger } from '@/lib/logger';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

const ProviderSettings = () => {
  const { provider, profile, isAdmin } = useAuth();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    rental_name: '',
    company_id: '',
    address: '',
    location: '',
    country: 'CZ',
    phone: '',
    website: '',
    email: '',
    currency: 'CZK',
    time_zone: 'Europe/Prague',
    tax_id: '',
    terms_text: '',
  });
  const [initialData, setInitialData] = useState(formData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const requiredFields = useMemo(() => ([
    { key: 'rental_name', label: t('provider.settings.fields.rentalName') },
    { key: 'company_id', label: t('provider.settings.fields.companyId') },
    { key: 'address', label: t('provider.settings.fields.address') },
    { key: 'location', label: t('provider.settings.fields.city') },
    { key: 'phone', label: t('provider.settings.fields.phone') },
    { key: 'email', label: t('provider.settings.fields.email') },
    { key: 'currency', label: t('provider.settings.fields.currency') },
    { key: 'time_zone', label: t('provider.settings.fields.timezone') },
  ]), [t]);

  useEffect(() => {
    if (provider) {
      hydrateFromProvider(provider);
    }
  }, [provider]);

  const hydrateFromProvider = useCallback((p: typeof provider) => {
    setFormData({
      rental_name: p?.rental_name || '',
      company_id: p?.company_id || '',
      address: p?.address || '',
      location: p?.location || '',
      country: p?.country || 'CZ',
      phone: p?.phone || '',
      website: p?.website || '',
      email: p?.email || '',
      currency: p?.currency || 'CZK',
      time_zone: p?.time_zone || 'Europe/Prague',
      tax_id: p?.tax_id || '',
      terms_text: p?.terms_text || '',
    });
    setInitialData({
      rental_name: p?.rental_name || '',
      company_id: p?.company_id || '',
      address: p?.address || '',
      location: p?.location || '',
      country: p?.country || 'CZ',
      phone: p?.phone || '',
      website: p?.website || '',
      email: p?.email || '',
      currency: p?.currency || 'CZK',
      time_zone: p?.time_zone || 'Europe/Prague',
      tax_id: p?.tax_id || '',
      terms_text: p?.terms_text || '',
    });
  }, []);

  const handleSave = async () => {
    if (!provider?.id) {
      toast.error(t('provider.settings.toasts.notFound'));
      return;
    }

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      toast.error(t('provider.settings.toasts.missingFields'));
      return;
    }

    setIsSubmitting(true);

    try {
      logger.debug('Saving provider settings');

      const { data, error } = await supabase
        .from('providers')
        .update(formData)
        .eq('id', provider.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating provider', error);
        throw error;
      }

      logger.debug('Provider updated successfully');
      toast.success(t('provider.settings.toasts.saved'));
      setInitialData(formData);
    } catch (error) {
      logger.error('Save failed', error);
      toast.error(getErrorMessage(error) || t('provider.settings.toasts.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const completion = useMemo(() => {
    const total = requiredFields.length;
    const completed = requiredFields.filter((f) => {
      const val = formData[f.key as keyof typeof formData];
      return typeof val === 'string' && val.trim().length > 0;
    }).length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100),
      missing: requiredFields.filter((f) => {
        const val = formData[f.key as keyof typeof formData];
        return !val || !val.toString().trim().length;
      }),
    };
  }, [formData, requiredFields]);

  const handleReset = () => {
    if (provider) {
      hydrateFromProvider(provider);
      setErrors({});
    }
  };

  const countryOptions = [
    { value: 'CZ', label: t('provider.settings.options.country.cz') },
    { value: 'SK', label: t('provider.settings.options.country.sk') },
    { value: 'AT', label: t('provider.settings.options.country.at') },
    { value: 'PL', label: t('provider.settings.options.country.pl') },
  ];

  const timeZoneOptions = [
    'Europe/Prague',
    'Europe/Bratislava',
    'Europe/Vienna',
    'Europe/Berlin',
  ];

  const canEdit = isAdmin || ['provider', 'operator', 'manager'].includes(profile?.role ?? '');

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialData),
    [formData, initialData]
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    if (isDirty) {
      window.addEventListener('beforeunload', handler);
    }
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const normalizePhone = (value: string) => {
    if (!value) return '';
    const cleaned = value.replace(/[\s-]/g, '');
    if (!cleaned.startsWith('+')) return cleaned;
    return cleaned;
  };

  const validatePhone = (value: string) => {
    const normalized = normalizePhone(value);
    if (!normalized.startsWith('+')) return false;
    const digits = normalized.replace(/[^\d]/g, '');
    const length = digits.length;
    return length >= 8 && length <= 15;
  };

  const normalizeWebsite = (value: string) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const isValidUrl = (value: string) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.hostname.includes('.');
    } catch {
      return false;
    }
  };

  const validateForm = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    const trimmed = (v: string) => v?.trim() || '';

    requiredFields.forEach((field) => {
      const val = trimmed(formData[field.key as keyof typeof formData] as string);
      if (!val) {
        nextErrors[field.key] = t('provider.settings.errors.required');
      }
    });

    if (formData.phone && !validatePhone(formData.phone)) {
      nextErrors.phone = t('provider.settings.errors.phone');
    }

    if (formData.email) {
      const email = trimmed(formData.email).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        nextErrors.email = t('provider.settings.errors.email');
      }
    }

    if (formData.website) {
      const normalized = normalizeWebsite(formData.website);
      if (!isValidUrl(normalized)) {
        nextErrors.website = t('provider.settings.errors.website');
      }
    }

    if (formData.terms_text && formData.terms_text.length > 1000) {
      nextErrors.terms_text = t('provider.settings.errors.termsLength');
    }

    setErrors(nextErrors);
    return nextErrors;
  }, [formData, requiredFields, t]);

  return (
    <ProviderLayout>
      <div className="max-w-5xl space-y-6 pb-24">
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 flex flex-col gap-3 shadow-[0_12px_40px_-28px_rgba(16,185,129,0.6)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-emerald-700 font-semibold">
                {t('provider.settings.badge')}
              </p>
              <h1 className="text-3xl font-heading font-bold text-emerald-950">{t('provider.settings.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('provider.settings.subtitle')}
              </p>
            </div>
            <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 flex items-center gap-1 h-fit">
              <ShieldCheck className="h-4 w-4" />
              {t('provider.settings.status.secured')}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white">
            <TabsTrigger value="profile">{t('provider.settings.tabs.profile')}</TabsTrigger>
            <TabsTrigger value="team" disabled>{t('provider.settings.tabs.team')}</TabsTrigger>
            <TabsTrigger value="notifications" disabled>{t('provider.settings.tabs.notifications')}</TabsTrigger>
            <TabsTrigger value="billing" disabled>{t('provider.settings.tabs.billing')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {!canEdit && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('provider.settings.readonly.title')}</CardTitle>
                  <CardDescription>{t('provider.settings.readonly.desc')}</CardDescription>
                </CardHeader>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{t('provider.settings.sections.identity.title')}</CardTitle>
                <CardDescription>{t('provider.settings.sections.identity.desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="rental_name">{t('provider.settings.fields.rentalName')} *</Label>
                    <Input
                      id="rental_name"
                      value={formData.rental_name}
                      onChange={(e) => updateField('rental_name', e.target.value)}
                      placeholder={t('provider.settings.placeholders.rentalName')}
                      disabled={!canEdit}
                    />
                    {errors.rental_name && <p className="text-xs text-red-600">{errors.rental_name}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="company_id">{t('provider.settings.fields.companyId')} *</Label>
                    <Input
                      id="company_id"
                      value={formData.company_id}
                      onChange={(e) => updateField('company_id', e.target.value)}
                      maxLength={16}
                      placeholder="12345678"
                      disabled={!canEdit}
                    />
                    {errors.company_id && <p className="text-xs text-red-600">{errors.company_id}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tax_id">{t('provider.settings.fields.taxId')}</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => updateField('tax_id', e.target.value)}
                      placeholder="CZ12345678"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="country">{t('provider.settings.fields.country')} *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => updateField('country', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('provider.settings.placeholders.country')} />
                      </SelectTrigger>
                      <SelectContent>
                        {countryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.country && <p className="text-xs text-red-600">{errors.country}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="address">{t('provider.settings.fields.address')} *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      placeholder={t('provider.settings.placeholders.address')}
                      disabled={!canEdit}
                    />
                    {errors.address && <p className="text-xs text-red-600">{errors.address}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="location">{t('provider.settings.fields.city')} *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      placeholder={t('provider.settings.placeholders.city')}
                      disabled={!canEdit}
                    />
                    {errors.location && <p className="text-xs text-red-600">{errors.location}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{t('provider.settings.sections.contact.title')}</CardTitle>
                <CardDescription>{t('provider.settings.sections.contact.desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="phone">{t('provider.settings.fields.phone')} *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      onBlur={(e) => updateField('phone', normalizePhone(e.target.value))}
                      placeholder={t('provider.settings.placeholders.phone')}
                      disabled={!canEdit}
                    />
                    {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">{t('provider.settings.fields.email')}</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      onBlur={(e) => updateField('email', e.target.value.trim().toLowerCase())}
                      placeholder={t('provider.settings.fields.email')}
                      disabled={!canEdit}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('provider.settings.microcopy.contactEmail')}
                    </p>
                    {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="website">{t('provider.settings.fields.website')}</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    onBlur={(e) => updateField('website', normalizeWebsite(e.target.value))}
                    placeholder="https://kitloop.cz"
                    disabled={!canEdit}
                  />
                  {errors.website && <p className="text-xs text-red-600">{errors.website}</p>}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>{t('provider.settings.sections.preferences.title')}</CardTitle>
                  <CardDescription>{t('provider.settings.sections.preferences.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="currency">{t('provider.settings.fields.currency')}</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => updateField('currency', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('provider.settings.placeholders.currency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CZK">CZK</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.currency && <p className="text-xs text-red-600">{errors.currency}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="time_zone">{t('provider.settings.fields.timezone')}</Label>
                    <Select
                      value={formData.time_zone}
                      onValueChange={(value) => updateField('time_zone', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('provider.settings.placeholders.timezone')} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeZoneOptions.map((zone) => (
                          <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.time_zone && <p className="text-xs text-red-600">{errors.time_zone}</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>{t('provider.settings.sections.legal.title')}</CardTitle>
                  <CardDescription>{t('provider.settings.sections.legal.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Label htmlFor="terms_text" className="text-sm text-foreground">{t('provider.settings.fields.terms')}</Label>
                    <span>{(formData.terms_text || '').length}/1000</span>
                  </div>
                  <Textarea
                    id="terms_text"
                    className="min-h-[140px]"
                    value={formData.terms_text}
                    onChange={(e) => updateField('terms_text', e.target.value)}
                    placeholder={t('provider.settings.placeholders.terms')}
                    disabled={!canEdit}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('provider.settings.hints.terms')}
                  </p>
                  {errors.terms_text && <p className="text-xs text-red-600">{errors.terms_text}</p>}
                  <div className="rounded-md border bg-muted/50 p-3 space-y-2">
                    <p className="text-xs font-semibold">{t('provider.settings.preview.title')}</p>
                    <div className="h-px bg-border" />
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{formData.terms_text || t('provider.settings.preview.empty')}</pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>{t('provider.settings.tabs.team')}</CardTitle>
                <CardDescription>
                  {t('provider.settings.soon')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('provider.settings.soonDetail')}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {canEdit && isDirty && (
          <div className="fixed bottom-4 left-1/2 z-20 w-full max-w-4xl -translate-x-1/2">
            <Card className="border-emerald-200 shadow-lg">
              <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 py-3 px-4">
                <div>
                  <p className="text-sm font-medium text-emerald-900">{t('provider.settings.cta.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('provider.settings.cta.desc')}</p>
                  {Object.keys(errors).length > 0 && (
                    <p className="text-xs text-red-600 mt-1">{t('provider.settings.toasts.missingFields')}</p>
                  )}
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Button variant="outline" className="w-full md:w-auto" onClick={handleReset} disabled={isSubmitting}>
                    {t('provider.settings.actions.cancel')}
                  </Button>
                  <Button
                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSave}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('provider.settings.actions.saving')}
                      </>
                    ) : (
                      t('provider.settings.actions.save')
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
};

export default ProviderSettings;
