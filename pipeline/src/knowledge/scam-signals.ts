/**
 * Behavioural signals of a scam, independent of the topic.
 *
 * Scam messages change wording all the time (bank, police, shipper, family,
 * job...), but they almost always combine a few moves: ask for money or a code,
 * put the victim under pressure, promise something too good, or move the
 * conversation to a channel the victim cannot check. A single move is common
 * in ordinary messages ("chuyển khoản tiền quỹ lớp"); two or more together
 * rarely are. The rule in rules/definitions/scam-signals.rule.ts scores the
 * combinations.
 */
import { PreparedText, prepareText, containsKeyword, stripDiacritics } from './text-match';

export type SignalId =
  | 'money_request'
  | 'upfront_fee'
  | 'code_request'
  | 'urgency'
  | 'threat'
  | 'secrecy'
  | 'too_good'
  | 'channel_switch'
  | 'remote_app';

export interface ScamSignal {
  id: SignalId;
  label: string;
  matched: string[];
}

interface SignalDefinition {
  id: SignalId;
  label: string;
  phrases: string[];
  /** Regular expressions on the text without diacritics, for patterns with numbers. */
  patterns?: RegExp[];
}

export const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    id: 'money_request',
    label: 'Yêu cầu chuyển tiền',
    phrases: [
      'chuyển tiền', 'chuyển khoản', 'chuyển gấp', 'chuyển giúp', 'chuyển vào tài khoản', 'chuyển vào số tài khoản',
      'chuyển trước', 'chuyển cho em', 'chuyển cho chị', 'chuyển cho anh', 'nạp tiền', 'nạp trước', 'nạp vốn',
      'nạp tối thiểu', 'thanh toán trước', 'thanh toán đơn trước', 'cho mượn', 'mượn tiền', 'quét mã em gửi',
    ],
  },
  {
    id: 'upfront_fee',
    label: 'Đòi đóng phí trước để nhận tiền, quà hoặc dịch vụ',
    phrases: [
      'nộp phí', 'đóng phí', 'phí hồ sơ', 'phí xét duyệt', 'phí trước bạ', 'phí kích hoạt', 'phí giải ngân',
      'phí bảo hiểm', 'phí nhận thưởng', 'phí nhận quà', 'phí thông quan', 'thông quan', 'phí mở khóa',
      'phí giao lại', 'phí xác minh', 'để kích hoạt', 'để nhận xe', 'để nhận quà', 'để nhận tiền', 'để nhận thưởng',
    ],
  },
  {
    id: 'code_request',
    label: 'Đòi mã OTP, mật khẩu hoặc thông tin đăng nhập',
    phrases: [
      'đọc giúp', 'đọc mã', 'đọc cho em mã', 'mã gồm 6 số', 'mã vừa gửi', 'gửi lại mã', 'cho em xin mã',
      'cung cấp mã', 'cung cấp mật khẩu', 'nhập mã otp', 'bằng tài khoản ngân hàng', 'đăng nhập tài khoản ngân hàng',
      'thông tin tài khoản ngân hàng', 'số thẻ', 'mã cvv',
    ],
  },
  {
    id: 'urgency',
    label: 'Hối thúc, đặt hạn chót gấp',
    phrases: [
      'gấp', 'khẩn cấp', 'ngay lập tức', 'ngay hôm nay', 'trong hôm nay', 'trước 24h', 'trong vòng 24h',
      'sau 24h', 'trong 2 giờ', 'giờ tới', 'sẽ bị khóa', 'sắp bị khóa', 'bị khóa do', 'bị khóa vĩnh viễn', 'sẽ bị vô hiệu hóa', 'sẽ cắt',
      'hết hạn trong', 'chỉ còn',
    ],
    patterns: [/truoc \d{1,2}h hom nay/, /trong vong \d+ (gio|phut)/],
  },
  {
    id: 'threat',
    label: 'Đe dọa hoặc mạo danh cơ quan chức năng',
    phrases: [
      'công an', 'bộ công an', 'viện kiểm sát', 'tòa án', 'cục thuế', 'hải quan', 'vụ án', 'rửa tiền', 'lệnh bắt',
      'triệu tập', 'vi phạm', 'bị phạt', 'kê khai tài sản', 'tài khoản tạm giữ', 'cắt điện', 'vô hiệu hóa',
    ],
  },
  {
    id: 'secrecy',
    label: 'Bắt giữ bí mật, không cho báo người khác',
    phrases: ['không được báo', 'không được nói', 'giữ bí mật', 'không nói với ai', 'không cho người nhà biết'],
  },
  {
    id: 'too_good',
    label: 'Hứa hẹn quá tốt để là thật',
    phrases: [
      'trúng thưởng', 'khách hàng may mắn', 'may mắn nhận', 'được chọn nhận', 'nhận học bổng', 'tri ân khách hàng',
      'cam kết lợi nhuận', 'lợi nhuận cam kết', 'không rủi ro', 'chốt lời', 'lãi suất 0%', 'hoa hồng',
      'việc nhẹ lương cao', 'kiếm 500k', 'thu nhập thụ động', 'nhận lại gốc', 'được hoàn tiền', 'hoàn thuế',
      'nâng hạn mức', 'không cần thế chấp', 'giải ngân trong',
    ],
    patterns: [/lai \d+(?:[.,]\d+)?%\s*\/?\s*(ngay|tuan|thang)/, /loi nhuan \d+(?:[.,]\d+)?%/, /\d+ ?- ?\d+ trieu\s*\/\s*thang/],
  },
  {
    id: 'channel_switch',
    label: 'Mạo danh người quen hoặc chuyển sang kênh khó kiểm chứng',
    phrases: [
      'đổi số mới', 'số mới', 'zalo bị lỗi', 'nhắn từ nick này', 'nick này', 'điện thoại hỏng', 'điện thoại hết pin',
      'hết pin', 'qua telegram', 'nhận việc qua telegram', 'liên hệ qua zalo', 'nhân viên hải quan qua zalo',
      'bạn của vợ', 'bạn của chồng',
    ],
  },
  {
    id: 'remote_app',
    label: 'Bắt cài ứng dụng hoặc cấp quyền điều khiển máy',
    phrases: [
      // Not "tải ứng dụng": typed without diacritics it reads "tại ứng dụng" (in the app).
      'tải app', 'tải và cài', 'cài ứng dụng', 'cài đặt ứng dụng', 'ứng dụng giả lập', 'file apk', '.apk',
      'cấp quyền', 'trợ năng', 'teamviewer', 'ultraviewer', 'anydesk', 'chia sẻ màn hình',
    ],
  },
];

// Phrases inside a warning ("KHÔNG cung cấp mã này cho bất kỳ ai") are the
// opposite of a request; ignore them when a negation comes just before.
const NEGATIONS = ['không', 'đừng', 'chớ', 'ko', 'tuyệt đối không'];
const NEGATION_WINDOW = 3; // words

function haystackOf(text: PreparedText): string {
  return text.hasDiacritics ? text.lower : text.stripped;
}

function negatedEverywhere(text: PreparedText, phrase: string): boolean {
  const haystack = haystackOf(text);
  const needle = (text.hasDiacritics ? phrase.toLowerCase() : stripDiacritics(phrase)).normalize('NFC');
  let index = haystack.indexOf(needle);
  if (index === -1) return false;
  const negations = new Set(NEGATIONS.map(n => (text.hasDiacritics ? n : stripDiacritics(n))));
  while (index !== -1) {
    const before = haystack.slice(0, index).trim().split(/\s+/).slice(-NEGATION_WINDOW);
    const negated = before.some((word, i) => {
      if (negations.has(word)) return true;
      const pair = before.slice(i, i + 2).join(' ');
      return negations.has(pair);
    });
    if (!negated) return false;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return true;
}

export function detectSignals(rawText: string): ScamSignal[] {
  const text = prepareText(rawText);
  const stripped = text.stripped;
  const signals: ScamSignal[] = [];

  for (const definition of SIGNAL_DEFINITIONS) {
    const matched = definition.phrases.filter(
      phrase => containsKeyword(text, phrase) && !(definition.id === 'code_request' && negatedEverywhere(text, phrase))
    );
    for (const pattern of definition.patterns ?? []) {
      const m = stripped.match(pattern);
      if (m) matched.push(m[0]);
    }
    if (matched.length > 0) {
      signals.push({ id: definition.id, label: definition.label, matched: [...new Set(matched)] });
    }
  }

  return signals;
}

/**
 * A one-time code sent by a real service: it contains the code itself and
 * warns not to share it, without any link. Such messages mention "OTP" and
 * "cung cấp mã" too, so the OTP-scam checks must not fire on them.
 */
export function isOneTimeCodeNotice(rawText: string, unofficialLinkCount: number): boolean {
  if (unofficialLinkCount > 0) return false;
  const stripped = stripDiacritics(rawText);
  const mentionsCode = /\b(otp|ma xac thuc|ma xac nhan|ma dang nhap|ma giao dich)\b/.test(stripped);
  // A 4-8 digit code, not part of an amount such as 1.500.000.
  const hasCode = /(?<![\d.,])\d{4,8}(?!\d|[.,]\d)/.test(stripped);
  const warns = /(khong|dung|tuyet doi khong)\s+(cung cap|chia se|tiet lo|gui)/.test(stripped);
  return mentionsCode && hasCode && warns;
}
