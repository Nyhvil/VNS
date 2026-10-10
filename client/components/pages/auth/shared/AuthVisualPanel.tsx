import type { ReactNode } from "react";

type AuthVisualPanelProps = {
  variant: "login" | "register";
  title: string;
  description?: string;
  bottomContent?: ReactNode;
  illustration: ReactNode;
};

export default function AuthVisualPanel({
  variant,
  title,
  description,
  bottomContent,
  illustration,
}: AuthVisualPanelProps) {
  if (variant === "register") {
    return (
      <section className="relative isolate overflow-hidden rounded-4xl border border-white/14 bg-[radial-gradient(circle_at_100%_15%,rgba(255,223,117,0.58),transparent_34%),linear-gradient(180deg,#1a417c_0%,#2d66b7_42%,#1b3d6d_100%)] px-7 py-8 text-white shadow-[0_18px_44px_rgba(19,59,116,0.16)] sm:px-8 lg:min-h-180 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_58%,rgba(255,255,255,0)_100%)]" />

        <div className="relative z-10 max-w-152">
          <h2 className="block w-full text-[2rem] font-semibold leading-[1.08] tracking-[-0.04em] text-justify sm:text-[2.7rem]">
            {title}
          </h2>
          {description ? (
            <p className="mt-5 max-w-md text-lg leading-8 text-white/88">
              {description}
            </p>
          ) : null}
        </div>

        <div className="relative z-10 mt-10 lg:absolute lg:bottom-6 lg:left-6 lg:right-6">
          {illustration}
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col justify-between px-2 py-4 lg:min-h-180 lg:px-4">
      <div className="flex-1">{illustration}</div>

      <div className="mt-6 max-w-152">
        <h2 className="block w-full text-[2.5rem] font-semibold leading-[0.96] tracking-[-0.05em] text-[#0e2250] sm:text-[3.5rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-5 text-lg leading-8 text-[#334155]">{description}</p>
        ) : null}
        {bottomContent}
      </div>
    </section>
  );
}
