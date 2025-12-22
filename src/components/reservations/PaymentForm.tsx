import React, { useState } from "react";
import {
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface PaymentFormProps {
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
    returnUrl?: string;
    totalPrice: number; // For display
    currency?: string;
}

const PaymentForm = ({
    onSuccess,
    onError,
    returnUrl = window.location.href,
    totalPrice,
    currency = "CZK",
}: PaymentFormProps) => {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: returnUrl,
            },
            redirect: "if_required", // Handle redirects if 3DS is needed, but 'if_required' allows staying on page if not
        });

        if (error) {
            // Show error to your customer (e.g., insufficient funds)
            onError(error.message || "Payment failed");
            setProcessing(false);
        } else if (paymentIntent && paymentIntent.status === "succeeded") {
            // Payment succeeded directly
            onSuccess(paymentIntent.id);
            setProcessing(false);
        } else {
            // Unexpected state
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-4 rounded-md border border-gray-200">
                <PaymentElement />
            </div>
            <Button
                type="submit"
                className="w-full"
                disabled={!stripe || processing}
            >
                {processing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("reservations.processing_payment") || "Processing..."}
                    </>
                ) : (
                    `Pay ${totalPrice} ${currency}`
                )}
            </Button>
        </form>
    );
};

export default PaymentForm;
