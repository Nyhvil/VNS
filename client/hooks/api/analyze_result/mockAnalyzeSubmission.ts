import {
  getMockAnalyzeResultRecords,
  type AnalyzeResultRiskTone,
  type MockAnalyzeResultSuccess,
} from "@/hooks/api/analyze_result/mockAnalyzeResult";

export type MockAnalyzeSubmissionInput = {
  rawText?: string;
  attachmentName?: string | null;
};

export type MockAnalyzeSubmissionSuccess = {
  ok: true;
  resultId: string;
  detailHref?: string;
  title: string;
  sourceLabel: string;
  attachmentName: string | null;
  riskScore: number;
  riskTone: AnalyzeResultRiskTone;
  statusLabel: string;
  summary: string;
  confidence: string;
  submittedText: string;
  extractedText: string;
  dangerousPhrases: string[];
  mentionedOrganizations: string[];
  verificationSummary: string;
};

export type MockAnalyzeSubmissionFailure = {
  ok: false;
  message: string;
};

export type MockAnalyzeSubmissionResponse =
  | MockAnalyzeSubmissionSuccess
  | MockAnalyzeSubmissionFailure;

const lovableSafeExtractedText =
  "Có vẻ thư này được viết bằng Tiếng Anh Dịch sang Tiếng Việt. Lovable Your idea is already halfway there. Hey there, Welcome to Lovable. Your idea is already halfway there - now let's build it. Describe what you want to make and Lovable will generate a first draft for you. Here's a starter prompt to get you going - just click, paste, and go. Create a dashboard with a sidebar nav, data table, and chart showing mock analytics. You've got 5 free credits waiting. Start building today. Send your first prompt Best, Team Lovable";

const baseRecords = getMockAnalyzeResultRecords();

export function buildMockAnalyzeSubmissionResponse({
  rawText,
  attachmentName,
}: MockAnalyzeSubmissionInput): MockAnalyzeSubmissionResponse {
  const submittedText = rawText?.trim() ?? "";
  const normalized = `${submittedText} ${attachmentName ?? ""}`.toLowerCase();

  if (!submittedText && !attachmentName) {
    return {
      ok: false,
      message: "Vui lòng nhập nội dung hoặc tải ảnh lên trước khi phân tích.",
    };
  }

  if (isLovableSafeScenario(normalized)) {
    return {
      ok: true,
      resultId: "scan-lovable-safe",
      title: "Ảnh chụp màn hình thư mời dùng thử Lovable",
      sourceLabel: getSourceLabel(submittedText, attachmentName),
      attachmentName: attachmentName ?? null,
      riskScore: 15,
      riskTone: "safe",
      statusLabel: "An toàn",
      summary:
        "Nội dung thông điệp là thư chào mừng từ 'Lovable', một nền tảng AI hỗ trợ lập trình thực tế. Mặc dù dữ liệu xác minh có nhắc đến SHB và Be, nhưng hai thương hiệu này không xuất hiện trong nội dung với bối cảnh đáng ngờ. Không có dấu hiệu yêu cầu chuyển tiền, cung cấp OTP hay truy cập link giả mạo.",
      confidence: "Độ tin cậy 91%",
      submittedText: submittedText || "Đã gửi ảnh để OCR và phân tích.",
      extractedText: lovableSafeExtractedText,
      dangerousPhrases: ["5 free credits waiting"],
      mentionedOrganizations: ["SHB (banks)", "Be (delivery)"],
      verificationSummary:
        "URL không được cung cấp rõ ràng để kiểm tra typosquatting. Hai tổ chức SHB và Be có trong CSDL nhưng không liên quan đến nội dung văn bản của Lovable. Không khớp với các mẫu lừa đảo chiếm đoạt tài sản ngân hàng phổ biến.",
    };
  }

  const record = pickRecord(normalized);

  return {
    ok: true,
    resultId: record.id,
    detailHref: `/analyze_result/${record.id}`,
    title: record.title,
    sourceLabel: getSourceLabel(submittedText, attachmentName),
    attachmentName: attachmentName ?? null,
    riskScore: record.riskScore,
    riskTone: record.riskTone,
    statusLabel: record.statusLabel,
    summary: record.summary,
    confidence: record.confidence,
    submittedText: submittedText || "Đã gửi ảnh để OCR và phân tích.",
    extractedText: buildExtractedText(record, submittedText, attachmentName),
    dangerousPhrases: buildDangerousPhrases(record),
    mentionedOrganizations: buildMentionedOrganizations(record),
    verificationSummary: buildVerificationSummary(record),
  };
}

function pickRecord(normalized: string): MockAnalyzeResultSuccess {
  if (
    includesAny(normalized, [
      "otp",
      "vietcombank",
      "vcb",
      "ma xac thuc",
      "xac thuc",
    ])
  ) {
    return getRequiredRecord("bank-otp-safe");
  }

  if (
    includesAny(normalized, [
      "bit.ly",
      "short link",
      "update account",
      "temporary suspension",
      "verify your account",
    ])
  ) {
    return getRequiredRecord("bitly-update-warning");
  }

  if (
    includesAny(normalized, [
      "hr",
      "payroll",
      "benefits",
      "employee",
      "salary",
      "invoice",
    ])
  ) {
    return getRequiredRecord("hr-invoice-danger");
  }

  if (
    includesAny(normalized, [
      "amazon",
      "amaz0n",
      "suspend",
      "security team",
      "verify your identity",
      "unusual login",
    ])
  ) {
    return getRequiredRecord("mg-8832-a9x");
  }

  if (includesAny(normalized, ["png", "jpg", "jpeg", "screenshot", "screen"])) {
    return getRequiredRecord("bitly-update-warning");
  }

  return getRequiredRecord("mg-8832-a9x");
}

function getRequiredRecord(id: string) {
  const record = baseRecords.find((item) => item.id === id);

  if (!record) {
    throw new Error(`Missing mock analyze record: ${id}`);
  }

  return record;
}

function getSourceLabel(submittedText: string, attachmentName?: string | null) {
  if (submittedText && attachmentName) {
    return "Ảnh tải lên + văn bản bổ sung";
  }

  if (attachmentName) {
    return "Ảnh tải lên";
  }

  return "Văn bản nhập tay";
}

function buildExtractedText(
  record: MockAnalyzeResultSuccess,
  submittedText: string,
  attachmentName?: string | null,
) {
  if (submittedText) {
    return submittedText;
  }

  if (attachmentName) {
    return record.submittedText;
  }

  return record.submittedText;
}

function buildDangerousPhrases(record: MockAnalyzeResultSuccess) {
  if (record.id === "bank-otp-safe") {
    return ["OTP", "không chia sẻ mã này"];
  }

  if (record.id === "bitly-update-warning") {
    return ["verify your account information", "temporary suspension"];
  }

  if (record.id === "hr-invoice-danger") {
    return ["confirm your payroll account information", "before noon today"];
  }

  return ["verify your identity", "within the next 12 hours", "permanent deletion"];
}

function buildMentionedOrganizations(record: MockAnalyzeResultSuccess) {
  if (record.id === "bank-otp-safe") {
    return ["Vietcombank"];
  }

  if (record.id === "bitly-update-warning") {
    return ["Bitly"];
  }

  if (record.id === "hr-invoice-danger") {
    return ["Benefits Support Desk", "Phòng nhân sự"];
  }

  return ["Amazon"];
}

function buildVerificationSummary(record: MockAnalyzeResultSuccess) {
  if (record.id === "bank-otp-safe") {
    return "Nội dung khớp mẫu OTP ngân hàng thông thường: không có liên kết ngoài, không yêu cầu phản hồi, và không chứa dấu hiệu ép người dùng chuyển sang website lạ.";
  }

  if (record.id === "bitly-update-warning") {
    return "Liên kết rút gọn che giấu đích đến thật và thông điệp yêu cầu xác minh tài khoản là mô típ phishing phổ biến. Cần mở rộng URL trước khi tương tác.";
  }

  if (record.id === "hr-invoice-danger") {
    return "Email sử dụng ngữ cảnh nội bộ để yêu cầu xác nhận thông tin lương và dẫn người dùng sang website ngoài tổ chức. Đây là dấu hiệu nghiêm trọng của business email compromise.";
  }

  return "Tên miền gửi và liên kết xác minh không khớp thương hiệu Amazon, đồng thời nội dung dùng ngôn ngữ gây áp lực cao. Nên xử lý như một email phishing nguy hiểm.";
}

function isLovableSafeScenario(normalized: string) {
  return includesAny(normalized, [
    "lovable",
    "5 free credits",
    "shb",
    " be ",
    "team lovable",
  ]);
}

function includesAny(input: string, values: string[]) {
  return values.some((value) => input.includes(value));
}
