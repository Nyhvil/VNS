import type {
  AnalyzeAction,
  AnalyzeEvidence,
  AnalyzeEvidenceLink,
  AnalyzeEvidenceTone,
  AnalyzeFinding,
  AnalyzeResultListItem,
  AnalyzeResultRiskTone,
  AnalyzeSourceIcon,
  MockAnalyzeResultSuccess,
} from '@/types/analyzeResult';
import type {
  AnalyzeResultResponseDto,
  ScanRequestsResponseDto,
} from '@/services/api/types';

export function mapRiskLevel(riskLevel: string): AnalyzeResultRiskTone {
  switch (riskLevel?.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
    case 'safe':
    default:
      return 'safe';
  }
}

export function mapSeverityLabel(riskLevel: string): string {
  switch (riskLevel?.toLowerCase()) {
    case 'critical':
      return 'Nguy hiểm nghiêm trọng';
    case 'high':
      return 'Nguy hiểm cao';
    case 'medium':
      return 'Đáng ngờ';
    case 'low':
    case 'safe':
      return 'An toàn';
    default:
      return 'Không xác định';
  }
}

export function mapRuleIdToTitle(ruleId: string): string {
  if (!ruleId) return 'Unknown Rule';

  return ruleId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function mapRuleIdToIcon(ruleId: string): 'link' | 'language' | 'brand' {
  const lower = ruleId?.toLowerCase() ?? '';

  if (
    lower.startsWith('spf') ||
    lower.startsWith('dkim') ||
    lower.startsWith('url') ||
    lower.startsWith('link') ||
    lower.startsWith('ip_url') ||
    lower.startsWith('url_shortener') ||
    lower.includes('similar_to_known')
  ) {
    return 'link';
  }

  if (
    lower.startsWith('lang') ||
    lower.startsWith('keyword') ||
    lower.startsWith('tone') ||
    lower.startsWith('suspicious_keyword') ||
    lower.startsWith('domain')
  ) {
    return 'language';
  }

  return 'brand';
}

export function mapSeverityToColors(severity: string): {
  iconBg: string;
  iconText: string;
  severityText: string;
} {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'high':
      return {
        iconBg: 'bg-[#ffe5e1]',
        iconText: 'text-[#b32117]',
        severityText: 'text-[#d21d18]',
      };
    case 'medium':
      return {
        iconBg: 'bg-[#fff2c1]',
        iconText: 'text-[#8a6b00]',
        severityText: 'text-[#8a6b00]',
      };
    case 'low':
    default:
      return {
        iconBg: 'bg-[#e8f3ff]',
        iconText: 'text-[#365c9a]',
        severityText: 'text-[#365c9a]',
      };
  }
}

function mapSeverityLabelFromSeverity(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'Mức độ: nghiêm trọng';
    case 'medium':
      return 'Mức độ: đáng ngờ';
    case 'low':
    default:
      return 'Mức độ: an toàn';
  }
}

export function mapFinding(finding: unknown): AnalyzeFinding {
  const record = (finding ?? {}) as Record<string, unknown>;
  const ruleId = String(record['rule_id'] ?? '');
  const severity = String(record['severity'] ?? 'low');
  const description = String(record['description'] ?? '');
  const colors = mapSeverityToColors(severity);

  return {
    title: mapRuleIdToTitle(ruleId),
    detail: description || 'Phát hiện dấu hiệu đáng ngờ.',
    severityLabel: mapSeverityLabelFromSeverity(severity),
    icon: mapRuleIdToIcon(ruleId),
    ...colors,
  };
}

export function mapEvidence(
  evidence: unknown,
  findings: unknown[] = [],
): AnalyzeEvidence {
  const record = (evidence ?? {}) as Record<string, unknown>;
  const headers = (record['headers'] ?? {}) as Record<string, string>;
  const urls = Array.isArray(record['urls'])
    ? (record['urls'] as Array<{
        original?: string;
        normalized?: string;
        is_ip_based?: boolean;
        is_shortener?: boolean;
      }>)
    : [];
  const keywords = Array.isArray(record['keywords'])
    ? (record['keywords'] as string[])
    : [];

  const firstUrl = normalizeEvidenceText(
    urls[0]?.original ?? urls[0]?.normalized,
  );
  const mappedLinks = urls
    .map((url) => mapEvidenceLink(url, findings))
    .filter((link): link is AnalyzeEvidenceLink => link !== null);
  const keywordText =
    keywords.length > 0
      ? normalizeEvidenceText(
          keywords
            .map((keyword) => String(keyword ?? '').trim())
            .filter(Boolean)
            .slice(0, 3)
            .join(', '),
        )
      : '—';
  const hasSuspiciousKeywords = keywordText !== '—';
  const notableLink = mappedLinks.find((link) => link.tone === 'danger');
  const warningLink = mappedLinks.find((link) => link.tone === 'warning');

  return {
    from: normalizeEvidenceText(headers['from'] ?? headers['sender']),
    subject: normalizeEvidenceText(headers['subject']),
    greeting: 'Nội dung phân tích:',
    highlightPrimary:
      hasSuspiciousKeywords
        ? `Từ khóa đáng ngờ: ${keywordText}`
        : 'Không phát hiện từ khóa đáng ngờ.',
    primaryContinuation:
      urls.length > 0
        ? `Phát hiện ${urls.length} URL trong nội dung.`
        : 'Không có URL.',
    highlightUrgency: buildUrlSummary(
      notableLink,
      warningLink,
      mappedLinks.length,
    ),
    highlightTone: notableLink ? 'danger' : warningLink ? 'warning' : 'safe',
    linkIntro:
      urls.length > 0 ? 'Các liên kết được phát hiện:' : 'Không có liên kết.',
    link: firstUrl,
    links: mappedLinks,
    signoff: '—',
    signature: '—',
  };
}

function mapEvidenceLink(
  url: {
    original?: string;
    normalized?: string;
    is_ip_based?: boolean;
    is_shortener?: boolean;
  },
  findings: unknown[],
): AnalyzeEvidenceLink | null {
  const href = normalizeEvidenceText(url.original ?? url.normalized);

  if (href === '—') {
    return null;
  }

  const matchingSeverity = findUrlFindingSeverity(href, findings);
  const typoSquattingTarget = findLikelyBrandTypoTarget(href);
  let tone: AnalyzeEvidenceTone = 'safe';
  let reason = 'Không có tín hiệu đáng ngờ trực tiếp từ server.';

  if (
    matchingSeverity === 'critical' ||
    matchingSeverity === 'high' ||
    url.is_ip_based ||
    typoSquattingTarget
  ) {
    tone = 'danger';
    reason = typoSquattingTarget
      ? `Tên miền giống ${typoSquattingTarget} nhưng không trùng khớp.`
      : url.is_ip_based
        ? 'URL dùng địa chỉ IP trực tiếp.'
        : 'Server gắn URL này với phát hiện mức cao.';
  } else if (matchingSeverity === 'medium' || url.is_shortener) {
    tone = 'warning';
    reason = url.is_shortener
      ? 'URL rút gọn cần xác minh đích đến.'
      : 'Server gắn URL này với phát hiện đáng ngờ.';
  } else if (matchingSeverity === 'low') {
    tone = 'safe';
    reason = 'Server chỉ ghi nhận tín hiệu mức thấp.';
  }

  return {
    href,
    label: href,
    tone,
    statusLabel: mapEvidenceToneLabel(tone),
    reason,
  };
}

function findUrlFindingSeverity(
  href: string,
  findings: unknown[],
): string | null {
  const normalizedHref = normalizeUrlForCompare(href);

  for (const finding of findings) {
    if (!finding || typeof finding !== 'object') continue;

    const record = finding as Record<string, unknown>;
    const evidence = record['evidence'];
    const severity = String(record['severity'] ?? '').toLowerCase();

    if (!severity || !evidenceContainsUrl(evidence, normalizedHref)) {
      continue;
    }

    return severity;
  }

  return null;
}

function evidenceContainsUrl(evidence: unknown, normalizedHref: string): boolean {
  if (typeof evidence === 'string') {
    return normalizeUrlForCompare(evidence) === normalizedHref;
  }

  if (Array.isArray(evidence)) {
    return evidence.some((item) => evidenceContainsUrl(item, normalizedHref));
  }

  if (evidence && typeof evidence === 'object') {
    return Object.values(evidence as Record<string, unknown>).some((value) =>
      evidenceContainsUrl(value, normalizedHref),
    );
  }

  return false;
}

function buildUrlSummary(
  notableLink: AnalyzeEvidenceLink | undefined,
  warningLink: AnalyzeEvidenceLink | undefined,
  totalLinks: number,
): string {
  if (notableLink) {
    return `URL đáng chú ý: ${notableLink.href}`;
  }

  if (warningLink) {
    return `URL nghi ngờ: ${warningLink.href}`;
  }

  if (totalLinks > 0) {
    return 'Các URL được ghi nhận ở mức bình thường.';
  }

  return '—';
}

function mapEvidenceToneLabel(tone: AnalyzeEvidenceTone): string {
  switch (tone) {
    case 'danger':
      return 'Đáng chú ý';
    case 'warning':
      return 'Nghi ngờ';
    case 'safe':
    default:
      return 'Bình thường';
  }
}

const KNOWN_BRAND_DOMAINS = [
  'youtube.com',
  'google.com',
  'facebook.com',
  'microsoft.com',
  'apple.com',
  'amazon.com',
  'paypal.com',
  'netflix.com',
  'github.com',
  'vietcombank.com.vn',
];

function findLikelyBrandTypoTarget(href: string): string | null {
  const host = extractHostname(href);

  if (!host) {
    return null;
  }

  for (const brandDomain of KNOWN_BRAND_DOMAINS) {
    const brandHost = brandDomain.replace(/^www\./, '');

    if (host === brandHost || host.endsWith(`.${brandHost}`)) {
      continue;
    }

    const hostRoot = host.split('.')[0] ?? host;
    const brandRoot = brandHost.split('.')[0] ?? brandHost;

    if (hostRoot.length < 4 || brandRoot.length < 4) {
      continue;
    }

    if (levenshteinDistance(hostRoot, brandRoot) <= 2) {
      return brandDomain;
    }
  }

  return null;
}

function extractHostname(href: string): string | null {
  try {
    return new URL(href).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function normalizeUrlForCompare(value: string): string {
  return value.trim().toLowerCase().replace(/\/$/, '');
}

function levenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length] ?? 0;
}

const DEFAULT_ACTIONS: AnalyzeAction[] = [
  {
    title: 'Không nhấn vào link',
    detail:
      'Tuyệt đối không mở liên kết hoặc nhập thông tin tài khoản vào biểu mẫu bên ngoài.',
    icon: 'ban-link',
    iconBg: 'bg-[#fff0ef]',
    iconText: 'text-[#d21d18]',
  },
  {
    title: 'Báo cáo cho IT Security',
    detail:
      'Chuyển tiếp email này cho đội ngũ bảo mật để họ chặn tên miền và cảnh báo nội bộ.',
    icon: 'report',
    iconBg: 'bg-[#fff4d4]',
    iconText: 'text-[#856400]',
  },
  {
    title: 'Xóa khỏi hộp thư',
    detail: 'Sau khi báo cáo, xóa email khỏi inbox để tránh mở nhầm về sau.',
    icon: 'trash',
    iconBg: 'bg-[#eef2f6]',
    iconText: 'text-[#71717a]',
  },
];

const SAFE_ACTIONS: AnalyzeAction[] = [
  {
    title: 'Không chia sẻ thông tin nhạy cảm',
    detail:
      'Dù nội dung có vẻ an toàn, không chia sẻ mật khẩu hay OTP với bất kỳ ai.',
    icon: 'ban-link',
    iconBg: 'bg-[#eef5ff]',
    iconText: 'text-[#365c9a]',
  },
  {
    title: 'Đối chiếu nguồn gửi',
    detail:
      'Xác minh người gửi qua kênh chính thức nếu có yêu cầu hành động.',
    icon: 'report',
    iconBg: 'bg-[#eef8ef]',
    iconText: 'text-[#2f6b40]',
  },
];

export function generateActions(
  recommendation: string | null,
  findings: unknown[],
): AnalyzeAction[] {
  const findingsArray = Array.isArray(findings) ? findings : [];
  const hasHighSeverity = findingsArray.some((finding) => {
    if (!finding || typeof finding !== 'object') {
      return false;
    }

    const record = finding as Record<string, unknown>;

    return (
      record['severity'] === 'high' || record['severity'] === 'critical'
    );
  });

  if (hasHighSeverity || findingsArray.length > 0) {
    return DEFAULT_ACTIONS;
  }

  if (recommendation?.trim()) {
    return SAFE_ACTIONS;
  }

  return SAFE_ACTIONS;
}

export function mapAnalyzeResultToUI(
  dto: AnalyzeResultResponseDto,
  jobId: string,
): MockAnalyzeResultSuccess {
  const findings = Array.isArray(dto.findings) ? dto.findings : [];
  const mappedFindings = findings.map(mapFinding);
  const mappedEvidence = mapEvidence(dto.evidence, findings);
  const mappedActions = generateActions(dto.recommendation, findings);
  const riskTone = mapRiskLevel(dto.risk_level);
  const severityLabel = mapSeverityLabel(dto.risk_level);

  const requestId = dto.scan_id.toUpperCase().slice(0, 12);
  const category = dto.category
    ? dto.category.charAt(0).toUpperCase() + dto.category.slice(1)
    : 'Unknown';

  return {
    ok: true,
    message: 'Kết quả phân tích đã được tải.',
    id: jobId,
    requestId,
    title: `${category} — ${severityLabel}`,
    source: dto.scan_id,
    sourceIcon: 'mail' as AnalyzeSourceIcon,
    time: formatTime(dto.created_at),
    period: formatPeriod(dto.created_at),
    analyzedAt: formatAnalyzedAt(dto.created_at),
    statusLabel: severityLabel,
    submittedText: '',
    riskScore: dto.risk_score,
    riskTone,
    severityLabel,
    summary: dto.recommendation ?? `Phân loại: ${category}`,
    confidence: `Độ tin cậy ${Math.min(95, dto.risk_score + 10)}%`,
    findings: mappedFindings,
    actions: mappedActions,
    evidence: mappedEvidence,
  };
}

function mapInputTypeToIcon(inputType: string): AnalyzeSourceIcon {
  if (inputType === 'image') return 'link';
  if (inputType === 'plain_text') return 'sms';
  return 'mail';
}

export function mapScanRequestToListItem(
  scanRequest: ScanRequestsResponseDto,
  analyzeResult: AnalyzeResultResponseDto | null,
): AnalyzeResultListItem {
  const riskScore = analyzeResult?.risk_score ?? 0;
  const riskLevel = analyzeResult?.risk_level ?? 'low';
  const riskTone = analyzeResult ? mapRiskLevel(riskLevel) : 'safe';
  const severityLabel = analyzeResult
    ? mapSeverityLabel(riskLevel)
    : 'Đang xử lý';
  const category = analyzeResult?.category ?? scanRequest.input_type;

  return {
    id: scanRequest.id,
    href: `/analyze_result/${scanRequest.id}`,
    requestId: scanRequest.id.toUpperCase().slice(0, 12),
    title: category
      ? category.charAt(0).toUpperCase() + category.slice(1)
      : 'Phân tích',
    source: scanRequest.original_url ?? scanRequest.file_name ?? 'Manual scan',
    sourceIcon: mapInputTypeToIcon(scanRequest.input_type),
    time: formatTime(scanRequest.created_at),
    period: formatPeriod(scanRequest.created_at),
    analyzedAt: formatAnalyzedAt(scanRequest.created_at),
    statusLabel: severityLabel,
    riskScore,
    riskTone,
    severityLabel,
    riskValue: `${riskScore}%`,
    summary:
      analyzeResult?.recommendation ?? `Loại: ${scanRequest.input_type}`,
    confidence: analyzeResult
      ? `Độ tin cậy ${Math.min(95, riskScore + 10)}%`
      : 'Đang xử lý...',
    findingsCount: Array.isArray(analyzeResult?.findings)
      ? analyzeResult.findings.length
      : 0,
    actionsCount: generateActions(
      analyzeResult?.recommendation ?? null,
      analyzeResult?.findings ?? [],
    ).length,
  };
}

export function computeListTotals(items: AnalyzeResultListItem[]): {
  total: number;
  danger: number;
  warning: number;
  safe: number;
} {
  return {
    total: items.length,
    danger: items.filter((item) => item.riskTone === 'danger').length,
    warning: items.filter((item) => item.riskTone === 'warning').length,
    safe: items.filter((item) => item.riskTone === 'safe').length,
  };
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatPeriod(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays <= 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';

    return `${diffDays} ngày trước`;
  } catch {
    return '—';
  }
}

function formatAnalyzedAt(dateStr: string): string {
  try {
    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return '—';
  }
}

function normalizeEvidenceText(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return '—';
}
