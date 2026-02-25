import { supabase } from "@/lib/supabase";

export interface SubmitRequestPayload {
  token: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  requested_start_date: string;
  requested_end_date: string;
  requested_gear_text?: string | null;
  notes?: string | null;
  /** Honeypot: must be sent in body; server rejects if non-empty. */
  _hp?: string;
}

export interface SubmitRequestResult {
  request_id: string;
  message: string;
}

export interface SubmitRequestError extends Error {
  status?: number;
  retryAfterSeconds?: number;
}

export async function submitRequest(
  payload: SubmitRequestPayload
): Promise<SubmitRequestResult> {
  const { data, error } = await supabase.functions.invoke("submit_request", {
    body: payload,
  });

  if (error) {
    const err = new Error(error.message ?? "Submit failed") as SubmitRequestError;
    err.status = 500;
    throw err;
  }

  if (data?.rate_limited === true) {
    const err = new Error("Too many requests") as SubmitRequestError;
    err.status = 429;
    err.retryAfterSeconds = Math.max(1, Number(data.retry_after_seconds) || 60);
    throw err;
  }

  if (data?.error) {
    const err = new Error(data.error ?? "Submit failed") as SubmitRequestError;
    err.status = (data as { status?: number }).status ?? 500;
    throw err;
  }

  if (!data?.request_id) {
    throw new Error("Invalid response from server");
  }

  return {
    request_id: data.request_id,
    message: data.message ?? "Request submitted",
  };
}
