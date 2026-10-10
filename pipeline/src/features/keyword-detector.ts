// Default suspicious keyword list
export const DEFAULT_SUSPICIOUS_KEYWORDS = [
  'urgent', 'verify', 'account suspended', 'click here', 'confirm your',
  'update your', 'login required', 'password expired', 'security alert',
  'unusual activity', 'limited time', 'act now', 'immediate action',
  'your account', 'suspended', 'verify your', 'confirm your identity',
  'bank account', 'credit card', 'social security', 'ssn', 'pin number',
  'wire transfer', 'western union', 'money transfer', 'prize', 'winner',
  'congratulations', 'free gift', 'claim your', 'you have been selected',
  'dear customer', 'dear user', 'dear account holder',
  'click the link', 'click below', 'follow the link',
  'reset your password', 'validate your', 'reactivate your',
];

export function detectSuspiciousKeywords(
  text: string,
  keywords: string[] = DEFAULT_SUSPICIOUS_KEYWORDS
): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  }

  return [...new Set(found)];
}
