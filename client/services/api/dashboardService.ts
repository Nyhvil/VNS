import type {
  DashboardStatCard,
  ProtectionModule,
  ScanHistoryItem,
} from '@/components/pages/dashboard/content';
import { mapScanRequestToListItem } from '@/services/mappers/resultMapper';

import {
  getResultsForScanRequests,
  getScanRequests,
} from './scanRequestService';
import type {
  AnalyzeResultResponseDto,
  ApiResult,
  ScanRequestsResponseDto,
} from './types';

export type DashboardData = {
  welcomeTitle: string;
  formattedDate: string;
  systemStatus: string;
  stats: DashboardStatCard[];
  protectionModules: ProtectionModule[];
  scanHistory: ScanHistoryItem[];
  updateStatus: {
    version: string;
    versionLabel: string;
    lastSyncedLabel: string;
  };
};

const DEFAULT_PROTECTION_MODULES: ProtectionModule[] = [
  {
    title: 'Trình quét liên kết',
    description: 'Phân tích URL thời gian thực',
    icon: 'link',
    status: 'Đang bật',
  },
  {
    title: 'Phân tích ngôn ngữ',
    description: 'Phát hiện giọng điệu lừa đảo',
    icon: 'language',
    status: 'Đang bật',
  },
  {
    title: 'Nhận diện hình ảnh',
    description: 'Trích xuất văn bản từ ảnh (OCR)',
    icon: 'image',
    status: 'Đang bật',
  },
];

export async function fetchDashboardData(
  userId: string,
  userName?: string | null,
): Promise<ApiResult<DashboardData>> {
  const scanRequestsResult = await getScanRequests(userId, 50);

  if (!scanRequestsResult.ok) {
    return scanRequestsResult;
  }

  const scanRequests = scanRequestsResult.data;
  const resultsResult = await getResultsForScanRequests(
    scanRequests.map((scanRequest) => scanRequest.id),
  );

  if (!resultsResult.ok) {
    return resultsResult;
  }

  const results = resultsResult.data;

  return {
    ok: true,
    data: {
      welcomeTitle: buildWelcomeTitle(userName),
      formattedDate: formatDashboardDate(new Date()),
      systemStatus: buildSystemStatus(results),
      stats: buildDashboardStats(scanRequests, results),
      protectionModules: DEFAULT_PROTECTION_MODULES,
      scanHistory: buildScanHistory(scanRequests, results),
      updateStatus: buildUpdateStatus(scanRequests),
    },
  };
}

export function buildDashboardStats(
  scanRequests: ScanRequestsResponseDto[],
  results: Record<string, AnalyzeResultResponseDto | null>,
): DashboardStatCard[] {
  const totalScans = scanRequests.length;
  const resultList = Object.values(results).filter(
    (result): result is AnalyzeResultResponseDto => result !== null,
  );
  const threatsBlocked = resultList.filter((result) =>
    isDangerRiskLevel(result.risk_level),
  ).length;
  const safeCount = resultList.filter((result) =>
    isSafeRiskLevel(result.risk_level),
  ).length;
  const safetyScore = computeSafetyScore(safeCount, totalScans);

  return [
    {
      label: 'Tổng số lượt quét',
      value: String(totalScans),
      note:
        totalScans === 0
          ? 'Chưa có dữ liệu'
          : `${resultList.length}/${totalScans} có kết quả`,
      accent: 'amber',
      type: 'metric',
    },
    {
      label: 'Mối đe dọa đã chặn',
      value: String(threatsBlocked),
      note:
        threatsBlocked === 0
          ? 'Chưa phát hiện high/critical'
          : 'High/Critical đã phát hiện',
      accent: 'red',
      type: 'shield',
    },
    {
      label: 'Điểm an toàn',
      value: String(safetyScore),
      note: describeSafetyScore(safetyScore),
      accent: 'olive',
      type: 'score',
    },
  ];
}

export function buildScanHistory(
  scanRequests: ScanRequestsResponseDto[],
  results: Record<string, AnalyzeResultResponseDto | null>,
): ScanHistoryItem[] {
  return scanRequests.slice(0, 3).map((scanRequest) => {
    const item = mapScanRequestToListItem(scanRequest, results[scanRequest.id] ?? null);

    return {
      id: item.id,
      href: item.href,
      time: item.time,
      period: item.period,
      sourceIcon: item.sourceIcon,
      title: item.title,
      source: item.source,
      riskLabel: item.severityLabel,
      riskValue: item.riskValue,
      tone: item.riskTone,
    };
  });
}

export function buildDashboardFallbackData(
  userName?: string | null,
): DashboardData {
  return {
    welcomeTitle: buildWelcomeTitle(userName),
    formattedDate: formatDashboardDate(new Date()),
    systemStatus: 'Dữ liệu đang tạm thời không khả dụng',
    stats: [
      {
        label: 'Tổng số lượt quét',
        value: '—',
        note: 'Không thể tải dữ liệu',
        accent: 'amber',
        type: 'metric',
      },
      {
        label: 'Mối đe dọa đã chặn',
        value: '—',
        note: 'Không thể tải dữ liệu',
        accent: 'red',
        type: 'shield',
      },
      {
        label: 'Điểm an toàn',
        value: '—',
        note: 'Không thể tải dữ liệu',
        accent: 'olive',
        type: 'score',
      },
    ],
    protectionModules: DEFAULT_PROTECTION_MODULES,
    scanHistory: [],
    updateStatus: {
      version: '—',
      versionLabel: 'Chưa đồng bộ',
      lastSyncedLabel: 'Chưa có dữ liệu',
    },
  };
}

export function computeSafetyScore(
  safeCount: number,
  totalCount: number,
): number {
  if (totalCount <= 0) {
    return 100;
  }

  return Math.round((safeCount / totalCount) * 100);
}

function buildWelcomeTitle(userName?: string | null): string {
  const normalizedName = userName?.trim();

  if (!normalizedName) {
    return 'Chào mừng trở lại!';
  }

  return `Chào mừng trở lại, ${normalizedName}!`;
}

function buildSystemStatus(
  results: Record<string, AnalyzeResultResponseDto | null>,
): string {
  const hasDanger = Object.values(results).some(
    (result) => result && isDangerRiskLevel(result.risk_level),
  );

  return hasDanger
    ? 'Có tín hiệu cần ưu tiên xử lý'
    : 'Hệ thống hoạt động bình thường';
}

function buildUpdateStatus(scanRequests: ScanRequestsResponseDto[]): {
  version: string;
  versionLabel: string;
  lastSyncedLabel: string;
} {
  const latestTimestamp =
    scanRequests[0]?.updated_at ?? scanRequests[0]?.created_at ?? null;

  return {
    version: 'v2.4.1',
    versionLabel: latestTimestamp ? 'Đã đồng bộ' : 'Mới nhất',
    lastSyncedLabel: latestTimestamp
      ? formatRelativeTime(latestTimestamp)
      : 'Chưa có dữ liệu',
  };
}

function describeSafetyScore(score: number): string {
  if (score >= 90) {
    return 'Mức độ bảo vệ xuất sắc';
  }

  if (score >= 70) {
    return 'Mức độ bảo vệ ổn định';
  }

  if (score >= 40) {
    return 'Cần xác minh thêm';
  }

  return 'Cần tăng cường bảo vệ';
}

function isDangerRiskLevel(riskLevel: string): boolean {
  const normalized = riskLevel.toLowerCase();
  return normalized === 'high' || normalized === 'critical';
}

function isSafeRiskLevel(riskLevel: string): boolean {
  const normalized = riskLevel.toLowerCase();
  return normalized === 'low' || normalized === 'safe';
}

function formatDashboardDate(value: Date): string {
  const formattedDate = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value);

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (Number.isNaN(date.getTime())) {
    return 'Chưa xác định';
  }

  const diffMinutes = Math.max(Math.round(diffMs / 60_000), 0);

  if (diffMinutes < 1) {
    return 'Vừa xong';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} ngày trước`;
}
