import * as OTPAuth from 'otpauth';
import { describe, expect, it } from 'vitest';
import {
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  verifyTotpCode,
} from '../mfa.service.js';

describe('mfa.service', () => {
  describe('encryptSecret / decryptSecret', () => {
    it('should round-trip a secret', () => {
      const original = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptSecret(original);
      expect(encrypted).not.toBe(original);
      expect(decryptSecret(encrypted)).toBe(original);
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const original = 'JBSWY3DPEHPK3PXP';
      const a = encryptSecret(original);
      const b = encryptSecret(original);
      expect(a).not.toBe(b);
      // Both decrypt back to the same value
      expect(decryptSecret(a)).toBe(original);
      expect(decryptSecret(b)).toBe(original);
    });

    it('should throw on invalid format', () => {
      expect(() => decryptSecret('not-valid')).toThrow('Invalid encrypted secret format');
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = encryptSecret('test-secret');
      const parts = encrypted.split(':');
      // Tamper with the ciphertext portion
      parts[2] = Buffer.from('tampered').toString('base64');
      expect(() => decryptSecret(parts.join(':'))).toThrow();
    });
  });

  describe('generateTotpSecret', () => {
    it('should return a base32 secret and otpauth URI', () => {
      const { secret, uri } = generateTotpSecret();
      expect(secret).toMatch(/^[A-Z2-7]+=*$/);
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('TaskForge');
    });

    it('should generate unique secrets each time', () => {
      const a = generateTotpSecret();
      const b = generateTotpSecret();
      expect(a.secret).not.toBe(b.secret);
    });
  });

  describe('verifyTotpCode', () => {
    it('should accept a valid current code', () => {
      const { secret } = generateTotpSecret();
      const totp = new OTPAuth.TOTP({
        issuer: 'TaskForge',
        label: 'TaskForge',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const code = totp.generate();
      expect(verifyTotpCode(secret, code)).toBe(true);
    });

    it('should reject an invalid code', () => {
      const { secret } = generateTotpSecret();
      expect(verifyTotpCode(secret, '000000')).toBe(false);
    });

    it('should reject a code with wrong length', () => {
      const { secret } = generateTotpSecret();
      expect(verifyTotpCode(secret, '12345')).toBe(false);
    });
  });
});
