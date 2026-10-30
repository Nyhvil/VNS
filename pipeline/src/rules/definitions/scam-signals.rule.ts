import { FeatureSet, Finding, Severity } from '../../types';

/**
 * Combinations of scam moves (see knowledge/scam-signals.ts). One move alone is
 * common in ordinary messages; scams combine them.
 *
 *   - asking for a one-time code or a password                      → high
 *   - money or a fee together with pressure, a threat, secrecy, a
 *     too-good promise, an impersonated channel or a remote app      → high
 *   - an easy online job together with money or a fee (task scam)  → high
 *   - betting ads with a link                                         → high
 *   - two other moves together, or several job-lure or betting words → medium
 */
const PRESSURE = new Set(['urgency', 'threat', 'secrecy', 'too_good', 'channel_switch', 'remote_app']);

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
    else if (signals.length >= 2) severity = 'medium';
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
