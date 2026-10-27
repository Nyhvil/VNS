import { describe, expect, it } from '@jest/globals';
import { detectSignals, isOneTimeCodeNotice } from '../../knowledge/scam-signals';
import { scamSignalsRule } from '../../rules/definitions/scam-signals.rule';
import { extractFeatures } from '../../features/feature-extractor';
import { parsePlainText } from '../../parser/plain-text-parser';
import { evaluateRules } from '../../rules/rule-engine';

const ids = (text: string) => detectSignals(text).map(s => s.id);
const rules = (text: string) => evaluateRules(extractFeatures(parsePlainText(text)));

describe('detectSignals', () => {
  it('finds a request for the one-time code, with or without diacritics', () => {
    expect(ids('Chị đọc giúp em mã gồm 6 số vừa gửi nhé')).toContain('code_request');
    expect(ids('chi doc giup em ma vua gui nhe')).toContain('code_request');
  });

  it('ignores a code phrase inside a warning', () => {
    expect(ids('Tuyệt đối không cung cấp mã cho bất kỳ ai')).not.toContain('code_request');
    expect(ids('KHONG cung cap ma nay cho ai')).not.toContain('code_request');
  });

  it('does not read "tại ứng dụng" typed without diacritics as "install an app"', () => {
    expect(ids('Tra cuu tai ung dung GHN')).not.toContain('remote_app');
  });

  it('recognises returns promised per day or month', () => {
    expect(ids('lãi 5%/ngày, nạp vốn tối thiểu 10 triệu')).toEqual(expect.arrayContaining(['too_good', 'money_request']));
  });
});

describe('scamSignalsRule', () => {
  const rule = (text: string) => scamSignalsRule.evaluate(extractFeatures(parsePlainText(text)));

  it('a lone money request is not a finding', () => {
    expect(rule('Lớp mình thu quỹ 100k, các bạn chuyển khoản cho lớp trưởng nha.')).toBeNull();
  });

  it('money plus pressure is high', () => {
    expect(rule('Ba ơi con bị tai nạn, ba chuyển gấp 20 triệu vào số tài khoản này')?.severity).toBe('high');
  });

  it('asking for the code is high on its own', () => {
    expect(rule('Em là nhân viên Shopee, chị đọc giúp em mã vừa gửi để hoàn tiền')?.severity).toBe('high');
  });
});

describe('one-time code notices', () => {
  const notice = 'Ma OTP cua Quy khach la 482913. Tuyet doi KHONG cung cap ma nay cho bat ky ai.';

  it('are recognised', () => {
    expect(isOneTimeCodeNotice(notice, 0)).toBe(true);
    expect(isOneTimeCodeNotice('Mã xác thực của bạn là 551203, không chia sẻ cho ai.', 0)).toBe(true);
  });

  it('are not when there is an unofficial link or no code', () => {
    expect(isOneTimeCodeNotice(notice, 1)).toBe(false);
    expect(isOneTimeCodeNotice('Không cung cấp OTP cho ai. Số tiền 1.500.000đ', 0)).toBe(false);
  });

  it('score as safe', () => {
    expect(rules(notice).score).toBeLessThan(31);
  });
});

describe('deceptive domains', () => {
  it('brand plus a deceptive word is critical', () => {
    const result = rules('Đăng nhập bidv-nangcap.top trước 17h để tránh bị khóa tài khoản');
    const finding = result.violations.find(v => v.rule_id === 'deceptive_domain');
    expect(finding?.severity).toBe('critical');
    expect(result.score).toBeGreaterThanOrEqual(71);
  });

  it('official domains are not flagged', () => {
    expect(rules('Lãi suất tiết kiệm 5.2%/năm, chi tiết tại bidv.com.vn').score).toBe(0);
  });
});
