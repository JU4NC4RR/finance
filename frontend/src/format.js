const LOCALE = "es-ES";

export function formatMoney(value, currency) {
  // useGrouping "always": es-ES omite el punto en cifras de 4 digitos, lo que
  // descuadra visualmente una columna con importes de 4 y 5 digitos mezclados.
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    useGrouping: "always",
  }).format(Number(value) || 0);
}

/**
 * Separa los decimales para poder atenuarlos en las cifras grandes.
 * Devuelve { main, cents } — p.ej. "12.345" + ",67 €".
 */
export function splitMoney(value, currency) {
  const formatted = formatMoney(value, currency);
  const match = formatted.match(/^(.*?)([.,]\d{2})(\D*)$/);
  if (!match) return { main: formatted, cents: "" };
  return { main: match[1], cents: match[2] + match[3] };
}

/**
 * Etiquetas de eje: numeros redondos y estrechos. Por debajo del millon se lee
 * mucho mejor "68.120 €" que el compacto "68,1 mil €", que ademas es mas ancho.
 */
export function formatAxis(value, currency) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    useGrouping: "always",
    ...(Math.abs(n) >= 1_000_000
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { maximumFractionDigits: 0 }),
  }).format(n);
}

export function formatQty(value, unit) {
  const n = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(Number(value) || 0);
  return unit === "unit" ? n : `${n} ${unit}`;
}

export function formatPercent(value, digits = 1) {
  return `${(Number(value) || 0).toFixed(digits).replace(".", ",")} %`;
}

export function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(LOCALE, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(LOCALE, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Coste aportado de un movimiento, en su divisa. */
export function costOf(tx) {
  if (tx.total_price != null) return Number(tx.total_price);
  if (tx.unit_cost != null) return Number(tx.quantity) * Number(tx.unit_cost);
  return 0;
}

/**
 * Coste y plusvalia, calculados SOLO sobre los activos que tienen precio de
 * compra registrado.
 *
 * Efectivo y ahorros no lo tienen (su coste es su propio importe), asi que
 * contrastar ese coste parcial contra el patrimonio total da un porcentaje
 * disparatado. Aqui se comparan los dos lados del mismo conjunto.
 *
 * Devuelve null si ningun movimiento tiene precio de compra.
 */
export function pricedTotals(summary, transactions) {
  if (!summary?.assets?.length) return null;

  const costByAsset = {};
  for (const tx of transactions) {
    const code = tx.asset_type.code;
    costByAsset[code] = (costByAsset[code] || 0) + costOf(tx);
  }

  const covered = summary.assets.filter((a) => (costByAsset[a.asset_type.code] || 0) > 0);
  if (!covered.length) return null;

  const cost = covered.reduce((sum, a) => sum + costByAsset[a.asset_type.code], 0);
  const value = covered.reduce((sum, a) => sum + (Number(a.current_value_base_ccy) || 0), 0);

  return {
    names: covered.map((a) => a.asset_type.name).join(", "),
    count: covered.length,
    cost,
    value,
    gain: value - cost,
    pct: ((value - cost) / cost) * 100,
  };
}
