import React, { useState, useEffect } from 'react';
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
import { Loader2, Upload } from "lucide-react";
import { getErrorMessage } from '@/lib/error-utils';

const ProviderSettings = () => {
  const { provider } = useAuth();
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
  });

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
      });
    }
  }, [provider]);

  const handleSave = async () => {
    if (!provider?.id) {
      toast.error('Provider not found');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Saving provider settings:', formData);

      const { data, error } = await supabase
        .from('providers')
        .update(formData)
        .eq('id', provider.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating provider:', error);
        throw error;
      }

      console.log('Provider updated successfully:', data);
      toast.success('Settings saved successfully');

      // Refresh auth context (optional - depends on your AuthContext implementation)
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Save failed:', error);
      toast.error(getErrorMessage(error) || 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ProviderLayout>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Company Profile</TabsTrigger>
            <TabsTrigger value="team" disabled>Team</TabsTrigger>
            <TabsTrigger value="notifications" disabled>Notifications</TabsTrigger>
            <TabsTrigger value="billing" disabled>Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
                <CardDescription>
                  Update your business information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400">
                      {formData.rental_name?.substring(0, 2).toUpperCase() || 'HV'}
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Logo
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Coming soon: Upload your company logo
                  </p>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="rental_name">Company Name *</Label>
                  <Input
                    id="rental_name"
                    value={formData.rental_name}
                    onChange={(e) => updateField('rental_name', e.target.value)}
                  />
                </div>

                {/* ICO */}
                <div className="space-y-2">
                  <Label htmlFor="company_id">ICO *</Label>
                  <Input
                    id="company_id"
                    value={formData.company_id}
                    onChange={(e) => updateField('company_id', e.target.value)}
                    maxLength={8}
                  />
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Street, Number"
                  />
                </div>

                {/* City & Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">City *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                    />
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
                        <SelectItem value="CZ">Czech Republic</SelectItem>
                        <SelectItem value="SK">Slovakia</SelectItem>
                        <SelectItem value="AT">Austria</SelectItem>
                        <SelectItem value="PL">Poland</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+420 123 456 789"
                  />
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
                    Email cannot be changed here
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://yourwebsite.cz"
                  />
                </div>

                {/* Business Settings */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">Business Settings</h3>

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

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  <Button variant="outline" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Invite and manage your team (Coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">This feature will be available soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProviderLayout>
  );
};

export default ProviderSettings;
