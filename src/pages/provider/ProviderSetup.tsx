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
import { Loader2, CheckCircle2, Building2, MapPin, Settings2 } from "lucide-react";
import { getErrorMessage } from '@/lib/error-utils';
import { motion, AnimatePresence } from "framer-motion";

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
    if (!formData.rental_name || formData.rental_name.length < 3) newErrors.rental_name = 'Company name must be at least 3 characters';
    if (!formData.contact_name) newErrors.contact_name = 'Contact person is required';
    if (!formData.company_id || !/^\d{8}$/.test(formData.company_id)) newErrors.company_id = 'IČO must be 8 digits';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.location) newErrors.location = 'City is required';
    if (!formData.phone || !/^\+?\d{7,15}$/.test(formData.phone.replace(/\s/g, ''))) newErrors.phone = 'Phone number is invalid';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) {
      toast.error('Please fix the errors to continue');
      return;
    }
    if (step === 2 && !validateStep2()) {
      toast.error('Please fix the errors to continue');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => setStep(prev => prev - 1);

  const handleComplete = async () => {
    if (!user?.id) {
      toast.error('No user session found. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const providerData = {
        user_id: user.id,
        rental_name: formData.rental_name, // explicitly set rental_name
        name: formData.rental_name, // map to name column
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
        verified: false,
        current_season: 'all-year',
      };

      const { data: insertedProvider, error: insertError } = await supabase
        .from('providers')
        .insert(providerData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      toast.success('Setup complete! Redirecting to dashboard...');
      await refreshProfile();
      await new Promise(resolve => setTimeout(resolve, 1500)); // Creating a small delay for the success animation
      navigate('/provider/dashboard');
    } catch (error) {
      console.error('💥 Unexpected error during setup:', error);
      toast.error(getErrorMessage(error) || 'An unexpected error occurred.');
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

  const steps = [
    { title: "Company", icon: Building2 },
    { title: "Location", icon: MapPin },
    { title: "Details", icon: Settings2 },
    { title: "Complete", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Progress Steps */}
        <div className="mb-8 flex justify-between items-center px-4 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -z-10 transform -translate-y-1/2" />
          <div className="absolute top-1/2 left-0 h-0.5 bg-primary transition-all duration-500 -z-10 transform -translate-y-1/2" style={{ width: `${((step - 1) / 3) * 100}%` }} />

          {steps.map((s, index) => {
            const StepIcon = s.icon;
            const isActive = step >= index + 1;
            const isCurrent = step === index + 1;
            return (
              <div key={index} className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm p-2 rounded-xl">
                <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm
                    ${isActive ? 'bg-primary text-primary-foreground scale-110 shadow-md' : 'bg-gray-100 text-gray-400'}
                    ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                  `}>
                  <StepIcon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium transition-colors ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-xl overflow-hidden">
          <CardHeader className="text-center pb-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 mb-2">
                  {step === 1 && "Welcome to Kitloop!"}
                  {step === 2 && "Where are you located?"}
                  {step === 3 && "Business Details"}
                  {step === 4 && "You're All Set!"}
                </CardTitle>
                <CardDescription className="text-lg">
                  {step === 1 && "Let's get your rental business set up for success."}
                  {step === 2 && "Help customers find your store easily."}
                  {step === 3 && "Customize how your business operates."}
                  {step === 4 && "Your rental shop is ready to launch."}
                </CardDescription>
              </motion.div>
            </AnimatePresence>
          </CardHeader>

          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="min-h-[300px]"
              >
                {/* Step 1: Company Info */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="rental_name">Company Name</Label>
                        <Input
                          id="rental_name"
                          placeholder="e.g. Horská Výbava s.r.o."
                          value={formData.rental_name}
                          onChange={(e) => updateField('rental_name', e.target.value)}
                          className={`h-12 text-lg transition-all ${errors.rental_name ? 'border-red-500 ring-red-500/20' : 'focus:ring-primary/20'}`}
                        />
                        {errors.rental_name && <p className="text-sm text-red-500 flex items-center gap-1">⚠️ {errors.rental_name}</p>}
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="contact_name">Contact Person</Label>
                          <Input
                            id="contact_name"
                            placeholder="Your Full Name"
                            value={formData.contact_name}
                            onChange={(e) => updateField('contact_name', e.target.value)}
                            className={`h-12 ${errors.contact_name ? 'border-red-500' : ''}`}
                          />
                          {errors.contact_name && <p className="text-sm text-red-500">⚠️ {errors.contact_name}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company_id">IČO (Company ID)</Label>
                          <Input
                            id="company_id"
                            placeholder="12345678"
                            value={formData.company_id}
                            onChange={(e) => updateField('company_id', e.target.value)}
                            maxLength={8}
                            className={`h-12 font-mono ${errors.company_id ? 'border-red-500' : ''}`}
                          />
                          {errors.company_id && <p className="text-sm text-red-500">⚠️ {errors.company_id}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Location & Contact */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input
                        id="address"
                        placeholder="Street, Number"
                        value={formData.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        className={`h-12 ${errors.address ? 'border-red-500' : ''}`}
                      />
                      {errors.address && <p className="text-sm text-red-500">⚠️ {errors.address}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="location">City</Label>
                        <Input
                          id="location"
                          placeholder="City"
                          value={formData.location}
                          onChange={(e) => updateField('location', e.target.value)}
                          className={`h-12 ${errors.location ? 'border-red-500' : ''}`}
                        />
                        {errors.location && <p className="text-sm text-red-500">⚠️ {errors.location}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select value={formData.country} onValueChange={(value) => updateField('country', value)}>
                          <SelectTrigger className="h-12">
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
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        placeholder="+420 777 123 456"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className={`h-12 font-mono ${errors.phone ? 'border-red-500' : ''}`}
                      />
                      {errors.phone && <p className="text-sm text-red-500">⚠️ {errors.phone}</p>}
                    </div>
                  </div>
                )}

                {/* Step 3: Business Details */}
                {step === 3 && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <Label className="text-lg font-medium">What do you rent?</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          'Ferraty & Via Ferrata', 'Climbing & Mountaineering',
                          'Winter Sports', 'Water Sports',
                          'Camping & Hiking', 'Other'
                        ].map((category) => (
                          <div
                            key={category}
                            onClick={() => toggleCategory(category)}
                            className={`
                                cursor-pointer border rounded-lg p-3 flex items-center space-x-3 transition-all duration-200
                                ${formData.categories.includes(category)
                                ? 'bg-primary/5 border-primary shadow-sm text-primary'
                                : 'hover:bg-gray-50 border-gray-200'}
                            `}
                          >
                            <Checkbox
                              checked={formData.categories.includes(category)}
                              onCheckedChange={() => toggleCategory(category)}
                              className="data-[state=checked]:bg-primary"
                            />
                            <span className="text-sm font-medium">{category}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <Label className="text-base">Operational Mode</Label>
                      <RadioGroup
                        value={formData.seasonal_mode ? 'seasonal' : 'year-round'}
                        onValueChange={(value) => updateField('seasonal_mode', value === 'seasonal')}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className={`
                            flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-all
                            ${!formData.seasonal_mode ? 'bg-white border-primary shadow-sm' : 'border-transparent hover:bg-white'}
                        `}>
                          <RadioGroupItem value="year-round" id="year-round" />
                          <Label htmlFor="year-round" className="cursor-pointer font-medium">Year-round</Label>
                        </div>
                        <div className={`
                            flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-all
                            ${formData.seasonal_mode ? 'bg-white border-primary shadow-sm' : 'border-transparent hover:bg-white'}
                        `}>
                          <RadioGroupItem value="seasonal" id="seasonal" />
                          <Label htmlFor="seasonal" className="cursor-pointer font-medium">Seasonal</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                  <div className="text-center py-8 space-y-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12" />
                      </div>
                    </motion.div>

                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-gray-900">Successfully Configured!</h3>
                      <p className="text-gray-500">
                        {formData.rental_name} is now ready for business.
                      </p>
                    </div>

                    <div className="grid gap-3 max-w-sm mx-auto text-left">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="bg-white p-2 rounded-md shadow-sm text-lg">📦</span>
                        <span className="font-medium text-gray-700">Add Inventory</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="bg-white p-2 rounded-md shadow-sm text-lg">📅</span>
                        <span className="font-medium text-gray-700">Manage Reservations</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8 mt-4 border-t border-gray-100">
              {step > 1 && step < 4 && (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="pl-0 hover:pl-2 transition-all"
                >
                  ← Back
                </Button>
              )}

              {/* Spacer for Step 1 where there is no back button */}
              {step === 1 && <div />}

              {step < 3 && (
                <Button
                  size="lg"
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-full px-8 transition-all hover:scale-105"
                >
                  Continue →
                </Button>
              )}

              {step === 3 && (
                <Button
                  size="lg"
                  onClick={handleNext} // Just moves to success step locally, actual submit happens there usually or we submit here
                  className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-full px-8 transition-all hover:scale-105"
                >
                  Finish Setup →
                </Button>
              )}

              {step === 4 && (
                <Button
                  size="lg"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25 rounded-full text-lg h-14 transition-all hover:scale-105"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Launching Dashboard...
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
