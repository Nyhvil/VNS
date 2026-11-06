import { FeatureSet, Finding, ScamSignalFinding, Severity } from '../../types';

/**
 * Combinations of scam moves (see knowledge/scam-signals.ts). One move alone is
 * common in ordinary messages; scams combine them.
 *
 *   - asking for a one-time code or a password                      → high
 *   - money or a fee together with pressure, a threat, secrecy, a
 *     too-good promise, an impersonated channel or a remote app      → high
 *   - an easy online job together with money or a fee (task scam)  → high
 *   - betting ads with a link                                         → high
 *   - proof of funds or ID papers with a too-good offer or a deadline → high
 *   - a seller asking to cancel the platform order or deal outside it, plus money → high
 *   - several "hostess" job words (đêm, tiếp khách, ưu tiên nữ...)  → medium
 *   - two other moves together, or several job-lure or betting words → medium
 */
const PRESSURE = new Set(['urgency', 'threat', 'secrecy', 'too_good', 'channel_switch', 'remote_app']);

// Cancelling the platform order or dealing outside it: the buyer loses the platform's protection.
const OFF_PLATFORM_DEAL = new Set(['hủy đơn', 'huỷ đơn', 'giao dịch ngoài', 'không qua sàn']);
const offPlatformDeal = (signals: ScamSignalFinding[]) =>
  signals.some(s => s.id === 'off_platform' && s.matched.some(m => OFF_PLATFORM_DEAL.has(m)));

// "Ưu tiên nữ" or "ca đêm" alone is common in genuine ads; with "tiếp khách",
// "karaoke" or "ngoại hình" it is the shape of a hostess job.
const HOSTESS_CORE = new Set(['tiếp khách', 'phục vụ khách nước ngoài', 'ngoại hình ưa nhìn', 'ngoại hình khá', 'karaoke', 'massage', 'quán bar']);
const hostessJob = (signals: ScamSignalFinding[]) =>
  signals.some(s => s.id === 'hostess' && s.matched.length >= 2 && s.matched.some(m => HOSTESS_CORE.has(m)));

export const scamSignalsRule = {
  id: 'scam_signals',
  evaluate(features: FeatureSet): Finding | null {
    const signals = features.signals ?? [];
    if (signals.length === 0) return null;

    const ids = new Set(signals.map(s => s.id));
    const asksMoney = ids.has('money_request') || ids.has('upfront_fee');
    const pressure = signals.filter(s => PRESSURE.has(s.id));

    let severity: Severity | null = null;
    if (ids.has('code_request')) severity = 'high';
    else if (asksMoney && pressure.length > 0) severity = 'high';
    else if (ids.has('upfront_fee') && ids.has('money_request')) severity = 'high';
    else if (ids.has('remote_app') && pressure.filter(s => s.id !== 'remote_app').length >= 2) severity = 'high';
    else if (ids.has('job_lure') && asksMoney) severity = 'high';
    else if (ids.has('gambling') && features.urls.length > 0) severity = 'high';
    else if (ids.has('balance_proof') && (ids.has('too_good') || ids.has('urgency') || ids.has('threat'))) severity = 'high';
    else if (ids.has('money_request') && offPlatformDeal(signals)) severity = 'high';
    else if (signals.filter(s => s.id !== 'hostess').length >= 2) severity = 'medium';
    else if (hostessJob(signals)) severity = 'medium';
    else if (signals.some(s => (s.id === 'job_lure' || s.id === 'gambling') && s.matched.length >= 2)) severity = 'medium';

    if (!severity) return null;

    return {
      rule_id: 'scam_signals',
      severity,
      description: signals.map((s, i) => (i === 0 ? s.label : s.label.charAt(0).toLowerCase() + s.label.slice(1))).join('; '),
      evidence: { signals: signals.map(s => ({ id: s.id, matched: s.matched })) },
    };
  },
};
