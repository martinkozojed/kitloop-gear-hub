import { describe, it, expect } from 'vitest';
import { validateEmail } from './availability';

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('should accept standard email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should accept email with subdomain', () => {
      expect(validateEmail('test@mail.example.com')).toBe(true);
    });

    it('should accept email with plus sign', () => {
      expect(validateEmail('test+tag@example.com')).toBe(true);
    });

    it('should accept email with dots in local part', () => {
      expect(validateEmail('first.last@example.com')).toBe(true);
    });

    it('should accept email with special characters', () => {
      expect(validateEmail('test.name+tag@example.co.uk')).toBe(true);
    });

    it('should accept email with hyphen in domain', () => {
      expect(validateEmail('test@my-domain.com')).toBe(true);
    });

    it('should accept email with numbers', () => {
      expect(validateEmail('user123@example456.com')).toBe(true);
    });
  });

  describe('invalid emails - consecutive dots', () => {
    it('should reject consecutive dots in local part', () => {
      expect(validateEmail('test..test@example.com')).toBe(false);
    });

    it('should reject consecutive dots in domain', () => {
      expect(validateEmail('test@example..com')).toBe(false);
    });
  });

  describe('invalid emails - leading/trailing dots', () => {
    it('should reject leading dot in local part', () => {
      expect(validateEmail('.test@example.com')).toBe(false);
    });

    it('should reject trailing dot in local part', () => {
      expect(validateEmail('test.@example.com')).toBe(false);
    });

    it('should reject leading dot in domain', () => {
      expect(validateEmail('test@.example.com')).toBe(false);
    });

    it('should reject trailing dot in domain', () => {
      expect(validateEmail('test@example.com.')).toBe(false);
    });

    it('should reject trailing dot after TLD', () => {
      expect(validateEmail('test@example.')).toBe(false);
    });
  });

  describe('invalid emails - missing parts', () => {
    it('should reject email without domain', () => {
      expect(validateEmail('test@')).toBe(false);
    });

    it('should reject email without local part', () => {
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should reject email without TLD', () => {
      expect(validateEmail('test@example')).toBe(false);
    });

    it('should reject email without @ sign', () => {
      expect(validateEmail('testexample.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('should reject whitespace only', () => {
      expect(validateEmail('   ')).toBe(false);
    });
  });

  describe('invalid emails - multiple @ signs', () => {
    it('should reject multiple @ signs', () => {
      expect(validateEmail('test@@example.com')).toBe(false);
    });

    it('should reject email with @ in local and domain', () => {
      expect(validateEmail('test@test@example.com')).toBe(false);
    });
  });

  describe('invalid emails - invalid characters', () => {
    it('should reject spaces in email', () => {
      expect(validateEmail('test user@example.com')).toBe(false);
    });

    it('should reject invalid characters in domain', () => {
      expect(validateEmail('test@exam ple.com')).toBe(false);
    });
  });

  describe('invalid emails - domain label issues', () => {
    it('should reject domain starting with hyphen', () => {
      expect(validateEmail('test@-example.com')).toBe(false);
    });

    it('should reject domain ending with hyphen', () => {
      expect(validateEmail('test@example-.com')).toBe(false);
    });

    it('should reject domain label starting with hyphen', () => {
      expect(validateEmail('test@mail.-example.com')).toBe(false);
    });

    it('should reject domain label ending with hyphen', () => {
      expect(validateEmail('test@mail.example-.com')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should trim whitespace', () => {
      expect(validateEmail('  test@example.com  ')).toBe(true);
    });

    it('should handle single character local part', () => {
      expect(validateEmail('a@example.com')).toBe(true);
    });

    it('should handle long valid email', () => {
      const longLocal = 'a'.repeat(60);
      expect(validateEmail(`${longLocal}@example.com`)).toBe(true);
    });

    it('should reject label longer than 63 characters', () => {
      const longLabel = 'a'.repeat(64);
      expect(validateEmail(`test@${longLabel}.com`)).toBe(false);
    });
  });
});
