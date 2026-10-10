import { FeatureSet, Finding } from '../../types';

export const spfFailRule = {
  id: 'spf_fail',
  evaluate(features: FeatureSet): Finding | null {
    if (features.spf_result === 'fail') {
      return {
        rule_id: 'spf_fail',
        severity: 'high',
        description: 'SPF authentication failed — sender domain is not authorized to send email from this IP',
        evidence: { spf_result: features.spf_result },
      };
    }
    return null;
  },
};
