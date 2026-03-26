import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('email.service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    // Ensure SMTP vars are absent so defaults apply
    for (const key of [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_SECURE',
      'SMTP_TLS_REJECT_UNAUTHORIZED',
      'EMAIL_FROM',
    ]) {
      vi.stubEnv(key, undefined as unknown as string);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function loadModule() {
    return import('../email.service.js');
  }

  describe('createTransportOptions', () => {
    it('should return defaults when no env vars are set', async () => {
      const { createTransportOptions } = await loadModule();
      const opts = createTransportOptions();

      expect(opts.host).toBe('localhost');
      expect(opts.port).toBe(1025);
      expect(opts.secure).toBe(false);
      expect(opts.auth).toBeUndefined();
      expect(opts.tls).toBeUndefined();
    });

    it('should use custom SMTP host and port', async () => {
      process.env.SMTP_HOST = 'smtp.sendgrid.net';
      process.env.SMTP_PORT = '587';

      const { createTransportOptions } = await loadModule();
      const opts = createTransportOptions();

      expect(opts.host).toBe('smtp.sendgrid.net');
      expect(opts.port).toBe(587);
    });

    it('should enable TLS when SMTP_SECURE is true', async () => {
      process.env.SMTP_SECURE = 'true';

      const { createTransportOptions } = await loadModule();
      const opts = createTransportOptions();

      expect(opts.secure).toBe(true);
    });

    it('should not enable TLS when SMTP_SECURE is false', async () => {
      process.env.SMTP_SECURE = 'false';

      const { createTransportOptions } = await loadModule();
      const opts = createTransportOptions();

      expect(opts.secure).toBe(false);
    });

    it('should include auth when SMTP_USER is set', async () => {
      process.env.SMTP_USER = 'apikey';
      process.env.SMTP_PASS = 'SG.secret';

      const { createTransportOptions } = await loadModule();
      const opts = createTransportOptions();

      expect(opts.auth).toEqual({ user: 'apikey', pass: 'SG.secret' });
    });

    it('should not include auth when SMTP_USER is empty', async () => {
      process.env.SMTP_USER = '';

      const { createTransportOptions } = await loadModule();
      const opts = createTransportOptions();

      expect(opts.auth).toBeUndefined();
    });

    it('should disable TLS cert verification when SMTP_TLS_REJECT_UNAUTHORIZED is false', async () => {
      process.env.SMTP_TLS_REJECT_UNAUTHORIZED = 'false';

      const { createTransportOptions } = await loadModule();
      const opts = createTransportOptions();

      expect(opts.tls).toEqual({ rejectUnauthorized: false });
    });

    it('should not set tls options when SMTP_TLS_REJECT_UNAUTHORIZED is true (default)', async () => {
      process.env.SMTP_TLS_REJECT_UNAUTHORIZED = 'true';

      const { createTransportOptions } = await loadModule();
      const opts = createTransportOptions();

      expect(opts.tls).toBeUndefined();
    });

    it('should configure for production SES-like setup', async () => {
      process.env.SMTP_HOST = 'email-smtp.us-east-1.amazonaws.com';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_SECURE = 'true';
      process.env.SMTP_USER = 'AKIAIOSFODNN7EXAMPLE';
      process.env.SMTP_PASS = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

      const { createTransportOptions } = await loadModule();
      const opts = createTransportOptions();

      expect(opts.host).toBe('email-smtp.us-east-1.amazonaws.com');
      expect(opts.port).toBe(465);
      expect(opts.secure).toBe(true);
      expect(opts.auth).toEqual({
        user: 'AKIAIOSFODNN7EXAMPLE',
        pass: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      });
      expect(opts.tls).toBeUndefined();
    });

    it('should configure for staging with self-signed cert', async () => {
      process.env.SMTP_HOST = 'mail.staging.internal';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_SECURE = 'false';
      process.env.SMTP_TLS_REJECT_UNAUTHORIZED = 'false';

      const { createTransportOptions } = await loadModule();
      const opts = createTransportOptions();

      expect(opts.secure).toBe(false);
      expect(opts.tls).toEqual({ rejectUnauthorized: false });
    });
  });
});
