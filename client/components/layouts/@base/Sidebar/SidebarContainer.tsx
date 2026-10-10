import type { ReactNode } from "react";

type SidebarContainerProps = {
  children: ReactNode;
};

export default function SidebarContainer({ children }: SidebarContainerProps) {
  return (
    <aside className="flex min-h-full flex-col gap-6 rounded-3xl bg-[rgba(255,255,255,0.28)] px-5 py-6 xl:sticky xl:top-6 xl:h-[calc(100vh-48px)]">
      {children}
    </aside>
  );
}
