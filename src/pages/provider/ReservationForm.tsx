import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { checkVariantAvailability, calculatePrice, calculateDays, validatePhone, validateEmail, formatPrice } from "@/lib/availability";
import { createReservationHold, ReservationError } from "@/services/reservations";
import { toast } from "sonner";
import { CalendarIcon, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { getErrorMessage } from '@/lib/error-utils';
import { CustomerPicker, CustomerOption } from '@/components/crm/CustomerPicker';
import { Separator } from '@/components/ui/separator';
import { logger } from '@/lib/logger';
import { useTranslation } from 'react-i18next';
import { cs, enUS } from 'date-fns/locale';
import { track, trackError } from '@/lib/telemetry';

interface Variant {
  id: string;
  name: string;
  price_override_cents: number | null;
  is_active: boolean | null;
}

interface Product {
  id: string;
  name: string;
  category: string;
  base_price_cents: number | null;
  image_url: string | null;
  product_variants: Variant[];
}

interface FormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_id: string;
  variant_id: string;
  quantity: number; // For now typically 1, but we could support bulk
  start_date: string;
  end_date: string;
  notes: string;
  deposit_paid: boolean;
}

interface FormErrors {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  product_id?: string;
  variant_id?: string;
  start_date?: string;
  end_date?: string;
}

interface AvailabilityState {
  checking: boolean;
  result: {
    isAvailable: boolean;
    message: string;
    available: number;
  } | null;
}

export interface FromRequestState {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  requested_start_date: string;
  requested_end_date: string;
  requested_gear_text: string | null;
  notes: string | null;
  status?: string;
}

const ReservationForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromRequestId = searchParams.get('fromRequest');
  const { provider } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language.startsWith('cs') ? cs : enUS;
  const fromRequestState = (location.state as { fromRequest?: FromRequestState })?.fromRequest;
  const [resolvedRequest, setResolvedRequest] = useState<FromRequestState | null>(null);
  const [requestResolveError, setRequestResolveError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    product_id: '',
    variant_id: '',
    quantity: 1,
    start_date: '',
    end_date: '',
    notes: '',
    deposit_paid: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [availability, setAvailability] = useState<AvailabilityState>({
    checking: false,
    result: null,
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  // Fetch Products & Variants
  useEffect(() => {
    const fetchProducts = async () => {
      if (!provider?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, category, base_price_cents, image_url,
            product_variants (
              id, name, price_override_cents, is_active
            )
          `)
          .eq('provider_id', provider.id)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        // Filter and organize
        const validProducts = (data || []).map((p: unknown) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(p as any),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          product_variants: ((p as any).product_variants || []).filter((v: Variant) => v.is_active !== false)
        })).filter((p: Product) => p.product_variants.length > 0);

        setProducts(validProducts);
      } catch (error) {
        logger.error('Error fetching products', error);
        toast.error(getErrorMessage(error) || 'Chyba při načítání produktů');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [provider?.id]);

  // Resolve request from URL (refresh-safe): state if matching, else fetch by id
  useEffect(() => {
    if (!fromRequestId || !provider?.id) {
      if (fromRequestId && !provider?.id) setResolvedRequest(null);
      return;
    }
    if (fromRequestState?.id === fromRequestId) {
      setRequestResolveError(null);
      setResolvedRequest(fromRequestState.status === 'pending' ? fromRequestState : null);
      if (fromRequestState.status !== 'pending') {
        setRequestResolveError(t('provider.requestLink.alreadyProcessed'));
      }
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('reservation_requests')
        .select('id, customer_name, customer_email, customer_phone, requested_start_date, requested_end_date, requested_gear_text, notes, status')
        .eq('id', fromRequestId)
        .eq('provider_id', provider.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setRequestResolveError(getErrorMessage(error) || 'Request not found');
        setResolvedRequest(null);
        return;
      }
      if (!data) {
        setRequestResolveError(t('provider.requestLink.alreadyProcessed'));
        setResolvedRequest(null);
        return;
      }
      const row = data as FromRequestState & { status?: string };
      if (row.status !== 'pending') {
        setRequestResolveError(t('provider.requestLink.alreadyProcessed'));
        setResolvedRequest(null);
        return;
      }
      setRequestResolveError(null);
      setResolvedRequest(row);
    })();
    return () => { cancelled = true; };
  }, [fromRequestId, provider?.id, fromRequestState, t]);

  const fromRequest = resolvedRequest ?? (fromRequestState?.id === fromRequestId ? fromRequestState : null);

  const didPrefillFromRequest = useRef(false);
  // Prefill from reservation request (Request Link flow) — once per request id
  useEffect(() => {
    if (!fromRequest?.id || didPrefillFromRequest.current) return;
    didPrefillFromRequest.current = true;
    const parts: string[] = [];
    if (fromRequest.requested_gear_text) parts.push(fromRequest.requested_gear_text);
    if (fromRequest.notes) parts.push(fromRequest.notes);
    const notes = parts.join('\n\n');
    setFormData(prev => ({
      ...prev,
      customer_name: fromRequest.customer_name ?? '',
      customer_email: fromRequest.customer_email ?? '',
      customer_phone: fromRequest.customer_phone ?? '',
      start_date: fromRequest.requested_start_date ?? '',
      end_date: fromRequest.requested_end_date ?? '',
      notes: notes || prev.notes,
    }));
  }, [fromRequest, fromRequestState]);

  // Check availability when Variant or Date changes
  useEffect(() => {
    const checkAvail = async () => {
      // Need variant and dates
      if (!formData.variant_id || !formData.start_date || !formData.end_date) {
        setAvailability({ checking: false, result: null });
        return;
      }

      const startLocal = new Date(formData.start_date);
      const endLocal = new Date(formData.end_date);

      // Avoid timezone shift by preserving wall time
      const normalizeToUtc = (d: Date) =>
        new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()));

      const start = normalizeToUtc(startLocal);
      const end = normalizeToUtc(endLocal);

      if (end <= start) {
        setAvailability({
          checking: false,
          result: { isAvailable: false, message: 'Konec musí být po začátku', available: 0 }
        });
        return;
      }

      setAvailability({ checking: true, result: null });

      try {
        const result = await checkVariantAvailability(
          formData.variant_id,
          start,
          end
        );

        setAvailability({
          checking: false,
          result: {
            isAvailable: result.isAvailable,
            message: result.message,
            available: result.available,
          },
        });
      } catch (error) {
        setAvailability({
          checking: false,
          result: {
            isAvailable: false,
            message: getErrorMessage(error) || 'Chyba při kontrole dostupnosti',
            available: 0,
          },
        });
      }
    };

    checkAvail();
  }, [formData.variant_id, formData.start_date, formData.end_date]);

  // Helper to get selected product/variant
  const selectedProduct = products.find(p => p.id === formData.product_id);
  const selectedVariant = selectedProduct?.product_variants.find(v => v.id === formData.variant_id);

  // Price Calculation
  const calculateTotalPrice = useCallback(() => {
    if (!selectedProduct || !selectedVariant || !formData.start_date || !formData.end_date) {
      return 0;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);

    if (end <= start) return 0;

    // Use variant override price if exists, else base product price
    const priceCents = selectedVariant.price_override_cents ?? selectedProduct.base_price_cents ?? 0;
    const pricePerDay = priceCents / 100;

    const basePrice = calculatePrice(pricePerDay, start, end);
    return basePrice * formData.quantity;
  }, [selectedProduct, selectedVariant, formData.start_date, formData.end_date, formData.quantity]);

  const totalPrice = calculateTotalPrice();
  const rentalDays = formData.start_date && formData.end_date && new Date(formData.end_date) > new Date(formData.start_date)
    ? calculateDays(new Date(formData.start_date), new Date(formData.end_date))
    : 0;

  const pricePerDay = selectedVariant
    ? (selectedVariant.price_override_cents ?? selectedProduct?.base_price_cents ?? 0) / 100
    : 0;

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.customer_name.trim()) newErrors.customer_name = t('provider.reservationForm.errors.nameRequired');
    if (formData.customer_email && !validateEmail(formData.customer_email)) {
      newErrors.customer_email = t('provider.reservationForm.errors.emailInvalid');
    }
    if (!validatePhone(formData.customer_phone)) {
      newErrors.customer_phone = t('provider.reservationForm.errors.phoneInvalid');
    }
    if (!formData.product_id) newErrors.product_id = t('provider.reservationForm.errors.productRequired');
    if (!formData.variant_id) newErrors.variant_id = t('provider.reservationForm.errors.variantRequired');

    if (!formData.start_date) {
      newErrors.start_date = t('provider.reservationForm.errors.startRequired');
    } else {
      const start = new Date(formData.start_date);
      const now = new Date();
      now.setMinutes(now.getMinutes() - 1);
      if (start < now) {
        newErrors.start_date = t('provider.reservationForm.errors.startPast');
      }
    }

    if (!formData.end_date) {
      newErrors.end_date = t('provider.reservationForm.errors.endRequired');
    } else if (formData.start_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end <= start) newErrors.end_date = t('provider.reservationForm.errors.endBeforeStart');
    }

    if (availability.result && !availability.result.isAvailable && formData.variant_id && formData.start_date && formData.end_date) {
      newErrors.variant_id = t('provider.reservationForm.errors.notAvailable');
    }



    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t('provider.reservationForm.toasts.fixErrors'));
      return;
    }

    if (!provider?.id) return;

    if (fromRequestId && requestResolveError) {
      toast.error(t('provider.requestLink.alreadyProcessed'));
      return;
    }
    if (fromRequestId && !fromRequest) {
      toast.error(t('provider.reservationForm.toasts.loadingRequest', 'Loading request…'));
      return;
    }

    setSubmitting(true);
    track('reservations.create_started', { variant_id: formData.variant_id }, 'ReservationForm');
    try {
      const startLocal = new Date(formData.start_date);
      const endLocal = new Date(formData.end_date);

      // Preserve wall time to avoid timezone date shift
      const normalizeToUtc = (d: Date) =>
        new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()));

      const start = normalizeToUtc(startLocal);
      const end = normalizeToUtc(endLocal);

      // Re-check availability

      const availCheck = await checkVariantAvailability(formData.variant_id, start, end);


      if (!availCheck.isAvailable) {
        toast.error(t('provider.reservationForm.toasts.notAvailable'));
        setSubmitting(false);
        return;
      }

      let reservationId: string;

      if (fromRequestId && fromRequest?.id) {
        // Atomic convert: one RPC creates reservation and marks request converted
        const { data: convId, error: convertError } = await supabase.rpc('convert_request_to_reservation', {
          p_request_id: fromRequest.id,
          p_variant_id: formData.variant_id,
          p_quantity: formData.quantity,
          p_start_date: start.toISOString(),
          p_end_date: end.toISOString(),
          p_total_price_cents: Math.round(totalPrice * 100),
          p_notes: formData.notes.trim() || undefined,
          p_idempotency_key: undefined,
        });
        if (convertError) throw convertError;
        reservationId = convId as string;
        track('reservations.created', { reservation_id: reservationId, via: 'convert_request' }, 'ReservationForm');
        toast.success(t('provider.reservationForm.toasts.created', { status: 'hold' }));
        navigate(`/provider/reservations/edit/${reservationId}`);
        return;
      }

      const reservationResult = await createReservationHold({
        providerId: provider.id,
        productVariantId: formData.variant_id,
        startDate: start,
        endDate: end,
        totalPrice,
        depositPaid: formData.deposit_paid,
        notes: formData.notes.trim() || null,
        customer: {
          name: formData.customer_name.trim(),
          email: formData.customer_email.trim() || null,
          phone: formData.customer_phone.trim(),
        },
        rentalDays,
        pricePerDay,
        customerUserId: null,
      });

      reservationId = reservationResult.reservation_id;
      track('reservations.created', { reservation_id: reservationId, status: reservationResult.status }, 'ReservationForm');
      toast.success(t('provider.reservationForm.toasts.created', { status: reservationResult.status }));
      navigate('/provider/reservations');

    } catch (error: unknown) {
      trackError('reservation_create', error);

      logger.error('Reservation creation failed', error);
      toast.error(getErrorMessage(error) || t('provider.reservationForm.toasts.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Group products by category
  const productsByCategory = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, Product[]>);

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{t('provider.reservationForm.title')}</h1>
          <p className="text-muted-foreground">{t('provider.reservationForm.subtitle')}</p>
        </div>

        {requestResolveError && (
          <div className="mb-4 p-4 rounded-lg border border-status-warning/30 bg-status-warning/10 text-status-warning flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{requestResolveError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader><CardTitle>{t('provider.reservationForm.sections.customerInfo')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              <div className="bg-muted p-4 rounded-lg border border-dashed mb-4">
                <Label className="mb-2 block">{t('provider.reservationForm.crmSelect')}</Label>
                <CustomerPicker
                  value={undefined} // We don't strictly bind ID yet, just pre-fill
                  onSelect={(c) => {
                    if (c) {
                      setFormData(prev => ({
                        ...prev,
                        customer_name: c.full_name,
                        customer_email: c.email || '',
                        customer_phone: c.phone || '',
                      }));
                      // Clear errors
                      setErrors(prev => ({ ...prev, customer_name: undefined, customer_phone: undefined }));
                      toast.success(t('provider.reservationForm.toasts.customerLoaded'));
                    }
                  }}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t('provider.reservationForm.manualEntry')}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="customer_name">{t('provider.reservationForm.labels.name')} *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={e => handleInputChange('customer_name', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, customer_name: true }))}
                  className={errors.customer_name && touched.customer_name ? 'border-status-danger' : ''}
                  placeholder={t('provider.reservationForm.placeholders.name')}
                />
                {errors.customer_name && touched.customer_name && <p className="text-sm text-status-danger mt-1">{errors.customer_name}</p>}
              </div>
              <div>
                <Label htmlFor="customer_phone">{t('provider.reservationForm.labels.phone')} *</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={e => handleInputChange('customer_phone', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, customer_phone: true }))}
                  className={errors.customer_phone && touched.customer_phone ? 'border-status-danger' : ''}
                  placeholder={i18n.language.startsWith('cs') ? '+420 123 456 789' : '+1 415 555 1234'}
                />
                {errors.customer_phone && touched.customer_phone && <p className="text-sm text-status-danger mt-1">{errors.customer_phone}</p>}
              </div>
              <div>
                <Label htmlFor="customer_email">{t('provider.reservationForm.labels.email')}</Label>
                <Input
                  id="customer_email" type="email"
                  value={formData.customer_email}
                  onChange={e => handleInputChange('customer_email', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, customer_email: true }))}
                  className={errors.customer_email && touched.customer_email ? 'border-status-danger' : ''}
                  placeholder={t('provider.reservationForm.placeholders.email')}
                />
                {errors.customer_email && touched.customer_email && <p className="text-sm text-status-danger mt-1">{errors.customer_email}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card>
            <CardHeader><CardTitle>{t('provider.reservationForm.sections.itemSelection')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('provider.reservationForm.labels.product')} *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={v => {
                    handleInputChange('product_id', v);
                    handleInputChange('variant_id', ''); // Reset variant
                  }}
                >
                  <SelectTrigger
                    className={errors.product_id && touched.product_id ? 'border-status-danger' : ''}
                    data-testid="reservation-product-select"
                  >
                    <SelectValue placeholder={t('provider.reservationForm.placeholders.product')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(productsByCategory).map(([cat, prods]) => (
                      <SelectGroup key={cat}>
                        <SelectLabel>{cat}</SelectLabel>
                        {prods.map(p => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            data-testid={`reservation-product-option-${p.id}`}
                          >
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div>
                  <Label>{t('provider.reservationForm.labels.variant')} *</Label>
                  <Select
                    value={formData.variant_id}
                    onValueChange={v => handleInputChange('variant_id', v)}
                  >
                    <SelectTrigger
                      className={errors.variant_id && touched.variant_id ? 'border-status-danger' : ''}
                      data-testid="reservation-variant-select"
                    >
                      <SelectValue placeholder={t('provider.reservationForm.placeholders.variant')} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProduct.product_variants.map(v => (
                        <SelectItem
                          key={v.id}
                          value={v.id}
                          data-testid={`reservation-variant-option-${v.id}`}
                        >
                          {v.name}
                          {v.price_override_cents
                            ? ` (${formatPrice(v.price_override_cents / 100)}/den)`
                            : ` (${formatPrice((selectedProduct.base_price_cents || 0) / 100)}/den)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.variant_id && <p className="text-sm text-status-danger mt-1">{errors.variant_id}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('provider.reservationForm.labels.start')} *</Label>
                  <div className="relative">
                    <Input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={e => handleInputChange('start_date', e.target.value)}
                      data-testid="reservation-start"
                      onBlur={() => setTouched(prev => ({ ...prev, start_date: true }))}
                      className={errors.start_date && touched.start_date ? 'border-status-danger' : ''}
                    />
                  </div>
                  {errors.start_date && touched.start_date && <p className="text-sm text-status-danger mt-1">{errors.start_date}</p>}
                </div>
                <div>
                  <Label>{t('provider.reservationForm.labels.end')} *</Label>
                  <div className="relative">
                    <Input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={e => handleInputChange('end_date', e.target.value)}
                      data-testid="reservation-end"
                      onBlur={() => setTouched(prev => ({ ...prev, end_date: true }))}
                      className={errors.end_date && touched.end_date ? 'border-status-danger' : ''}
                    />
                  </div>
                  {errors.end_date && touched.end_date && <p className="text-sm text-status-danger mt-1">{errors.end_date}</p>}
                </div>
              </div>

              {/* Availability Status */}
              {formData.variant_id && formData.start_date && formData.end_date && (
                <div className={`p-4 border rounded-lg flex items-center gap-2 ${availability.checking ? 'text-muted-foreground' :
                  availability.result?.isAvailable ? 'text-status-success bg-status-success/10 border border-status-success/20' : 'text-status-danger bg-status-danger/10 border border-status-danger/20'
                  }`}>
                  {availability.checking ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('provider.reservationForm.availability.checking')}</>
                  ) : availability.result ? (
                    <>
                      {availability.result.isAvailable ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      <span className="font-medium">{availability.result.message}</span>
                    </>
                  ) : null}
                </div>
              )}

              {/* Price Summary */}
              {selectedVariant && rentalDays > 0 && (
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('provider.reservationForm.pricing.rate')}</span>
                    <span className="font-medium">{formatPrice(pricePerDay)} / {t('provider.reservationForm.pricing.perDay')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('provider.reservationForm.pricing.duration')}</span>
                    <span className="font-medium">{rentalDays} {t('provider.reservationForm.pricing.days')}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>{t('provider.reservationForm.pricing.total')}</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes">{t('provider.reservationForm.labels.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={e => handleInputChange('notes', e.target.value)}
                  maxLength={1000}
                />
                {formData.notes.length > 800 && (
                  <p className={`text-sm mt-1 ${formData.notes.length > 950 ? 'text-status-warning font-medium' : 'text-muted-foreground'
                    }`}>
                    {formData.notes.length}/1000 {t('provider.reservationForm.notes.chars')}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deposit_paid"
                  checked={formData.deposit_paid}
                  onCheckedChange={c => handleInputChange('deposit_paid', c)}
                />
                <Label htmlFor="deposit_paid">{t('provider.reservationForm.labels.depositPaid')}</Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 sticky bottom-4 bg-background py-2">
            <Button type="button" variant="outline" onClick={() => navigate('/provider/reservations')}>
              {t('provider.reservationForm.buttons.cancel')}
            </Button>
            <Button
              type="submit"
              data-testid="reservation-submit"
              disabled={submitting || (availability.result !== null && !availability.result.isAvailable)}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('provider.reservationForm.buttons.create')}
            </Button>
          </div>
        </form>
      </div>
    </ProviderLayout>
  );
};

export default ReservationForm;
