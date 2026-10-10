import Link from "next/link";

const footerLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyze_result", label: "Mail Analysis" },
  { href: "/analyze_result#support", label: "Support" },
];

export default function DashboardFooter() {
  return (
    <footer className="rounded-[24px] bg-white px-6 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[1rem] font-semibold tracking-[-0.03em] text-[#111827]">
            MailGuard Dashboard
          </p>
          <p className="mt-1.5 text-[0.94rem] text-[#5a5447]">
            © 2026 MailGuard • Trung tâm giám sát và phân tích rủi ro cho hệ thống.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="inline-flex items-center rounded-full bg-[#f5f7fb] px-4 py-2 text-[0.92rem] font-medium text-[#4b5563] transition hover:bg-[#eef2f7] hover:text-[#111827]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
