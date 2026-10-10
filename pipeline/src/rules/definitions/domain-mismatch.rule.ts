import { FeatureSet, Finding } from '../../types';

export const domainMismatchRule = {
  id: 'domain_mismatch',
  evaluate(features: FeatureSet): Finding | null {
    if (features.domain_mismatch) {
      return {
        rule_id: 'domain_mismatch',
        severity: 'medium',
        description: 'Sender domain does not match reply-to domain — possible phishing indicator',
        evidence: {
          sender_domain: features.sender_domain,
          reply_to_domain: features.reply_to_domain,
        },
      };
    }
    return null;
  },
};
