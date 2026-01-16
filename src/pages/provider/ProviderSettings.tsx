import React, { useState, useEffect, useMemo } from 'react';
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
import { Loader2, Upload, Building2, MapPin, Phone, Globe, ShieldCheck, CheckCircle2 } from "lucide-react";
import { getErrorMessage } from '@/lib/error-utils';
import { logger } from '@/lib/logger';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

const ProviderSettings = () => {
  const { provider } = useAuth();
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
  const requiredFields = useMemo(() => ([
    { key: 'rental_name', label: t('provider.settings.fields.rentalName') },
    { key: 'company_id', label: t('provider.settings.fields.companyId') },
    { key: 'address', label: t('provider.settings.fields.address') },
    { key: 'location', label: t('provider.settings.fields.city') },
    { key: 'phone', label: t('provider.settings.fields.phone') },
  ]), [t]);

  useEffect(() => {
    if (provider) {
      setFormData({
        rental_name: provider.rental_name || '',
        company_id: provider.company_id || '',
        address: provider.address || '',
        location: provider.location || '',
        country: provider.country || 'CZ',
        phone: provider.phone || '',
        website: provider.website || '',
        email: provider.email || '',
        currency: provider.currency || 'CZK',
        time_zone: provider.time_zone || 'Europe/Prague',
        tax_id: provider.tax_id || '',
        terms_text: provider.terms_text || '',
      });
    }
  }, [provider]);

  const handleSave = async () => {
    if (!provider?.id) {
      toast.error(t('provider.settings.toasts.notFound'));
      return;
    }

    const missing = requiredFields
      .filter((field) => !formData[field.key as keyof typeof formData])
      .map((field) => field.label);

    if (missing.length) {
      toast.error(t('provider.settings.toasts.missingFields'), {
        description: missing.join(', '),
      });
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

  return (
    <ProviderLayout>
      <div className="max-w-5xl space-y-6">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-white p-6 flex flex-col gap-4 shadow-[0_18px_60px_-40px_rgba(16,185,129,0.6)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-emerald-700 font-semibold">
                {t('provider.settings.badge')}
              </p>
              <h1 className="text-3xl font-heading font-bold text-emerald-950">{t('provider.settings.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('provider.settings.subtitle')}
              </p>
            </div>
            <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              {t('provider.settings.status.secured')}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-white text-emerald-800 border-emerald-200">
              <Building2 className="h-4 w-4 mr-1" /> {t('provider.settings.pills.identity')}
            </Badge>
            <Badge variant="secondary" className="bg-white text-emerald-800 border-emerald-200">
              <MapPin className="h-4 w-4 mr-1" /> {t('provider.settings.pills.location')}
            </Badge>
            <Badge variant="secondary" className="bg-white text-emerald-800 border-emerald-200">
              <Globe className="h-4 w-4 mr-1" /> {t('provider.settings.pills.regional')}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle>{t('provider.settings.sections.identity.title')}</CardTitle>
                  <CardDescription>{t('provider.settings.sections.identity.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rental_name">{t('provider.settings.fields.rentalName')} *</Label>
                      <Input
                        id="rental_name"
                        value={formData.rental_name}
                        onChange={(e) => updateField('rental_name', e.target.value)}
                        placeholder={t('provider.settings.placeholders.rentalName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_id">{t('provider.settings.fields.companyId')} *</Label>
                      <Input
                        id="company_id"
                        value={formData.company_id}
                        onChange={(e) => updateField('company_id', e.target.value)}
                        maxLength={16}
                        placeholder="12345678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_id">{t('provider.settings.fields.taxId')}</Label>
                      <Input
                        id="tax_id"
                        value={formData.tax_id}
                        onChange={(e) => updateField('tax_id', e.target.value)}
                        placeholder="CZ12345678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">{t('provider.settings.fields.country')} *</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) => updateField('country', value)}
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">{t('provider.settings.fields.address')} *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        placeholder={t('provider.settings.placeholders.address')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">{t('provider.settings.fields.city')} *</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => updateField('location', e.target.value)}
                        placeholder={t('provider.settings.placeholders.city')}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle>{t('provider.settings.sections.profileCard.title')}</CardTitle>
                  <CardDescription>{t('provider.settings.sections.profileCard.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-700">
                      {formData.rental_name?.substring(0, 2).toUpperCase() || 'KL'}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-emerald-900">{formData.rental_name || t('provider.settings.sections.profileCard.placeholder')}</p>
                      <p className="text-xs text-muted-foreground">{t('provider.settings.sections.profileCard.hint')}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled className="w-full justify-center">
                    <Upload className="w-4 h-4 mr-2" />
                    {t('provider.settings.actions.uploadSoon')}
                  </Button>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('provider.settings.sections.profileCard.notice')}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{t('provider.settings.sections.contact.title')}</CardTitle>
                <CardDescription>{t('provider.settings.sections.contact.desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('provider.settings.fields.phone')} *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder={t('provider.settings.placeholders.phone')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('provider.settings.fields.email')}</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('provider.settings.hints.email')}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">{t('provider.settings.fields.website')}</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://kitloop.cz"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>{t('provider.settings.sections.preferences.title')}</CardTitle>
                  <CardDescription>{t('provider.settings.sections.preferences.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">{t('provider.settings.fields.currency')}</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => updateField('currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('provider.settings.placeholders.currency')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CZK">CZK</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time_zone">{t('provider.settings.fields.timezone')}</Label>
                      <Select
                        value={formData.time_zone}
                        onValueChange={(value) => updateField('time_zone', value)}
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>{t('provider.settings.sections.legal.title')}</CardTitle>
                  <CardDescription>{t('provider.settings.sections.legal.desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label htmlFor="terms_text">{t('provider.settings.fields.terms')}</Label>
                  <Textarea
                    id="terms_text"
                    className="min-h-[140px]"
                    value={formData.terms_text}
                    onChange={(e) => updateField('terms_text', e.target.value)}
                    placeholder={t('provider.settings.placeholders.terms')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('provider.settings.hints.terms')}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="sticky bottom-4 z-10">
              <Card className="border-emerald-200 shadow-[0_14px_40px_-30px_rgba(16,185,129,0.8)]">
                <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-medium text-emerald-900">{t('provider.settings.cta.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('provider.settings.cta.desc')}</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="w-full md:w-auto" disabled={isSubmitting}>
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
      </div>
    </ProviderLayout>
  );
};

export default ProviderSettings;
