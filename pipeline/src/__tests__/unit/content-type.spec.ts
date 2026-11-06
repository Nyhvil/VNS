import { describe, expect, it } from '@jest/globals';
import { detectContentType, CHECKLISTS } from '../../knowledge/content-type';
import { extractFeatures } from '../../features/feature-extractor';
import { parsePlainText } from '../../parser/plain-text-parser';
import { evaluateRules } from '../../rules/rule-engine';
import { buildVnsVerdict } from '../../scoring/vns-verdict';

const verdict = (text: string) => {
  const features = extractFeatures(parsePlainText(text));
  const rules = evaluateRules(features);
  return buildVnsVerdict({ riskScore: rules.score, path: 'deep', findings: rules.violations, features });
};

describe('detectContentType', () => {
  it('recognises job ads, sale posts, loans, investment and dating', () => {
    expect(detectContentType('Cần tuyển nhân viên bán hàng, lương cứng 7 triệu, ca làm linh hoạt')?.type).toBe('job');
    expect(detectContentType('Cần bán gấp iPhone 15, còn hàng, ib giá')?.type).toBe('sale');
    expect(detectContentType('Hỗ trợ vay tiền nhanh, giải ngân trong ngày')?.type).toBe('loan');
    expect(detectContentType('Tham gia sàn giao dịch, lợi nhuận mỗi ngày')?.type).toBe('investment');
    expect(detectContentType('Anh muốn làm quen, kết bạn với em')?.type).toBe('romance');
  });

  it('leaves other content alone', () => {
    expect(detectContentType('Chiều nay 3h họp nhóm ở thư viện nhé')).toBeNull();
    expect(detectContentType('Vietcombank: giảm giá 20% khi thanh toán QR')).toBeNull();
  });

  it('collects concrete details that can be checked', () => {
    const kind = detectContentType('Công ty TNHH Minh Phát tuyển dụng nhân viên kho, lương 8 triệu. MST: 0312345678. Địa chỉ 12 đường Lê Lợi');
    expect(kind?.trust).toEqual(expect.arrayContaining(['mã số thuế', 'công ty có tên', 'địa chỉ cụ thể']));
  });
});

describe('REVIEW level', () => {
  it('a job ad with no warning sign and no checkable details: check further, with a checklist', () => {
    const v = verdict('Tuyển cộng tác viên bán hàng, thu nhập theo doanh số, inbox để nhận việc');
    expect(v.risk_level).toBe('REVIEW');
    expect(v.content_type).toBe('Tin tuyển dụng');
    expect(v.checklist).toEqual(CHECKLISTS.job);
  });

  it('a job ad with a tax code, a company name and an address can be safe', () => {
    const v = verdict('Công ty TNHH Minh Phát tuyển dụng nhân viên kho, lương 8 triệu. MST: 0312345678. Địa chỉ 12 đường Lê Lợi, Quận 1');
    expect(v.risk_level).toBe('SAFE');
    expect(v.checklist).toEqual(CHECKLISTS.job);
  });

  it('a job ad that asks for a fee is still a scam', () => {
    const v = verdict('Tuyển cộng tác viên thả tim sản phẩm, lương ngày 500k. Đóng phí kích hoạt 199k để nhận việc');
    expect(v.risk_level).toBe('SCAM');
  });

  it('a hostess job is suspicious', () => {
    const v = verdict('Tuyển lễ tân ưu tiên nữ, ngoại hình ưa nhìn, tiếp khách nước ngoài, ca đêm 19h-0h, địa chỉ sẽ trao đổi khi liên hệ');
    expect(['SUSPICIOUS', 'SCAM']).toContain(v.risk_level);
  });

  it('a seller who asks to cancel the Shopee order and pay outside it is a scam', () => {
    const v = verdict('Bạn hủy đơn trên Shopee giúp mình, chuyển khoản trước 500k qua tài khoản này để giao dịch ngoài cho rẻ');
    expect(v.risk_level).toBe('SCAM');
  });

  it('ordinary messages stay safe', () => {
    expect(verdict('Chiều nay 3h họp nhóm ở thư viện nhé').risk_level).toBe('SAFE');
  });
});
