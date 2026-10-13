import { useEffect, useState } from "react";
import { JAR_COLORS, UI } from "../assetTheme";

const emptyForm = () => ({ name: "", bank: "", color: "sp500", initial_balance: "", note: "" });

const fromAccount = (a) => ({
  name: a.name,
  bank: a.bank || "",
  color: a.color,
  initial_balance: a.initial_balance ?? "",
  note: a.note || "",
});

export default function BankAccountForm({ editing, onCreate, onUpdate, onCancelEdit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(editing);

  useEffect(() => {
    setError(null);
    setForm(editing ? fromAccount(editing) : emptyForm());
  }, [editing]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Ponle un nombre a la cuenta.");
      return;
    }

    setLoading(true);
    try {
      await (isEditing ? onUpdate(editing.id, buildPayload(form)) : onCreate(buildPayload(form)));
      if (!isEditing) setForm(emptyForm());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="field">
        <label htmlFor="cuenta">Nombre</label>
        <input
          id="cuenta"
          type="text"
          placeholder="Cuenta nómina, Ahorro…"
          value={form.name}
          onChange={update("name")}
        />
      </div>

      <div className="field">
        <label htmlFor="banco">Banco</label>
        <input
          id="banco"
          type="text"
          placeholder="BBVA, Santander…"
          value={form.bank}
          onChange={update("bank")}
        />
      </div>

      <div className="field">
        <label htmlFor="saldo">Saldo inicial (€)</label>
        <input
          id="saldo"
          type="number"
          step="0.01"
          placeholder="0,00"
          value={form.initial_balance}
          onChange={update("initial_balance")}
        />
      </div>

      <div className="field field-wide">
        <label>Color</label>
        <div className="swatches">
          {JAR_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`swatch${form.color === c.key ? " active" : ""}`}
              style={{ "--seg": c.hex }}
              onClick={() => setForm((f) => ({ ...f, color: c.key }))}
              aria-label={c.label}
              aria-pressed={form.color === c.key}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="form-error">
          <span className="icon">{UI.alert}</span>
          <span>{error}</span>
        </div>
      )}

      <div className="form-actions">
        <button className="btn" type="submit" disabled={loading}>
          <span className="icon">{isEditing ? UI.pencil : UI.plus}</span>
          {loading ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear cuenta"}
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

function buildPayload(form) {
  return {
    name: form.name.trim(),
    bank: form.bank.trim() || null,
    color: form.color,
    initial_balance: form.initial_balance ? parseFloat(form.initial_balance) : 0,
    currency: "EUR",
    note: form.note.trim() || null,
  };
}
