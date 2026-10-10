type AppLoadingScreenProps = {
  overlay?: boolean;
  isExiting?: boolean;
};

export default function AppLoadingScreen({
  overlay = false,
  isExiting = false,
}: AppLoadingScreenProps) {
  return (
    <div
      className={[
        overlay
          ? "fixed inset-0 z-[120] flex h-dvh items-center justify-center overflow-hidden p-4 transition duration-500 ease-out"
          : "flex h-dvh items-center justify-center overflow-hidden p-4",
        isExiting ? "pointer-events-none opacity-0 scale-[0.98]" : "opacity-100",
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(22,37,70,0.96),_rgba(6,11,24,0.985)_58%)]" />

      <div className="mg-loading-shell relative w-full max-w-[430px] overflow-hidden rounded-[42px] border border-white/8 px-8 py-8 text-center text-white shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(49,90,173,0.28),_transparent_40%),radial-gradient(circle_at_50%_85%,_rgba(7,9,17,0),_rgba(7,9,17,0.45)_100%)]" />

        <div className="relative mx-auto flex w-full max-w-[300px] flex-col items-center">
          <div className="relative flex h-[220px] w-[220px] items-center justify-center sm:h-[250px] sm:w-[250px]">
            <div className="mg-scan-ring mg-scan-ring-outer absolute inset-0 rounded-full border border-[#61c7ff]/20" />
            <div className="mg-scan-ring mg-scan-ring-middle absolute inset-[20px] rounded-full border border-[#61c7ff]/18" />
            <div className="mg-scan-ring mg-scan-ring-inner absolute inset-[44px] rounded-full border border-[#ffe15a]/18" />

            <div className="mg-scan-dots absolute inset-[10px] rounded-full" />

            <div className="mg-scan-orbit mg-scan-orbit-blue absolute inset-[4px] rounded-full">
              <span className="mg-orbit-node mg-orbit-node-blue" />
            </div>
            <div className="mg-scan-orbit mg-scan-orbit-yellow absolute inset-[12px] rounded-full">
              <span className="mg-orbit-node mg-orbit-node-yellow" />
            </div>

            <div className="mg-tilted-orbit mg-tilted-orbit-blue absolute h-[186px] w-[92px] rounded-full sm:h-[210px] sm:w-[104px]">
              <span className="mg-orbit-node mg-orbit-node-blue" />
              <span className="mg-orbit-node mg-orbit-node-blue mg-orbit-node-opposite" />
            </div>
            <div className="mg-tilted-orbit mg-tilted-orbit-yellow absolute h-[194px] w-[96px] rounded-full sm:h-[218px] sm:w-[108px]">
              <span className="mg-orbit-node mg-orbit-node-yellow" />
              <span className="mg-orbit-node mg-orbit-node-yellow mg-orbit-node-opposite" />
            </div>

            <div className="mg-arc mg-arc-blue absolute inset-[22px] rounded-full" />
            <div className="mg-arc mg-arc-blue-secondary absolute inset-[36px] rounded-full" />
            <div className="mg-arc mg-arc-yellow absolute inset-[50px] rounded-full" />

            <div className="mg-core-grid absolute flex h-[64px] w-[64px] items-center justify-center rounded-full sm:h-[72px] sm:w-[72px]">
              <span className="mg-core-pulse absolute inset-0 rounded-full" />
              <NetworkGlyph />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NetworkGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="relative z-10 h-[46px] w-[46px] text-[#90dcff] sm:h-[52px] sm:w-[52px]"
      fill="none"
    >
      <path
        d="M19 57 35 44m0 0 15 7m-15-7 4-18m11 25 16-8m-16 8 6 17m10-25 12 15M39 26l27 17M32 67l24 1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <circle cx="19" cy="57" r="4" fill="currentColor" />
      <circle cx="35" cy="44" r="4.5" fill="currentColor" />
      <circle cx="39" cy="26" r="4" fill="currentColor" />
      <circle cx="50" cy="51" r="5" fill="currentColor" />
      <circle cx="66" cy="43" r="4.5" fill="currentColor" />
      <circle cx="56" cy="68" r="4" fill="currentColor" />
      <circle cx="78" cy="58" r="4" fill="currentColor" />
      <circle cx="32" cy="67" r="3.8" fill="currentColor" />
    </svg>
  );
}
