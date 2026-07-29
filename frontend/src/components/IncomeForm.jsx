import { useEffect, useState } from "react";
import { UI } from "../assetTheme";

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

const emptyForm = (assetType, baseCurrency) => ({
  asset_type_id: assetType.id,
  occurred_on: today(),
  quantity: "",
  purity: "1.0",
  unit_cost: "",
  currency: baseCurrency,
  note: "",
  item_name: "",
  item_type: "lingote",
  asset_year: "",
  invoice_id: "",
  base_price: "",
  total_price: "",
  purchase_platform: "",
  piece_id: "",
  bill_type: "",
  reference_number: "",
  income_month: currentMonth(),
  tx_hash: "",
});

const formFromTransaction = (tx, baseCurrency) => ({
  asset_type_id: tx.asset_type_id,
  occurred_on: tx.occurred_on,
  quantity: tx.quantity ?? "",
  purity: tx.purity ?? "1.0",
  unit_cost: tx.unit_cost ?? "",
  currency: tx.currency || baseCurrency,
  note: tx.note || "",
  item_name: tx.item_name || "",
  item_type: tx.item_type || "lingote",
  asset_year: tx.asset_year ?? "",
  invoice_id: tx.invoice_id || "",
  base_price: tx.base_price ?? "",
  total_price: tx.total_price ?? "",
  purchase_platform: tx.purchase_platform || "",
  piece_id: tx.piece_id || "",
  bill_type: tx.bill_type || "",
  reference_number: tx.reference_number || "",
  income_month: tx.income_month || currentMonth(),
  tx_hash: tx.tx_hash || "",
});

export default function IncomeForm({ assetType, editingTransaction, onCreated, onUpdated, onCancelEdit, baseCurrency }) {
  const [form, setForm] = useState(() => emptyForm(assetType, baseCurrency));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(editingTransaction);

  useEffect(() => {
    setError(null);
    setForm(editingTransaction ? formFromTransaction(editingTransaction, baseCurrency) : emptyForm(assetType, baseCurrency));
  }, [editingTransaction, assetType, baseCurrency]);

  const category = assetType.category;
  const isMetal = category === "metal";
  const isCash = category === "cash";
  const isInvestment = category === "investment";
  const isSavings = category === "savings";
  const isLingote = form.item_type === "lingote";

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.quantity) {
      setError(
        isMetal ? "Indica el peso del activo."
          : isInvestment ? "Indica el valor de la posición."
            : "Indica el importe."
      );
      return;
    }
    if (isCash && !String(form.reference_number).trim()) {
      setError("Los ingresos en efectivo requieren una referencia.");
      return;
    }
    if (isCash && !form.income_month) {
      setError("Indica el mes del ingreso.");
      return;
    }
    if ((isMetal || isInvestment || isSavings) && !form.occurred_on) {
      setError(
        isSavings ? "Indica la fecha del ingreso."
          : isInvestment ? "Indica la fecha de la valoración."
            : "Indica la fecha de compra."
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        asset_type_id: assetType.id,
        occurred_on: isCash ? `${form.income_month}-01` : form.occurred_on,
        quantity: parseFloat(form.quantity),
        purity: isMetal ? parseFloat(form.purity || "1.0") : 1.0,
        unit_cost: null,
        currency: form.currency || baseCurrency,
        note: form.note || null,
        item_name: isMetal ? form.item_name || null : null,
        item_type: isMetal ? form.item_type : null,
        asset_year: isMetal && form.asset_year ? parseInt(form.asset_year, 10) : null,
        invoice_id: isMetal ? form.invoice_id || null : null,
        base_price: isMetal && form.base_price ? parseFloat(form.base_price) : null,
        total_price: isMetal && form.total_price ? parseFloat(form.total_price) : null,
        purchase_platform: isMetal ? form.purchase_platform || null : null,
        piece_id: isMetal && isLingote ? form.piece_id || null : null,
        bill_type: isCash ? form.bill_type || null : null,
        reference_number: isCash ? form.reference_number || null : null,
        income_month: isCash ? form.income_month : null,
        tx_hash: isSavings ? form.tx_hash || null : null,
      };
      if (isEditing) {
        await onUpdated(editingTransaction.id, payload);
      } else {
        await onCreated(payload);
        setForm(emptyForm(assetType, baseCurrency));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      {isMetal && (
        <>
          <div className="field">
            <label>Nombre</label>
            <input type="text" placeholder="Moneda 1oz 2024..." value={form.item_name} onChange={update("item_name")} />
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={form.item_type} onChange={update("item_type")}>
              <option value="lingote">Lingote</option>
              <option value="moneda">Moneda</option>
            </select>
          </div>
          <div className="field">
            <label>Peso (g)</label>
            <input type="number" step="0.0001" min="0" placeholder="0.00" value={form.quantity} onChange={update("quantity")} />
          </div>
          <div className="field">
            <label>Pureza</label>
            <input type="number" step="0.0001" min="0" max="1" value={form.purity} onChange={update("purity")} />
          </div>
          <div className="field">
            <label>Año del activo</label>
            <input type="number" step="1" min="0" placeholder="2024" value={form.asset_year} onChange={update("asset_year")} />
          </div>
          <div className="field">
            <label>ID factura</label>
            <input type="text" placeholder="opcional" value={form.invoice_id} onChange={update("invoice_id")} />
          </div>
          <div className="field">
            <label>Fecha de compra</label>
            <input type="date" value={form.occurred_on} onChange={update("occurred_on")} />
          </div>
          <div className="field">
            <label>Precio base ({form.currency})</label>
            <input type="number" step="0.01" min="0" placeholder="opcional" value={form.base_price} onChange={update("base_price")} />
          </div>
          <div className="field">
            <label>Precio total ({form.currency})</label>
            <input type="number" step="0.01" min="0" placeholder="opcional" value={form.total_price} onChange={update("total_price")} />
          </div>
          <div className="field">
            <label>Plataforma de compra</label>
            <input type="text" placeholder="opcional" value={form.purchase_platform} onChange={update("purchase_platform")} />
          </div>
          {isLingote && (
            <div className="field">
              <label>ID del lingote</label>
              <input type="text" placeholder="opcional" value={form.piece_id} onChange={update("piece_id")} />
            </div>
          )}
        </>
      )}

      {isCash && (
        <>
          <div className="field">
            <label>Tipo de billete</label>
            <input type="text" placeholder="20€, 50€..." value={form.bill_type} onChange={update("bill_type")} />
          </div>
          <div className="field">
            <label>Importe ({form.currency})</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.quantity} onChange={update("quantity")} />
          </div>
          <div className="field">
            <label>Referencia *</label>
            <input type="text" placeholder="obligatorio" value={form.reference_number} onChange={update("reference_number")} />
          </div>
          <div className="field">
            <label>Mes del ingreso</label>
            <input type="month" value={form.income_month} onChange={update("income_month")} />
          </div>
        </>
      )}

      {/* Las inversiones no se registran por participaciones: se anota cuanto
          vale la posicion en una fecha, y la ultima lectura es su valor. */}
      {isInvestment && (
        <>
          <div className="field">
            <label>Fecha de la valoración</label>
            <input type="date" value={form.occurred_on} onChange={update("occurred_on")} />
          </div>
          <div className="field">
            <label>Valor de la posición ({form.currency})</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.quantity} onChange={update("quantity")} />
          </div>
        </>
      )}

      {isSavings && (
        <>
          <div className="field">
            <label>Importe ({form.currency})</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.quantity} onChange={update("quantity")} />
          </div>
          <div className="field">
            <label>Fecha del ingreso</label>
            <input type="date" value={form.occurred_on} onChange={update("occurred_on")} />
          </div>
          <div className="field">
            <label>Hash de la transferencia</label>
            <input type="text" placeholder="opcional" value={form.tx_hash} onChange={update("tx_hash")} />
          </div>
        </>
      )}

      {error && (
        <div className="form-error">
          <span className="icon">{UI.alert}</span>
          <span>{error}</span>
        </div>
      )}

      <div className="field field-wide">
        <label>Nota</label>
        <input type="text" placeholder="opcional" value={form.note} onChange={update("note")} />
      </div>

      <div className="form-actions">
        <button className="btn" type="submit" disabled={loading}>
          <span className="icon">{isEditing ? UI.pencil : UI.plus}</span>
          {loading
            ? "Guardando…"
            : isEditing
              ? "Guardar cambios"
              : isInvestment ? "Registrar valoración" : "Registrar movimiento"}
        </button>
        {isEditing && (
          <button className="btn btn-ghost" type="button" onClick={onCancelEdit} disabled={loading}>
            <span className="icon">{UI.x}</span>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
