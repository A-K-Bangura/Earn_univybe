/** Small branded certificate mark used on tiles and entry points (CSS/SVG only — no generated media). */
export const CertificateGlyph = ({ className = "h-14 w-14" }: { className?: string }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    role="img"
    aria-label="Certificate"
    focusable="false"
  >
    <rect x="4" y="10" width="56" height="44" rx="6" fill="#FFFDF8" stroke="#8338EC" strokeWidth="2.5" />
    <rect x="9" y="15" width="46" height="34" rx="3" fill="none" stroke="#0B1026" strokeOpacity="0.2" />
    <rect x="18" y="22" width="28" height="3.5" rx="1.75" fill="#8338EC" />
    <rect x="14" y="30" width="36" height="5" rx="2.5" fill="#0B1026" />
    <rect x="22" y="39" width="8" height="3" rx="1.5" fill="#3A86FF" />
    <rect x="31" y="39" width="8" height="3" rx="1.5" fill="#8338EC" />
    <rect x="40" y="39" width="6" height="3" rx="1.5" fill="#FF006E" />
    <circle cx="54" cy="46" r="7" fill="#FFBE0B" />
    <path d="M50.8 46.2l2.2 2.2 4.1-4.3" fill="none" stroke="#0B1026" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
