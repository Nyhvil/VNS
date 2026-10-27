import { describe, expect, it } from '@jest/globals';
import { extractUrls, refang } from '../../parser/url-extractor';

describe('extractUrls', () => {
  it('keeps links with a scheme', () => {
    expect(extractUrls('Vào http://vietcombank-xacminh.top/login ngay.')).toEqual(['http://vietcombank-xacminh.top/login']);
  });

  it('finds bare domains, with paths, and adds http://', () => {
    expect(extractUrls('Xác minh tại zalo-xacthuc.com để giữ tài khoản')).toEqual(['http://zalo-xacthuc.com']);
    expect(extractUrls('Đăng nhập bidv-nangcap.top/dang-nhap trước 17h')).toEqual(['http://bidv-nangcap.top/dang-nhap']);
    expect(extractUrls('Chi tiết tại bidv.com.vn.')).toEqual(['http://bidv.com.vn']);
  });

  it('undoes defanged links', () => {
    expect(refang('vietcombank[.]com hxxps://abc(.)xyz')).toBe('vietcombank.com https://abc.xyz');
    expect(extractUrls('mo khoa tai vcb-mokhoa[.]vip')).toEqual(['http://vcb-mokhoa.vip']);
  });

  it('ignores emails, amounts, abbreviations and file names', () => {
    expect(extractUrls('Gửi cskh@vietcombank.com.vn, số tiền 1.500.000đ, v.v. Xem file baocao.docx')).toEqual([]);
  });

  it('does not report the host of a scheme link twice', () => {
    expect(extractUrls('https://shopee.vn/abc và shopee.vn')).toEqual(['https://shopee.vn/abc', 'http://shopee.vn']);
  });
});
