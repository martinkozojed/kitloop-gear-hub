import { describe, expect, it } from "vitest";
import { validateUploadRequest } from "@/lib/upload/validation";

const defaultParams = {
  useCase: "gear_image" as const,
  mimeType: "image/png",
  sizeBytes: 1024 * 1024,
  bucket: "gear-images",
};

describe("validateUploadRequest", () => {
  it("accepts valid mime and size", () => {
    const result = validateUploadRequest({
      ...defaultParams,
      path: "provider123/gear/example.png",
      expectedPrefix: "provider123/gear/",
    });

    expect(result.ok).toBe(true);
    expect(result.reasonCode).toBeUndefined();
  });

  it("rejects disallowed mime type", () => {
    const result = validateUploadRequest({
      ...defaultParams,
      mimeType: "application/pdf",
      path: "provider123/gear/example.pdf",
      expectedPrefix: "provider123/gear/",
    });

    expect(result.ok).toBe(false);
    expect(result.reasonCode).toBe("mime_not_allowed");
  });

  it("rejects oversized files", () => {
    const result = validateUploadRequest({
      ...defaultParams,
      sizeBytes: 10 * 1024 * 1024,
      path: "provider123/gear/large.png",
      expectedPrefix: "provider123/gear/",
    });

    expect(result.ok).toBe(false);
    expect(result.reasonCode).toBe("file_too_large");
  });

  it("rejects paths outside allowed prefix", () => {
    const result = validateUploadRequest({
      ...defaultParams,
      path: "other-provider/gear/example.png",
      expectedPrefix: "provider123/gear/",
    });

    expect(result.ok).toBe(false);
    expect(result.reasonCode).toBe("path_not_allowed");
  });
});
