export default function RegisterSecurityArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 620 540"
      className="mx-auto w-full max-w-115"
      fill="none"
    >
      <defs>
        <radialGradient id="registerGlow" cx="0" cy="0" r="1" gradientTransform="translate(308 430) rotate(90) scale(100 180)">
          <stop stopColor="#FFF4B2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFF4B2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shieldBody" x1="210" y1="160" x2="380" y2="420" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF2B1" />
          <stop offset="0.48" stopColor="#97C4FF" />
          <stop offset="1" stopColor="#1E4E91" />
        </linearGradient>
        <linearGradient id="circuit" x1="60" y1="460" x2="560" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A5D8FF" />
          <stop offset="1" stopColor="#FFF0A4" />
        </linearGradient>
      </defs>

      <ellipse cx="308" cy="430" rx="170" ry="96" fill="url(#registerGlow)" />

      <path
        d="M303 120c35 27 75 40 120 40v90c0 94-53 149-120 173-67-24-120-79-120-173v-90c45 0 85-13 120-40Z"
        fill="url(#shieldBody)"
        stroke="#FFF7D1"
        strokeWidth="7"
      />
      <path
        d="M303 176c21 16 46 24 72 24v53c0 55-29 87-72 106-43-19-72-51-72-106v-53c26 0 51-8 72-24Z"
        fill="#1A3E72"
        stroke="#FFF0A1"
        strokeWidth="5"
      />
      <path
        d="m275 263 21 21 37-45"
        stroke="#8BD0FF"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <g stroke="url(#circuit)" strokeWidth="4" strokeLinecap="round">
        <path d="M136 390h62l38-42" />
        <path d="M420 347l42 42h54" />
        <path d="M303 336v95" />
        <path d="M232 214h-54l-44-42" />
        <path d="M372 212h56l44-44" />
        <path d="M194 430H108l-28 28" />
        <path d="M412 430h82l28 28" />
      </g>

      <g fill="#FFF1B5" fillOpacity="0.9" stroke="#E5CC78" strokeWidth="4">
        <circle cx="92" cy="414" r="26" />
        <circle cx="520" cy="396" r="24" />
        <circle cx="506" cy="176" r="20" />
        <circle cx="128" cy="186" r="18" />
      </g>

      <g stroke="#D9F0FF" strokeWidth="5">
        <path d="M73 414h38" />
        <path d="M92 395v38" />
        <path d="M501 396h38" />
        <path d="M520 377v38" />
      </g>

      <g transform="translate(400 228)">
        <rect width="96" height="96" rx="24" fill="#FFFFFF22" stroke="#CFE4FF" strokeWidth="3" />
        <path d="M48 26c11 9 24 13 38 13v27c0 30-17 48-38 56C27 114 10 96 10 66V39c14 0 27-4 38-13Z" fill="#FDE68A" stroke="#FFF7DA" strokeWidth="3" />
        <path d="M33 71h30" stroke="#244B88" strokeWidth="5" strokeLinecap="round" />
      </g>

      <g transform="translate(106 210)">
        <rect width="84" height="84" rx="22" fill="#FFFFFF20" stroke="#CFE4FF" strokeWidth="3" />
        <path d="M42 22c10 8 22 12 34 12v24c0 28-15 44-34 51C23 102 8 86 8 58V34c12 0 24-4 34-12Z" fill="#8CC4FF" stroke="#E5F5FF" strokeWidth="3" />
        <rect x="30" y="48" width="24" height="18" rx="5" stroke="#173E74" strokeWidth="4" />
      </g>

      <g transform="translate(414 82)">
        <circle cx="44" cy="44" r="44" fill="#FFFFFF1F" />
        <text x="44" y="57" textAnchor="middle" fill="#FFF7CC" fontSize="42" fontWeight="700" fontFamily="Inter, Segoe UI, sans-serif">
          AI
        </text>
      </g>
    </svg>
  );
}
