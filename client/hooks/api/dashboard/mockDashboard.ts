import type {
  DashboardStatCard,
  ProtectionModule,
  ScanHistoryItem,
} from "@/components/pages/dashboard/content";
import { getMockAnalyzeResultListItems } from "@/hooks/api/analyze_result/mockAnalyzeResult";

export type MockDashboardSuccess = {
  ok: true;
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

export type MockDashboardFailure = {
  ok: false;
  message: string;
};

export type MockDashboardResponse = MockDashboardSuccess | MockDashboardFailure;

export async function delayMockDashboard(ms = 900) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildMockDashboardResponse(now = new Date()): MockDashboardSuccess {
  const scanHistory = getMockAnalyzeResultListItems()
    .slice(0, 3)
    .map<ScanHistoryItem>((item) => ({
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
    }));

  return {
    ok: true,
    welcomeTitle: "Chào mừng trở lại, Duy!",
    formattedDate: formatDashboardDate(now),
    systemStatus: "Hệ thống hoạt động bình thường",
    stats: [
      {
        label: "Tổng số lượt quét",
        value: "10",
        note: "+12%",
        accent: "amber",
        type: "metric",
      },
      {
        label: "Mối đe dọa đã chặn",
        value: "342",
        note: "Trong 30 ngày qua",
        accent: "red",
        type: "shield",
      },
      {
        label: "Điểm an toàn",
        value: "92",
        note: "Mức độ bảo vệ xuất sắc",
        accent: "olive",
        type: "score",
      },
    ],
    protectionModules: [
      {
        title: "Trình quét liên kết",
        description: "Phân tích URL thời gian thực",
        icon: "link",
        status: "Đang bật",
      },
      {
        title: "Phân tích ngôn ngữ",
        description: "Phát hiện giọng điệu lừa đảo",
        icon: "language",
        status: "Đang bật",
      },
      {
        title: "Nhận diện hình ảnh",
        description: "Trích xuất văn bản từ ảnh (OCR)",
        icon: "image",
        status: "Đang bật",
      },
    ],
    scanHistory,
    updateStatus: {
      version: "v2.4.1",
      versionLabel: "Mới nhất",
      lastSyncedLabel: "10 phút trước",
    },
  };
}

function formatDashboardDate(value: Date) {
  const formattedDate = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}
