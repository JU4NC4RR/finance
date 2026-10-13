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

/**
 * Paleta elegible para las huchas. Reutiliza el mismo conjunto ya validado
 * de los activos, asi que la interfaz mantiene un unico sistema de color y
 * las huchas siguen siendo distinguibles entre si con vision del color
 * alterada. Se guarda la CLAVE en base de datos, no el hex: si algun dia se
 * reajusta un color, las huchas existentes se actualizan solas.
 */
export const JAR_COLORS = [
  { key: "cash", label: "Verde", hex: "#10a15a" },
  { key: "silver", label: "Azul", hex: "#13a0d8" },
  { key: "sp500", label: "Índigo", hex: "#617eed" },
  { key: "msci", label: "Magenta", hex: "#bb52a8" },
  { key: "savings", label: "Naranja", hex: "#e06623" },
  { key: "gold", label: "Oro", hex: "#ba8b0c" },
];

export function jarColor(key) {
  return (JAR_COLORS.find((c) => c.key === key) || JAR_COLORS[0]).hex;
}

// width/height en 1em: un <svg> sin dimensiones toma el tamaño por defecto del
// navegador (300x150) y revienta el contenedor. Con 1em cualquier icono suelto
// queda a la altura del texto, y el CSS puede seguir fijándole otra medida.
const svg = (children, extra = {}) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...extra}>
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
  // Lápiz y papelera se dibujan a 15 px: trazos separados y pocas curvas, que
  // a ese tamaño los detalles finos se emborronan.
  pencil: svg(<>
    <path d="M14.8 4.6a1.9 1.9 0 0 1 2.7 0l1.9 1.9a1.9 1.9 0 0 1 0 2.7L8.6 20H4v-4.6z" />
    <path d="M13.4 6 18 10.6" />
  </>),
  trash: svg(<>
    <path d="M3.5 6.5h17" />
    <path d="M9.5 6.5V5A1.5 1.5 0 0 1 11 3.5h2A1.5 1.5 0 0 1 14.5 5v1.5" />
    <path d="M5.8 6.5l.8 12.8a2 2 0 0 0 2 1.9h6.8a2 2 0 0 0 2-1.9l.8-12.8" />
    <path d="M10 10.5v6.5M14 10.5v6.5" />
  </>),
  arrowRight: svg(<path d="M5 12h13M12.5 5.5L19 12l-6.5 6.5" />),
  arrowLeft: svg(<path d="M19 12H6M11.5 5.5L5 12l6.5 6.5" />),
  trendUp: svg(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  trendDown: svg(<><path d="M3 7l6 6 4-4 8 8" /><path d="M15 17h6v-6" /></>),
  minus: svg(<path d="M5 12h14" />),
  alert: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.6" /></>),
  user: svg(<><circle cx="12" cy="8" r="3.6" /><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" /></>),
  jars: svg(<>
    <path d="M5 9.5h14a1 1 0 0 1 1 1V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5a1 1 0 0 1 1-1z" />
    <path d="M8.5 9.5V6a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 6v3.5" />
    <path d="M12 13v4M10 15h4" />
  </>),
  bank: svg(<>
    <path d="M3.5 9.5 12 4.5l8.5 5" />
    <path d="M5.5 9.5v8M9.5 9.5v8M14.5 9.5v8M18.5 9.5v8" />
    <path d="M3 20.5h18" />
  </>),
  transfer: svg(<><path d="M4 9h13M13.5 5.5 17 9l-3.5 3.5" /><path d="M20 15H7M10.5 11.5 7 15l3.5 3.5" /></>),
  settings: svg(<>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1h-.2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5v-.2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </>),
  copy: svg(<>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </>),
  check: svg(<><path d="M4.5 12.5 9.5 17.5 19.5 6.5" /></>),
  wallet: svg(<>
    <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v10A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
    <path d="M4 9.5h11.5A1.5 1.5 0 0 1 17 11v3a1.5 1.5 0 0 1-1.5 1.5H4" />
    <circle cx="13.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
  </>),
  strategy: svg(<>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5" />
  </>),
  arrowDown: svg(<><path d="M12 5v13M7 13.5 12 18.5l5-5" /></>),
  arrowUp: svg(<><path d="M12 19V6M7 10.5 12 5.5l5 5" /></>),
  logout: svg(<><path d="M15 4.5h3A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-3" /><path d="M11 15.5 14.5 12 11 8.5M14.5 12h-10" /></>),
  inbox: svg(<>
    <path d="M3 13h5l1.5 3h5L16 13h5" />
    <path d="M5.2 5h13.6l2.2 8v4.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5V13z" />
  </>),
  plus: svg(<path d="M12 5v14M5 12h14" />),
  x: svg(<path d="M6 6l12 12M18 6L6 18" />),
};
