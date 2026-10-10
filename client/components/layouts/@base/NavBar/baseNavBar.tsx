import Link from "next/link";
import type { ReactNode } from "react";

import NavbarContainer from "@/components/layouts/@base/NavBar/NavBarContainer";

export type BaseNavItem = {
  href: string;
  label: string;
};

export type BaseNavAction = BaseNavItem & {
  variant?: "ghost" | "secondary" | "primary";
};

type BaseNavbarProps = {
  brand: ReactNode;
  navItems: BaseNavItem[];
  actions: BaseNavAction[];
};

export default function BaseNavbar({
  brand,
  navItems,
  actions,
}: BaseNavbarProps) {
  return (
    <NavbarContainer>
      <div className="flex min-h-18 items-center justify-between gap-4">
        <div className="min-w-0">{brand}</div>

        <div className="hidden items-center gap-8 lg:flex">
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="text-[0.98rem] font-medium text-[#4b5563] transition hover:text-[#111827]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={getActionClassName(action.variant)}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </NavbarContainer>
  );
}

function getActionClassName(variant: BaseNavAction["variant"] = "ghost") {
  if (variant === "primary") {
    return "sentinel-gradient inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-[0.95rem] font-semibold shadow-[0_14px_24px_rgba(112,93,0,0.18)] transition hover:brightness-105";
  }

  if (variant === "secondary") {
    return "inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--mg-surface-lowest)] px-5 text-[0.95rem] font-semibold text-[var(--mg-on-surface)] transition hover:bg-[var(--mg-surface-low)]";
  }

  return "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-[0.95rem] font-medium text-[var(--mg-on-surface-muted)] transition hover:bg-[var(--mg-surface-low)] hover:text-[var(--mg-on-surface)]";
}
