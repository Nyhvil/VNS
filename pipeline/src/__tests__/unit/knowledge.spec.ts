import * as fs from 'fs';
import * as path from 'path';
import { checkUrlSafety, findEntities, matchScamPatterns, checkKnowledge, SCAM_PATTERNS, OFFICIAL_DOMAINS } from '../../knowledge';
import { containsKeyword, prepareText } from '../../knowledge/text-match';

describe('Knowledge base', () => {
  describe('data files', () => {
    it('should hold the 16 scam patterns and 23 official domains', () => {
      expect(SCAM_PATTERNS).toHaveLength(16);
      expect(OFFICIAL_DOMAINS).toHaveLength(23);
    });

    // The web app's built-in analysis keeps its own copy of the two files.
    it.each(['verified_entities_2026.json', 'vietnam_scam_patterns.json'])(
      'should keep %s identical to the copy used by the edge function',
      fileName => {
        const edgeCopy = path.join(__dirname, '../../../../supabase/functions/analyze-content', fileName);
        if (!fs.existsSync(edgeCopy)) return; // pipeline checked out on its own

        const ours = JSON.parse(fs.readFileSync(path.join(__dirname, '../../knowledge', fileName), 'utf8'));
        expect(ours).toEqual(JSON.parse(fs.readFileSync(edgeCopy, 'utf8')));
      }
    );
  });

  describe('checkUrlSafety()', () => {
    it('should accept an official domain and its subdomains', () => {
      expect(checkUrlSafety('https://vietcombank.com.vn/login')).toMatchObject({ official: true, suspicious: false });
      expect(checkUrlSafety('https://dichvucong.gov.vn/p/home')).toMatchObject({ official: true, suspicious: false });
    });

    it('should flag a look-alike domain that contains a brand name', () => {
      const result = checkUrlSafety('http://vietcombank-xacminh.top/login');
      expect(result.official).toBe(false);
      expect(result.suspicious).toBe(true);
      expect(result.flags.impersonated_brands).toEqual(['vietcombank']);
      expect(result.flags.suspicious_tld).toBe(true);
    });

    it('should flag IP addresses, shorteners and long subdomain chains', () => {
      expect(checkUrlSafety('http://45.12.8.9/login').flags.ip_address).toBe(true);
      expect(checkUrlSafety('https://bit.ly/3xYz').flags.shortener).toBe(true);
      expect(checkUrlSafety('https://secure.login.bank.example.com/a').flags.many_subdomains).toBe(true);
    });

    it('should not count an IP address as a long subdomain chain', () => {
      expect(checkUrlSafety('http://45.12.8.9/login').flags.many_subdomains).toBe(false);
    });

    it('should leave an ordinary unknown domain unflagged', () => {
      const result = checkUrlSafety('https://vnexpress.net/tin-tuc');
      expect(result).toMatchObject({ official: false, suspicious: false });
    });

    it('should treat an unparsable URL as suspicious', () => {
      expect(checkUrlSafety('http://')).toMatchObject({ suspicious: true, flags: { invalid: true } });
    });
  });

  describe('keyword matching', () => {
    it('should match Vietnamese typed without diacritics', () => {
      expect(containsKeyword(prepareText('tai khoan bi khoa roi'), 'tài khoản bị khóa')).toBe(true);
    });

    it('should respect diacritics when the text has them', () => {
      // "công ăn việc làm" (livelihood) must not match "công an" (police)
      expect(containsKeyword(prepareText('Lo công ăn việc làm cho mọi người'), 'công an')).toBe(false);
      expect(containsKeyword(prepareText('Tôi là cán bộ công an phường'), 'công an')).toBe(true);
    });

    it('should match short keywords only as whole words', () => {
      expect(containsKeyword(prepareText('Vui lòng đọc mã OTP'), 'OTP')).toBe(true);
      expect(containsKeyword(prepareText('Toi nay an hotpot nhe'), 'OTP')).toBe(false);
    });
  });

  describe('findEntities()', () => {
    it('should find verified organisations by category', () => {
      const entities = findEntities('Vietcombank thông báo, vui lòng liên hệ Bộ Công an');
      expect(entities.find(e => e.category === 'banks')?.found).toContain('Vietcombank');
      expect(entities.find(e => e.category === 'government')?.found).toContain('Bộ Công an');
    });

    it('should return nothing for text without organisations', () => {
      expect(findEntities('Chiều nay nhóm mình họp ở thư viện nhé')).toEqual([]);
    });
  });

  describe('matchScamPatterns()', () => {
    it('should match a prize scam and report its keywords', () => {
      const matches = matchScamPatterns('Chúc mừng bạn đã trúng thưởng xe SH, liên hệ để nhận thưởng');
      const prize = matches.find(m => m.id === 'fake_prize');
      expect(prize?.matched_keywords).toEqual(expect.arrayContaining(['trúng thưởng', 'nhận thưởng', 'chúc mừng bạn']));
    });

    it('should sort matches by danger', () => {
      const matches = matchScamPatterns('Công an triệu tập, bạn đã trúng thưởng');
      const weights = matches.map(m => m.risk_weight);
      expect(weights).toEqual([...weights].sort((a, b) => b - a));
    });

    it('should return nothing for an ordinary message', () => {
      expect(matchScamPatterns('Chào bạn, chiều nay 3 giờ nhóm mình họp ở thư viện tầng 2 nhé.')).toEqual([]);
    });
  });

  it('checkKnowledge() should combine the three checks', () => {
    const findings = checkKnowledge('Vietcombank: tài khoản bị khóa, nhập mã OTP', ['http://vietcombank-vn.xyz']);
    expect(findings.urls).toHaveLength(1);
    expect(findings.entities.length).toBeGreaterThan(0);
    expect(findings.patterns[0]?.id).toBe('fake_bank_otp');
  });
});
