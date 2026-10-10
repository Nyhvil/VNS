interface AnalysisResult {
  riskPercentage: number;
  explanation: string;
  detectedKeywords: string[];
}

const SUSPICIOUS_PATTERNS: { pattern: RegExp; weight: number; label: string }[] = [
  { pattern: /urgent|khẩn cấp|gấp/gi, weight: 10, label: "từ ngữ khẩn cấp" },
  { pattern: /password|mật khẩu/gi, weight: 15, label: "yêu cầu mật khẩu" },
  { pattern: /bank|ngân hàng|tài khoản ngân hàng/gi, weight: 10, label: "đề cập ngân hàng" },
  { pattern: /verify|xác minh|xác nhận/gi, weight: 10, label: "yêu cầu xác minh" },
  { pattern: /click (here|link)|nhấn (vào|link)|bấm vào/gi, weight: 12, label: "yêu cầu nhấn link" },
  { pattern: /OTP|mã xác thực|mã bảo mật/gi, weight: 15, label: "yêu cầu OTP/mã bảo mật" },
  { pattern: /account locked|tài khoản bị khóa|bị đóng băng/gi, weight: 15, label: "cảnh báo tài khoản bị khóa" },
  { pattern: /winner|trúng thưởng|giải thưởng|congratulations/gi, weight: 12, label: "thông báo trúng thưởng" },
  { pattern: /free|miễn phí|tặng/gi, weight: 5, label: "lời hứa miễn phí" },
  { pattern: /limited time|thời gian có hạn|hết hạn/gi, weight: 8, label: "tạo áp lực thời gian" },
  { pattern: /wire transfer|chuyển tiền|chuyển khoản/gi, weight: 12, label: "yêu cầu chuyển tiền" },
  { pattern: /social security|CMND|CCCD|căn cước/gi, weight: 15, label: "yêu cầu thông tin cá nhân" },
  { pattern: /act now|hành động ngay/gi, weight: 8, label: "thúc giục hành động" },
  { pattern: /suspend|đình chỉ/gi, weight: 10, label: "đe dọa đình chỉ" },
  { pattern: /http[s]?:\/\/[^\s]+/gi, weight: 5, label: "chứa đường link" },
  { pattern: /dear customer|quý khách|thân gửi/gi, weight: 3, label: "xưng hô chung chung" },
  { pattern: /nigerian prince|thừa kế|inheritance/gi, weight: 15, label: "lừa đảo thừa kế" },
  { pattern: /bitcoin|crypto|tiền ảo|tiền điện tử/gi, weight: 10, label: "đề cập tiền ảo" },
  { pattern: /investment|đầu tư|lợi nhuận cao/gi, weight: 8, label: "mời đầu tư" },
  { pattern: /confidential|bí mật|không chia sẻ/gi, weight: 8, label: "yêu cầu giữ bí mật" },
];

export function analyzeEmail(emailContent: string): AnalysisResult {
  const detectedKeywords: string[] = [];
  let totalWeight = 0;

  for (const { pattern, weight, label } of SUSPICIOUS_PATTERNS) {
    const matches = emailContent.match(pattern);
    if (matches && matches.length > 0) {
      totalWeight += weight * Math.min(matches.length, 3);
      detectedKeywords.push(label);
    }
  }

  const riskPercentage = Math.min(Math.round((totalWeight / 80) * 100), 100);

  let explanation: string;
  if (riskPercentage >= 80) {
    explanation = `⚠️ CẢNH BÁO CAO: Email này có nhiều dấu hiệu lừa đảo nghiêm trọng. Phát hiện ${detectedKeywords.length} tín hiệu đáng ngờ bao gồm: ${detectedKeywords.join(", ")}. Không nên tương tác với email này.`;
  } else if (riskPercentage >= 50) {
    explanation = `⚠️ ĐÁNG NGHI: Email này có một số dấu hiệu đáng ngờ. Phát hiện: ${detectedKeywords.join(", ")}. Cần thận trọng và xác minh nguồn gửi trước khi phản hồi.`;
  } else if (riskPercentage >= 20) {
    explanation = `ℹ️ RỦI RO THẤP: Email có vài yếu tố cần chú ý (${detectedKeywords.join(", ")}), nhưng nhìn chung không quá nguy hiểm. Vẫn nên cẩn thận khi chia sẻ thông tin cá nhân.`;
  } else {
    explanation = `✅ AN TOÀN: Email này không có dấu hiệu lừa đảo rõ ràng. Tuy nhiên, luôn cảnh giác với mọi email yêu cầu thông tin cá nhân.`;
  }

  return { riskPercentage, explanation, detectedKeywords };
}

export function generateSessionId(): string {
  const existing = sessionStorage.getItem("mailguard_session_id");
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem("mailguard_session_id", id);
  return id;
}

export function getUserId(): string {
  const existing = localStorage.getItem("mailguard_user_id");
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem("mailguard_user_id", id);
  return id;
}
