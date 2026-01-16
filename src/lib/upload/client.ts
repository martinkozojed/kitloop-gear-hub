import { supabase } from "@/lib/supabase";
import type { UploadUseCase } from "@/lib/upload/validation";

export class UploadTicketError extends Error {
  reasonCode?: string;
  status?: number;

  constructor(message: string, reasonCode?: string, status?: number) {
    super(message);
    this.reasonCode = reasonCode;
    this.status = status;
  }
}

export interface UploadTicketRequest {
  useCase: UploadUseCase;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  providerId: string;
  reservationId?: string;
}

export interface UploadTicketResponse {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
  expiresIn: number;
  maxBytes: number;
  allowedMime: string[];
}

export async function requestUploadTicket(input: UploadTicketRequest): Promise<UploadTicketResponse> {
  const { data, error } = await supabase.functions.invoke("upload_ticket", {
    body: input,
  });

  if (error) {
    const reasonCode = (error as { context?: { reasonCode?: string } }).context?.reasonCode
      ?? (data as { reasonCode?: string } | null | undefined)?.reasonCode;
    throw new UploadTicketError(error.message ?? "Failed to issue upload ticket", reasonCode, (error as { status?: number }).status);
  }

  if (!data) {
    throw new UploadTicketError("Missing upload ticket response");
  }

  return data as UploadTicketResponse;
}

export async function uploadWithTicket(ticket: UploadTicketResponse, file: File) {
  const { error, data } = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return data;
}

export function publicUrlForTicket(ticket: Pick<UploadTicketResponse, "bucket" | "path">) {
  return supabase.storage.from(ticket.bucket).getPublicUrl(ticket.path).data.publicUrl;
}
