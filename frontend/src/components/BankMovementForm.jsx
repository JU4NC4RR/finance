import { useEffect, useState } from "react";
import { UI } from "../assetTheme";
import { formatMoney } from "../format";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (accounts) => ({
  account_id: accounts[0]?.id || "",
  kind: "expense",
  amount: "",
  concept: "",
  occurred_on: today(),
  jar_id: "",
});

const fromMovement = (m) => ({
  account_id: m.account_id,
  kind: m.kind,
  amount: m.amount ?? "",
  concept: m.concept || "",
  occurred_on: m.occurred_on,
  jar_id: m.jar_id || "",
});

export default function BankMovementForm({ accounts, jars, editing, onCreate, onUpdate, onCancelEdit }) {
  const [form, setForm] = useState(() => emptyForm(accounts));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(editing);

  useEffect(() => {
    setError(null);
    setForm(editing ? fromMovement(editing) : emptyForm(accounts));
  }, [editing, accounts]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.account_id) {
      setError("Elige una cuenta.");
      return;
    }
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El importe debe ser mayor que cero.");
      return;
    }
    if (!form.occurred_on) {
      setError("Indica la fecha.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        account_id: form.account_id,
        occurred_on: form.occurred_on,
        kind: form.kind,
        amount,
        concept: form.concept.trim() || null,
        note: null,
        jar_id: form.jar_id || null,
      };
      if (isEditing) {
        await onUpdate(editing.id, payload);
      } else {
        await onCreate(payload);
        setForm((f) => ({ ...emptyForm(accounts), account_id: f.account_id, kind: f.kind }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!accounts.length) return null;

  const jar = jars.find((j) => j.id === form.jar_id);
  const amount = parseFloat(form.amount);
  const showPreview = jar && Number.isFinite(amount) && amount > 0;
  const account = accounts.find((a) => a.id === form.account_id);
  const outgoing = form.kind === "expense";

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="field field-kind">
        <label>Tipo</label>
        <div className="kind-toggle" role="group">
          <button
            type="button"
            className={`kind-btn is-income${form.kind === "income" ? " active" : ""}`}
            onClick={() => setForm((f) => ({ ...f, kind: "income" }))}
            aria-pressed={form.kind === "income"}
          >
            <span className="icon">{UI.arrowDown}</span>Ingreso
          </button>
          <button
            type="button"
            className={`kind-btn is-expense${form.kind === "expense" ? " active" : ""}`}
            onClick={() => setForm((f) => ({ ...f, kind: "expense" }))}
            aria-pressed={form.kind === "expense"}
          >
            <span className="icon">{UI.arrowUp}</span>Gasto
          </button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="cta">Cuenta</label>
        <select id="cta" value={form.account_id} onChange={update("account_id")}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.bank ? `${a.name} · ${a.bank}` : a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="imp">Importe (€)</label>
        <input
          id="imp"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={form.amount}
          onChange={update("amount")}
        />
      </div>

      <div className="field">
        <label htmlFor="fch">Fecha</label>
        <input id="fch" type="date" value={form.occurred_on} onChange={update("occurred_on")} />
      </div>

      <div className="field">
        <label htmlFor="cpt">Concepto</label>
        <input
          id="cpt"
          type="text"
          placeholder="Nómina, compra…"
          value={form.concept}
          onChange={update("concept")}
        />
      </div>

      <div className="field">
        <label htmlFor="hch">Hucha destino</label>
        <select id="hch" value={form.jar_id} onChange={update("jar_id")} disabled={!jars.length}>
          <option value="">Sin hucha (solo la cuenta)</option>
          {jars.map((j) => (
            <option key={j.id} value={j.id}>{j.name}</option>
          ))}
        </select>
      </div>

      {/* Un traspaso toca dos saldos a la vez, asi que se enseña el efecto
          exacto antes de guardarlo en lugar de dejarlo a la imaginacion. */}
      {showPreview && (
        <div className="transfer-preview">
          <span className="icon">{UI.transfer}</span>
          <span>
            <strong>{account?.name}</strong>{" "}
            <span className={outgoing ? "is-expense" : "is-income"}>
              {outgoing ? "−" : "+"}{formatMoney(amount, "EUR")}
            </span>
            {"  →  "}
            <strong>{jar.name}</strong>{" "}
            <span className={outgoing ? "is-income" : "is-expense"}>
              {outgoing ? "+" : "−"}{formatMoney(amount, "EUR")}
            </span>
          </span>
        </div>
      )}

      {error && (
        <div className="form-error">
          <span className="icon">{UI.alert}</span>
          <span>{error}</span>
        </div>
      )}

      <div className="form-actions">
        <button className="btn" type="submit" disabled={loading}>
          <span className="icon">{isEditing ? UI.pencil : UI.plus}</span>
          {loading ? "Guardando…" : isEditing ? "Guardar cambios" : "Registrar movimiento"}
        </button>
        {isEditing && (
          <button className="btn btn-ghost" type="button" onClick={onCancelEdit} disabled={loading}>
            <span className="icon">{UI.x}</span>Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
