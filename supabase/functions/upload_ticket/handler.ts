import { rulesForUseCase, validateUploadRequest, type UploadUseCase } from "../../../shared/upload/validation.ts";

export interface UploadTicketDeps {
  getUser: () => Promise<{ id: string } | null>;
  checkProviderAccess: (providerId: string, userId: string) => Promise<boolean>;
  checkReservationOwnership: (reservationId: string, providerId: string) => Promise<boolean>;
  createSignedUploadUrl: (bucket: string, path: string) => Promise<{ signedUrl: string; path: string; token: string }>;
  logAudit: (entry: {
    providerId: string;
    userId: string;
    action: "upload_ticket_issued" | "upload_ticket_denied";
    resourceId: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const allowedUseCases: UploadUseCase[] = ["gear_image", "damage_photo", "provider_logo"];

function assertMaxBodySize(bodyLength: number, maxBytes = 256 * 1024) {
  if (bodyLength > maxBytes) {
    const error = new Error("Payload Too Large");
    (error as { status?: number }).status = 413;
    throw error;
  }
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRegex.test(value);
}

type ParsedPayload = {
  useCase: UploadUseCase;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  providerId: string;
  reservationId?: string;
};

function parsePayload(raw: unknown): { ok: true; data: ParsedPayload } | { ok: false } {
  if (!raw || typeof raw !== "object") return { ok: false };
  const data = raw as Record<string, unknown>;

  const useCase = data.useCase;
  const fileName = data.fileName;
  const mimeType = data.mimeType;
  const sizeBytes = data.sizeBytes;
  const providerId = data.providerId;
  const reservationId = data.reservationId;

  if (!allowedUseCases.includes(useCase as UploadUseCase)) return { ok: false };
  if (typeof fileName !== "string" || fileName.length === 0) return { ok: false };
  if (typeof mimeType !== "string" || mimeType.length === 0) return { ok: false };
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) return { ok: false };
  if (!isUuid(providerId)) return { ok: false };
  if (useCase === "damage_photo" && !isUuid(reservationId)) return { ok: false };
  if (reservationId && !isUuid(reservationId)) return { ok: false };

  return {
    ok: true,
    data: {
      useCase: useCase as UploadUseCase,
      fileName,
      mimeType,
      sizeBytes,
      providerId: providerId as string,
      reservationId: reservationId as string | undefined,
    },
  };
}

function sanitizeFileName(fileName: string, fallbackExt: string): string {
  const baseName = fileName.split("/").pop() ?? fileName;
  const trimmed = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const parts = trimmed.split(".");
  const ext = parts.length > 1 ? parts.pop() ?? "" : "";
  const safeExt = (ext || fallbackExt || "bin").slice(0, 10).toLowerCase();
  const stem = (parts.join(".") || "file").slice(0, 50);
  return `${stem}.${safeExt}`;
}

function buildPrefix(useCase: UploadUseCase, providerId: string, reservationId?: string) {
  if (useCase === "gear_image") {
    return `${providerId}/gear/`;
  }
  if (useCase === "damage_photo") {
    return reservationId ? `${providerId}/${reservationId}/damage/` : `${providerId}/damage/`;
  }
  return `${providerId}/logo/`;
}

function chooseFallbackExt(mimeType: string) {
  const lowered = mimeType.toLowerCase();
  if (lowered.includes("png")) return "png";
  if (lowered.includes("jpeg") || lowered.includes("jpg")) return "jpg";
  if (lowered.includes("webp")) return "webp";
  return "bin";
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function mapErrorStatus(reason: string): number {
  if (reason === "provider_forbidden" || reason === "reservation_mismatch") return 403;
  if (reason === "file_too_large" || reason === "mime_not_allowed" || reason === "path_not_allowed") return 400;
  if (reason === "reservation_required" || reason === "invalid_payload") return 400;
  return 400;
}

export async function handleUploadTicket(
  req: Request,
  deps: UploadTicketDeps,
  options?: { now?: () => string }
) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await req.text();
    assertMaxBodySize(rawBody.length);

    let parsed: { ok: true; data: ParsedPayload } | { ok: false };
    try {
      parsed = parsePayload(JSON.parse(rawBody));
    } catch {
      parsed = { ok: false };
    }

    if (!parsed.ok) {
      return jsonResponse({ error: "Invalid payload", reasonCode: "invalid_payload" }, 400);
    }

    const payload = parsed.data;

    if (payload.useCase === "damage_photo" && !payload.reservationId) {
      return jsonResponse({ error: "reservationId required", reasonCode: "reservation_required" }, 400);
    }

    const user = await deps.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized", reasonCode: "unauthorized" }, 401);
    }

    const providerAllowed = await deps.checkProviderAccess(payload.providerId, user.id);
    if (!providerAllowed) {
      await deps.logAudit({
        providerId: payload.providerId,
        userId: user.id,
        action: "upload_ticket_denied",
        resourceId: payload.providerId,
        metadata: {
          useCase: payload.useCase,
          reason: "provider_forbidden",
          mime: payload.mimeType,
          size: payload.sizeBytes,
        },
      });
      return jsonResponse({ error: "Forbidden", reasonCode: "provider_forbidden" }, 403);
    }

    if (payload.useCase === "damage_photo" && payload.reservationId) {
      const reservationOk = await deps.checkReservationOwnership(payload.reservationId, payload.providerId);
      if (!reservationOk) {
        await deps.logAudit({
          providerId: payload.providerId,
          userId: user.id,
          action: "upload_ticket_denied",
          resourceId: payload.reservationId,
          metadata: {
            useCase: payload.useCase,
            reason: "reservation_mismatch",
            mime: payload.mimeType,
            size: payload.sizeBytes,
          },
        });
        return jsonResponse({ error: "Reservation scope mismatch", reasonCode: "reservation_mismatch" }, 403);
      }
    }

    const prefix = buildPrefix(payload.useCase, payload.providerId, payload.reservationId);
    const safeName = sanitizeFileName(payload.fileName, chooseFallbackExt(payload.mimeType));
    const path = `${prefix}${(options?.now ? options.now() : crypto.randomUUID())}_${safeName}`;
    const rule = rulesForUseCase(payload.useCase);

    const validation = validateUploadRequest({
      useCase: payload.useCase,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      bucket: rule?.bucket ?? "",
      path,
      expectedPrefix: prefix,
    });

    if (!validation.ok) {
      await deps.logAudit({
        providerId: payload.providerId,
        userId: user.id,
        action: "upload_ticket_denied",
        resourceId: path,
        metadata: {
          useCase: payload.useCase,
          reason: validation.reasonCode,
          mime: payload.mimeType,
          size: payload.sizeBytes,
          bucket: rule?.bucket,
          path,
        },
      });
      return jsonResponse({
        error: "Validation failed",
        reasonCode: validation.reasonCode,
      }, mapErrorStatus(validation.reasonCode ?? "validation_failed"));
    }

    const signed = await deps.createSignedUploadUrl(rule!.bucket, path);

    await deps.logAudit({
      providerId: payload.providerId,
      userId: user.id,
      action: "upload_ticket_issued",
      resourceId: path,
      metadata: {
        useCase: payload.useCase,
        bucket: rule?.bucket,
        path,
        mime: payload.mimeType,
        size: payload.sizeBytes,
      },
    });

    return jsonResponse({
      bucket: rule!.bucket,
      path,
      token: signed.token,
      signedUrl: signed.signedUrl,
      expiresIn: 15 * 60,
      maxBytes: rule!.maxBytes,
      allowedMime: rule!.allowedMime,
    });
  } catch (error) {
    console.error("upload_ticket error", error);
    const status = (error as { status?: number }).status ?? 500;
    return jsonResponse({ error: "Internal error" }, status);
  }
}
