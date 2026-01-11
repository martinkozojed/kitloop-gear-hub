import { describe, it, expect } from 'vitest';
import { validateImageFile } from './file-validation';

// Helper: Create file with specific magic bytes
function createFileWithMagicBytes(
  bytes: number[],
  filename: string,
  mimeType: string
): File {
  const uint8 = new Uint8Array(bytes);
  return new File([uint8], filename, { type: mimeType });
}

// Real magic bytes for testing
const MAGIC_BYTES_JPEG = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46];
const MAGIC_BYTES_PNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const MAGIC_BYTES_GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const MAGIC_BYTES_WEBP_RIFF = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
const MAGIC_BYTES_EXE = [0x4D, 0x5A]; // PE executable

describe('validateImageFile', () => {
  describe('file size validation', () => {
    it('should reject file larger than 5MB', async () => {
      const largeContent = new Array(6 * 1024 * 1024).fill(0);
      const largeFile = createFileWithMagicBytes(
        [...MAGIC_BYTES_JPEG, ...largeContent],
        'large.jpg',
        'image/jpeg'
      );

      const result = await validateImageFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('příliš velký');
    });

    it('should accept file smaller than 5MB', async () => {
      const smallFile = createFileWithMagicBytes(
        MAGIC_BYTES_JPEG,
        'small.jpg',
        'image/jpeg'
      );

      const result = await validateImageFile(smallFile);

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('jpeg');
    });
  });

  describe('magic bytes detection', () => {
    it('should reject file with no detectable type (invalid magic bytes)', async () => {
      const invalidFile = createFileWithMagicBytes(
        [0x00, 0x00, 0x00, 0x00],
        'file.jpg',
        'image/jpeg'
      );

      const result = await validateImageFile(invalidFile);

      expect(result.valid).toBe(false);
      expect(result.detectedType).toBe(null);
      expect(result.error).toContain('Neplatný formát');
    });

    it('should detect PNG from magic bytes', async () => {
      const pngFile = createFileWithMagicBytes(
        MAGIC_BYTES_PNG,
        'file.png',
        'image/png'
      );

      const result = await validateImageFile(pngFile);

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('png');
    });
  });

  describe('allowedTypes enforcement', () => {
    it('should reject detected type not in allowedTypes', async () => {
      const gifFile = createFileWithMagicBytes(
        MAGIC_BYTES_GIF,
        'file.gif',
        'image/gif'
      );

      // Default allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      const result = await validateImageFile(gifFile);

      expect(result.valid).toBe(false);
      expect(result.detectedType).toBe('gif');
      expect(result.error).toContain('GIF není povolen');
    });

    it('should accept detected type in allowedTypes', async () => {
      const jpegFile = createFileWithMagicBytes(
        MAGIC_BYTES_JPEG,
        'file.jpg',
        'image/jpeg'
      );

      const result = await validateImageFile(jpegFile);

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('jpeg');
    });

    it('should enforce custom allowedTypes', async () => {
      const pngFile = createFileWithMagicBytes(
        MAGIC_BYTES_PNG,
        'file.png',
        'image/png'
      );

      // Only allow JPEG
      const result = await validateImageFile(pngFile, ['image/jpeg']);

      expect(result.valid).toBe(false);
      expect(result.detectedType).toBe('png');
      expect(result.error).toContain('PNG není povolen');
    });

    it('should normalize allowedTypes (jpg -> jpeg)', async () => {
      const jpegFile = createFileWithMagicBytes(
        MAGIC_BYTES_JPEG,
        'file.jpg',
        'image/jpg'
      );

      // Pass 'image/jpg' which should be normalized to 'jpeg'
      const result = await validateImageFile(jpegFile, ['image/jpg']);

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('jpeg');
    });
  });

  describe('empty MIME type handling (CRITICAL TEST)', () => {
    it('should STILL enforce allowedTypes when file.type is empty', async () => {
      // GIF magic bytes but empty MIME, default allowedTypes excludes GIF
      const gifFile = createFileWithMagicBytes(
        MAGIC_BYTES_GIF,
        'file.gif',
        '' // Empty MIME
      );

      const result = await validateImageFile(gifFile);

      // MUST FAIL because 'gif' is not in default allowedTypes
      expect(result.valid).toBe(false);
      expect(result.detectedType).toBe('gif');
      expect(result.error).toContain('GIF není povolen');
    });

    it('should PASS when detectedType is in allowedTypes AND file.type is empty', async () => {
      // JPEG magic bytes, empty MIME, but JPEG is in default allowedTypes
      const jpegFile = createFileWithMagicBytes(
        MAGIC_BYTES_JPEG,
        'file.jpg',
        '' // Empty MIME
      );

      const result = await validateImageFile(jpegFile);

      // Should PASS: detectedType='jpeg' is in default allowedTypes
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('jpeg');
    });
  });

  describe('MIME type spoofing detection', () => {
    it('should reject when file.type does not match detectedType', async () => {
      // File claims to be PNG but magic bytes say JPEG
      const spoofedFile = createFileWithMagicBytes(
        MAGIC_BYTES_JPEG,
        'malware.png',
        'image/png' // Claims PNG
      );

      const result = await validateImageFile(spoofedFile);

      expect(result.valid).toBe(false);
      expect(result.detectedType).toBe('jpeg');
      expect(result.error).toContain('neodpovídá jeho obsahu');
    });

    it('should accept when file.type matches detectedType', async () => {
      const validFile = createFileWithMagicBytes(
        MAGIC_BYTES_PNG,
        'file.png',
        'image/png'
      );

      const result = await validateImageFile(validFile);

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('png');
    });

    it('should normalize client MIME (image/jpg -> jpeg)', async () => {
      const fileWithJpg = createFileWithMagicBytes(
        MAGIC_BYTES_JPEG,
        'file.jpg',
        'image/jpg' // jpg instead of jpeg
      );

      const result = await validateImageFile(fileWithJpg);

      // Should PASS: 'image/jpg' normalized to 'jpeg' matches detected 'jpeg'
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('jpeg');
    });
  });

  describe('integration scenarios', () => {
    it('scenario: valid JPEG with correct MIME', async () => {
      const file = createFileWithMagicBytes(
        MAGIC_BYTES_JPEG,
        'photo.jpg',
        'image/jpeg'
      );

      const result = await validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('jpeg');
    });

    it('scenario: .exe renamed to .jpg (magic bytes detect exe)', async () => {
      const malware = createFileWithMagicBytes(
        MAGIC_BYTES_EXE,
        'virus.jpg',
        'image/jpeg'
      );

      const result = await validateImageFile(malware);

      expect(result.valid).toBe(false);
      expect(result.detectedType).toBe(null);
      expect(result.error).toContain('Neplatný formát');
    });

    it('scenario: valid PNG with empty MIME (trust magic bytes)', async () => {
      const file = createFileWithMagicBytes(
        MAGIC_BYTES_PNG,
        'image.png',
        ''
      );

      const result = await validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('png');
    });

    it('scenario: GIF with empty MIME but allowedTypes excludes GIF', async () => {
      const file = createFileWithMagicBytes(
        MAGIC_BYTES_GIF,
        'anim.gif',
        ''
      );

      const result = await validateImageFile(file, [
        'image/jpeg',
        'image/png',
      ]);

      expect(result.valid).toBe(false);
      expect(result.detectedType).toBe('gif');
      expect(result.error).toContain('GIF není povolen');
    });

    it('scenario: WEBP with correct RIFF header', async () => {
      const file = createFileWithMagicBytes(
        MAGIC_BYTES_WEBP_RIFF,
        'image.webp',
        'image/webp'
      );

      const result = await validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('webp');
    });
  });
});
