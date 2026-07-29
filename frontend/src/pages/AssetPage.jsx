import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { api } from "../api";
import { accentFor, iconFor } from "../assetTheme";
import { formatMoney, formatQty, formatPercent, formatDate, costOf } from "../format";
import IncomeForm from "../components/IncomeForm";
import TransactionsTable, { columnsForCategory } from "../components/TransactionsTable";
import ExportButton from "../components/ExportButton";
import ImportButton from "../components/ImportButton";
import { CostVsValueChart, ValuationChart } from "../components/AssetCharts";
import { Topbar, Banner, Panel, StatTile, Delta } from "../components/ui";

export default function AssetPage({
  assetTypes, transactions, summary, error,
  onCreated, onUpdated, onDelete, onDataChanged,
}) {
  const { code } = useParams();
  const assetType = assetTypes.find((a) => a.code === code);
  const [editingTransaction, setEditingTransaction] = useState(null);

  useEffect(() => {
    setEditingTransaction(null);
  }, [code]);

  if (!assetType) {
    return <Navigate to="/" replace />;
  }

  const assetTransactions = transactions.filter((tx) => tx.asset_type.code === code);
  const assetSummary = summary?.assets.find((a) => a.asset_type.code === code);
  const baseCurrency = summary?.base_currency || "EUR";
  const accent = accentFor(code);

  const category = assetType.category;
  const isMetal = category === "metal";
  const isInvestment = category === "investment";

  const total = Number(summary?.total_value_base_ccy) || 0;
  const value = Number(assetSummary?.current_value_base_ccy) || 0;
  const share = total > 0 ? (value / total) * 100 : 0;
  const invested = assetTransactions.reduce((sum, tx) => sum + costOf(tx), 0);
  const gain = invested > 0 ? value - invested : null;
  const gainPct = invested > 0 ? (gain / invested) * 100 : null;

  // Inversiones: la primera y la ultima lectura anotadas.
  const byDate = [...assetTransactions].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
  const firstReading = byDate[0];
  const lastReading = byDate[byDate.length - 1];
  const drift =
    isInvestment && firstReading && lastReading && Number(firstReading.quantity) > 0
      ? ((Number(lastReading.quantity) - Number(firstReading.quantity)) / Number(firstReading.quantity)) * 100
      : null;

  const handleUpdate = async (id, payload) => {
    await onUpdated(id, payload);
    setEditingTransaction(null);
  };

  const handleDelete = async (id) => {
    if (editingTransaction?.id === id) setEditingTransaction(null);
    await onDelete(id);
  };

  return (
    <>
      <Topbar eyebrow="Activo" title={assetType.name} icon={iconFor(code)} accent={accent}>
        <ExportButton
          onExport={() => api.exportAsset(assetType.id, assetType.name)}
          label="Exportar"
        />
        <ImportButton
          onImport={(file) => api.importAsset(assetType.id, file)}
          onDone={onDataChanged}
          label="Importar"
        />
      </Topbar>

      <div className="content">
        {error && <Banner>{error}</Banner>}

        <div className="stat-row">
          <StatTile
            label="Valor actual"
            value={assetSummary ? formatMoney(value, baseCurrency) : "—"}
            foot={isInvestment ? "Tu última lectura" : "A precio de mercado"}
          />

          {isInvestment ? (
            <>
              <StatTile
                label="Última valoración"
                value={lastReading ? formatDate(lastReading.occurred_on) : "—"}
                foot={`${assetTransactions.length} lecturas registradas`}
              />
              <StatTile
                label="Desde la primera lectura"
                value={
                  drift !== null && firstReading
                    ? formatMoney(Number(lastReading.quantity) - Number(firstReading.quantity), baseCurrency)
                    : "—"
                }
                badge={drift !== null ? <Delta value={drift} /> : null}
                foot={firstReading ? `Desde ${formatDate(firstReading.occurred_on)}` : "Aún sin histórico"}
              />
              <StatTile
                label="Peso en cartera"
                value={formatPercent(share)}
                foot="Sobre el patrimonio total"
              />
            </>
          ) : (
            <>
              <StatTile
                label="Coste aportado"
                value={invested > 0 ? formatMoney(invested, baseCurrency) : "—"}
                foot={
                  invested > 0
                    ? `${assetTransactions.length} movimientos`
                    : "Sin precios de compra registrados"
                }
              />
              <StatTile
                label="Resultado"
                value={gain !== null ? formatMoney(gain, baseCurrency) : "—"}
                badge={gainPct !== null ? <Delta value={gainPct} /> : null}
                foot={gain !== null ? "Frente a lo pagado" : "Requiere precio de compra"}
              />
              <StatTile
                label="Posición"
                value={assetSummary ? formatQty(assetSummary.total_quantity, assetType.unit) : "—"}
                foot={isMetal ? "Peso fino, con pureza" : `${formatPercent(share)} de la cartera`}
              />
            </>
          )}
        </div>

        {isMetal && (
          <Panel
            title="Coste pagado frente a valor actual"
            sub="Acumulado por fecha de compra · valorado al precio spot de hoy"
          >
            <CostVsValueChart
              transactions={assetTransactions}
              spotPerGram={
                assetSummary?.current_unit_price_base_ccy != null
                  ? Number(assetSummary.current_unit_price_base_ccy)
                  : null
              }
              currency={baseCurrency}
              accent={accent}
            />
          </Panel>
        )}

        {isInvestment && (
          <Panel title="Evolución de la posición" sub="Según las valoraciones que has anotado">
            <ValuationChart
              transactions={assetTransactions}
              currency={baseCurrency}
              accent={accent}
            />
          </Panel>
        )}

        <Panel
          title={
            editingTransaction
              ? isInvestment ? "Editar valoración" : "Editar movimiento"
              : isInvestment ? "Nueva valoración" : "Nuevo movimiento"
          }
          sub={
            isInvestment
              ? "Anota cuánto vale hoy tu posición; la última lectura es su valor"
              : assetType.name
          }
        >
          <IncomeForm
            assetType={assetType}
            editingTransaction={editingTransaction}
            onCreated={onCreated}
            onUpdated={handleUpdate}
            onCancelEdit={() => setEditingTransaction(null)}
            baseCurrency={baseCurrency}
          />
        </Panel>

        <Panel
          title={isInvestment ? "Valoraciones" : "Movimientos"}
          sub={`${assetTransactions.length} registro${assetTransactions.length === 1 ? "" : "s"}`}
          flush
        >
          <TransactionsTable
            transactions={assetTransactions}
            onEdit={setEditingTransaction}
            onDelete={handleDelete}
            columns={columnsForCategory(category)}
          />
        </Panel>
      </div>
    </>
  );
}
