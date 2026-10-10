import type { ReactNode } from "react";

type AuthFormCardProps = {
  badge: string;
  title: string;
  description?: string;
  tone?: "solid" | "soft";
  children: ReactNode;
};

export default function AuthFormCard({
  badge,
  title,
  description,
  tone = "solid",
  children,
}: AuthFormCardProps) {
  const cardClassName =
    tone === "soft"
      ? "border border-white/70 bg-white/82 shadow-[0_18px_42px_rgba(17,24,39,0.08)] backdrop-blur-sm"
      : "border border-[#e8e8ea] bg-white shadow-[0_22px_52px_rgba(17,24,39,0.11)]";

  return (
    <section
      className={`rounded-[28px] px-6 py-6 sm:px-7 sm:py-7 ${cardClassName}`}
    >
      <div className="inline-flex rounded-full bg-[#ffd95a] px-4 py-2 text-sm font-medium text-[#3a2e08]">
        {badge}
      </div>

      <h1 className="mt-5 block w-full text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-[#0f172a] sm:text-[2.7rem]">
        {title}
      </h1>

      {description ? (
        <p className="mt-4 text-[1rem] leading-7 text-[#31353d]">{description}</p>
      ) : null}

      <div className="mt-6">{children}</div>
    </section>
  );
}
