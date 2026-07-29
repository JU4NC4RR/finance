import { UI } from "../assetTheme";
import { formatMoney, formatQty, formatDate } from "../format";
import { EmptyState } from "./ui";

const dash = (v) => (v == null || v === "" ? <span className="muted">—</span> : v);
const num = (v, digits) => (v != null ? Number(v).toFixed(digits) : null);

const METAL_COLUMNS = [
  { key: "occurred_on", label: "Fecha compra", render: (tx) => formatDate(tx.occurred_on) },
  { key: "item_name", label: "Nombre", render: (tx) => dash(tx.item_name) },
  { key: "item_type", label: "Tipo", render: (tx) => dash(tx.item_type === "lingote" ? "Lingote" : tx.item_type === "moneda" ? "Moneda" : null) },
  { key: "quantity", label: "Peso", num: true, render: (tx) => formatQty(Number(tx.quantity), "g") },
  { key: "asset_year", label: "Año", num: true, render: (tx) => dash(tx.asset_year) },
  { key: "invoice_id", label: "ID factura", render: (tx) => dash(tx.invoice_id) },
  { key: "base_price", label: "Precio base", num: true, render: (tx) => dash(num(tx.base_price, 2)) },
  { key: "total_price", label: "Precio total", num: true, render: (tx) => dash(num(tx.total_price, 2)) },
  { key: "purchase_platform", label: "Plataforma", render: (tx) => dash(tx.purchase_platform) },
  { key: "piece_id", label: "ID lingote", render: (tx) => dash(tx.piece_id) },
];

const CASH_COLUMNS = [
  { key: "income_month", label: "Mes", render: (tx) => dash(tx.income_month) },
  { key: "bill_type", label: "Tipo de billete", render: (tx) => dash(tx.bill_type) },
  { key: "quantity", label: "Importe", num: true, render: (tx) => formatMoney(Number(tx.quantity), tx.currency) },
  { key: "reference_number", label: "Referencia", render: (tx) => dash(tx.reference_number) },
];

const INVESTMENT_COLUMNS = [
  { key: "occurred_on", label: "Fecha de valoración", render: (tx) => formatDate(tx.occurred_on) },
  { key: "quantity", label: "Valor de la posición", num: true, render: (tx) => formatMoney(Number(tx.quantity), tx.currency) },
];

const SAVINGS_COLUMNS = [
  { key: "occurred_on", label: "Fecha", render: (tx) => formatDate(tx.occurred_on) },
  { key: "quantity", label: "Importe", num: true, render: (tx) => formatMoney(Number(tx.quantity), tx.currency) },
  { key: "tx_hash", label: "Hash", render: (tx) => dash(tx.tx_hash) },
];

const DEFAULT_COLUMNS = [
  { key: "occurred_on", label: "Fecha", render: (tx) => formatDate(tx.occurred_on) },
  { key: "quantity", label: "Cantidad", num: true, render: (tx) => formatQty(Number(tx.quantity), tx.asset_type.unit) },
];

export function columnsForCategory(category) {
  if (category === "metal") return METAL_COLUMNS;
  if (category === "cash") return CASH_COLUMNS;
  if (category === "investment") return INVESTMENT_COLUMNS;
  if (category === "savings") return SAVINGS_COLUMNS;
  return DEFAULT_COLUMNS;
}

export default function TransactionsTable({ transactions, onEdit, onDelete, columns, showAsset = false }) {
  if (!transactions.length) {
    return (
      <EmptyState
        title="Todavía no hay movimientos"
        hint="Registra el primero con el formulario de arriba y aparecerá aquí."
      />
    );
  }

  const cols = columns || DEFAULT_COLUMNS;

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {showAsset && <th>Activo</th>}
            {cols.map((c) => (
              <th key={c.key} className={c.num ? "num" : undefined}>{c.label}</th>
            ))}
            <th>Nota</th>
            <th className="num">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              {showAsset && <td><span className="tag">{tx.asset_type.name}</span></td>}
              {cols.map((c) => (
                <td key={c.key} className={c.num ? "num" : undefined}>
                  {c.render ? c.render(tx) : dash(tx[c.key])}
                </td>
              ))}
              <td>{dash(tx.note)}</td>
              <td>
                <div className="row-actions">
                  {onEdit && (
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => onEdit(tx)}
                      title="Editar movimiento"
                      aria-label="Editar movimiento"
                    >
                      <span className="icon">{UI.pencil}</span>
                    </button>
                  )}
                  <button
                    className="icon-btn is-danger"
                    type="button"
                    onClick={() => onDelete(tx.id)}
                    title="Eliminar movimiento"
                    aria-label="Eliminar movimiento"
                  >
                    <span className="icon">{UI.trash}</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
