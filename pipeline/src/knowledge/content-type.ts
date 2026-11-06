/**
 * What kind of content is this: a job ad, a sale post, a loan offer...?
 *
 * Some kinds are used by honest people and scammers alike. A job ad or a sale
 * post with no warning sign is not proof that it is genuine, so for these
 * "gray" kinds VNS says "Cần kiểm tra thêm" (check further) instead of "An
 * toàn", and gives a checklist the reader can follow (scoring/vns-verdict.ts).
 * A post with enough concrete, checkable details (a tax code, a street address,
 * a link to a known job or shopping site) can still be rated safe.
 */
import { prepareText, stripDiacritics } from './text-match';
import { hasPhrase } from './scam-signals';

export type ContentType = 'job' | 'sale' | 'loan' | 'investment' | 'romance';

interface TypeDefinition {
  type: ContentType;
  label: string;
  /** Phrases that point to this kind of content. */
  phrases: string[];
  /** How many different phrases must appear. */
  minMatches: number;
}

// Checked in this order: a loan ad often mentions "thu nhập", a job ad rarely mentions "giải ngân".
const TYPES: TypeDefinition[] = [
  {
    type: 'loan',
    label: 'Tin cho vay tiền',
    phrases: ['vay tiền', 'cho vay', 'khoản vay', 'giải ngân', 'hỗ trợ vay', 'vay nhanh', 'vay online', 'vay tín chấp', 'hạn mức vay'],
    minMatches: 1,
  },
  {
    type: 'investment',
    label: 'Tin mời đầu tư',
    phrases: [
      'đầu tư', 'lợi nhuận', 'sàn giao dịch', 'forex', 'crypto', 'tiền số', 'tiền ảo', 'usdt', 'bitcoin', 'chứng khoán',
      'cổ phiếu', 'tín hiệu', 'room vip', 'chốt lời', 'cắt lỗ',
    ],
    minMatches: 2,
  },
  {
    type: 'job',
    label: 'Tin tuyển dụng',
    phrases: [
      'tuyển dụng', 'tuyển gấp', 'tuyển nhân viên', 'tuyển ctv', 'cần tuyển', 'cộng tác viên', 'việc làm', 'tìm việc',
      'ứng tuyển', 'mức lương', 'lương cứng', 'thu nhập', 'ca làm', 'part time', 'part-time', 'full time', 'full-time',
      'hiring', 'job', 'jobs', 'phỏng vấn', 'nhận việc', 'làm thêm', 'kinh nghiệm', 'lương',
    ],
    minMatches: 2,
  },
  {
    type: 'sale',
    label: 'Tin mua bán',
    // Posts by individual sellers. Not "giảm giá" or "khuyến mãi" alone: brands
    // send those in genuine promotions.
    phrases: [
      'cần bán', 'bán gấp', 'pass lại', 'thanh lý', 'inbox giá', 'ib giá', 'chốt đơn', 'còn hàng', 'order', 'ship cod',
      'freeship', 'đặt hàng', 'giá chỉ', 'size', 'mua bán', 'cọc trước', 'đặt cọc',
    ],
    minMatches: 2,
  },
  {
    type: 'romance',
    label: 'Tin làm quen, kết bạn',
    phrases: ['kết bạn', 'làm quen', 'hẹn hò', 'người yêu', 'cô đơn', 'gửi quà cho em', 'gửi quà cho anh', 'thùng quà', 'em yêu', 'anh yêu'],
    minMatches: 2,
  },
];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = Object.fromEntries(
  TYPES.map(t => [t.type, t.label])
) as Record<ContentType, string>;

export interface ContentTypeResult {
  type: ContentType;
  label: string;
  matched: string[];
  /** Concrete, checkable details that make a genuine post more likely. */
  trust: string[];
}

// Known job and shopping sites: a link there can be checked by the reader.
const TRUSTED_SITES = [
  'topcv.vn', 'vietnamworks.com', 'itviec.com', 'careerviet.vn', 'careerlink.vn', 'linkedin.com', 'jobstreet.vn',
  'glints.com', 'shopee.vn', 'lazada.vn', 'tiki.vn', 'sendo.vn', 'chotot.com', 'batdongsan.com.vn',
];

const TRUST_PATTERNS: Array<[string, RegExp]> = [
  ['mã số thuế', /\b(ma so thue|mst)\s*:?\s*\d{10}/],
  ['địa chỉ cụ thể', /\b(so|sn)?\s*\d{1,4}[a-z]?\s*(\/\s*\d+\s*)?(duong|pho|ngo|hem|kiet)\s+\p{L}+/u],
  ['nhận hàng rồi mới trả tiền', /\b(kiem tra hang|xem hang) (truoc khi|roi moi) (thanh toan|nhan|tra tien)/],
  ['công ty có tên', /\bcong ty (tnhh|co phan|cp)\s+\p{L}+/u],
];

function trustDetails(text: string, hosts: string[]): string[] {
  const stripped = stripDiacritics(text);
  const found = TRUST_PATTERNS.filter(([, pattern]) => pattern.test(stripped)).map(([name]) => name);
  const site = hosts.find(h => TRUSTED_SITES.some(d => h === d || h.endsWith(`.${d}`)));
  if (site) found.push(`link tới ${site}`);
  return found;
}

/** The gray kind of content this is, or null for anything else. */
export function detectContentType(rawText: string, linkHosts: string[] = []): ContentTypeResult | null {
  const text = prepareText(rawText);
  for (const definition of TYPES) {
    const matched = definition.phrases.filter(p => hasPhrase(text, p));
    if (new Set(matched).size >= definition.minMatches) {
      return { type: definition.type, label: definition.label, matched, trust: trustDetails(rawText, linkHosts) };
    }
  }
  return null;
}

/** Two concrete, checkable details are enough to rate a gray post as safe. */
export const MIN_TRUST_DETAILS = 2;

/** What the reader can check for each kind of content. No phone numbers or links. */
export const CHECKLISTS: Record<ContentType, string[]> = {
  job: [
    'Không đóng bất kỳ khoản phí nào (cọc, đồng phục, đào tạo, kích hoạt tài khoản) trước khi đi làm.',
    'Tra tên công ty và mã số thuế trên trang tra cứu doanh nghiệp của nhà nước.',
    'Hỏi rõ địa chỉ làm việc và phỏng vấn trực tiếp hoặc gọi video với người của công ty.',
    'Cảnh giác với việc online dễ mà lương cao (thả tim, làm nhiệm vụ, nhập liệu) và mọi yêu cầu nạp tiền.',
    'Không gửi ảnh CCCD hay số tài khoản ngân hàng trước khi ký hợp đồng.',
  ],
  sale: [
    'Mua qua sàn thương mại điện tử và thanh toán trong ứng dụng; không hủy đơn để giao dịch riêng.',
    'Ưu tiên nhận hàng, kiểm tra rồi mới trả tiền; hạn chế chuyển cọc cho người lạ.',
    'Giá rẻ bất thường so với thị trường là dấu hiệu cần dè chừng.',
    'Xem đánh giá và lịch sử của người bán; tài khoản mới lập, ít bài đăng thì càng phải cẩn thận.',
    'Người giao hàng không bao giờ cần mã OTP hay bắt chuyển thêm phí qua đường link.',
  ],
  loan: [
    'Ngân hàng, công ty tài chính hợp pháp không thu phí trước khi giải ngân.',
    'Chỉ vay ở ngân hàng hoặc công ty tài chính được Ngân hàng Nhà nước cấp phép, liên hệ qua kênh chính thức của họ.',
    'Không cài ứng dụng vay lạ, không cho ứng dụng đọc danh bạ hay ảnh trong máy.',
    'Đọc kỹ lãi suất và phí phạt; lãi cao bất thường là vay nặng lãi.',
  ],
  investment: [
    'Không kênh đầu tư hợp pháp nào cam kết lợi nhuận cao và cố định.',
    'Chỉ mua chứng khoán qua công ty chứng khoán được cấp phép; phần lớn sàn ngoại hối, tiền số mời gọi qua mạng không được cấp phép ở Việt Nam.',
    'Cảnh giác nhóm Zalo, Telegram có "chuyên gia" hô hào nạp tiền, cho rút thử khoản nhỏ để tạo lòng tin.',
  ],
  romance: [
    'Không chuyển tiền, không nhận "quà gửi từ nước ngoài" cho người chỉ quen qua mạng.',
    'Gọi video để chắc là người thật; người đó luôn tìm cách từ chối là dấu hiệu đáng ngờ.',
    'Hải quan không nhắn tin riêng bắt đóng phí để nhận quà.',
  ],
};
