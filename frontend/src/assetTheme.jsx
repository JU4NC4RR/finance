import React from "react";

/**
 * Acentos por tipo de activo.
 *
 * Estos colores hacen doble trabajo: identifican el activo en la interfaz y
 * son los colores de serie de los graficos. Por eso no estan elegidos a ojo,
 * sino validados sobre la superficie de panel (#11151c) en modo oscuro:
 *   - lightness OKLCH dentro de 0.48-0.67 y croma >= 0.10
 *   - separacion protan/deutan (Machado 2009) DeltaE 11.9  -> objetivo 8
 *   - separacion en vision normal DeltaE 18.4               -> minimo 15
 *   - contraste >= 3:1 contra el panel
 * Si anades un activo nuevo, revalida el conjunto antes de fijar su color.
 */
export const ACCENT = {
  PHYSICAL_GOLD: "#ba8b0c",
  PHYSICAL_SILVER: "#13a0d8",
  CASH: "#10a15a",
  INVEST_SP500: "#617eed",
  INVEST_MSCI_WORLD: "#bb52a8",
  SAVINGS: "#e06623",
};

const FALLBACK = "#ba8b0c";

export function accentFor(code) {
  return ACCENT[code] || FALLBACK;
}

const svg = (children, extra = {}) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
       strokeLinecap="round" strokeLinejoin="round" {...extra}>
    {children}
  </svg>
);

export const ICONS = {
  PHYSICAL_GOLD: svg(<><path d="M4 9l2-4h12l2 4-8 11-8-11z" /><path d="M4 9h16M9 5l3 15 3-15" /></>),
  PHYSICAL_SILVER: svg(<>
    <ellipse cx="12" cy="6" rx="7" ry="2.6" />
    <path d="M5 6v5c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
    <path d="M5 11v5c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-5" />
  </>),
  CASH: svg(<>
    <rect x="3" y="7" width="18" height="11" rx="1.5" />
    <circle cx="12" cy="12.5" r="2.8" />
    <path d="M3 9.5h1.5M21 9.5h-1.5M3 15.5h1.5M21 15.5h-1.5" />
  </>),
  INVEST_SP500: svg(<path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />),
  INVEST_MSCI_WORLD: svg(<>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.6 2.6 4 6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-6-4-9s1.4-6.4 4-9z" />
  </>),
  SAVINGS: svg(<>
    <path d="M4 12a8 8 0 1 1 8 8" />
    <path d="M4 12v5a1 1 0 0 0 1 1h2" />
    <path d="M9 4.5V8h3.5" />
    <circle cx="15" cy="9" r="0.9" fill="currentColor" stroke="none" />
  </>),
};

export function iconFor(code) {
  return ICONS[code] || ICONS.CASH;
}

/** Iconografia de interfaz, con el mismo trazo que los iconos de activo. */
export const UI = {
  vault: svg(<>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="12.5" cy="12" r="4" />
    <path d="M12.5 8.6v1.2M12.5 14.2v1.2M9.1 12h1.2M14.7 12h1.2" />
  </>),
  grid: svg(<>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </>),
  download: svg(<><path d="M12 3v12M7.5 10.5L12 15l4.5-4.5" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" /></>),
  upload: svg(<><path d="M12 15V3M7.5 7.5L12 3l4.5 4.5" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" /></>),
  pencil: svg(<><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" /><path d="M14.5 6.5l3 3" /></>),
  trash: svg(<><path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" /><path d="M6.5 7l.8 12.1A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" /></>),
  arrowRight: svg(<path d="M5 12h13M12.5 5.5L19 12l-6.5 6.5" />),
  arrowLeft: svg(<path d="M19 12H6M11.5 5.5L5 12l6.5 6.5" />),
  trendUp: svg(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  trendDown: svg(<><path d="M3 7l6 6 4-4 8 8" /><path d="M15 17h6v-6" /></>),
  minus: svg(<path d="M5 12h14" />),
  alert: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.6" /></>),
  user: svg(<><circle cx="12" cy="8" r="3.6" /><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" /></>),
  logout: svg(<><path d="M15 4.5h3A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-3" /><path d="M11 15.5 14.5 12 11 8.5M14.5 12h-10" /></>),
  inbox: svg(<>
    <path d="M3 13h5l1.5 3h5L16 13h5" />
    <path d="M5.2 5h13.6l2.2 8v4.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5V13z" />
  </>),
  plus: svg(<path d="M12 5v14M5 12h14" />),
  x: svg(<path d="M6 6l12 12M18 6L6 18" />),
};
