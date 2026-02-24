import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const submitRequestSchema = z.object({
  token: z.string().min(1, "Token is required"),
  customer_name: z.string().min(1, "Name is required").max(200),
  customer_email: z.string().email().optional().nullable().or(z.literal("")),
  customer_phone: z.string().max(30).optional().nullable().or(z.literal("")),
  requested_start_date: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), "Invalid start date"),
  requested_end_date: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), "Invalid end date"),
  product_variant_id: z.string().uuid().optional().nullable(),
  requested_gear_text: z.string().max(1000).optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable().or(z.literal("")),
}).refine(
  (data) => {
    const email = data.customer_email?.trim();
    const phone = data.customer_phone?.trim();
    return (email && email.length > 0) || (phone && phone.length >= 3);
  },
  { message: "Email or phone is required", path: ["customer_email"] }
);

export type SubmitRequestPayload = z.infer<typeof submitRequestSchema>;
