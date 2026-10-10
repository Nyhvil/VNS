"use client";

import Image from "next/image";
import Link from "next/link";

import { useDashboardData } from "@/components/layouts/dashboard/DashboardDataProvider";

export default function DashboardNavbar() {
  const data = useDashboardData();

  return (
    <header className="mg-panel-enter relative overflow-hidden rounded-[30px] border border-white/65 bg-white/84 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.07)] backdrop-blur xl:px-6 xl:py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,203,17,0.18),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.65),rgba(255,255,255,0.35))]" />

      <div className="relative space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-3 self-start">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#fff8df] shadow-[0_10px_22px_rgba(211,154,16,0.16)]">
              <Image
                src="/img/Logo.png"
                alt=""
                aria-hidden="true"
                width={44}
                height={44}
                className="h-11 w-11 rounded-md object-cover"
                priority
              />
            </span>

            <div className="leading-none">
              <div className="text-[1.55rem] font-semibold tracking-[-0.05em]">
                <span className="text-[#101828]">Mail</span>
                <span className="text-[#D39A10]">Guard</span>
              </div>
              <div className="mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#6a7686]">
                Security Dashboard
              </div>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <span className="inline-flex items-center rounded-full bg-[#eef4ff] px-3 py-1 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-[#36507b]">
              Live dashboard
            </span>

            <div className="flex items-center gap-3">
              <NavbarAction icon="search" />
              <NavbarAction icon="bell" hasDot />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-[2.3rem] font-semibold leading-[1.02] tracking-[-0.06em] text-[#101418] sm:text-[3rem]">
              {data.welcomeTitle}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
            <StatusChip tone="neutral">{data.formattedDate}</StatusChip>
            <StatusChip tone="success">{data.systemStatus}</StatusChip>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusChip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "neutral" | "success";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3.5 py-2 text-[0.9rem] font-medium ${
        tone === "success"
          ? "bg-[#e8f7ef] text-[#156b43]"
          : "bg-[#f5f7fb] text-[#4c5a6c]"
      }`}
    >
      {children}
    </span>
  );
}

function NavbarAction({
  icon,
  hasDot = false,
}: {
  icon: "search" | "bell";
  hasDot?: boolean;
}) {
  return (
    <button
      type="button"
      className="mg-card-hover relative flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#4b3f21] shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur hover:bg-[#fffdf8]"
    >
      {hasDot ? (
        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[#c22a21]" />
      ) : null}
      {icon === "search" ? <SearchIcon /> : <BellIcon />}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none">
      <path
        d="M12 4.5a4 4 0 0 0-4 4v2.2c0 .7-.2 1.3-.6 1.9L6 15h12l-1.4-2.4a3.8 3.8 0 0 1-.6-1.9V8.5a4 4 0 0 0-4-4Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
