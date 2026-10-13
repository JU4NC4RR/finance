import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatMoney, formatAxis, formatDate, costOf } from "../format";
import { EmptyState } from "./ui";

const SURFACE = "#11151c";
const GRID = "#1b212a";
const AXIS_TEXT = "#626d7e";
/* Serie de referencia en gris: patron de enfasis — el coste es el contexto y
   el valor actual es el sujeto, asi no hacen falta dos colores compitiendo. */
const COST = "#98a2b3";

/*
 * isAnimationActive={false} en todas las series: la animacion de entrada de
 * Recharts se queda congelada en este montaje (stroke-dasharray se detiene
 * cerca de 0, dejando la curva invisible, y la capa de puntos vacia). Sin
 * animacion el grafico se pinta completo desde el primer frame.
 */

function Legend({ items }) {
  return (
    <div className="chart-legend">
      {items.map((it) => (
        <span className="legend-item" key={it.label}>
          <span className="dot" style={{ "--seg": it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

const axisProps = {
  tick: { fill: AXIS_TEXT, fontSize: 11, fontFamily: "JetBrains Mono, monospace" },
  tickLine: false,
};

function Tip({ active, payload, label, currency, rows }) {
  if (!active || !payload?.length) return null;
  const byKey = Object.fromEntries(payload.map((p) => [p.dataKey, p.value]));
  return (
    <div className="chart-tip">
      <div className="chart-tip-label">{formatDate(label)}</div>
      {rows.map((r) => (
        <div className="chart-tip-row" key={r.key}>
          <span className="dot" style={{ "--seg": r.color }} />
          <span>{r.label}</span>
          <strong>{formatMoney(byKey[r.key] ?? 0, currency)}</strong>
        </div>
      ))}
    </div>
  );
}

/**
 * Metales: coste acumulado frente a lo que vale hoy lo acumulado.
 *
 * Ojo con la lectura: la curva de valor NO es un historico de mercado (no hay
 * precios spot pasados), sino cuanto valdria a precio de HOY el metal que ya
 * se habia comprado en cada fecha. Por eso la subtitula "a precio spot actual".
 */
export function CostVsValueChart({ transactions, spotPerGram, currency, accent }) {
  const sorted = [...transactions].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));

  // Un punto por fecha: varias compras el mismo dia se colapsan en el
  // acumulado de ese dia, si no el eje repite la misma etiqueta.
  let cumCost = 0;
  let cumFine = 0;
  const byDate = new Map();
  for (const tx of sorted) {
    cumCost += costOf(tx);
    cumFine += Number(tx.quantity) * Number(tx.purity ?? 1);
    byDate.set(tx.occurred_on, {
      date: tx.occurred_on,
      cost: cumCost,
      value: spotPerGram != null ? cumFine * spotPerGram : null,
    });
  }
  const data = [...byDate.values()];

  if (!data.length) {
    return (
      <EmptyState
        title="Sin compras registradas"
        hint="Registra un movimiento con su precio para comparar lo pagado con el valor actual."
      />
    );
  }

  const items = [{ label: "Coste pagado", color: COST }];
  if (spotPerGram != null) items.push({ label: "Valor hoy", color: accent });

  return (
    <>
      <Legend items={items} />
      <ResponsiveContainer width="100%" height={264}>
        <LineChart data={data} margin={{ top: 8, right: 44, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            axisLine={{ stroke: GRID }}
            minTickGap={28}
            dy={4}
            {...axisProps}
          />
          <YAxis
            tickFormatter={(v) => formatAxis(v, currency)}
            axisLine={false}
            width={82}
            {...axisProps}
          />
          <Tooltip
            cursor={{ stroke: "#2f3846", strokeWidth: 1 }}
            content={
              <Tip
                currency={currency}
                rows={[
                  { key: "cost", label: "Pagado", color: COST },
                  ...(spotPerGram != null ? [{ key: "value", label: "Vale hoy", color: accent }] : []),
                ]}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="cost"
            stroke={COST}
            strokeWidth={2}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4.5, fill: COST, stroke: SURFACE, strokeWidth: 2 }}
          />
          {spotPerGram != null && (
            <Line
              type="monotone"
              dataKey="value"
              stroke={accent}
              strokeWidth={2}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 4.5, fill: accent, stroke: SURFACE, strokeWidth: 2 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

/** Inversiones: evolucion de las valoraciones anotadas. Una sola serie, sin leyenda. */
export function ValuationChart({ transactions, currency, accent }) {
  // Si hay varias lecturas el mismo dia vale la ultima, igual que en el resumen.
  const byDate = new Map();
  for (const tx of [...transactions].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))) {
    byDate.set(tx.occurred_on, { date: tx.occurred_on, value: Number(tx.quantity) });
  }
  const data = [...byDate.values()];

  if (data.length < 2) {
    return (
      <EmptyState
        title={data.length ? "Solo hay una valoración" : "Sin valoraciones"}
        hint="Anota el valor de tu posición cada cierto tiempo y aquí verás cómo evoluciona."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={264}>
      <LineChart data={data} margin={{ top: 8, right: 44, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          axisLine={{ stroke: GRID }}
          minTickGap={28}
          dy={4}
          {...axisProps}
        />
        <YAxis
          tickFormatter={(v) => formatAxis(v, currency)}
          axisLine={false}
          width={82}
          domain={["auto", "auto"]}
          {...axisProps}
        />
        <Tooltip
          cursor={{ stroke: "#2f3846", strokeWidth: 1 }}
          content={<Tip currency={currency} rows={[{ key: "value", label: "Valor", color: accent }]} />}
        />
        {/* Cada punto es una lectura real anotada, no una serie continua, asi
            que se marcan. isAnimationActive=false porque Recharts deja la capa
            de puntos vacia hasta dar la animacion por terminada. */}
        <Line
          type="monotone"
          dataKey="value"
          stroke={accent}
          strokeWidth={2}
          isAnimationActive={false}
          dot={{ r: 3.5, fill: accent, stroke: SURFACE, strokeWidth: 2 }}
          activeDot={{ r: 5.5, fill: accent, stroke: SURFACE, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
