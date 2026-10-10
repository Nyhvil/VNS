export type DashboardNavItem = {
  href: string;
  label: string;
  icon: "grid" | "analysis" | "intel" | "settings" | "support";
};

export type DashboardStatCard = {
  label: string;
  value: string;
  note: string;
  accent: "amber" | "red" | "olive";
  type: "metric" | "shield" | "score";
};

export type ProtectionModule = {
  title: string;
  description: string;
  icon: "link" | "language" | "image";
  status: string;
};

export type ScanHistoryItem = {
  id: string;
  href: string;
  time: string;
  period: string;
  sourceIcon: "mail" | "sms" | "link";
  title: string;
  source: string;
  riskLabel: string;
  riskValue: string;
  tone: "danger" | "safe" | "warning";
};

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/analyze_result", label: "Mail Analysis", icon: "analysis" },
  { href: "/analyze_result#threat-intel", label: "Threat Intel", icon: "intel" },
  { href: "/analyze_result#settings", label: "Settings", icon: "settings" },
  { href: "/analyze_result#support", label: "Support", icon: "support" },
];
