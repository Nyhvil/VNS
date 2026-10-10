import Link from "next/link";
import type { ReactNode } from "react";

import SidebarContainer from "@/components/layouts/@base/Sidebar/SidebarContainer";

export type BaseSidebarItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

type BaseSidebarProps = {
  brand: ReactNode;
  navItems: BaseSidebarItem[];
  action?: ReactNode;
};

export default function BaseSidebar({
  brand,
  navItems,
  action,
}: BaseSidebarProps) {
  return (
    <SidebarContainer>
      {brand}

      <nav className="space-y-3">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex w-full items-center gap-3 rounded-[16px] px-4 py-3.5 text-left transition ${
              item.active
                ? "bg-white text-[#111827] shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                : "text-[#64748b] hover:bg-white/70"
            }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-[11px] ${
                item.active ? "bg-[#f5f7fb]" : "bg-transparent"
              }`}
            >
              {item.icon}
            </span>
            <span className="text-[0.92rem] font-semibold uppercase tracking-[0.14em]">
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      {action ? <div className="mt-auto px-3">{action}</div> : null}
    </SidebarContainer>
  );
}
