import type { ReactNode } from "react";

type FooterContainerProps = {
  children: ReactNode;
};

export default function FooterContainer({ children }: FooterContainerProps) {
  return (
    <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </footer>
  );
}
