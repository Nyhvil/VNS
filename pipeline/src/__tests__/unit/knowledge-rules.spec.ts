import { extractFeatures } from '../../features/feature-extractor';
import { evaluateRules } from '../../rules/rule-engine';
import { parsePlainText } from '../../parser/plain-text-parser';

function rulesFor(text: string) {
  const result = evaluateRules(extractFeatures(parsePlainText(text)));
  return { result, ids: result.violations.map(v => v.rule_id) };
}

describe('Rules backed by the Vietnamese knowledge base', () => {
  it('should flag a link that borrows a brand name as high severity', () => {
    const { result, ids } = rulesFor('Xac minh tai http://vietcombank-secure.com/login');
    expect(ids).toContain('brand_impersonation_url');
    expect(result.violations.find(v => v.rule_id === 'brand_impersonation_url')?.severity).toBe('high');
  });

  it('should not flag the official domain of the same brand', () => {
    const { ids } = rulesFor('Xem thong bao tai https://www.vietcombank.com.vn/tin-tuc');
    expect(ids).not.toContain('brand_impersonation_url');
    expect(ids).not.toContain('entity_unofficial_link');
  });

  it('should flag suspicious TLDs and long subdomain chains', () => {
    expect(rulesFor('Nhan qua tai http://qua-tang.xyz').ids).toContain('suspicious_tld');
    expect(rulesFor('Dang nhap http://a.b.c.d.example.com').ids).toContain('excessive_subdomains');
  });

  it('should flag an organisation mentioned next to an unofficial link', () => {
    const { result, ids } = rulesFor('MoMo thông báo hoàn tiền, xem tại https://hoan-tien-nhanh.com');
    expect(ids).toContain('entity_unofficial_link');
    expect(result.violations.find(v => v.rule_id === 'entity_unofficial_link')?.severity).toBe('medium');
  });

  describe('scam_pattern', () => {
    it('should be high when a dangerous pattern matches on several keywords', () => {
      const { result } = rulesFor('Tôi là công an, bạn liên quan đến vụ án rửa tiền, sẽ có lệnh bắt');
      expect(result.violations.find(v => v.rule_id === 'scam_pattern')?.severity).toBe('high');
      expect(result.score).toBeGreaterThanOrEqual(75);
    });

    it('should be low when only one keyword of one pattern appears', () => {
      const { result } = rulesFor('Hôm qua công an phường đến kiểm tra tạm trú');
      expect(result.violations.find(v => v.rule_id === 'scam_pattern')?.severity).toBe('low');
      expect(result.score).toBeLessThan(30);
    });

    it('should be medium when a milder pattern matches strongly', () => {
      const { result } = rulesFor('Kêu gọi quyên góp từ thiện cho hoàn cảnh khó khăn');
      expect(result.violations.find(v => v.rule_id === 'scam_pattern')?.severity).toBe('medium');
    });
  });

  it('should find nothing in an ordinary message', () => {
    const { result } = rulesFor('Chào bạn, chiều nay 3 giờ nhóm mình họp ở thư viện tầng 2 nhé. Nhớ mang theo laptop.');
    expect(result.violations).toEqual([]);
    expect(result.score).toBe(0);
  });

  it('should find nothing in an ordinary delivery notice', () => {
    const { result } = rulesFor('Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn đã mua hàng.');
    expect(result.score).toBeLessThan(30);
  });
});
