import { Link } from "react-router-dom";
import { accentFor, iconFor, UI } from "../assetTheme";
import { formatMoney, formatQty, formatPercent, formatDate } from "../format";

export default function SummaryCards({ assets, baseCurrency, total }) {
  return (
    <div className="asset-grid">
      {assets.map((a) => {
        const code = a.asset_type.code;
        const value = Number(a.current_value_base_ccy) || 0;
        const share = total > 0 ? (value / total) * 100 : 0;

        return (
          <Link
            className="asset-card"
            key={a.asset_type.id}
            style={{ "--accent": accentFor(code) }}
            to={`/activos/${code}`}
          >
            <div className="asset-card-top">
              <span className="icon-badge">{iconFor(code)}</span>
              <span className="name">{a.asset_type.name}</span>
              <span className="asset-go">{UI.arrowRight}</span>
            </div>

            <div className="value">{formatMoney(value, baseCurrency)}</div>

            <div className="meta">
              {/* Una inversion no acumula cantidad: su valor es la ultima
                  lectura anotada, asi que lo util es cuando se tomo. */}
              <span>
                {a.asset_type.category === "investment"
                  ? a.last_valued_on
                    ? `Valorado el ${formatDate(a.last_valued_on)}`
                    : "Sin valoraciones"
                  : formatQty(a.total_quantity, a.asset_type.unit)}
              </span>
              <span>
                {a.num_transactions}
                {a.asset_type.category === "investment" ? " lect." : " mov."}
              </span>
            </div>

            {/* eco visual del porcentaje que ya se lee debajo */}
            <div className="share-track" aria-hidden="true">
              <div className="share-fill" style={{ width: `${Math.max(share, 1.5)}%` }} />
            </div>
            <div className="meta">
              <span>{formatPercent(share)} de la cartera</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
