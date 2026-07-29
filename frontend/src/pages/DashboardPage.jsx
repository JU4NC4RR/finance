import { useMemo } from "react";
import { api } from "../api";
import { UI, accentFor } from "../assetTheme";
import {
  splitMoney, formatMoney, formatPercent, formatDate, formatDateTime, costOf,
} from "../format";
import SummaryCards from "../components/SummaryCards";
import EvolutionChart from "../components/EvolutionChart";
import AllocationChart from "../components/AllocationChart";
import ExportButton from "../components/ExportButton";
import ImportButton from "../components/ImportButton";
import { Topbar, Banner, Panel, StatTile, Delta } from "../components/ui";

export default function DashboardPage({ summary, transactions, error, onDataChanged }) {
  const baseCurrency = summary?.base_currency || "EUR";

  const evolutionData = useMemo(() => {
    const priced = transactions.filter((tx) => tx.unit_cost || tx.total_price);
    const sorted = [...priced].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
    let running = 0;
    const byDate = {};
    for (const tx of sorted) {
      running += costOf(tx);
      byDate[tx.occurred_on] = running;
    }
    return Object.entries(byDate).map(([date, total]) => ({ date, total }));
  }, [transactions]);

  const costByAsset = useMemo(() => {
    const map = {};
    for (const tx of transactions) {
      const code = tx.asset_type.code;
      map[code] = (map[code] || 0) + costOf(tx);
    }
    return map;
  }, [transactions]);

  /**
   * La plusvalia solo se puede calcular sobre los activos que tienen precio de
   * compra registrado. Efectivo y ahorros no lo tienen (su coste es su importe),
   * asi que contrastar ese coste parcial contra el patrimonio total da un
   * porcentaje disparatado. Aqui se comparan los dos lados del mismo conjunto.
   */
  const priced = useMemo(() => {
    if (!summary?.assets?.length) return null;
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
      pct: (value - cost) / cost * 100,
    };
  }, [summary, costByAsset]);

  const lastMovement = useMemo(() => {
    if (!transactions.length) return null;
    return transactions.reduce(
      (latest, tx) => (tx.occurred_on > latest ? tx.occurred_on : latest),
      transactions[0].occurred_on
    );
  }, [transactions]);

  const biggest = useMemo(() => {
    if (!summary?.assets?.length) return null;
    return summary.assets.reduce((top, a) =>
      Number(a.current_value_base_ccy) > Number(top.current_value_base_ccy) ? a : top
    );
  }, [summary]);

  if (!summary) {
    return (
      <>
        <Topbar eyebrow="Bóveda" title="Resumen" icon={UI.grid} />
        <div className="content">{error && <Banner>{error}</Banner>}</div>
      </>
    );
  }

  const total = Number(summary.total_value_base_ccy) || 0;
  const { main, cents } = splitMoney(total, baseCurrency);

  return (
    <>
      <Topbar eyebrow="Bóveda" title="Resumen" icon={UI.grid}>
        <ExportButton onExport={api.exportFullBackup} label="Copia de seguridad" />
        <ImportButton onImport={api.importFullBackup} onDone={onDataChanged} label="Restaurar" />
      </Topbar>

      <div className="content">
        {error && <Banner>{error}</Banner>}

        <section className="hero">
          <div className="hero-main">
            <div className="hero-label">Patrimonio monitorizado</div>
            <div className="hero-value">
              {main}
              <span className="cents">{cents}</span>
            </div>
            {/* Sin chip de variacion: no hay coste de compra para toda la
                cartera, y un porcentaje aqui se leeria como si lo hubiera. */}
            <div className="hero-meta">
              {summary.prices_updated_at && (
                <span>Precios actualizados · {formatDateTime(summary.prices_updated_at)}</span>
              )}
            </div>
          </div>

          <div className="hero-aside">
            <div>
              <div className="stat-label">Activos</div>
              <div className="stat-value">{summary.assets.length}</div>
            </div>
            <div>
              <div className="stat-label">Movimientos</div>
              <div className="stat-value">{transactions.length}</div>
            </div>
          </div>
        </section>

        <div className="stat-row">
          <StatTile
            label="Coste aportado"
            value={priced ? formatMoney(priced.cost, baseCurrency) : "—"}
            foot={
              priced
                ? `${priced.count} de ${summary.assets.length} activos con precio de compra`
                : "Ningún movimiento tiene precio de compra"
            }
          />
          <StatTile
            label="Plusvalía latente"
            value={priced ? formatMoney(priced.gain, baseCurrency) : "—"}
            badge={priced ? <Delta value={priced.pct} /> : null}
            foot={priced ? `Solo sobre ${priced.names}` : "Requiere precio de compra"}
          />
          <StatTile
            label="Mayor posición"
            value={biggest ? biggest.asset_type.name : "—"}
            foot={
              biggest && total > 0
                ? `${formatPercent((Number(biggest.current_value_base_ccy) / total) * 100)} de la cartera`
                : "Sin activos valorados"
            }
            accent={biggest ? accentFor(biggest.asset_type.code) : undefined}
          />
          <StatTile
            label="Último movimiento"
            value={lastMovement ? formatDate(lastMovement) : "—"}
            foot={`${transactions.length} registrados en total`}
          />
        </div>

        <div className="section-head">
          <h2 className="section-title">Activos</h2>
          <span className="section-hint">Pulsa para ver el detalle</span>
        </div>

        <SummaryCards assets={summary.assets} baseCurrency={baseCurrency} total={total} />

        <div className="grid-2">
          <Panel title="Evolución del coste aportado" sub="Acumulado por fecha de compra">
            <EvolutionChart data={evolutionData} currency={baseCurrency} />
          </Panel>
          <Panel title="Distribución actual" sub="Peso de cada activo">
            <AllocationChart assets={summary.assets} currency={baseCurrency} />
          </Panel>
        </div>

        <div className="footer-note">
          Oro y plata vía gold-api.com · S&amp;P 500 y MSCI World vía Yahoo Finance · Tipos de cambio vía frankfurter.dev
        </div>
      </div>
    </>
  );
}
