// Default suspicious keyword list (English)
export const ENGLISH_SUSPICIOUS_KEYWORDS = [
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

// Vietnamese phrases taken from the team's own list of common scam patterns
// in Vietnam (fake bank / OTP, fake police, fake prize, easy job, phishing
// link, investment, shipping, loan, SIM, tax, impersonation, QR, urgency).
// Only phrases specific enough to be a signal on their own are kept: single
// everyday words such as "đơn hàng" or "công an" would flag ordinary messages.
export const VIETNAMESE_SUSPICIOUS_KEYWORDS = [
  'mã otp', 'mã xác thực', 'xác minh tài khoản', 'tài khoản bị khóa',
  'tài khoản bị đóng băng', 'lệnh bắt', 'liên quan đến vụ án', 'rửa tiền',
  'trúng thưởng', 'nhận thưởng', 'chúc mừng bạn', 'việc nhẹ lương cao',
  'thu nhập thụ động', 'không cần kinh nghiệm', 'đặt cọc', 'phí đăng ký',
  'hoa hồng cao', 'click vào link', 'nhấn vào đây', 'xác nhận ngay',
  'cập nhật thông tin', 'đăng nhập lại', 'chuyển tiền giúp', 'phí hải quan',
  'đầu tư sinh lời', 'lợi nhuận cam kết', 'lãi suất cao', 'giao hàng thất bại',
  'vay nhanh', 'duyệt ngay', 'không cần thế chấp', 'giải ngân nhanh',
  'nâng cấp sim', 'khóa sim', 'cung cấp mã', 'hoàn thuế', 'nợ thuế',
  'mượn tiền', 'tài khoản bị hack', 'xác thực sinh trắc', 'quét mã qr',
  'khẩn cấp', 'ngay lập tức', 'trong vòng 24h', 'bị khóa vĩnh viễn',
];

export const DEFAULT_SUSPICIOUS_KEYWORDS = [
  ...ENGLISH_SUSPICIOUS_KEYWORDS,
  ...VIETNAMESE_SUSPICIOUS_KEYWORDS,
];

/**
 * Lowercase and strip Vietnamese diacritics, so that "Tài khoản bị khóa" and
 * "tai khoan bi khoa" (very common in SMS and chat) match the same keyword.
 */
export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export function detectSuspiciousKeywords(
  text: string,
  keywords: string[] = DEFAULT_SUSPICIOUS_KEYWORDS
): string[] {
  const normalizedText = normalizeForMatching(text);
  const found: string[] = [];

  for (const keyword of keywords) {
    if (normalizedText.includes(normalizeForMatching(keyword))) {
      found.push(keyword);
    }
  }

  return [...new Set(found)];
}
