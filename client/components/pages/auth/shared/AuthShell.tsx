import type { ReactNode } from "react";

type AuthShellProps = {
  visual: ReactNode;
  formCard: ReactNode;
};

export default function AuthShell({
  visual,
  formCard,
}: AuthShellProps) {
  return (
    <div className="grid flex-1 items-center gap-8 pt-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-8">
      {visual}
      <div className="w-full max-w-[396px] xl:justify-self-center">{formCard}</div>
    </div>
  );
}
