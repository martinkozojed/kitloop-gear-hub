// components/AddRental.tsx

import React, { useState, useRef } from 'react';
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
import { toast } from "sonner";
import { Upload, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";


// Form schema (Zod validation)
const formSchema = z.object({
  rental_name: z.string().min(1, "Required"),
  contact_name: z.string().min(1, "Required"),
  email: z.string().email("Must be a valid email"),
  phone: z.string().regex(/^\+?\d{7,15}$/, "Invalid phone number"),
  website: z.union([z.string().url("Invalid website URL"), z.literal("")]).optional(),
  company_id: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
  category: z.string().min(1, "Select a category"),
  availability_notes: z.string().optional(),
  logoFile: z.any().optional(),
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
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rental_name: "",
      contact_name: "",
      email: "",
      phone: "",
      website: "",
      company_id: "",
      location: "",
      category: "",
      availability_notes: "",
      logoFile: null,
    }
  });

  const handleFile = (file: File) => {
    form.setValue("logoFile", file, { shouldValidate: true });
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onSubmit = async (values: FormSchema) => {
    setIsSubmitting(true);

    try {
      let imageUrl: string | null = null;

      if (values.logoFile) {
        const file = values.logoFile as File;
        const path = `logos/${crypto.randomUUID()}.png`;
        const { error } = await supabase.storage
          .from("logos")
          .upload(path, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("logos")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase
        .from("providers")
        .insert({
          rental_name: values.rental_name,
          contact_name: values.contact_name,
          name: values.rental_name,
          email: values.email,
          phone: values.phone,
          website: values.website || null,
          company_id: values.company_id,
          location: values.location,
          category: values.category,
          availability_notes: values.availability_notes ?? null,
          logo_url: imageUrl,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast.success("Rental submitted for review");
      form.reset();
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-kitloop-background px-4">
      <Card className="w-full max-w-xl shadow">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Package className="w-5 h-5" />
            Register Your Shop
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField control={form.control} name="rental_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Rental Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="contact_name" render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Name</FormLabel>
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

          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="website" render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="company_id" render={({ field }) => (
            <FormItem>
              <FormLabel>Company ID (IČO)</FormLabel>
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

          <FormField control={form.control} name="category" render={({ field }) => (
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

          <FormField control={form.control} name="availability_notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Availability Notes</FormLabel>
              <FormControl><Textarea {...field} placeholder="e.g. only weekends" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormItem>
            <FormLabel>Upload Logo (optional)</FormLabel>
            <div
              className={cn(
                "border border-dashed rounded-lg p-4 text-center cursor-pointer",
                isDragging ? "bg-green-50 border-green-300" : "border-gray-300"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto" />
              ) : (
                <div className="text-gray-500">
                  <Upload className="w-6 h-6 mx-auto mb-2" />
                  Drag & drop or click to upload
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          </FormItem>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Listing"}
          </Button>
        </form>
      </Form>
        </CardContent>
      </Card>
    </div>
  );
}
