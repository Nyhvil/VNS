"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import BaseSidebar, {
  type BaseSidebarItem,
} from "@/components/layouts/@base/Sidebar/baseSidebar";
import { dashboardNavItems } from "@/components/pages/dashboard/content";

export default function DashboardSidebar() {
  const pathname = usePathname();

  const navItems: BaseSidebarItem[] = dashboardNavItems.map((item) => ({
    href: item.href,
    label: item.label,
    active: isItemActive(pathname, item.href),
    icon: <SidebarIcon icon={item.icon} active={isItemActive(pathname, item.href)} />,
  }));

  return (
    <BaseSidebar
      brand={<DashboardBrand />}
      navItems={navItems}
      action={
        <Link
          href="/analyze_result"
          className="inline-flex h-13 w-full items-center justify-center gap-3 rounded-2xl bg-[#ffcb11] px-5 text-[0.98rem] font-semibold text-[#5f4a00] shadow-[0_18px_34px_rgba(255,203,17,0.32)] transition hover:brightness-105"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#af8400] text-[#ffdd52]">
            +
          </span>
          Analysis Results
        </Link>
      }
    />
  );
}

function DashboardBrand() {
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#faf7eb]">
        <LogoMark />
      </div>
      <div>
        <p className="text-[0.98rem] font-semibold tracking-[-0.03em] text-[#111827]">
          Vigilant Sentinel
        </p>
        <p className="mt-1 text-[0.82rem] uppercase tracking-[0.22em] text-[#3b3423]">
          Premium Security
        </p>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none">
      <path
        d="M12 3c2.2 1.6 4.8 2.4 7.5 2.4V10c0 5.3-2.9 8.8-7.5 11-4.6-2.2-7.5-5.7-7.5-11V5.4C7.2 5.4 9.8 4.6 12 3Z"
        fill="#735D00"
      />
    </svg>
  );
}

function SidebarIcon({
  icon,
  active,
}: {
  icon: "grid" | "analysis" | "intel" | "settings" | "support";
  active?: boolean;
}) {
  const stroke = active ? "#171717" : "#64748b";

  if (icon === "grid") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    );
  }

  if (icon === "analysis") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M12 4c3 2.4 5.9 3.4 8.4 3.4v4.8c0 4.8-3 7.8-8.4 9.8-5.4-2-8.4-5-8.4-9.8V7.4C6.1 7.4 9 6.4 12 4Z"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="m9.2 12.1 1.9 1.9 3.7-4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "intel") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <circle cx="12" cy="12" r="2.4" fill={stroke} />
        <path
          d="M12 4v4M20 12h-4M12 20v-4M4 12h4m6.3-6.3-2.8 2.8m0 6.8 2.8 2.8m-6.8 0 2.8-2.8m0-6.8-2.8-2.8"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "support") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <circle cx="12" cy="12" r="7.5" stroke={stroke} strokeWidth="1.8" />
        <path d="M12 16v.01" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M9.7 9.7a2.5 2.5 0 1 1 4.2 1.8c-.9.8-1.9 1.4-1.9 2.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M12 3.5 14 5l2.7-.1.8 2.6L20 9l-1.5 2 1.5 2-1.5 1.5-.8 2.6L14 17l-2 1.5L10 17l-2.7.1-.8-2.6L4 13l1.5-2L4 9l1.5-1.5.8-2.6L10 5l2-1.5Z"
        stroke={stroke}
        strokeWidth="1.8"
      />
      <circle cx="12" cy="11" r="2.3" fill={stroke} />
    </svg>
  );
}

function isItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
