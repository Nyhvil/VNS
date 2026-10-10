import {
  FeatureSet,
  Finding,
  LlmResult,
  MlResult,
  RagResult,
  VnsRiskLevel,
  VnsVerdict,
  AnalysisPath,
} from '../types';

/**
 * The verdict in the shape the VNS web app shows: three levels, a percentage,
 * and an explanation in Vietnamese.
 */

export function toVnsRiskLevel(score: number): VnsRiskLevel {
  if (score <= 30) return 'SAFE';
  if (score <= 70) return 'SUSPICIOUS';
  return 'SCAM';
}

/** Vietnamese wording for the rules whose own description is in English. */
const RULE_DESCRIPTIONS_VI: Record<string, string> = {
  spf_fail: 'Email không vượt qua kiểm tra SPF (máy chủ gửi không được tên miền cho phép)',
  dkim_fail: 'Email không vượt qua kiểm tra chữ ký DKIM',
  domain_mismatch: 'Tên miền người gửi và địa chỉ trả lời khác nhau',
  ip_url: 'Link dùng địa chỉ IP thay cho tên miền',
  url_shortener: 'Có link rút gọn, che mất địa chỉ thật',
  ocr_failure: 'Không đọc được chữ trong ảnh',
};

function describeFinding(finding: Finding): string {
  if (finding.rule_id === 'suspicious_keyword') {
    const keywords = Array.isArray(finding.evidence['keywords'])
      ? (finding.evidence['keywords'] as unknown[]).map(String).slice(0, 5)
      : [];
    return `Có cụm từ thường gặp trong tin lừa đảo: ${keywords.join(', ')}`;
  }

  if (finding.rule_id === 'similar_to_known_phishing') {
    const similarity = Number(finding.evidence['top_similarity']);
    return Number.isFinite(similarity)
      ? `Giống ${(similarity * 100).toFixed(0)}% với một mẫu lừa đảo đã biết`
      : 'Giống với một mẫu lừa đảo đã biết';
  }

  return RULE_DESCRIPTIONS_VI[finding.rule_id] ?? finding.description;
}

const DEFAULT_ADVICE: Record<VnsRiskLevel, string> = {
  SCAM:
    'Không bấm vào link, không cung cấp mã OTP, mật khẩu hay thông tin cá nhân, và không chuyển tiền. Nếu nội dung nhân danh ngân hàng hoặc cơ quan nhà nước, hãy tự gọi tới số tổng đài chính thức để kiểm tra.',
  SUSPICIOUS:
    'Hãy thận trọng: xác minh người gửi qua kênh chính thức trước khi bấm link, cung cấp thông tin hoặc chuyển tiền.',
  SAFE:
    'Chưa thấy dấu hiệu lừa đảo rõ ràng. Dù vậy, hãy luôn cảnh giác với mọi yêu cầu cung cấp thông tin cá nhân hoặc chuyển tiền.',
};

function buildExplanation(
  level: VnsRiskLevel,
  findings: Finding[],
  ml: MlResult | undefined,
  path: AnalysisPath
): string {
  const parts: string[] = [];

  if (path === 'fast_ml' && ml?.available && ml.label) {
    parts.push(
      `Mô hình phân loại (${ml.model ?? 'ML'}) đánh giá nội dung này là ${ml.label === 'scam' ? 'lừa đảo' : 'an toàn'} với độ tin cậy ${(ml.confidence * 100).toFixed(0)}%.`
    );
  }

  const reasons = findings.map(describeFinding);

  if (level === 'SCAM') {
    parts.push(
      reasons.length > 0
        ? `Nội dung có nhiều dấu hiệu lừa đảo: ${reasons.join('; ')}.`
        : 'Nội dung có nhiều dấu hiệu lừa đảo.'
    );
  } else if (level === 'SUSPICIOUS') {
    parts.push(
      reasons.length > 0
        ? `Nội dung có dấu hiệu đáng ngờ: ${reasons.join('; ')}.`
        : 'Nội dung có dấu hiệu đáng ngờ.'
    );
  } else {
    parts.push('Không phát hiện dấu hiệu lừa đảo rõ ràng.');
    if (reasons.length > 0) {
      parts.push(`Có vài yếu tố nên lưu ý: ${reasons.join('; ')}.`);
    }
  }

  return parts.join(' ');
}

function buildVerificationSummary(features: FeatureSet | undefined, ragResult: RagResult | undefined): string {
  const parts: string[] = [];
  const knowledge = features?.knowledge;

  if (knowledge && knowledge.urls.length > 0) {
    const suspicious = knowledge.urls.filter(u => u.suspicious).length;
    parts.push(`Đã kiểm tra ${knowledge.urls.length} link, ${suspicious} link đáng ngờ.`);
  }

  if (knowledge && knowledge.entities.length > 0) {
    const names = [...new Set(knowledge.entities.flatMap(e => e.found))].slice(0, 5);
    parts.push(`Tổ chức được nhắc tới: ${names.join(', ')}.`);
  }

  if (knowledge && knowledge.patterns.length > 0) {
    parts.push(`Mẫu lừa đảo khớp: ${knowledge.patterns.slice(0, 3).map(p => p.name).join('; ')}.`);
  }

  if (ragResult && ragResult.matches.length > 0 && ragResult.top_score > 0) {
    parts.push(
      `Mẫu gần nhất trong cơ sở dữ liệu lừa đảo giống ${(ragResult.top_score * 100).toFixed(0)}%.`
    );
  }

  return parts.join(' ');
}

function collectDangerousPhrases(features: FeatureSet | undefined): string[] {
  if (!features) return [];

  const phrases = [
    ...(features.knowledge?.patterns.flatMap(p => p.matched_keywords) ?? []),
    ...features.suspicious_keywords,
  ];

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const phrase of phrases) {
    const key = phrase.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(phrase);
    }
  }
  return unique.slice(0, 10);
}

export interface VerdictInput {
  riskScore: number;
  path: AnalysisPath;
  findings: Finding[];
  features?: FeatureSet;
  ragResult?: RagResult;
  llm?: LlmResult;
  ml?: MlResult;
  extractedText?: string;
}

export function buildVnsVerdict(input: VerdictInput): VnsVerdict {
  const level = toVnsRiskLevel(input.riskScore);
  const llm = input.llm?.succeeded ? input.llm : undefined;

  const verdict: VnsVerdict = {
    scam_percent: input.riskScore,
    risk_level: level,
    explanation: llm?.explanation || buildExplanation(level, input.findings, input.ml, input.path),
    dangerous_phrases:
      llm?.dangerous_phrases && llm.dangerous_phrases.length > 0
        ? llm.dangerous_phrases
        : collectDangerousPhrases(input.features),
    advice: llm?.advice || DEFAULT_ADVICE[level],
    verification_summary:
      llm?.verification_summary || buildVerificationSummary(input.features, input.ragResult),
  };

  if (input.extractedText) verdict.extracted_text = input.extractedText;

  return verdict;
}
