import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatMoney, formatAxis, formatDate } from "../format";
import { EmptyState } from "./ui";

const LINE = "#d4af5f";
const SURFACE = "#11151c";
const GRID = "#1b212a";
const AXIS_TEXT = "#626d7e";

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="chart-tip-label">{formatDate(label)}</div>
      <div className="chart-tip-value">{formatMoney(payload[0].value, currency)}</div>
    </div>
  );
}

export default function EvolutionChart({ data, currency }) {
  if (!data.length) {
    return (
      <EmptyState
        title="Todavía no hay serie histórica"
        hint="Los movimientos que incluyan precio de compra irán dibujando la curva de coste aportado."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={272}>
      <AreaChart data={data} margin={{ top: 8, right: 44, left: 4, bottom: 0 }}>
        <defs>
          {/* Lavado al 10%, nunca un bloque saturado */}
          <linearGradient id="evolutionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={LINE} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />

        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: AXIS_TEXT, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
          axisLine={{ stroke: GRID }}
          tickLine={false}
          minTickGap={28}
          dy={4}
        />
        <YAxis
          tickFormatter={(v) => formatAxis(v, currency)}
          tick={{ fill: AXIS_TEXT, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
          axisLine={false}
          tickLine={false}
          width={82}
        />

        <Tooltip
          content={<ChartTooltip currency={currency} />}
          cursor={{ stroke: "#2f3846", strokeWidth: 1 }}
        />

        <Area
          type="monotone"
          dataKey="total"
          stroke={LINE}
          strokeWidth={2}
          fill="url(#evolutionFill)"
          /* Sin animacion de entrada: se queda congelada y deja la curva
             practicamente invisible (stroke-dasharray detenido cerca de 0). */
          isAnimationActive={false}
          /* anillo de 2px en color de superficie para que el punto se lea sobre la linea */
          activeDot={{ r: 4.5, fill: LINE, stroke: SURFACE, strokeWidth: 2 }}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
