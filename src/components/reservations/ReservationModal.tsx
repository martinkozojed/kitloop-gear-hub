import React, { useState, useEffect } from "react";
import { type DateRange } from "react-day-picker";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { Calendar as CalendarIcon, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    createReservationHold,
    createPaymentIntent,
    type ReservationHoldResult,
} from "@/services/reservations";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import PaymentForm from "./PaymentForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Initialize Stripe outside of component
// Initialize Stripe outside of component
// Initialize Stripe outside of component
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
// Gracefully handle missing key without error logging spam
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    gearItem: {
        id: string;
        name: string;
        price_per_day: number | null;
        provider_id: string;
        image_url?: string | null;
    };
}

type Step = "dates" | "details" | "payment" | "success";

const ReservationModal = ({
    isOpen,
    onClose,
    gearItem,
}: ReservationModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [step, setStep] = useState<Step>("dates");
    const [dateRange, setDateRange] = useState<{
        from: Date | undefined;
        to: Date | undefined;
    }>({
        from: undefined,
        to: undefined,
    });
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const [customerDetails, setCustomerDetails] = useState({
        name: "",
        email: "",
        phone: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reservation, setReservation] = useState<ReservationHoldResult | null>(
        null
    );
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    // Inventory 2.0 Variants
    const [variants, setVariants] = useState<{ id: string, name: string }[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string>("");

    useEffect(() => {
        if (isOpen && gearItem.id) {
            const fetchVariants = async () => {
                const { data } = await supabase
                    .from('product_variants')
                    .select('id, name')
                    .eq('product_id', gearItem.id);

                if (data && data.length > 0) {
                    setVariants(data);
                    if (data.length === 1) setSelectedVariantId(data[0].id);
                }
            };
            fetchVariants();
        }
    }, [isOpen, gearItem.id]);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setStep("dates");
            setError(null);
            setReservation(null);
            setClientSecret(null);
            // Prefill if logged in
            if (user) {
                setCustomerDetails((prev) => ({
                    ...prev,
                    email: user.email || "",
                    // If we had profiles table with phone/name, fetch it here.
                    // For now just email is reliably in session.user usually.
                }));
            }
        }
    }, [isOpen, user]);

    const handleDateSelect = (range: DateRange | undefined) => {
        setDateRange({ from: range?.from, to: range?.to });
        setError(null);
    };

    const calculateTotal = () => {
        if (!dateRange.from || !dateRange.to || !gearItem.price_per_day) return 0;
        const days = differenceInCalendarDays(dateRange.to, dateRange.from);
        // Add 1 day because rental includes both start and end dates usually, or if logic is [start, end)
        // The brief says [start, end), so start inclusive, end exclusive?
        // "Interval rezervace: [start, end) (start inkluzivní, end exkluzivní)" from brief.
        // If user picks same day in calendar, from=to. Difference is 0. But valid rental is at least 1 day?
        // Let's assume standard calendar behavior - if user picks range, 'to' is usually inclusive in UI but stored as exclusive in some systems.
        // However, date-fns differenceInCalendarDays(2023-10-02, 2023-10-01) is 1.
        // Let's trust the 'days' calculation for price. Minimum 1 day.
        const rentalDays = Math.max(1, days);
        return rentalDays * gearItem.price_per_day * quantity;
    };

    const calculateDays = () => {
        if (!dateRange.from || !dateRange.to) return 0;
        return Math.max(1, differenceInCalendarDays(dateRange.to, dateRange.from));
    };

    const handleHoldReservation = async () => {
        if (!dateRange.from || !dateRange.to) {
            setError("Please select a valid date range.");
            return;
        }
        if (!customerDetails.name || !customerDetails.email) {
            setError("Please provide your name and email.");
            return;
        }
        // Inventory 2.0: Require Variant if variants exist
        if (variants.length > 0 && !selectedVariantId) {
            setError("Please select a size/variant.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const totalPrice = calculateTotal();
            const rentalDays = calculateDays();

            // Prepare ID: Use Variant ID if available. 
            // If No variants found (legacy item?), fall back to gearItem.id as 'gearId'.
            const useVariant = variants.length > 0;
            const targetVariantId = useVariant ? selectedVariantId : undefined;
            const targetGearId = useVariant ? undefined : gearItem.id;

            const result = await createReservationHold({
                providerId: gearItem.provider_id,
                gearId: targetGearId,
                productVariantId: targetVariantId,
                startDate: dateRange.from,
                endDate: dateRange.to,
                // ... rest same ...
                totalPrice: totalPrice,
                depositPaid: false,
                notes: notes,
                customer: customerDetails,
                rentalDays: rentalDays,
                pricePerDay: gearItem.price_per_day || 0,
                customerUserId: user?.id,
            });

            setReservation(result);

            // Create Payment Intent
            const piResult = await createPaymentIntent({
                reservationId: result.reservation_id,
            });

            setClientSecret(piResult.clientSecret);
            setStep("payment");
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Failed to create reservation.";
            setError(message);
            toast.error("Reservation failed", {
                description: message,
            });
        } finally {
            setLoading(false);
        }
    };

    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Timer effect
    useEffect(() => {
        if (step === "payment" && reservation?.expires_at) {
            const interval = setInterval(() => {
                const expires = new Date(reservation.expires_at!);
                const now = new Date();
                const diff = Math.floor((expires.getTime() - now.getTime()) / 1000);

                if (diff <= 0) {
                    clearInterval(interval);
                    setTimeLeft(0);
                    setError("Reservation hold expired. Please try again.");
                    setReservation(null);
                    setClientSecret(null);
                    setStep("dates");
                } else {
                    setTimeLeft(diff);
                }
            }, 1000);

            return () => clearInterval(interval);
        } else {
            setTimeLeft(null);
        }
    }, [step, reservation]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handlePaymentSuccess = (paymentIntentId: string) => {
        setStep("success");
        toast.success("Reservation confirmed!", {
            description: "You will receive a confirmation email shortly.",
        });
    };

    const handlePaymentError = (errMsg: string) => {
        setError(errMsg);
        toast.error("Payment failed", { description: errMsg });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !loading && onClose()}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Reserve {gearItem.name}</DialogTitle>
                    <DialogDescription>
                        {step === "dates" && "Select dates"}
                        {step === "details" && "Contact Details"}
                        {step === "payment" && "Secure Payment"}
                        {step === "success" && "Confirmed!"}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {step === "dates" && (
                    <div className="space-y-4 py-4">
                        {variants.length > 0 && (
                            <div className="space-y-2">
                                <Label>Option / Size</Label>
                                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select variant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {variants.map(v => (
                                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex justify-center">
                            <Calendar
                                mode="range"
                                selected={dateRange}
                                onSelect={handleDateSelect}
                                numberOfMonths={1}
                                disabled={(date) => date < new Date()}
                                className="rounded-md border"
                            />
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <span className="text-sm font-medium">Total ({calculateDays()} days):</span>
                            <span className="text-lg font-bold text-green-600">
                                {calculateTotal()} CZK
                            </span>
                        </div>

                        <Button
                            className="w-full"
                            onClick={() => setStep("details")}
                            disabled={!dateRange.from || !dateRange.to || (variants.length > 0 && !selectedVariantId)}
                        >
                            Continue
                        </Button>
                    </div>
                )}

                {step === "details" && (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={customerDetails.name}
                                onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={customerDetails.email}
                                onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone (optional)</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={customerDetails.phone}
                                onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                                placeholder="+420..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (optional)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Pick up time preference..."
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" onClick={() => setStep("dates")} disabled={loading}>
                                Back
                            </Button>
                            <Button className="flex-1" onClick={handleHoldReservation} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Proceed to Payment
                            </Button>
                        </div>
                    </div>
                )}

                {step === "payment" && clientSecret && (
                    <div className="py-2">
                        {timeLeft !== null && (
                            <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-md flex items-center justify-between text-sm">
                                <span>Complete payment within:</span>
                                <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
                            </div>
                        )}
                        {stripePromise ? (
                            <Elements stripe={stripePromise} options={{ clientSecret }}>
                                <PaymentForm
                                    onSuccess={handlePaymentSuccess}
                                    onError={handlePaymentError}
                                    totalPrice={calculateTotal()}
                                />
                            </Elements>
                        ) : (
                            <div className="p-4 bg-red-50 text-red-800 rounded-md">
                                Error: Payment system not configured (Missing Stripe Key).
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            className="mt-2 w-full text-muted-foreground text-sm"
                            onClick={() => setStep("details")}
                            disabled={loading} // You probably shouldn't go back once Client secret is made to avoid orphaned intents, but for MVP it's OK.
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {step === "success" && (
                    <div className="py-8 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-2xl">🎉</span>
                        </div>
                        <h3 className="text-xl font-bold">Reservation Confirmed!</h3>
                        <p className="text-muted-foreground">
                            We have sent a confirmation email to {customerDetails.email}.
                        </p>
                        <Button className="w-full" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ReservationModal;
