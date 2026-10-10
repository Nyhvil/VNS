export enum SeverityType {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export type RuleDetectionsRow = {
  id: string;
  scan_id: string;
  rule_code: string;
  rule_name: string;
  severity: SeverityType;
  score: string | number;
  is_triggered: boolean;
  evidence: unknown;
  created_at: Date;
};
