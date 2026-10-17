/**
 * The model must not hand out phone numbers, hotlines, links or email
 * addresses as advice: it can make them up, and on an anti-scam site a wrong
 * hotline sends people straight to the next scam. The prompts say so; this is
 * the safety net for when the model does it anyway.
 */

// Neutral placeholders on purpose: the text may be quoting the scam itself
// ("do not call 0912..." / "do not open bidv-xacminh.com"), so a contact
// detail must never be turned into something that sounds official.
const HIDDEN_NUMBER = '[số đã ẩn]';
const HIDDEN_LINK = '[link đã ẩn]';
const HIDDEN_EMAIL = '[email đã ẩn]';

// Hotlines such as 1900 54 54 13, 1800-1234, 19001234.
const HOTLINE = /(?<![\d])1[89]00(?:[\s.-]?\d){4,6}(?![\d])/g;
// Vietnamese phone numbers: 0xxxxxxxxx or +84xxxxxxxxx, with separators.
const PHONE = /(?<![\d])(?:\+?84|0)(?:[\s.-]?\d){9,10}(?![\d])/g;
const URL = /\bhttps?:\/\/[^\s)]+/gi;
const BARE_DOMAIN = /\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|vn|net|org|gov|edu|info|io)(?:\.vn)?\b(?:\/[^\s)]*)?/gi;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Replace contact details in a piece of advice with a generic pointer. */
export function removeContactDetails(text: string): string {
  if (!text) return text;
  return text
    .replace(EMAIL, HIDDEN_EMAIL)
    .replace(URL, HIDDEN_LINK)
    .replace(BARE_DOMAIN, HIDDEN_LINK)
    .replace(HOTLINE, HIDDEN_NUMBER)
    .replace(PHONE, HIDDEN_NUMBER);
}

/** The rule added to every prompt that may produce advice. */
export const NO_CONTACT_RULE =
  'Tuyệt đối không ghi số điện thoại, số tổng đài, đường link, tên miền hay email của bất kỳ tổ chức nào trong lời khuyên, kể cả khi bạn nghĩ mình biết. Chỉ khuyên người dùng tự liên hệ tổ chức đó qua số tổng đài in trên thẻ, trên ứng dụng hoặc trang web chính thức mà họ tự tìm, và trình báo cơ quan công an nơi gần nhất.';
