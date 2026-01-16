import { describe, expect, it, vi } from "vitest";
import { handleUploadTicket } from "./handler.ts";

const providerId = "11111111-1111-1111-1111-111111111111";

const basePayload = {
  useCase: "gear_image" as const,
  fileName: "photo.png",
  mimeType: "image/png",
  sizeBytes: 1024,
  providerId,
};

const baseDeps = () => ({
  getUser: vi.fn().mockResolvedValue({ id: "user-1" }),
  checkProviderAccess: vi.fn().mockResolvedValue(true),
  checkReservationOwnership: vi.fn().mockResolvedValue(true),
  createSignedUploadUrl: vi.fn().mockResolvedValue({
    signedUrl: "https://example.com/upload",
    path: "path",
    token: "token-123",
  }),
  logAudit: vi.fn().mockResolvedValue(undefined),
});

describe("upload_ticket handler", () => {
  it("issues ticket and logs audit on happy path", async () => {
    const deps = baseDeps();
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { Authorization: "Bearer test" },
      body: JSON.stringify(basePayload),
    });

    const res = await handleUploadTicket(req, deps);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.bucket).toBe("gear-images");
    expect(typeof body.path).toBe("string");
    expect(deps.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "upload_ticket_issued" }),
    );
  });

  it("denies oversized uploads and logs denial", async () => {
    const deps = baseDeps();
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { Authorization: "Bearer test" },
      body: JSON.stringify({ ...basePayload, sizeBytes: 10 * 1024 * 1024 }),
    });

    const res = await handleUploadTicket(req, deps);
    const body = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(body.reasonCode).toBe("file_too_large");
    expect(deps.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "upload_ticket_denied" }),
    );
  });
});
