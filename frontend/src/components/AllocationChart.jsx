import { useState } from "react";
import { accentFor } from "../assetTheme";
import { formatMoney, formatPercent } from "../format";
import { EmptyState } from "./ui";

/**
 * Distribucion de la cartera.
 *
 * Barra apilada horizontal + filas etiquetadas, en lugar de un donut: con seis
 * categorias los angulos son dificiles de comparar y la identidad acabaria
 * dependiendo solo del color. Aqui cada tramo lleva su nombre, su porcentaje y
 * su importe al lado, y el orden es fijo (no salta al moverse los precios).
 */
export default function AllocationChart({ assets, currency }) {
  const [hovered, setHovered] = useState(null);

  const data = assets
    .map((a) => ({
      code: a.asset_type.code,
      name: a.asset_type.name,
      value: Number(a.current_value_base_ccy) || 0,
      color: accentFor(a.asset_type.code),
    }))
    .filter((d) => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!data.length) {
    return (
      <EmptyState
        title="Sin valor acumulado"
        hint="Registra tu primer movimiento para ver como se reparte la cartera."
      />
    );
  }

  return (
    <div className="alloc" onMouseLeave={() => setHovered(null)}>
      <div className="alloc-bar">
        {data.map((d) => (
          <div
            key={d.code}
            className="alloc-seg"
            style={{
              "--seg": d.color,
              flexGrow: d.value,
              opacity: hovered && hovered !== d.code ? 0.3 : 1,
            }}
            onMouseEnter={() => setHovered(d.code)}
            title={`${d.name} · ${formatPercent((d.value / total) * 100)}`}
          />
        ))}
      </div>

      <div className="alloc-rows">
        {data.map((d) => (
          <div
            key={d.code}
            className="alloc-row"
            style={{ opacity: hovered && hovered !== d.code ? 0.45 : 1 }}
            onMouseEnter={() => setHovered(d.code)}
          >
            <span className="alloc-key">
              <span className="dot" style={{ "--seg": d.color }} />
              <span className="name">{d.name}</span>
            </span>
            <span className="alloc-pct">{formatPercent((d.value / total) * 100)}</span>
            <span className="alloc-val">{formatMoney(d.value, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
