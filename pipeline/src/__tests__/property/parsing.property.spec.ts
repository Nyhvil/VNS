import * as fc from 'fast-check';
import { parseEmail } from '../../parser/email-parser';

// Feature: phishing-analysis-pipeline, Property 1: Email parsing round trip
describe('Email Parsing — Property Tests', () => {
  describe('Property 1: Email parsing round trip', () => {
    it('should consistently parse sender and subject from generated emails', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid email addresses
          fc.emailAddress(),
          // Generate printable ASCII subjects (avoid control chars, leading/trailing whitespace)
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[\x21-\x7E][\x20-\x7E]*[\x21-\x7E]$/.test(s) || /^[\x21-\x7E]$/.test(s)),
          // Generate body text
          fc.string({ minLength: 1, maxLength: 200 }),
          async (senderEmail, subject, body) => {
            const rawEmail = [
              `From: ${senderEmail}`,
              `To: recipient@test.com`,
              `Subject: ${subject}`,
              `Date: Mon, 1 Jan 2024 00:00:00 +0000`,
              `Message-ID: <test@example.com>`,
              `MIME-Version: 1.0`,
              `Content-Type: text/plain`,
              ``,
              body,
            ].join('\r\n');

            const parsed = await parseEmail(rawEmail);

            // Round-trip property: parsed sender should match input
            expect(parsed.sender).toBe(senderEmail);
            // Subject should be preserved
            expect(parsed.subject).toBe(subject);
            // Body should be a string
            expect(typeof parsed.body).toBe('string');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always return arrays for urls and attachments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => /^[\x20-\x7E]+$/.test(s)),
          async (senderEmail, body) => {
            const rawEmail = [
              `From: ${senderEmail}`,
              `To: recipient@test.com`,
              `Subject: Test`,
              `Date: Mon, 1 Jan 2024 00:00:00 +0000`,
              `Message-ID: <test@example.com>`,
              `Content-Type: text/plain`,
              ``,
              body,
            ].join('\r\n');

            const parsed = await parseEmail(rawEmail);

            expect(Array.isArray(parsed.urls)).toBe(true);
            expect(Array.isArray(parsed.attachments)).toBe(true);
            expect(parsed.urls.length).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
