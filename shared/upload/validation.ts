export type UploadUseCase = "gear_image" | "damage_photo" | "provider_logo";

export type UploadReasonCode =
  | "use_case_unknown"
  | "bucket_not_allowed"
  | "mime_not_allowed"
  | "file_too_large"
  | "path_not_allowed";

export interface UploadRules {
  useCase: UploadUseCase;
  allowedMime: string[];
  maxBytes: number;
  bucket: string;
  /**
   * Descriptive prefix template (may include placeholders).
   * Use `expectedPrefix` in validateUploadRequest for concrete checks.
   */
  allowedPrefix: string;
}

const FIVE_MB = 5 * 1024 * 1024;
const TWO_MB = 2 * 1024 * 1024;

const uploadRules: Record<UploadUseCase, UploadRules> = {
  gear_image: {
    useCase: "gear_image",
    allowedMime: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: FIVE_MB,
    bucket: "gear-images",
    allowedPrefix: "{providerId}/gear/",
  },
  damage_photo: {
    useCase: "damage_photo",
    allowedMime: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: FIVE_MB,
    bucket: "damage-photos",
    allowedPrefix: "{providerId}/{reservationId}/",
  },
  provider_logo: {
    useCase: "provider_logo",
    allowedMime: ["image/png", "image/jpeg", "image/webp"],
    maxBytes: TWO_MB,
    bucket: "logos",
    allowedPrefix: "{providerId}/logo/",
  },
};

export function rulesForUseCase(useCase: UploadUseCase): UploadRules | null {
  return uploadRules[useCase] ?? null;
}

interface ValidateParams {
  useCase: UploadUseCase;
  mimeType: string;
  sizeBytes: number;
  bucket: string;
  path?: string;
  expectedPrefix?: string;
}

export function validateUploadRequest(params: ValidateParams): {
  ok: boolean;
  reasonCode?: UploadReasonCode;
  rule?: UploadRules;
} {
  const rule = rulesForUseCase(params.useCase);
  if (!rule) {
    return { ok: false, reasonCode: "use_case_unknown" };
  }

  if (params.bucket !== rule.bucket) {
    return { ok: false, reasonCode: "bucket_not_allowed", rule };
  }

  const normalizedMime = params.mimeType.toLowerCase();
  if (!rule.allowedMime.includes(normalizedMime)) {
    return { ok: false, reasonCode: "mime_not_allowed", rule };
  }

  if (params.sizeBytes > rule.maxBytes || params.sizeBytes <= 0) {
    return { ok: false, reasonCode: "file_too_large", rule };
  }

  if (params.path) {
    if (params.path.includes("..")) {
      return { ok: false, reasonCode: "path_not_allowed", rule };
    }
    const prefix = params.expectedPrefix ?? rule.allowedPrefix;
    if (prefix && !params.path.startsWith(prefix)) {
      return { ok: false, reasonCode: "path_not_allowed", rule };
    }
  }

  return { ok: true, rule };
}
