import type { AuthVisualBullet } from "@/components/pages/auth/content";

type AuthVisualChecklistProps = {
  items: AuthVisualBullet[];
};

export default function AuthVisualChecklist({
  items,
}: AuthVisualChecklistProps) {
  return (
    <ul className="mt-7 space-y-4 text-[1.02rem] leading-8 text-[#1b2432]">
      {items.map((item) => (
        <li key={item.label} className="flex items-start gap-3">
          <span className="mt-1.5 inline-flex h-5 w-5 flex-none items-center justify-center text-[#111827]">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none">
              <path
                d="m4.5 10 3.1 3.1 7.9-8.1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
