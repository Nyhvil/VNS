/**
 * Cases found by running the rules over the team's log of real checks
 * (MailGuard_Analysis, 4–8/2026). The texts are shortened or rewritten so they
 * carry no personal data; the log itself stays out of the repository.
 */
import { describe, expect, it } from '@jest/globals';
import { detectSignals, isOfficialNotice, isScamWarning } from '../../knowledge/scam-signals';
import { findEntities } from '../../knowledge/entity-checker';
import { checkUrlSafety } from '../../knowledge/url-safety';
import { extractUrls } from '../../parser/url-extractor';
import { extractFeatures } from '../../features/feature-extractor';
import { parsePlainText } from '../../parser/plain-text-parser';
import { evaluateRules } from '../../rules/rule-engine';

const score = (text: string) => evaluateRules(extractFeatures(parsePlainText(text))).score;
const ids = (text: string) => detectSignals(text).map(s => s.id);
const SAFE = 30;

describe('genuine messages that were flagged', () => {
  it('Viettel links on viettel.vn and vietteltelecom.vn', () => {
    expect(score('[TB] Quý khách vui lòng truy cập https://vietteltelecom.vn/vanbanchapthuan đọc và xác nhận đồng ý, giúp Viettel hỗ trợ kịp thời.')).toBeLessThanOrEqual(SAFE);
    expect(score('Nhap ma OTP 4681 de xac thuc Doi mat khau tren ung dung My Viettel. Ma OTP se het han sau 5p. Truy cap https://viettel.vn/app. Vui long khong cung cap ma cho bat ky ai.')).toBeLessThanOrEqual(SAFE);
  });

  it('a membership card number is not a request for a bank card', () => {
    expect(score('Chào mừng Quý hội viên gia nhập Chương trình Bông Sen Vàng của Vietnam Airlines với số thẻ là 9072380000. Truy cập ww.vietnamairlines.com để tạo mật khẩu.')).toBeLessThanOrEqual(SAFE);
    expect(ids('the server will use that explicit path so the filenames')).not.toContain('code_request');
  });

  it('a bank statement opened with a password', () => {
    expect(ids('Để mở Sao kê vui lòng nhập Mật khẩu là Số Giấy tờ tùy thân của Quý khách.')).not.toContain('code_request');
  });

  it('a booking code is not a one-time code', () => {
    expect(ids('Quý khách cần hỗ trợ gấp vui lòng cung cấp mã đặt phòng 779033419 cho tổng đài.')).not.toContain('code_request');
  });

  it('a news article warning about scams', () => {
    const news =
      'CSGT TP.HCM khuyến cáo tình trạng mạo danh, lừa đảo người dân. Các đối tượng yêu cầu nạn nhân chuyển tiền, ' +
      'cung cấp mã OTP. Người dân không cung cấp thông tin cá nhân hoặc chuyển tiền theo yêu cầu của người lạ.';
    expect(isScamWarning(news, 0)).toBe(true);
    expect(score(news)).toBeLessThanOrEqual(SAFE);
  });

  it('a notice that points only to the official app or counter', () => {
    expect(score('MobiFone kính mời Quý khách cập nhật thông tin thẻ căn cước qua App My MobiFone hoặc tại Cửa hàng MobiFone gần nhất.')).toBeLessThanOrEqual(SAFE);
  });

  it('a short link in a tuition email, on its own', () => {
    expect(score('Thân gửi sinh viên, xem hướng dẫn gia hạn học phí tại https://bit.ly/GIAHANHK253')).toBeLessThanOrEqual(SAFE);
  });

  it('a brand named next to an unrelated link', () => {
    expect(score('Ưu đãi Shopee hôm nay khi mua qua VNPT Money, chi tiết tại https://truonghocsoquocgia.vn')).toBeLessThanOrEqual(SAFE);
  });

  it('English words that are also brand names', () => {
    expect(findEntities('Questions often begin with "What is". Be clear about the local sample.')).toEqual([]);
    expect(findEntities('Đặt xe Be về nhà').flatMap(e => e.found)).toContain('Be');
  });

  it('the start of an email address is not a link', () => {
    expect(extractUrls('Marketing Challenge <masc26.work@gmail.com> đến tôi')).toEqual([]);
  });
});

describe('scams that were missed', () => {
  it('online job with no deposit, paid weekly', () => {
    expect(score('TUYỂN DỤNG ONLINE - mình có jobs onl không cọc không vốn - không yêu cầu kinh nghiệm - lương tuần, ib để mình gửi jd')).toBeGreaterThan(SAFE);
  });

  it('task job that asks for an activation fee', () => {
    expect(score('Công việc chỉ cần thả tim sản phẩm, mỗi ngày kiếm 500k. Muốn nhận việc thì đóng trước phí kích hoạt tài khoản 299k.')).toBeGreaterThan(70);
  });

  it('betting ad with a link', () => {
    expect(score('[8qbet] nạp tiền lần đầu tặng 58.8k, rút tiền không giới hạn. dk ngay: https://dx6614.8qbet84.com')).toBeGreaterThan(70);
  });

  it('asking a friend to send money, typed without diacritics', () => {
    expect(ids('Chi cho em muon tien 5 trieu chuyen qua so nay giup em')).toContain('money_request');
  });

  it('a mangled link is not a valid domain', () => {
    expect(checkUrlSafety('http://mttq-http//mttq_gov.online/confirm').suspicious).toBe(true);
  });
});

describe('exceptions are not loopholes', () => {
  it('a fake police call is not a news article', () => {
    expect(isScamWarning('Công an thông báo bạn liên quan vụ án rửa tiền, chuyển tiền vào tài khoản tạm giữ để điều tra.', 0)).toBe(false);
  });

  it('a warning with a flagged link is not exempt', () => {
    expect(isScamWarning('Cảnh giác lừa đảo mạo danh: nạn nhân hãy xác minh tại vcb-xacminh.top', 1)).toBe(false);
  });

  it('a notice that asks for money is not an official notice', () => {
    expect(isOfficialNotice('Vui lòng chuyển khoản phí tại cửa hàng gần nhất', [], detectSignals('Vui lòng chuyển khoản phí tại cửa hàng gần nhất'))).toBe(false);
  });
});
