import { parseEmail } from '../../parser/email-parser';

const VALID_EMAIL = `From: sender@example.com
To: recipient@test.com
Subject: Test Email
Date: Mon, 1 Jan 2024 00:00:00 +0000
Message-ID: <test@example.com>
MIME-Version: 1.0
Content-Type: text/plain

Hello, please click http://example.com/link to verify your account.
`;

const EMAIL_WITH_AUTH = `From: sender@example.com
To: recipient@test.com
Subject: Auth Test
Date: Mon, 1 Jan 2024 00:00:00 +0000
Message-ID: <test2@example.com>
Authentication-Results: mx.example.com; spf=pass smtp.mailfrom=example.com; dkim=fail header.d=example.com
MIME-Version: 1.0
Content-Type: text/plain

Test body.
`;

describe('Email Parser', () => {
  describe('parseEmail()', () => {
    it('should parse sender address', async () => {
      const result = await parseEmail(VALID_EMAIL);
      expect(result.sender).toBe('sender@example.com');
    });

    it('should parse subject', async () => {
      const result = await parseEmail(VALID_EMAIL);
      expect(result.subject).toBe('Test Email');
    });

    it('should extract URLs from body', async () => {
      const result = await parseEmail(VALID_EMAIL);
      expect(result.urls).toContain('http://example.com/link');
    });

    it('should return empty arrays for email with no URLs', async () => {
      const noUrlEmail = `From: a@b.com
To: c@d.com
Subject: No URLs
Date: Mon, 1 Jan 2024 00:00:00 +0000
Message-ID: <test3@example.com>
Content-Type: text/plain

Just plain text, no links here.
`;
      const result = await parseEmail(noUrlEmail);
      expect(result.urls).toEqual([]);
    });

    it('should parse SPF pass result from Authentication-Results header', async () => {
      const result = await parseEmail(EMAIL_WITH_AUTH);
      expect(result.spf_result).toBe('pass');
    });

    it('should parse DKIM fail result from Authentication-Results header', async () => {
      const result = await parseEmail(EMAIL_WITH_AUTH);
      expect(result.dkim_result).toBe('fail');
    });

    it('should return null for spf_result when no auth header', async () => {
      const result = await parseEmail(VALID_EMAIL);
      expect(result.spf_result).toBeNull();
    });

    it('should return body as string', async () => {
      const result = await parseEmail(VALID_EMAIL);
      expect(typeof result.body).toBe('string');
      expect(result.body.length).toBeGreaterThan(0);
    });

    it('should return attachments as array', async () => {
      const result = await parseEmail(VALID_EMAIL);
      expect(Array.isArray(result.attachments)).toBe(true);
    });
  });
});
