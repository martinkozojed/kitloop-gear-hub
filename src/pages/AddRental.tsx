import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Upload, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitRental, RentalSubmission } from "@/services/kitloopApi";

// Available gear categories with more specific options
const gearCategories = [
  "Tents",
  "Sleeping Bags",
  "Backpacks",
  "Cooking Equipment",
  "Climbing Gear",
  "Kayaks & Canoes",
  "Winter Sports Equipment",
  "Hiking Poles",
  "Mountain Bikes",
  "Avalanche Safety Gear",
  "Fishing Equipment",
  "Other Outdoor Gear"
];

const AddRental = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const form = useForm({
    defaultValues: {
      rentalName: "",
      location: "",
      email: "",
      gearCategory: "",
      availability: "",
      image: null as File | null,
    },
  });
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      form.setValue("image", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const onSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    
    try {
      // Use our API service instead of setTimeout
      await submitRental(data as RentalSubmission);
      toast.success("Your listing request has been sent successfully!");
      setIsSubmitted(true);
    } catch (error) {
      toast.error("There was an error submitting your listing. Please try again.");
      console.error("Error submitting rental:", error);
    } finally {
      setIsSubmitting(false);
    }
  });
  
  if (isSubmitted) {
    return (
      <div className="bg-kitloop-background min-h-screen pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background rounded-lg p-6 md:p-10 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-gradient-to-br from-green-400 to-green-600">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Thank You for Your Submission!</h2>
              <div className="max-w-lg">
                <p className="text-lg mb-4">
                  We've received your listing request. Our team will review it and get back to you within 2 business days.
                </p>
                <p className="text-md text-gray-600">
                  You'll be notified via email when your rental is approved and ready to go live on Kitloop.
                </p>
              </div>
              <Button
                variant="primary"
                className="mt-8"
                onClick={() => (window.location.href = '/')}
              >
                Return to Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-kitloop-background min-h-screen pt-24 pb-16 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-background rounded-lg p-6 md:p-10 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">List Your Gear on Kitloop</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join our community of outdoor gear providers and earn extra income while helping others enjoy the outdoors.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="bg-kitloop-background rounded-lg p-6 flex flex-col items-center text-center">
              <div className="rounded-full p-4 mb-4 bg-gradient-to-br from-green-400 to-green-600">
                <Package className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Why list your gear?</h3>
              <ul className="text-left space-y-3 mt-4">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 shrink-0 mt-0.5" />
                  <span>Earn extra income from gear you already own</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 shrink-0 mt-0.5" />
                  <span>Help others access quality outdoor equipment</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 shrink-0 mt-0.5" />
                  <span>Simple booking and secure payment system</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2 shrink-0 mt-0.5" />
                  <span>Full control over pricing and availability</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">How it works</h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-full h-6 w-6 text-white flex items-center justify-center mr-3 shrink-0 mt-0.5">1</div>
                  <div>
                    <h4 className="font-medium">Submit your gear</h4>
                    <p className="text-sm text-gray-600">Fill out this form with details about your equipment</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-full h-6 w-6 text-white flex items-center justify-center mr-3 shrink-0 mt-0.5">2</div>
                  <div>
                    <h4 className="font-medium">Verification</h4>
                    <p className="text-sm text-gray-600">Our team reviews your listing for quality assurance</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-full h-6 w-6 text-white flex items-center justify-center mr-3 shrink-0 mt-0.5">3</div>
                  <div>
                    <h4 className="font-medium">Start renting</h4>
                    <p className="text-sm text-gray-600">Receive booking requests and earn income</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">Your Information</h2>
              
              <Alert className="mb-6 bg-green-600/5 border-green-600/20">
                <AlertDescription>
                  Your listing will be reviewed by our team before it goes live on Kitloop. We do this to ensure a safe and high-quality experience for everyone.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="rentalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rental/Shop Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Mountain Adventure Rentals" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="City, Region" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="gearCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of Gear Offered</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a gear category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {gearCategories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <FormLabel htmlFor="image">Upload Image</FormLabel>
                  <div className="mt-1.5">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      {imagePreview ? (
                        <div className="w-full h-full relative">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-500" />
                          <p className="text-sm text-gray-500">Add a photo of your gear or your rental's logo</p>
                        </div>
                      )}
                      <input 
                        id="image" 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g. Available on weekends only. Not available in winter." 
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Listing Request"}
                </Button>
              </div>
              
              <p className="text-center text-sm text-gray-500 mt-4">
                By submitting this form, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default AddRental;
