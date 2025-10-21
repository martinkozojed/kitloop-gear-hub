import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { getErrorMessage } from '@/lib/error-utils';

interface ProviderSetupForm {
  rental_name: string;
  contact_name: string;
  email: string;
  phone: string;
  company_id: string;
  address: string;
  location: string;
  country: string;
  category: string;
  time_zone: string;
  currency: string;
  website: string;
  seasonal_mode: boolean;
  categories: string[];
}

const ProviderSetup = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProviderSetupForm>({
    rental_name: '',
    contact_name: '',
    email: user?.email || '',
    phone: '',
    company_id: '',
    address: '',
    location: '',
    country: 'CZ',
    category: 'outdoor-gear',
    time_zone: 'Europe/Prague',
    currency: 'CZK',
    website: '',
    seasonal_mode: false,
    categories: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof ProviderSetupForm>(
    field: K,
    value: ProviderSetupForm[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.rental_name || formData.rental_name.length < 3) {
      newErrors.rental_name = 'Company name must be at least 3 characters';
    }
    if (!formData.contact_name) {
      newErrors.contact_name = 'Contact person is required';
    }
    if (!formData.company_id || !/^\d{8}$/.test(formData.company_id)) {
      newErrors.company_id = 'IČO must be 8 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.address) {
      newErrors.address = 'Address is required';
    }
    if (!formData.location) {
      newErrors.location = 'City is required';
    }
    if (!formData.phone || !/^\+?\d{7,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone number is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) {
      toast.error('Please fill all required fields correctly');
      return;
    }
    if (step === 2 && !validateStep2()) {
      toast.error('Please fill all required fields correctly');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleComplete = async () => {
    // Validate user session first
    if (!user?.id) {
      toast.error('No user session found. Please log in again.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🎯 Completing provider setup for user:', user.id);

      const providerData = {
        user_id: user.id,
        rental_name: formData.rental_name,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone,
        company_id: formData.company_id,
        address: formData.address,
        location: formData.location,
        country: formData.country,
        category: formData.categories.join(', ') || formData.category,
        time_zone: formData.time_zone,
        currency: formData.currency,
        website: formData.website || null,
        seasonal_mode: formData.seasonal_mode,
        onboarding_completed: true,
        onboarding_step: 4,
        status: 'pending',
        verified: false,
        current_season: 'all-year',
      };

      console.log('📝 Inserting provider data:', providerData);

      // CRITICAL: Add .select().single() to get the inserted record back
      const { data: insertedProvider, error: insertError } = await supabase
        .from('providers')
        .insert(providerData)
        .select()
        .single();

      // CRITICAL: Log the full response with error details
      console.log('📦 Supabase INSERT response:', {
        insertedProvider,
        insertError,
        errorCode: insertError?.code,
        errorMessage: insertError?.message,
        errorDetails: insertError?.details,
        errorHint: insertError?.hint,
      });

      if (insertError) {
        console.error('❌ Provider insert failed:', insertError);

        // Show user-friendly error message based on error code
        if (insertError.code === '42501') {
          toast.error('Permission denied. Please contact support.');
        } else if (insertError.code === '23505') {
          toast.error('Provider record already exists. Please contact support.');
        } else if (insertError.code === '23502') {
          toast.error(`Missing required field: ${insertError.details || 'Unknown'}`);
        } else if (insertError.code === '42703') {
          toast.error(`Database column error: ${insertError.message}`);
        } else {
          toast.error(`Setup failed: ${insertError.message}`);
        }

        setIsSubmitting(false);
        return;
      }

      console.log('✅ Provider created successfully:', insertedProvider);
      toast.success('Setup complete! Redirecting to dashboard...');

      try {
        console.log('🔄 Refreshing auth context with new provider data...');
        await refreshProfile();
        console.log('✅ Auth context refreshed');
      } catch (refreshError) {
        console.warn('⚠️ Failed to refresh profile after setup:', refreshError);
      }

      // Wait a moment for toast to show and database to settle
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to dashboard - ProviderRoute will now allow access
      navigate('/provider/dashboard');
    } catch (error) {
      console.error('💥 Unexpected error during setup:', error);
      toast.error(getErrorMessage(error) || 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {step === 1 && "🎿 Welcome to Kitloop!"}
              {step === 2 && "📍 Location & Contact"}
              {step === 3 && "⚙️ Business Details"}
              {step === 4 && "✅ Setup Complete!"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Let's set up your rental business. This takes about 5 minutes."}
              {step === 2 && "Where can customers find you?"}
              {step === 3 && "Optional settings you can configure now or later"}
              {step === 4 && "You're all set! Time to start renting."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>Step {step} of 4</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step 1: Company Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rental_name">Company Name *</Label>
                  <Input
                    id="rental_name"
                    placeholder="e.g. Horská Výbava s.r.o."
                    value={formData.rental_name}
                    onChange={(e) => updateField('rental_name', e.target.value)}
                    className={errors.rental_name ? 'border-red-500' : ''}
                  />
                  {errors.rental_name && (
                    <p className="text-sm text-red-500">{errors.rental_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Person *</Label>
                  <Input
                    id="contact_name"
                    placeholder="Your name"
                    value={formData.contact_name}
                    onChange={(e) => updateField('contact_name', e.target.value)}
                    className={errors.contact_name ? 'border-red-500' : ''}
                  />
                  {errors.contact_name && (
                    <p className="text-sm text-red-500">{errors.contact_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_id">IČO (Company ID) *</Label>
                  <Input
                    id="company_id"
                    placeholder="12345678"
                    value={formData.company_id}
                    onChange={(e) => updateField('company_id', e.target.value)}
                    maxLength={8}
                    className={errors.company_id ? 'border-red-500' : ''}
                  />
                  {errors.company_id && (
                    <p className="text-sm text-red-500">{errors.company_id}</p>
                  )}
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    💡 Don't worry, you can change these details later in Settings
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Location & Contact */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    placeholder="Street, Number"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className={errors.address ? 'border-red-500' : ''}
                  />
                  {errors.address && (
                    <p className="text-sm text-red-500">{errors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">City *</Label>
                    <Input
                      id="location"
                      placeholder="e.g. České Budějovice"
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      className={errors.location ? 'border-red-500' : ''}
                    />
                    {errors.location && (
                      <p className="text-sm text-red-500">{errors.location}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => updateField('country', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CZ">🇨🇿 Czech Republic</SelectItem>
                        <SelectItem value="SK">🇸🇰 Slovakia</SelectItem>
                        <SelectItem value="AT">🇦🇹 Austria</SelectItem>
                        <SelectItem value="PL">🇵🇱 Poland</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    placeholder="+420 123 456 789"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    From your account
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (optional)</Label>
                  <Input
                    id="website"
                    placeholder="https://yourwebsite.cz"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Business Details */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>What type of gear do you rent? (optional)</Label>
                  <div className="space-y-3">
                    {[
                      'Ferraty & Via Ferrata',
                      'Climbing & Mountaineering',
                      'Winter Sports (ski, snowshoes)',
                      'Water Sports (kayak, SUP)',
                      'Camping & Hiking',
                      'Other'
                    ].map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={formData.categories.includes(category)}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <Label htmlFor={category} className="font-normal cursor-pointer">
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Do you operate seasonally?</Label>
                  <RadioGroup
                    value={formData.seasonal_mode ? 'seasonal' : 'year-round'}
                    onValueChange={(value) => updateField('seasonal_mode', value === 'seasonal')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="year-round" id="year-round" />
                      <Label htmlFor="year-round" className="font-normal cursor-pointer">
                        Year-round
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="seasonal" id="seasonal" />
                      <Label htmlFor="seasonal" className="font-normal cursor-pointer">
                        Seasonal (we'll help you set up seasons later)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => updateField('currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CZK">CZK (Czech Koruna)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time_zone">Time Zone</Label>
                    <Select
                      value={formData.time_zone}
                      onValueChange={(value) => updateField('time_zone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Prague">Europe/Prague</SelectItem>
                        <SelectItem value="Europe/Bratislava">Europe/Bratislava</SelectItem>
                        <SelectItem value="Europe/Vienna">Europe/Vienna</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <div className="space-y-6 text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold">Setup Complete!</h3>
                <p className="text-muted-foreground">
                  {formData.rental_name} is ready to go.
                </p>

                <Card className="text-left">
                  <CardHeader>
                    <CardTitle className="text-lg">🎯 Next Steps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">1️⃣</span>
                      <span>Add your first gear item</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-lg">2️⃣</span>
                      <span>Create a test reservation</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-lg">3️⃣</span>
                      <span>Invite your team</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700">
                    💡 Need help? Check out our 2-min guide or contact us on WhatsApp
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              {step > 1 && step < 4 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  ← Back
                </Button>
              )}

              {step < 3 && (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  className={step === 1 ? 'ml-auto' : ''}
                >
                  Continue →
                </Button>
              )}

              {step === 3 && (
                <Button
                  variant="primary"
                  onClick={handleNext}
                >
                  Complete Setup →
                </Button>
              )}

              {step === 4 && (
                <Button
                  variant="primary"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="mx-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finishing...
                    </>
                  ) : (
                    'Go to Dashboard →'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProviderSetup;
