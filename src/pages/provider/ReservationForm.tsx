import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { checkAvailability, calculatePrice, calculateDays, validatePhone, formatPrice } from "@/lib/availability";
import { createReservationHold, ReservationError } from "@/services/reservations";
import { toast } from "sonner";
import { CalendarIcon, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { getErrorMessage } from '@/lib/error-utils';

interface GearItem {
  id: string;
  name: string;
  category: string | null;
  price_per_day: number | null;
  quantity_available: number | null;
  active: boolean | null;
}

interface FormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  gear_id: string;
  quantity: number;
  start_date: string;
  end_date: string;
  notes: string;
  deposit_paid: boolean;
}

interface FormErrors {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  gear_id?: string;
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

const ReservationForm = () => {
  const navigate = useNavigate();
  const { provider } = useAuth();

  const [gearItems, setGearItems] = useState<GearItem[]>([]);
  const [selectedGear, setSelectedGear] = useState<GearItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '+420 ',
    gear_id: '',
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

  // Fetch gear items
  useEffect(() => {
    const fetchGearItems = async () => {
      if (!provider?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('gear_items')
          .select('id, name, category, price_per_day, quantity_available, active')
          .eq('provider_id', provider.id)
          .order('name');

        if (error) throw error;

        // Filter to only active items with availability > 0
        const activeItems = (data || []).filter(
          item => item.active && (item.quantity_available || 0) > 0
        );

        setGearItems(activeItems);
      } catch (error) {
        console.error('Error fetching gear items:', error);
        toast.error(getErrorMessage(error) || 'Chyba při načítání vybavení');
      } finally {
        setLoading(false);
      }
    };

    fetchGearItems();
  }, [provider?.id]);

  // Check availability when dates or gear change
  useEffect(() => {
    const checkAvail = async () => {
      if (!formData.gear_id || !formData.start_date || !formData.end_date) {
        setAvailability({ checking: false, result: null });
        return;
      }

      // Validate dates first
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);

      if (end <= start) {
        setAvailability({
          checking: false,
          result: { isAvailable: false, message: 'Konec musí být po začátku', available: 0 }
        });
        return;
      }

      setAvailability({ checking: true, result: null });

      try {
        const result = await checkAvailability(
          formData.gear_id,
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
  }, [formData.gear_id, formData.start_date, formData.end_date]);

  // Update selected gear when gear_id changes
  useEffect(() => {
    if (formData.gear_id) {
      const gear = gearItems.find(item => item.id === formData.gear_id);
      setSelectedGear(gear || null);
    } else {
      setSelectedGear(null);
    }
  }, [formData.gear_id, gearItems]);

  // Calculate price
  const calculateTotalPrice = useCallback(() => {
    if (!selectedGear?.price_per_day || !formData.start_date || !formData.end_date) {
      return 0;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);

    if (end <= start) return 0;

    const basePrice = calculatePrice(selectedGear.price_per_day, start, end);
    return basePrice * formData.quantity;
  }, [selectedGear, formData.start_date, formData.end_date, formData.quantity]);

  const totalPrice = calculateTotalPrice();
  const rentalDays = formData.start_date && formData.end_date && new Date(formData.end_date) > new Date(formData.start_date)
    ? calculateDays(new Date(formData.start_date), new Date(formData.end_date))
    : 0;

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Customer name
    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Jméno zákazníka je povinné';
    }

    // Email (optional but validate if provided)
    if (formData.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
      newErrors.customer_email = 'Neplatná e-mailová adresa';
    }

    // Phone
    if (!validatePhone(formData.customer_phone)) {
      newErrors.customer_phone = 'Neplatné telefonní číslo (formát: +420 XXX XXX XXX)';
    }

    // Gear selection
    if (!formData.gear_id) {
      newErrors.gear_id = 'Vyberte vybavení';
    }

    // Start date
    if (!formData.start_date) {
      newErrors.start_date = 'Vyberte datum začátku';
    } else {
      const start = new Date(formData.start_date);
      const now = new Date();
      now.setMinutes(now.getMinutes() - 1);
      if (start < now) {
        newErrors.start_date = 'Nelze rezervovat v minulosti';
      }
    }

    // End date
    if (!formData.end_date) {
      newErrors.end_date = 'Vyberte datum konce';
    } else if (formData.start_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end <= start) {
        newErrors.end_date = 'Konec musí být po začátku';
      }
    }

    // Availability
    if (!availability.result?.isAvailable && formData.gear_id && formData.start_date && formData.end_date) {
      newErrors.gear_id = 'Vybavení není dostupné v tomto termínu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Opravte chyby ve formuláři');
      return;
    }

    if (!provider?.id) {
      toast.error('Chyba: Poskytovatel nebyl nalezen');
      return;
    }

    setSubmitting(true);

    try {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);

      // Double-check availability before submitting
      const availCheck = await checkAvailability(formData.gear_id, start, end);
      if (!availCheck.isAvailable) {
        toast.error('Vybavení již není dostupné v tomto termínu');
        setSubmitting(false);
        return;
      }

      const reservationResult = await createReservationHold({
        providerId: provider.id,
        gearId: formData.gear_id,
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
        pricePerDay: selectedGear?.price_per_day ?? 0,
        customerUserId: null,
      });

      const expiresAt = reservationResult.expires_at
        ? new Date(reservationResult.expires_at)
        : null;
      const holdMessage = expiresAt
        ? `Rezervace je podržena do ${expiresAt.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}.`
        : 'Rezervace byla podržena.';

      toast.success(`${holdMessage} Dokončete potvrzení v detailu rezervace.`);
      navigate('/provider/reservations');
    } catch (error) {
      console.error('Error creating reservation:', error);

      if (error instanceof ReservationError) {
        switch (error.code) {
          case 'conflict':
            toast.error('Termín je právě obsazený jinou rezervací.');
            break;
          case 'idempotent':
            toast.success('Rezervace již existuje a byla znovu načtena.');
            navigate('/provider/reservations');
            break;
          case 'rls_denied':
            toast.error('Nemáte oprávnění dokončit rezervaci. Zkontrolujte své členství v týmu.');
            break;
          case 'edge_failed':
            toast.error(error.message || 'Edge funkce pro vytvoření rezervace se nezdařila.');
            break;
          default:
            toast.error(error.message || 'Rezervaci se nepodařilo vytvořit.');
        }
      } else {
        toast.error(getErrorMessage(error) || 'Chyba při vytváření rezervace');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Group gear by category
  const gearByCategory = gearItems.reduce((acc, item) => {
    const category = item.category || 'Ostatní';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, GearItem[]>);

  if (loading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </ProviderLayout>
    );
  }

  if (gearItems.length === 0) {
    return (
      <ProviderLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Žádné dostupné vybavení</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Před vytvořením rezervace musíte přidat alespoň jednu aktivní položku vybavení s dostupností {'>'} 0.
              </p>
              <Button onClick={() => navigate('/provider/inventory/new')}>
                Přidat vybavení
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Nová rezervace</h1>
          <p className="text-muted-foreground">
            Vytvořte manuální rezervaci pro zákazníka
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informace o zákazníkovi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer_name">
                  Jméno zákazníka <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  placeholder="Jan Novák"
                  className={errors.customer_name ? 'border-red-500' : ''}
                />
                {errors.customer_name && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.customer_name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="customer_phone">
                  Telefon <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_phone"
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  placeholder="+420 123 456 789"
                  className={errors.customer_phone ? 'border-red-500' : ''}
                />
                {errors.customer_phone && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.customer_phone}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="customer_email">E-mail (volitelné)</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  placeholder="jan.novak@example.com"
                  className={errors.customer_email ? 'border-red-500' : ''}
                />
                {errors.customer_email && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.customer_email}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rental Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detaily půjčení</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gear_id">
                  Vybavení <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.gear_id}
                  onValueChange={(value) => handleInputChange('gear_id', value)}
                >
                  <SelectTrigger className={errors.gear_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Vyberte vybavení" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(gearByCategory).map(([category, items]) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                          {category}
                        </SelectLabel>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({formatPrice(item.price_per_day || 0)}/den)
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {errors.gear_id && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.gear_id}
                  </p>
                )}
              </div>

              {/* Quantity Selector */}
              {selectedGear && (
                <div>
                  <Label htmlFor="quantity">
                    Množství <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-4">
                    <Select
                      value={formData.quantity.toString()}
                      onValueChange={(value) => handleInputChange('quantity', parseInt(value, 10))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(Math.min(selectedGear.quantity_available || 1, 10))].map((_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      Dostupné: {availability.result?.available ?? selectedGear.quantity_available ?? 0} ks
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">
                    Začátek <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      className={errors.start_date ? 'border-red-500' : ''}
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.start_date && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.start_date}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="end_date">
                    Konec <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      className={errors.end_date ? 'border-red-500' : ''}
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.end_date && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.end_date}
                    </p>
                  )}
                </div>
              </div>

              {/* Availability Indicator */}
              {formData.gear_id && formData.start_date && formData.end_date && (
                <div className="p-4 border rounded-lg">
                  {availability.checking ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Kontrola dostupnosti...</span>
                    </div>
                  ) : availability.result ? (
                    <div className={`flex items-center gap-2 ${
                      availability.result.isAvailable ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {availability.result.isAvailable ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                      <span className="font-medium">{availability.result.message}</span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Price Calculation */}
              {selectedGear && rentalDays > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cena za den:</span>
                    <span className="font-medium">{formatPrice(selectedGear.price_per_day || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Počet dní:</span>
                    <span className="font-medium">× {rentalDays}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Množství:</span>
                    <span className="font-medium">× {formData.quantity}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Celková cena:</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(selectedGear.price_per_day || 0)} × {rentalDays} {rentalDays === 1 ? 'den' : rentalDays < 5 ? 'dny' : 'dní'} × {formData.quantity} ks
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Poznámky (volitelné)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Speciální požadavky, poznámky..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deposit_paid"
                  checked={formData.deposit_paid}
                  onCheckedChange={(checked) => handleInputChange('deposit_paid', checked as boolean)}
                />
                <Label
                  htmlFor="deposit_paid"
                  className="text-sm font-normal cursor-pointer"
                >
                  Záloha zaplacena
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/provider/reservations')}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              disabled={submitting || !availability.result?.isAvailable}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vytváření...
                </>
              ) : (
                'Vytvořit rezervaci'
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProviderLayout>
  );
};

export default ReservationForm;
