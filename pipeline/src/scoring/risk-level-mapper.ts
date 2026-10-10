import { RiskLevel } from '../types';

export function mapToRiskLevel(score: number): RiskLevel {
  if (score <= 29) return 'low';
  if (score <= 59) return 'medium';
  if (score <= 84) return 'high';
  return 'critical';
}
