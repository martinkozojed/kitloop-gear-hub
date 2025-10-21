import { z } from "npm:zod@3.23.8";

export const reservationRequestSchema = z.object({
  gear_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  start_date: z.string().datetime({ offset: true }),
  end_date: z.string().datetime({ offset: true }),
  idempotency_key: z.string().min(10),
  total_price: z.number().nonnegative().optional(),
  deposit_paid: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
  user_id: z.string().uuid().optional(),
  customer: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().optional().nullable(),
    phone: z.string().min(3).max(30).optional().nullable(),
  }).partial().optional(),
});

export type ReservationRequest = z.infer<typeof reservationRequestSchema>;
