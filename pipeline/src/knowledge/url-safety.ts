import verifiedEntities from './verified_entities_2026.json';
import { UrlSafetyResult } from '../types';

/** Official domains of well-known Vietnamese organisations. */
export const OFFICIAL_DOMAINS: string[] = verifiedEntities.official_domains;

const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.buzz', '.tk', '.ml', '.ga', '.cf', '.gq', '.click', '.loan',
  '.work', '.racing', '.date', '.download', '.stream', '.bid', '.trade', '.win',
  '.party', '.science', '.review', '.accountant',
  // Cheap TLDs common in recent Vietnamese scam campaigns
  '.online', '.site', '.vip', '.icu', '.cyou', '.sbs', '.cfd', '.bond', '.lol', '.mom', '.rest',
];

/** Brand names that scammers commonly put inside look-alike domains. */
const IMPERSONATION_TARGETS = [
  'vietcombank', 'techcombank', 'bidv', 'agribank', 'vpbank', 'mbbank', 'momo',
  'zalopay', 'shopee', 'lazada', 'tiki', 'vnpay', 'viettel',
  'vietinbank', 'sacombank', 'hdbank', 'tpbank', 'seabank', 'lpbank', 'acb', 'vib', 'shb', 'msb', 'ocb', 'vcb',
  'zalo', 'facebook', 'fb', 'messenger', 'tiktok', 'google', 'apple', 'icloud', 'netflix', 'grab',
  'evn', 'vneid', 'dichvucong', 'etax', 'gdt', 'ghtk', 'ghn', 'vnpost', 'mobifone', 'vinaphone', 'vnpt',
];

/**
 * Words scam domains add to look official or urgent: xac-minh (verify),
 * hoan-tien (refund), nang-cap (upgrade)... A real organisation does not put
 * them in its domain name.
 */
const DECEPTIVE_DOMAIN_WORDS = [
  'xacminh', 'xacthuc', 'xacnhan', 'hoantien', 'hoanthue', 'nangcap', 'mokhoa', 'khoatk', 'thanhtoan',
  'giaolai', 'hanmuc', 'nhanqua', 'tangqua', 'khuyenmai', 'trian', 'hotro', 'support', 'verify', 'secure',
  'login', 'dangnhap', 'update', 'capnhat', 'kyc', 'dinhdanh', 'nhanthuong', 'trungthuong',
];

/** True when `brand` appears in the host as a whole label part ("bidv-xacminh") or, for long names, anywhere. */
function hostMentions(host: string, word: string): boolean {
  if (word.length >= 5) return host.includes(word);
  return host.split(/[.-]/).includes(word);
}

const SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'v.gd', 's.id', 'rb.gy',
  'cutt.ly', 'shorturl.at',
];

export function isOfficialDomain(hostname: string, officialDomains: string[] = OFFICIAL_DOMAINS): boolean {
  const host = hostname.toLowerCase();
  return officialDomains.some(domain => host === domain || host.endsWith('.' + domain));
}

export function checkUrlSafety(url: string, officialDomains: string[] = OFFICIAL_DOMAINS): UrlSafetyResult {
  const flags: UrlSafetyResult['flags'] = {
    invalid: false,
    suspicious_tld: false,
    impersonated_brands: [],
    shortener: false,
    ip_address: false,
    many_subdomains: false,
  };

  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    flags.invalid = true;
    return { url, hostname: '', official: false, suspicious: true, flags, reasons: ['URL không hợp lệ'] };
  }

  // A host without a dot or with an underscore is not a real public domain
  // ("http://mttq-http//mttq_gov.online", a link mangled to fool filters).
  if (!hostname.includes('.') || hostname.includes('_')) {
    flags.invalid = true;
    return { url, hostname, official: false, suspicious: true, flags, reasons: ['Tên miền không hợp lệ'] };
  }

  if (isOfficialDomain(hostname, officialDomains)) {
    return {
      url,
      hostname,
      official: true,
      suspicious: false,
      flags,
      reasons: ['Domain chính thức đã xác minh'],
    };
  }

  const reasons: string[] = [];

  if (SUSPICIOUS_TLDS.some(tld => hostname.endsWith(tld))) {
    flags.suspicious_tld = true;
    reasons.push('Tên miền đuôi đáng ngờ: ' + hostname.split('.').pop());
  }

  for (const brand of IMPERSONATION_TARGETS) {
    if (hostMentions(hostname, brand)) {
      flags.impersonated_brands.push(brand);
      reasons.push(`Có thể giả mạo ${brand}`);
    }
  }

  const compactHost = hostname.replace(/[.-]/g, '');
  const deceptive = DECEPTIVE_DOMAIN_WORDS.filter(word => compactHost.includes(word));
  if (deceptive.length > 0) {
    flags.deceptive_words = deceptive;
    reasons.push(`Tên miền chứa từ dễ gây hiểu nhầm: ${deceptive.join(', ')}`);
  }

  if (SHORTENERS.includes(hostname)) {
    flags.shortener = true;
    reasons.push('Link rút gọn — có thể ẩn URL thật');
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    flags.ip_address = true;
    reasons.push('Domain là địa chỉ IP — rất đáng ngờ');
  } else if (hostname.split('.').length > 4) {
    flags.many_subdomains = true;
    reasons.push('Quá nhiều subdomain — dấu hiệu phishing');
  }

  return {
    url,
    hostname,
    official: false,
    suspicious: reasons.length > 0,
    flags,
    reasons: reasons.length > 0 ? reasons : ['Không phát hiện dấu hiệu bất thường rõ ràng'],
  };
}

export function checkUrlsSafety(urls: string[], officialDomains: string[] = OFFICIAL_DOMAINS): UrlSafetyResult[] {
  return urls.map(url => checkUrlSafety(url, officialDomains));
}
