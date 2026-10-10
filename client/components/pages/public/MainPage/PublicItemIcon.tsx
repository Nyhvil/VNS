import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function PublicItemIcon({ name, className }: { name: string; className?: string }) {
  const normalized = name.trim().replace(/^Lucide/, "");
  const iconEntry = Object.entries(LucideIcons).find(
    ([key, value]) => key.toLowerCase() === normalized.toLowerCase() && typeof value !== "string",
  );

  if (!iconEntry) {
    return <span className={className}>•</span>;
  }

  const Icon = iconEntry[1] as LucideIcon;
  return <Icon className={className} strokeWidth={2.2} />;
}
