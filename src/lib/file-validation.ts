/**
 * File Validation Utilities
 * P0 Security Fix: Magic byte verification for uploaded files
 * Prevents spoofed file types (e.g., .exe renamed to .jpg)
 */

/**
 * Supported image formats with their magic byte signatures
 */
const MAGIC_BYTES = {
  jpeg: [
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG/JFIF
    [0xFF, 0xD8, 0xFF, 0xE1], // JPEG/Exif
    [0xFF, 0xD8, 0xFF, 0xE2], // JPEG
    [0xFF, 0xD8, 0xFF, 0xE3], // JPEG
    [0xFF, 0xD8, 0xFF, 0xE8], // JPEG
  ],
  png: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]], // PNG signature
  webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF (need to check WEBP at offset 8)
  gif: [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
};

/**
 * Check if byte array matches a magic byte signature
 */
function matchesMagicBytes(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Detect image type from file magic bytes
 * @param file - File to analyze
 * @returns Promise with detected type or null if invalid
 */
export async function detectImageType(
  file: File
): Promise<'jpeg' | 'png' | 'webp' | 'gif' | null> {
  try {
    // Read first 12 bytes (enough for all signatures)
    const arrayBuffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Check JPEG
    for (const signature of MAGIC_BYTES.jpeg) {
      if (matchesMagicBytes(bytes, signature)) {
        return 'jpeg';
      }
    }

    // Check PNG
    for (const signature of MAGIC_BYTES.png) {
      if (matchesMagicBytes(bytes, signature)) {
        return 'png';
      }
    }

    // Check GIF
    for (const signature of MAGIC_BYTES.gif) {
      if (matchesMagicBytes(bytes, signature)) {
        return 'gif';
      }
    }

    // Check WEBP (RIFF header + WEBP signature at offset 8)
    if (matchesMagicBytes(bytes, MAGIC_BYTES.webp[0])) {
      // Read more bytes to check WEBP signature at offset 8
      const fullHeader = await file.slice(0, 16).arrayBuffer();
      const fullBytes = new Uint8Array(fullHeader);

      // Check for "WEBP" at offset 8
      const webpSignature = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
      if (
        fullBytes.length >= 12 &&
        matchesMagicBytes(fullBytes.slice(8), webpSignature)
      ) {
        return 'webp';
      }
    }

    return null;
  } catch (error) {
    console.error('Error detecting file type:', error);
    return null;
  }
}

/**
 * Validate image file using magic bytes
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types (e.g., ['image/jpeg', 'image/png'])
 * @returns Promise<{valid: boolean, detectedType: string | null, error?: string}>
 */
export async function validateImageFile(
  file: File,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp']
): Promise<{ valid: boolean; detectedType: string | null; error?: string }> {
  // First check: file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      detectedType: null,
      error: 'Soubor je příliš velký (max 5MB)',
    };
  }

  // Second check: magic bytes
  const detectedType = await detectImageType(file);

  if (!detectedType) {
    return {
      valid: false,
      detectedType: null,
      error: 'Neplatný formát obrázku',
    };
  }

  // Third check: verify against allowed types
  const normalizedAllowed = allowedTypes.map((type) =>
    type.replace('image/', '').replace('jpg', 'jpeg')
  );

  if (!normalizedAllowed.includes(detectedType)) {
    return {
      valid: false,
      detectedType,
      error: `Formát ${detectedType.toUpperCase()} není povolen`,
    };
  }

  // Fourth check: verify client-reported MIME matches detected type
  const clientType = file.type.replace('image/', '').replace('jpg', 'jpeg');
  
  // Handle empty MIME type (common in some browsers/file systems)
  if (clientType === '') {
    // No client-reported type - rely solely on magic bytes
    // This is acceptable as magic bytes are more reliable than MIME headers
    return {
      valid: true,
      detectedType,
    };
  }
  
  // If client reported a type, it must match detected type
  if (clientType !== detectedType) {
    // Client reported type doesn't match detected type (spoofing attempt)
    return {
      valid: false,
      detectedType,
      error: 'Typ souboru neodpovídá jeho obsahu (možný pokus o falšování)',
    };
  }

  return {
    valid: true,
    detectedType,
  };
}

/**
 * Validate multiple image files
 * @param files - Array of files to validate
 * @param allowedTypes - Array of allowed MIME types
 * @returns Promise with validation results
 */
export async function validateImageFiles(
  files: File[],
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp']
): Promise<{
  valid: File[];
  invalid: Array<{ file: File; error: string }>;
}> {
  const valid: File[] = [];
  const invalid: Array<{ file: File; error: string }> = [];

  for (const file of files) {
    const result = await validateImageFile(file, allowedTypes);

    if (result.valid) {
      valid.push(file);
    } else {
      invalid.push({
        file,
        error: result.error || 'Neplatný soubor',
      });
    }
  }

  return { valid, invalid };
}
