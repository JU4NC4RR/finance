import { useMemo, useState } from "react";
import { UI, accentFor } from "../assetTheme";
import { formatMoney, formatDate, pricedTotals } from "../format";
import SummaryCards from "../components/SummaryCards";
import TransactionsTable from "../components/TransactionsTable";
import NewAssetForm from "../components/NewAssetForm";
import { Topbar, Banner, Panel, StatTile, Delta, EmptyState } from "../components/ui";

export default function AssetsPage({
  summary, transactions, error, onDelete, onCreateAsset, onUpdateAsset, onDeleteAsset,
}) {
  const [filterCode, setFilterCode] = useState("");
  const [editingAsset, setEditingAsset] = useState(null);

  const priced = useMemo(() => pricedTotals(summary, transactions), [summary, transactions]);

  const lastMovement = useMemo(() => {
    if (!transactions.length) return null;
    return transactions.reduce(
      (latest, tx) => (tx.occurred_on > latest ? tx.occurred_on : latest),
      transactions[0].occurred_on,
    );
  }, [transactions]);

  if (!summary) {
    return (
      <>
        <Topbar eyebrow="Bóveda" title="Activos" icon={UI.wallet} />
        <div className="content">
          {error && <Banner>{error}</Banner>}
          <EmptyState title="Sin datos" hint="No se ha podido cargar el resumen de activos." />
        </div>
      </>
    );
  }

  const baseCurrency = summary.base_currency || "EUR";
  const total = Number(summary.total_value_base_ccy) || 0;
  const assets = summary.assets || [];

  const visible = filterCode
    ? transactions.filter((tx) => tx.asset_type.code === filterCode)
    : transactions;

  const handleDeleteAsset = async (assetType, movements) => {
    const extra = movements
      ? `\n\nSe borrarán también sus ${movements} movimiento${movements === 1 ? "" : "s"}.`
      : "";
    if (!window.confirm(`¿Eliminar el activo "${assetType.name}"?${extra}`)) return;
    if (editingAsset?.id === assetType.id) setEditingAsset(null);
    await onDeleteAsset(assetType.id);
  };

  const handleUpdateAsset = async (id, payload) => {
    await onUpdateAsset(id, payload);
    setEditingAsset(null);
  };

  return (
    <>
      <Topbar eyebrow="Bóveda" title="Activos" icon={UI.wallet} />

      <div className="content">
        {error && <Banner>{error}</Banner>}

        <div className="stat-row">
          <StatTile
            label="Valor actual"
            value={formatMoney(total, baseCurrency)}
            foot="A precio de mercado"
          />
          <StatTile
            label="Coste aportado"
            value={priced ? formatMoney(priced.cost, baseCurrency) : "—"}
            foot={
              priced
                ? `${priced.count} de ${assets.length} activos con precio de compra`
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
            label="Último movimiento"
            value={lastMovement ? formatDate(lastMovement) : "—"}
            foot={`${transactions.length} registrados en total`}
          />
        </div>

        <div className="section-head">
          <h2 className="section-title">Tus activos</h2>
          <span className="section-hint">Pulsa para ver el detalle</span>
        </div>

        {assets.length ? (
          <SummaryCards assets={assets} baseCurrency={baseCurrency} total={total} />
        ) : (
          <EmptyState title="Sin activos" hint="El catálogo de activos está vacío." />
        )}

        <Panel
          title="Gestionar activos"
          sub="Edita el nombre o el ticker, y elimina los que ya no uses"
          flush
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Tipo</th>
                  <th className="num">Movimientos</th>
                  <th className="num">Valor</th>
                  <th className="num">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => {
                  const at = a.asset_type;
                  const movs = transactions.filter((tx) => tx.asset_type.code === at.code).length;
                  return (
                    <tr key={at.id}>
                      <td>
                        <span className="tag" style={{ "--seg": accentFor(at.code) }}>
                          <span className="dot" />
                          {at.name}
                        </span>
                      </td>
                      <td>
                        {at.market_symbol ? (
                          <span className="from-bank">
                            <span className="icon">{UI.trendUp}</span>
                            <code>{at.market_symbol}</code>
                          </span>
                        ) : (
                          <span className="muted">Manual</span>
                        )}
                      </td>
                      <td className="num">{movs}</td>
                      <td className="num">
                        {formatMoney(Number(a.current_value_base_ccy) || 0, baseCurrency)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Editar activo"
                            onClick={() => setEditingAsset(at)}
                          >
                            {UI.pencil}
                          </button>
                          <button
                            type="button"
                            className="icon-btn is-danger"
                            title="Eliminar activo"
                            onClick={() => handleDeleteAsset(at, movs)}
                          >
                            {UI.trash}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title={editingAsset ? "Editar activo" : "Nuevo activo"}
          sub={
            editingAsset
              ? editingAsset.name
              : "Cotizado si tiene ticker, manual si el importe lo pones tú"
          }
        >
          <NewAssetForm
            editing={editingAsset}
            onCreate={onCreateAsset}
            onUpdate={handleUpdateAsset}
            onCancelEdit={() => setEditingAsset(null)}
          />
        </Panel>

        {/* Vista transversal que no existia en ningun sitio: hasta ahora habia
            que entrar activo por activo para ver los movimientos. */}
        <Panel
          title="Movimientos"
          sub={`${visible.length} registro${visible.length === 1 ? "" : "s"} · todos los activos`}
          flush
          action={
            assets.length > 0 && (
              <select
                className="panel-filter"
                value={filterCode}
                onChange={(e) => setFilterCode(e.target.value)}
                aria-label="Filtrar por activo"
              >
                <option value="">Todos los activos</option>
                {assets.map((a) => (
                  <option key={a.asset_type.id} value={a.asset_type.code}>
                    {a.asset_type.name}
                  </option>
                ))}
              </select>
            )
          }
        >
          {/* Sin onEdit: cada categoria tiene su propio formulario, asi que
              editar se hace en la pagina del activo. */}
          <TransactionsTable
            transactions={visible}
            onDelete={onDelete}
            showAsset
          />
        </Panel>
      </div>
    </>
  );
}
