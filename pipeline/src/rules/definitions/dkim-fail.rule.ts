import { FeatureSet, Finding } from '../../types';

export const dkimFailRule = {
  id: 'dkim_fail',
  evaluate(features: FeatureSet): Finding | null {
    if (features.dkim_result === 'fail') {
      return {
        rule_id: 'dkim_fail',
        severity: 'high',
        description: 'DKIM signature verification failed — email may have been tampered with',
        evidence: { dkim_result: features.dkim_result },
      };
    }
    return null;
  },
};
