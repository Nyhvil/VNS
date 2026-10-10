export type AnalyzeSourceIcon = "mail" | "sms" | "link";
export type AnalyzeResultRiskTone = "safe" | "warning" | "danger";

export type AnalyzeFinding = {
  title: string;
  detail: string;
  severityLabel: string;
  icon: "link" | "language" | "brand";
  iconBg: string;
  iconText: string;
  severityText: string;
};

export type AnalyzeAction = {
  title: string;
  detail: string;
  icon: "ban-link" | "report" | "trash";
  iconBg: string;
  iconText: string;
};

export type AnalyzeEvidence = {
  from: string;
  subject: string;
  greeting: string;
  highlightPrimary: string;
  primaryContinuation: string;
  highlightUrgency: string;
  linkIntro: string;
  link: string;
  signoff: string;
  signature: string;
};

export type MockAnalyzeResultSuccess = {
  ok: true;
  id: string;
  requestId: string;
  title: string;
  source: string;
  sourceIcon: AnalyzeSourceIcon;
  time: string;
  period: string;
  analyzedAt: string;
  statusLabel: string;
  message: string;
  submittedText: string;
  riskScore: number;
  riskTone: AnalyzeResultRiskTone;
  severityLabel: string;
  summary: string;
  confidence: string;
  findings: AnalyzeFinding[];
  actions: AnalyzeAction[];
  evidence: AnalyzeEvidence;
};

export type MockAnalyzeResultFailure = {
  ok: false;
  message: string;
};

export type MockAnalyzeResultResponse = MockAnalyzeResultSuccess | MockAnalyzeResultFailure;

export type AnalyzeResultListItem = {
  id: string;
  href: string;
  requestId: string;
  title: string;
  source: string;
  sourceIcon: AnalyzeSourceIcon;
  time: string;
  period: string;
  analyzedAt: string;
  statusLabel: string;
  riskScore: number;
  riskTone: AnalyzeResultRiskTone;
  severityLabel: string;
  riskValue: string;
  summary: string;
  confidence: string;
  findingsCount: number;
  actionsCount: number;
};

export type MockAnalyzeResultListSuccess = {
  ok: true;
  message: string;
  items: AnalyzeResultListItem[];
  totals: {
    total: number;
    danger: number;
    warning: number;
    safe: number;
  };
};

export type MockAnalyzeResultListResponse =
  | MockAnalyzeResultListSuccess
  | MockAnalyzeResultFailure;

const mockAnalyzeResultRecords: Omit<MockAnalyzeResultSuccess, "ok" | "message">[] = [
  {
    id: "mg-8832-a9x",
    requestId: "MG-8832-A9X",
    title: "Thông báo khóa tài khoản Amazon giả mạo",
    source: "security@amaz0n-support-update.com",
    sourceIcon: "mail",
    time: "10:42 AM",
    period: "Hôm nay",
    analyzedAt: "10:42, 24 tháng 4, 2026",
    statusLabel: "Cần xử lý ngay",
    submittedText: `From: security@amaz0n-support-update.com
Subject: URGENT: Your account has been suspended

Dear Customer,

We detected unusual login activity on your account. To restore access and prevent permanent deletion, you must verify your identity within the next 12 hours.

Please click the secure link below to proceed:
https://secure-login.amaz0n-verify-identity.net/auth

Thank you,
Amazon Security Team`,
    riskScore: 92,
    riskTone: "danger",
    severityLabel: "Nguy hiểm cao",
    summary:
      "Email giả mạo thương hiệu Amazon, sử dụng tên miền đánh lừa và ngôn ngữ gây áp lực để dẫn người nhận tới liên kết độc hại.",
    confidence: "Độ tin cậy 96%",
    findings: [
      {
        title: "Phát hiện link độc hại",
        detail:
          "Liên kết chuyển hướng tới tên miền typosquatting, dễ đánh lừa người dùng tưởng là cổng đăng nhập Amazon thật.",
        severityLabel: "Mức độ: nghiêm trọng",
        icon: "link",
        iconBg: "bg-[#ffe5e1]",
        iconText: "text-[#b32117]",
        severityText: "text-[#d21d18]",
      },
      {
        title: "Ngôn ngữ thao túng",
        detail:
          "Nội dung dùng cảm giác khẩn cấp và đe dọa mất tài khoản để ép người nhận hành động ngay.",
        severityLabel: "Mức độ: đáng ngờ",
        icon: "language",
        iconBg: "bg-[#fff2c1]",
        iconText: "text-[#8a6b00]",
        severityText: "text-[#8a6b00]",
      },
      {
        title: "Mạo danh thương hiệu",
        detail:
          "Header, cách xưng hô và chữ ký đều mô phỏng thông báo chính thức của Amazon nhưng không khớp tên miền.",
        severityLabel: "Mức độ: nghiêm trọng",
        icon: "brand",
        iconBg: "bg-[#ffe8ea]",
        iconText: "text-[#b1161c]",
        severityText: "text-[#d21d18]",
      },
    ],
    actions: [
      {
        title: "Không nhấn vào link",
        detail: "Tuyệt đối không mở liên kết hoặc nhập thông tin tài khoản vào biểu mẫu bên ngoài.",
        icon: "ban-link",
        iconBg: "bg-[#fff0ef]",
        iconText: "text-[#d21d18]",
      },
      {
        title: "Báo cáo cho IT Security",
        detail: "Chuyển tiếp email này cho đội ngũ bảo mật để họ chặn tên miền và cảnh báo nội bộ.",
        icon: "report",
        iconBg: "bg-[#fff4d4]",
        iconText: "text-[#856400]",
      },
      {
        title: "Xóa khỏi hộp thư",
        detail: "Sau khi báo cáo, xóa email khỏi inbox để tránh mở nhầm về sau.",
        icon: "trash",
        iconBg: "bg-[#eef2f6]",
        iconText: "text-[#71717a]",
      },
    ],
    evidence: {
      from: "security@amaz0n-support-update.com",
      subject: "URGENT: Your account has been suspended",
      greeting: "Dear Customer,",
      highlightPrimary: "We detected unusual login activity on your account.",
      primaryContinuation:
        "To restore access and prevent permanent deletion, you must verify your identity",
      highlightUrgency: "within the next 12 hours.",
      linkIntro: "Please click the secure link below to proceed:",
      link: "https://secure-login.amaz0n-verify-identity.net/auth",
      signoff: "Thank you,",
      signature: "Amazon Security Team",
    },
  },
  {
    id: "bank-otp-safe",
    requestId: "MG-7711-B2K",
    title: "SMS OTP ngân hàng hợp lệ",
    source: "SMS từ VCB",
    sourceIcon: "sms",
    time: "09:15 AM",
    period: "Hôm nay",
    analyzedAt: "09:15, 24 tháng 4, 2026",
    statusLabel: "An toàn",
    submittedText:
      "VCB OTP: Ma xac thuc cua quy khach la 482913. Ma co hieu luc trong 2 phut. Vui long khong chia se ma nay cho bat ky ai.",
    riskScore: 5,
    riskTone: "safe",
    severityLabel: "An toàn",
    summary:
      "Tin nhắn có cấu trúc OTP chuẩn, không chứa liên kết, không yêu cầu phản hồi và khớp mẫu thông báo ngân hàng đã biết.",
    confidence: "Độ tin cậy 93%",
    findings: [
      {
        title: "Không có liên kết ngoài",
        detail: "Tin nhắn không chèn URL, không yêu cầu đăng nhập hay cập nhật thông tin cá nhân.",
        severityLabel: "Mức độ: an toàn",
        icon: "link",
        iconBg: "bg-[#e8f3ff]",
        iconText: "text-[#365c9a]",
        severityText: "text-[#365c9a]",
      },
      {
        title: "Giọng điệu trung tính",
        detail:
          "Ngôn ngữ ngắn gọn, mô tả đúng mục đích của OTP và không có dấu hiệu thúc ép bất thường.",
        severityLabel: "Mức độ: an toàn",
        icon: "language",
        iconBg: "bg-[#eef8ef]",
        iconText: "text-[#2f6b40]",
        severityText: "text-[#2f6b40]",
      },
      {
        title: "Nguồn gửi khớp ngữ cảnh",
        detail: "Nguồn gửi và nội dung nhất quán với mẫu OTP ngân hàng nội địa phổ biến.",
        severityLabel: "Mức độ: an toàn",
        icon: "brand",
        iconBg: "bg-[#edf6ff]",
        iconText: "text-[#365c9a]",
        severityText: "text-[#365c9a]",
      },
    ],
    actions: [
      {
        title: "Không chia sẻ mã OTP",
        detail: "Dù tin nhắn hợp lệ, mã OTP chỉ nên được nhập trong ứng dụng hoặc website chính thức.",
        icon: "ban-link",
        iconBg: "bg-[#eef5ff]",
        iconText: "text-[#365c9a]",
      },
      {
        title: "Đối chiếu phiên đăng nhập",
        detail: "Chỉ sử dụng mã nếu chính bạn đang thực hiện giao dịch hoặc đăng nhập tương ứng.",
        icon: "report",
        iconBg: "bg-[#eef8ef]",
        iconText: "text-[#2f6b40]",
      },
      {
        title: "Bỏ qua nếu không yêu cầu",
        detail: "Nếu bạn không thao tác gì, hãy đổi mật khẩu hoặc liên hệ ngân hàng để kiểm tra.",
        icon: "trash",
        iconBg: "bg-[#f4f6f8]",
        iconText: "text-[#5f6b7a]",
      },
    ],
    evidence: {
      from: "VCB SMS",
      subject: "OTP verification",
      greeting: "Kính gửi Quý khách,",
      highlightPrimary: "Mã xác thực của quý khách là 482913.",
      primaryContinuation: "Mã chỉ có hiệu lực trong 2 phút và dùng cho đúng phiên giao dịch hiện tại.",
      highlightUrgency: "Vui lòng không chia sẻ mã này cho bất kỳ ai.",
      linkIntro: "Tin nhắn không chứa liên kết.",
      link: "https://vcbdigibank.vietcombank.com.vn",
      signoff: "Trân trọng,",
      signature: "Vietcombank",
    },
  },
  {
    id: "bitly-update-warning",
    requestId: "MG-6204-C7M",
    title: "Link rút gọn yêu cầu cập nhật thông tin",
    source: "Quét thủ công",
    sourceIcon: "link",
    time: "Hôm qua",
    period: "14:30 PM",
    analyzedAt: "14:30, 23 tháng 4, 2026",
    statusLabel: "Cần xác minh",
    submittedText:
      "http://bit.ly/update-account-now - Verify your account information to avoid temporary suspension.",
    riskScore: 65,
    riskTone: "warning",
    severityLabel: "Đáng ngờ",
    summary:
      "URL rút gọn che giấu đích đến thật và nội dung dùng thông điệp xác minh tài khoản quen thuộc trong các kịch bản phishing trung cấp.",
    confidence: "Độ tin cậy 88%",
    findings: [
      {
        title: "Liên kết rút gọn",
        detail: "Bitly làm giảm khả năng người dùng nhận biết đích đến thật trước khi nhấn.",
        severityLabel: "Mức độ: đáng ngờ",
        icon: "link",
        iconBg: "bg-[#fff2c1]",
        iconText: "text-[#8a6b00]",
        severityText: "text-[#8a6b00]",
      },
      {
        title: "Thông điệp cập nhật tài khoản",
        detail:
          "Cụm từ verify account information xuất hiện phổ biến trong các chiến dịch lấy cắp thông tin đăng nhập.",
        severityLabel: "Mức độ: cảnh báo",
        icon: "language",
        iconBg: "bg-[#fff6dc]",
        iconText: "text-[#8a6b00]",
        severityText: "text-[#8a6b00]",
      },
      {
        title: "Thiếu nhận diện thương hiệu",
        detail: "Không có dấu hiệu rõ ràng cho thấy đây là thông báo từ một dịch vụ hợp pháp cụ thể.",
        severityLabel: "Mức độ: đáng ngờ",
        icon: "brand",
        iconBg: "bg-[#fff0e5]",
        iconText: "text-[#9a5800]",
        severityText: "text-[#9a5800]",
      },
    ],
    actions: [
      {
        title: "Mở rộng URL trước khi truy cập",
        detail: "Dùng công cụ preview hoặc dịch vụ expand URL để kiểm tra điểm đến thực tế.",
        icon: "ban-link",
        iconBg: "bg-[#fff8e7]",
        iconText: "text-[#8a6b00]",
      },
      {
        title: "Đối chiếu nguồn gửi",
        detail: "Chỉ tin cậy khi bạn xác minh được link được chia sẻ bởi nguồn nội bộ hoặc đối tác hợp lệ.",
        icon: "report",
        iconBg: "bg-[#f7f1da]",
        iconText: "text-[#7b6400]",
      },
      {
        title: "Không nhập thông tin nhạy cảm",
        detail: "Nếu chưa xác thực được domain cuối, không đăng nhập hay cung cấp thông tin cá nhân.",
        icon: "trash",
        iconBg: "bg-[#f4f6f8]",
        iconText: "text-[#5f6b7a]",
      },
    ],
    evidence: {
      from: "Manual URL scan",
      subject: "Shortened link analysis",
      greeting: "Scanned content:",
      highlightPrimary: "Verify your account information",
      primaryContinuation: "to avoid temporary suspension of your current service access.",
      highlightUrgency: "Respond immediately to maintain service continuity.",
      linkIntro: "Submitted link:",
      link: "http://bit.ly/update-account-now",
      signoff: "Analysis context:",
      signature: "User-submitted manual scan",
    },
  },
  {
    id: "hr-invoice-danger",
    requestId: "MG-5029-Z1Q",
    title: "Email giả mạo tài liệu nhân sự đính kèm",
    source: "hr-docs@company-benefits-support.co",
    sourceIcon: "mail",
    time: "22 tháng 4",
    period: "08:05 AM",
    analyzedAt: "08:05, 22 tháng 4, 2026",
    statusLabel: "Nguy hiểm",
    submittedText: `From: hr-docs@company-benefits-support.co
Subject: Updated employee benefits document

Please review the attached file and confirm your payroll account information before noon today.

Open here:
https://company-benefits-support.co/employee-documents`,
    riskScore: 84,
    riskTone: "danger",
    severityLabel: "Nguy hiểm",
    summary:
      "Email lợi dụng ngữ cảnh nội bộ HR để yêu cầu xác nhận thông tin trả lương và dẫn tới website ngoài tổ chức.",
    confidence: "Độ tin cậy 94%",
    findings: [
      {
        title: "Domain ngoài tổ chức",
        detail: "Tên miền không thuộc hệ thống công ty nhưng giả vờ là cổng tài liệu nhân sự nội bộ.",
        severityLabel: "Mức độ: nghiêm trọng",
        icon: "link",
        iconBg: "bg-[#ffe5e1]",
        iconText: "text-[#b32117]",
        severityText: "text-[#d21d18]",
      },
      {
        title: "Yêu cầu xác nhận tài khoản lương",
        detail: "Đây là loại thông tin nhạy cảm thường bị khai thác trong business email compromise.",
        severityLabel: "Mức độ: nghiêm trọng",
        icon: "language",
        iconBg: "bg-[#fff2c1]",
        iconText: "text-[#8a6b00]",
        severityText: "text-[#d21d18]",
      },
      {
        title: "Giả mạo quy trình nội bộ",
        detail: "Thông điệp nhắm vào bối cảnh nhân sự và dùng mốc thời gian trong ngày để tăng áp lực.",
        severityLabel: "Mức độ: đáng ngờ",
        icon: "brand",
        iconBg: "bg-[#ffe8ea]",
        iconText: "text-[#b1161c]",
        severityText: "text-[#d21d18]",
      },
    ],
    actions: [
      {
        title: "Không mở file hay link đính kèm",
        detail: "Tránh tương tác với tài liệu hoặc website ngoài miền công ty.",
        icon: "ban-link",
        iconBg: "bg-[#fff0ef]",
        iconText: "text-[#d21d18]",
      },
      {
        title: "Xác minh qua kênh nội bộ",
        detail: "Liên hệ trực tiếp HR hoặc quản lý bằng Teams, Slack hoặc email nội bộ chính thức.",
        icon: "report",
        iconBg: "bg-[#fff4d4]",
        iconText: "text-[#856400]",
      },
      {
        title: "Báo cáo phishing nội bộ",
        detail: "Gửi email này cho bộ phận security để phong tỏa domain và cảnh báo nhân viên khác.",
        icon: "trash",
        iconBg: "bg-[#eef2f6]",
        iconText: "text-[#71717a]",
      },
    ],
    evidence: {
      from: "hr-docs@company-benefits-support.co",
      subject: "Updated employee benefits document",
      greeting: "Hello team member,",
      highlightPrimary: "Please review the attached file and confirm your payroll account information",
      primaryContinuation: "to avoid delays in this month's salary processing.",
      highlightUrgency: "before noon today.",
      linkIntro: "Open here:",
      link: "https://company-benefits-support.co/employee-documents",
      signoff: "Regards,",
      signature: "Benefits Support Desk",
    },
  },
];

export async function delayMockAnalyzeResult(ms = 900) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function getMockAnalyzeResultRecords(): MockAnalyzeResultSuccess[] {
  return mockAnalyzeResultRecords.map((record) => ({
    ok: true,
    message: "Mock analyze result loaded successfully.",
    ...record,
  }));
}

export function getMockAnalyzeResultListItems(): AnalyzeResultListItem[] {
  return getMockAnalyzeResultRecords().map((record) => ({
    id: record.id,
    href: `/analyze_result/${record.id}`,
    requestId: record.requestId,
    title: record.title,
    source: record.source,
    sourceIcon: record.sourceIcon,
    time: record.time,
    period: record.period,
    analyzedAt: record.analyzedAt,
    statusLabel: record.statusLabel,
    riskScore: record.riskScore,
    riskTone: record.riskTone,
    severityLabel: record.severityLabel,
    riskValue: `${record.riskScore}%`,
    summary: record.summary,
    confidence: record.confidence,
    findingsCount: record.findings.length,
    actionsCount: record.actions.length,
  }));
}

export function buildMockAnalyzeResultListResponse(): MockAnalyzeResultListResponse {
  const items = getMockAnalyzeResultListItems();

  return {
    ok: true,
    message: "Mock analyze result list loaded successfully.",
    items,
    totals: {
      total: items.length,
      danger: items.filter((item) => item.riskTone === "danger").length,
      warning: items.filter((item) => item.riskTone === "warning").length,
      safe: items.filter((item) => item.riskTone === "safe").length,
    },
  };
}

export function buildMockAnalyzeResultDetailResponse(id: string): MockAnalyzeResultResponse {
  const item = getMockAnalyzeResultRecords().find((record) => record.id === id);

  if (!item) {
    return {
      ok: false,
      message: "Không tìm thấy kết quả phân tích phù hợp với mã bạn yêu cầu.",
    };
  }

  return item;
}

export function buildMockAnalyzeResultResponse(rawText?: string): MockAnalyzeResultResponse {
  const submittedText = rawText?.trim() ?? "";

  if (!submittedText) {
    return {
      ok: false,
      message: "Vui lòng dán nội dung cần kiểm tra trước khi phân tích.",
    };
  }

  const baseRecord = getMockAnalyzeResultRecords()[0];

  return {
    ...baseRecord,
    submittedText,
    message: "Mock API đã xử lý xong kết quả phân tích.",
  };
}
