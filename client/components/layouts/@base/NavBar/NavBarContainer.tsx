import type { ReactNode } from "react";

type NavBarContainerProps = {
  children: ReactNode;
};

export default function NavBarContainer({ children }: NavBarContainerProps) {
  return (
    <header className="sentinel-glass fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </header>
  );
}
