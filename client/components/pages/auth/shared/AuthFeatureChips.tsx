import type { AuthFormChip, AuthFormChipTone } from "@/components/pages/auth/content";

type AuthFeatureChipsProps = {
  items: AuthFormChip[];
};

const toneStyles: Record<AuthFormChipTone, string> = {
  amber: "bg-[#fff7df] text-[#4a3a10]",
  blue: "bg-[#edf4ff] text-[#173e7a]",
  green: "bg-[#edf9f1] text-[#1f5f31]",
};

const toneDotStyles: Record<AuthFormChipTone, string> = {
  amber: "bg-[#f5c93e]",
  blue: "bg-[#6ea4ff]",
  green: "bg-[#62c37a]",
};

export default function AuthFeatureChips({ items }: AuthFeatureChipsProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`inline-flex w-full items-center gap-3 rounded-full px-4 py-3 text-[0.98rem] ${toneStyles[item.tone]}`}
        >
          <span
            className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${toneDotStyles[item.tone]}`}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white/95" />
          </span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
