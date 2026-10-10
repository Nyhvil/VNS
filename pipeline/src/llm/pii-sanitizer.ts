// Regex patterns for PII detection
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
// Vietnamese citizen ID (CCCD): 12 digits standing alone
const VN_ID_REGEX = /(?<!\d)\d{12}(?!\d)/g;
// Vietnamese phone numbers: 0xxxxxxxxx or +84xxxxxxxxx, with optional separators
const VN_PHONE_REGEX = /(?<!\d)(?:\+?84|0)(?:[\s.\-]?\d){9}(?!\d)/g;
const PHONE_REGEX = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

/**
 * Remove personal data before the text leaves the pipeline for an external
 * model. The placeholders keep the fact that "a phone number was here", which
 * is all the model needs to judge the content.
 */
export function sanitizePii(text: string): string {
  return text
    .replace(EMAIL_REGEX, '[EMAIL_REDACTED]')
    .replace(CREDIT_CARD_REGEX, '[CC_REDACTED]')
    .replace(VN_ID_REGEX, '[ID_REDACTED]')
    .replace(VN_PHONE_REGEX, '[PHONE_REDACTED]')
    .replace(PHONE_REGEX, '[PHONE_REDACTED]')
    .replace(SSN_REGEX, '[SSN_REDACTED]');
}
