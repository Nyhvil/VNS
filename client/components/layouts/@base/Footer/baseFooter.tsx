import Link from "next/link";
import type { ReactNode } from "react";

import FooterContainer from "@/components/layouts/@base/Footer/FooterContainer";

export type BaseFooterLink = {
  href: string;
  label: string;
};

type BaseFooterProps = {
  content: ReactNode;
  links: BaseFooterLink[];
};

export default function BaseFooter({ content, links }: BaseFooterProps) {
  return (
    <FooterContainer>
      <div className="flex flex-col gap-6 py-8 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
        <div>{content}</div>

        <div className="flex flex-wrap items-center gap-3">
          {links.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </FooterContainer>
  );
}
