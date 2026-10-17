import { removeContactDetails, NO_CONTACT_RULE } from '../../llm/contact-guard';

describe('removeContactDetails()', () => {
  it('should hide a hotline the model wrote', () => {
    const advice =
      'Hãy lập tức liên hệ hotline Vietcombank (1900 54 54 13) hoặc khóa thẻ trên ứng dụng VCB Digibank.';
    expect(removeContactDetails(advice)).toBe(
      'Hãy lập tức liên hệ hotline Vietcombank ([số đã ẩn]) hoặc khóa thẻ trên ứng dụng VCB Digibank.'
    );
  });

  it('should never make a scam link sound official', () => {
    expect(removeContactDetails('Đừng mở vietcombank-xacminh.com')).toBe('Đừng mở [link đã ẩn]');
  });

  it('should remove phone numbers, links, domains and email addresses', () => {
    const out = removeContactDetails(
      'Gọi 0912 345 678 hoặc +84 912 345 678, xem https://vietcombank.com.vn/lien-he, vào www.bidv.com.vn, gửi mail cskh@bank.vn, hoặc 1800-1234.'
    );
    expect(out).not.toMatch(/\d{3,}/);
    expect(out).not.toMatch(/https?:|www\.|\.com|@/);
    expect(out).toContain('[link đã ẩn]');
    expect(out).toContain('[email đã ẩn]');
  });

  it('should keep ordinary text, amounts and times', () => {
    const text = 'Đừng chuyển 2.000.000 đồng; ngân hàng không bao giờ hỏi mã OTP trong vòng 24h.';
    expect(removeContactDetails(text)).toBe(text);
  });

  it('should be part of the rule given to the model', () => {
    expect(NO_CONTACT_RULE).toContain('không ghi số điện thoại');
  });
});
