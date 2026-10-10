export type AnalyzeSourceIcon = "mail" | "sms" | "link";
export type AnalyzeResultRiskTone = "safe" | "warning" | "danger";
export type AnalyzeEvidenceTone = "safe" | "warning" | "danger";

export type AnalyzeFinding = {
  title: string;
  detail: string;
  severityLabel: string;
  icon: "link" | "language" | "brand";
  iconBg: string;
  iconText: string;
  severityText: string;
};

export type AnalyzeAction = {
  title: string;
  detail: string;
  icon: "ban-link" | "report" | "trash";
  iconBg: string;
  iconText: string;
};

export type AnalyzeEvidenceLink = {
  href: string;
  label: string;
  tone: AnalyzeEvidenceTone;
  statusLabel: string;
  reason: string;
};

export type AnalyzeEvidence = {
  from: string;
  subject: string;
  greeting: string;
  highlightPrimary: string;
  primaryContinuation: string;
  highlightUrgency: string;
  highlightTone: AnalyzeEvidenceTone;
  linkIntro: string;
  link: string;
  links: AnalyzeEvidenceLink[];
  signoff: string;
  signature: string;
};

export type AnalyzeResultSuccess = {
  ok: true;
  id: string;
  requestId: string;
  title: string;
  source: string;
  sourceIcon: AnalyzeSourceIcon;
  time: string;
  period: string;
  analyzedAt: string;
  statusLabel: string;
  message: string;
  submittedText: string;
  riskScore: number;
  riskTone: AnalyzeResultRiskTone;
  severityLabel: string;
  summary: string;
  confidence: string;
  findings: AnalyzeFinding[];
  actions: AnalyzeAction[];
  evidence: AnalyzeEvidence;
};

export type AnalyzeResultFailure = {
  ok: false;
  message: string;
};

export type AnalyzeResultResponse =
  | AnalyzeResultSuccess
  | AnalyzeResultFailure;

export type AnalyzeResultListItem = {
  id: string;
  href: string;
  requestId: string;
  title: string;
  source: string;
  sourceIcon: AnalyzeSourceIcon;
  time: string;
  period: string;
  analyzedAt: string;
  statusLabel: string;
  riskScore: number;
  riskTone: AnalyzeResultRiskTone;
  severityLabel: string;
  riskValue: string;
  summary: string;
  confidence: string;
  findingsCount: number;
  actionsCount: number;
};

export type AnalyzeResultListSuccess = {
  ok: true;
  message: string;
  items: AnalyzeResultListItem[];
  totals: {
    total: number;
    danger: number;
    warning: number;
    safe: number;
  };
};

export type AnalyzeResultListResponse =
  | AnalyzeResultListSuccess
  | AnalyzeResultFailure;

export type AnalyzeSubmissionSuccess = {
  ok: true;
  resultId: string;
  detailHref?: string;
  title: string;
  sourceLabel: string;
  attachmentName: string | null;
  riskScore: number;
  riskTone: AnalyzeResultRiskTone;
  statusLabel: string;
  summary: string;
  confidence: string;
  submittedText: string;
  extractedText: string;
  dangerousPhrases: string[];
  mentionedOrganizations: string[];
  verificationSummary: string;
};

export type AnalyzeSubmissionFailure = {
  ok: false;
  message: string;
};

export type AnalyzeSubmissionResponse =
  | AnalyzeSubmissionSuccess
  | AnalyzeSubmissionFailure;

export type MockAnalyzeResultSuccess = AnalyzeResultSuccess;
export type MockAnalyzeResultFailure = AnalyzeResultFailure;
export type MockAnalyzeResultResponse = AnalyzeResultResponse;
export type MockAnalyzeResultListSuccess = AnalyzeResultListSuccess;
export type MockAnalyzeResultListResponse = AnalyzeResultListResponse;
export type MockAnalyzeSubmissionSuccess = AnalyzeSubmissionSuccess;
export type MockAnalyzeSubmissionFailure = AnalyzeSubmissionFailure;
export type MockAnalyzeSubmissionResponse = AnalyzeSubmissionResponse;
