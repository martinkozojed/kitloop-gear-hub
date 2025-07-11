// components/AddRental.tsx

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form, FormField, FormItem, FormLabel,
  FormControl, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { CheckCircle, Upload, Package } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Supabase client setup
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

// Form schema (Zod validation)
const formSchema = z.object({
  rentalName: z.string().min(2, "Required"),
  location: z.string().min(2, "Required"),
  email: z.string().email("Must be a valid email"),
  gearCategory: z.string().min(1, "Select a category"),
  availability: z.string().optional(),
  image: z.any().optional()
});

type FormSchema = z.infer<typeof formSchema>;

const categories = [
  "Tents", "Sleeping Bags", "Backpacks", "Cooking Equipment",
  "Climbing Gear", "Kayaks & Canoes", "Winter Sports Equipment",
  "Hiking Poles", "Mountain Bikes", "Avalanche Safety Gear",
  "Fishing Equipment", "Other Outdoor Gear"
];

export default function AddRental() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rentalName: '',
      location: '',
      email: '',
      gearCategory: '',
      availability: '',
      image: null
    }
  });

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("image", file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormSchema) => {
    setIsSubmitting(true);

    try {
      let imageUrl = null;

      if (values.image) {
        const file = values.image as File;
        const { data, error } = await supabase.storage
          .from('logos')
          .upload(`rental-logos/${Date.now()}-${file.name}`, file);

        if (error) throw error;

        const { data: urlData } = supabase
          .storage
          .from('logos')
          .getPublicUrl(data.path);
        imageUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase
        .from("rentals")
        .insert({
          name: values.rentalName,
          location: values.location,
          email: values.email,
          gear_category: values.gearCategory,
          availability: values.availability,
          logo_url: imageUrl,
          status: "pending"
        });

      if (insertError) throw insertError;

      setSuccess(true);
      toast.success("Rental submitted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto mt-32 text-center">
        <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Thanks for submitting!</h2>
        <p className="text-gray-600 mb-6">
          Your rental is now under review. We'll notify you once it's approved.
        </p>
        <Button onClick={() => window.location.href = "/"}>Back to homepage</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <h1 className="text-3xl font-bold mb-8 text-center">List Your Rental</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="rentalName" render={({ field }) => (
            <FormItem>
              <FormLabel>Rental Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="gearCategory" render={({ field }) => (
            <FormItem>
              <FormLabel>Gear Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="availability" render={({ field }) => (
            <FormItem>
              <FormLabel>Availability Notes</FormLabel>
              <FormControl><Textarea {...field} placeholder="e.g. only weekends" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormItem>
            <FormLabel>Upload Logo (optional)</FormLabel>
            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto" />
              ) : (
                <div className="text-gray-500">
                  <Upload className="w-6 h-6 mx-auto mb-2" />
                  Click to upload
                </div>
              )}
              <input type="file" className="hidden" onChange={handleImage} />
            </div>
          </FormItem>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Listing"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
