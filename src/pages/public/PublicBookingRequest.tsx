import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
    customerName: z.string().min(2, "Name must be at least 2 characters"),
    customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
    customerPhone: z.string().min(5, "Phone number too short").optional().or(z.literal("")),
    dateRange: z.object({
        from: z.date({
            required_error: "Start date is required",
        }),
        to: z.date({
            required_error: "End date is required",
        }),
    }),
    requestedGearText: z.string().optional(),
    notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional(),
    surname: z.string().max(0, "Invalid submission").optional(), // Honeypot
}).refine(data => data.customerEmail || data.customerPhone, {
    message: "Either email or phone is required",
    path: ["customerEmail"],
});

type FormValues = z.infer<typeof formSchema>;

export default function PublicBookingRequest() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [provider, setProvider] = useState<{ name: string; rental_name: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            customerName: "",
            customerEmail: "",
            customerPhone: "",
            requestedGearText: "",
            notes: "",
            surname: "",
        },
    });

    useEffect(() => {
        async function fetchProvider() {
            if (!token) {
                setError("Invalid link");
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("providers")
                    .select("name, rental_name, public_booking_enabled")
                    .eq("public_booking_token", token)
                    .single();

                const providerData = data as unknown as { name: string; rental_name: string; public_booking_enabled: boolean };

                if (error || !providerData) {
                    setError("Provider not found or invalid link.");
                } else if (!providerData.public_booking_enabled) {
                    setError("This provider is currently not accepting public requests.");
                } else {
                    setProvider(providerData);
                }
            } catch (err) {
                setError("Failed to load provider information.");
            } finally {
                setIsLoading(false);
            }
        }

        fetchProvider();
    }, [token]);

    const onSubmit = async (values: FormValues) => {
        if (values.surname) return; // Honeypot triggered
        if (!token) return;

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.functions.invoke('submit_request', {
                body: {
                    token,
                    customer_name: values.customerName,
                    customer_email: values.customerEmail || undefined,
                    customer_phone: values.customerPhone || undefined,
                    requested_start_date: format(values.dateRange.from, 'yyyy-MM-dd'),
                    requested_end_date: format(values.dateRange.to, 'yyyy-MM-dd'),
                    requested_gear_text: values.requestedGearText || undefined,
                    notes: values.notes || undefined,
                },
            });

            if (error) {
                throw new Error(error.message || "Failed to submit request");
            }

            if (data?.error) {
                if (data.retry_after_seconds) {
                    throw new Error(`Too many requests. Please try again in ${Math.ceil(data.retry_after_seconds / 60)} minutes.`);
                }
                throw new Error(data.error);
            }

            setIsSuccess(true);
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Submission failed",
                description: err.message || "An unexpected error occurred. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !provider) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTitle>Cannot load booking page</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
                    Return to Hub
                </Button>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-6" />
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Request Submitted!</h1>
                <p className="text-lg text-gray-600 mb-8 max-w-md">
                    Thank you. {provider.rental_name || provider.name} has received your inquiry and will contact you shortly to confirm the details and create a reservation.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Rent Gear from {provider.rental_name || provider.name}
                    </h2>
                    <p className="mt-4 text-lg text-gray-500">
                        Submit a non-binding request. The rental shop will confirm availability.
                    </p>
                </div>

                <div className="bg-white py-8 px-6 shadow sm:rounded-lg sm:px-10">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* HONEYPOT */}
                            <div aria-hidden="true" className="hidden">
                                <FormField
                                    control={form.control}
                                    name="surname"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl><Input {...field} tabIndex={-1} autoComplete="off" /></FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="customerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Jane Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="customerEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="jane@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="customerPhone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input type="tel" placeholder="+1234567890" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="dateRange"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Rental Period *</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value?.from ? (
                                                            field.value.to ? (
                                                                <>
                                                                    {format(field.value.from, "LLL dd, y")} -{" "}
                                                                    {format(field.value.to, "LLL dd, y")}
                                                                </>
                                                            ) : (
                                                                format(field.value.from, "LLL dd, y")
                                                            )
                                                        ) : (
                                                            <span>Select pickup and return dates</span>
                                                        )}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    initialFocus
                                                    mode="range"
                                                    defaultMonth={field.value?.from}
                                                    selected={{
                                                        from: field.value?.from,
                                                        to: field.value?.to,
                                                    }}
                                                    onSelect={field.onChange}
                                                    numberOfMonths={2}
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="requestedGearText"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>What are you looking to rent?</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 2x Mountain Bikes, 1x Tent" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Additional Notes</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Any special requirements, sizes, or questions?"
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting Request...
                                    </>
                                ) : (
                                    "Submit Request"
                                )}
                            </Button>
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    );
}
