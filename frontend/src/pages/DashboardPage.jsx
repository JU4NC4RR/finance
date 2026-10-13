import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { UI, accentFor, jarColor } from "../assetTheme";
import {
  splitMoney, formatMoney, formatPercent, formatDate, formatDateTime, costOf, pricedTotals,
} from "../format";
import SummaryCards from "../components/SummaryCards";
import EvolutionChart from "../components/EvolutionChart";
import AllocationChart from "../components/AllocationChart";
import ExportButton from "../components/ExportButton";
import ImportButton from "../components/ImportButton";
import { Topbar, Banner, Panel, StatTile, Delta, EmptyState } from "../components/ui";

const VIEWS = [
  { key: "todo", label: "Todo" },
  { key: "patrimonio", label: "Patrimonio" },
  { key: "cuentas", label: "Cuentas" },
  { key: "huchas", label: "Huchas" },
  { key: "estrategias", label: "Estrategias" },
];

const STORAGE_KEY = "boveda:resumen-vista";

/** Cifra pequeña dentro de un panel, para los totales de cada categoría. */
function MiniStat({ label, value, tone }) {
  return (
    <div className="mini-stat">
      <div className="mini-label">{label}</div>
      <div className={`mini-value${tone ? ` ${tone}` : ""}`}>{value}</div>
    </div>
  );
}

export default function DashboardPage({
  summary, transactions, jarsSummary, banksSummary, strategies = [], error, onDataChanged,
}) {
  // Se recuerda la vista elegida: si sueles mirar solo huchas, no tiene
  // sentido que cada visita empiece en "Todo". En modo privado falla la
  // lectura, y entonces simplemente se abre en "Todo".
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "todo";
    } catch {
      return "todo";
    }
  });

  const selectView = (key) => {
    setView(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* sin persistencia; la vista sigue funcionando en esta sesión */
    }
  };

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

  const priced = useMemo(() => pricedTotals(summary, transactions), [summary, transactions]);

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

  const jars = jarsSummary?.jars || [];
  const accounts = banksSummary?.accounts || [];
  const shows = (key) => view === "todo" || view === key;

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

        {/* Los cuatro totales, siempre a la vista. Son de circuitos separados
            —solo el patrimonio incluye activos— asi que se muestran uno al
            lado del otro pero nunca sumados entre si. */}
        <div className="stat-row">
          <StatTile
            label="Patrimonio"
            value={formatMoney(total, baseCurrency)}
            foot={`${summary.assets.length} activos`}
          />
          <StatTile
            label="En cuentas"
            value={formatMoney(Number(banksSummary?.total_balance) || 0, baseCurrency)}
            foot={`${accounts.length} cuenta${accounts.length === 1 ? "" : "s"}`}
          />
          <StatTile
            label="En huchas"
            value={formatMoney(Number(jarsSummary?.total_balance) || 0, baseCurrency)}
            foot={`${jars.length} hucha${jars.length === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Estrategias"
            value={strategies.length}
            foot={
              strategies.length
                ? `${formatPercent(Number(strategies[0].total_percentage) || 0)} asignado en «${strategies[0].name}»`
                : "Ninguna definida"
            }
          />
        </div>

        <div className="seg-control" role="tablist" aria-label="Categoría del resumen">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={view === v.key}
              className={`seg-btn${view === v.key ? " active" : ""}`}
              onClick={() => selectView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>

        {shows("patrimonio") && (
          <>
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
              <Link className="section-hint" to="/activos">Ver todo →</Link>
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
          </>
        )}

        {shows("cuentas") && (
          <Panel
            title="Cuentas"
            sub={banksSummary?.month_label ? `Movimiento de ${banksSummary.month_label}` : "Saldo por cuenta"}
            action={<Link className="section-hint" to="/cuentas">Ver todo →</Link>}
          >
            {accounts.length ? (
              <>
                <div className="mini-stats">
                  <MiniStat
                    label="Saldo total"
                    value={formatMoney(Number(banksSummary.total_balance) || 0, baseCurrency)}
                  />
                  <MiniStat
                    label="Entradas del mes"
                    value={formatMoney(Number(banksSummary.month_income) || 0, baseCurrency)}
                    tone="is-income"
                  />
                  <MiniStat
                    label="Salidas del mes"
                    value={formatMoney(Number(banksSummary.month_expense) || 0, baseCurrency)}
                    tone="is-expense"
                  />
                </div>

                <div className="alloc-rows">
                  {accounts.map((a) => (
                    <div className="alloc-row" key={a.id}>
                      <span className="alloc-key">
                        <span className="dot" style={{ "--seg": jarColor(a.color) }} />
                        <span className="name">{a.name}</span>
                      </span>
                      <span className="alloc-pct">{a.bank || "—"}</span>
                      <span className={`alloc-val${Number(a.balance) < 0 ? " is-expense" : ""}`}>
                        {formatMoney(Number(a.balance) || 0, baseCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                title="Sin cuentas"
                hint="Crea tu primera cuenta bancaria desde la pestaña Cuentas."
              />
            )}
          </Panel>
        )}

        {shows("huchas") && (
          <Panel
            title="Huchas"
            sub={jarsSummary?.month_label ? `Movimiento de ${jarsSummary.month_label}` : "Saldo por hucha"}
            action={<Link className="section-hint" to="/huchas">Ver todo →</Link>}
          >
            {jars.length ? (
              <>
                <div className="mini-stats">
                  <MiniStat
                    label="Saldo total"
                    value={formatMoney(Number(jarsSummary.total_balance) || 0, baseCurrency)}
                  />
                  <MiniStat
                    label="Ingresos del mes"
                    value={formatMoney(Number(jarsSummary.month_income) || 0, baseCurrency)}
                    tone="is-income"
                  />
                  <MiniStat
                    label="Gastos del mes"
                    value={formatMoney(Number(jarsSummary.month_expense) || 0, baseCurrency)}
                    tone="is-expense"
                  />
                </div>

                <div className="alloc-rows">
                  {jars.map((j) => {
                    const balance = Number(j.balance) || 0;
                    const target = j.target_amount != null ? Number(j.target_amount) : null;
                    return (
                      <div className="alloc-row" key={j.id}>
                        <span className="alloc-key">
                          <span className="dot" style={{ "--seg": jarColor(j.color) }} />
                          <span className="name">{j.name}</span>
                        </span>
                        <span className="alloc-pct">
                          {target > 0 ? formatPercent((balance / target) * 100) : "—"}
                        </span>
                        <span className={`alloc-val${balance < 0 ? " is-expense" : ""}`}>
                          {formatMoney(balance, baseCurrency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyState
                title="Sin huchas"
                hint="Crea tu primera hucha desde la pestaña Huchas."
              />
            )}
          </Panel>
        )}

        {shows("estrategias") && (
          <Panel
            title="Estrategias"
            sub="Reparto planificado del sueldo"
            action={<Link className="section-hint" to="/estrategias">Ver todo →</Link>}
          >
            {strategies.length ? (
              <div className="strategy-summary">
                {strategies.map((s) => {
                  const assigned = Number(s.total_percentage) || 0;
                  const free = 100 - assigned;
                  return (
                    <div className="strategy-summary-row" key={s.id}>
                      <div className="strategy-summary-head">
                        <span className="name">{s.name}</span>
                        <span className="alloc-pct">
                          {s.salary != null
                            ? formatMoney(Number(s.salary), s.currency)
                            : "Sin sueldo"}
                        </span>
                        <span className={`alloc-val${assigned > 100.005 ? " is-expense" : ""}`}>
                          {formatPercent(assigned)}
                        </span>
                      </div>
                      <div className="alloc-bar">
                        {s.items.map((i) => (
                          <div
                            key={i.id}
                            className="alloc-seg"
                            style={{ "--seg": jarColor(i.color), flexGrow: Number(i.percentage) || 0 }}
                          />
                        ))}
                        {free > 0.005 && (
                          <div className="alloc-seg is-free" style={{ flexGrow: free }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Sin estrategias"
                hint="Define tu primer reparto del sueldo desde la pestaña Estrategias."
              />
            )}
          </Panel>
        )}

        {shows("patrimonio") && (
          <div className="footer-note">
            Oro y plata vía gold-api.com · S&amp;P 500 y MSCI World vía Yahoo Finance · Tipos de cambio vía frankfurter.dev
          </div>
        )}
      </div>
    </>
  );
}
