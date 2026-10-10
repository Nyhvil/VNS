import { buildVnsVerdict, toVnsRiskLevel } from '../../scoring/vns-verdict';
import { extractFeatures } from '../../features/feature-extractor';
import { evaluateRules } from '../../rules/rule-engine';
import { parsePlainText } from '../../parser/plain-text-parser';

describe('VNS verdict', () => {
  it.each([
    [0, 'SAFE'],
    [30, 'SAFE'],
    [31, 'SUSPICIOUS'],
    [70, 'SUSPICIOUS'],
    [71, 'SCAM'],
    [100, 'SCAM'],
  ])('should map %i to %s', (score, level) => {
    expect(toVnsRiskLevel(score)).toBe(level);
  });

  it('should use the LLM wording when the LLM answered', () => {
    const verdict = buildVnsVerdict({
      riskScore: 92,
      path: 'deep',
      findings: [],
      llm: {
        explanation: 'Tin nhắn giả mạo ngân hàng.',
        score: 92,
        enabled: true,
        succeeded: true,
        dangerous_phrases: ['mã OTP'],
        advice: 'Không cung cấp OTP.',
        verification_summary: 'Link không chính thức.',
      },
    });

    expect(verdict).toEqual({
      scam_percent: 92,
      risk_level: 'SCAM',
      explanation: 'Tin nhắn giả mạo ngân hàng.',
      dangerous_phrases: ['mã OTP'],
      advice: 'Không cung cấp OTP.',
      verification_summary: 'Link không chính thức.',
    });
  });

  it('should write its own Vietnamese explanation without an LLM', () => {
    const features = extractFeatures(
      parsePlainText('Vietcombank: tài khoản bị khóa, nhập mã OTP tại http://vietcombank-xacminh.top')
    );
    const rules = evaluateRules(features);

    const verdict = buildVnsVerdict({ riskScore: 85, path: 'deep', findings: rules.violations, features });

    expect(verdict.risk_level).toBe('SCAM');
    expect(verdict.explanation).toContain('dấu hiệu lừa đảo');
    expect(verdict.explanation).toContain('vietcombank');
    expect(verdict.dangerous_phrases).toEqual(expect.arrayContaining(['OTP', 'tài khoản bị khóa']));
    expect(verdict.advice).toContain('OTP');
    expect(verdict.verification_summary).toContain('Đã kiểm tra 1 link, 1 link đáng ngờ');
    expect(verdict.verification_summary).toContain('Vietcombank');
  });

  it('should translate the English rule descriptions', () => {
    const verdict = buildVnsVerdict({
      riskScore: 80,
      path: 'deep',
      findings: [{ rule_id: 'ip_url', severity: 'high', description: 'URL(s) using IP address', evidence: {} }],
    });
    expect(verdict.explanation).toContain('Link dùng địa chỉ IP');
    expect(verdict.explanation).not.toContain('URL(s) using');
  });

  it('should say so plainly when nothing was found', () => {
    const verdict = buildVnsVerdict({ riskScore: 0, path: 'deep', findings: [] });
    expect(verdict.risk_level).toBe('SAFE');
    expect(verdict.explanation).toBe('Không phát hiện dấu hiệu lừa đảo rõ ràng.');
    expect(verdict.dangerous_phrases).toEqual([]);
  });

  it('should name the classifier on the fast path', () => {
    const verdict = buildVnsVerdict({
      riskScore: 97,
      path: 'fast_ml',
      findings: [],
      ml: { available: true, label: 'scam', confidence: 0.97, scam_probability: 0.97, model: 'phobert', language: 'vi' },
    });
    expect(verdict.explanation).toContain('Mô hình phân loại (phobert)');
    expect(verdict.explanation).toContain('97%');
  });

  it('should carry the text read from an image', () => {
    const verdict = buildVnsVerdict({ riskScore: 0, path: 'deep', findings: [], extractedText: 'xin chào' });
    expect(verdict.extracted_text).toBe('xin chào');
  });
});
