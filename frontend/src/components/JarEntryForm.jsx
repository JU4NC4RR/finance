import { useEffect, useState } from "react";
import { UI } from "../assetTheme";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (jars) => ({
  jar_id: jars[0]?.id || "",
  kind: "income",
  amount: "",
  concept: "",
  occurred_on: today(),
  note: "",
});

const fromEntry = (entry) => ({
  jar_id: entry.jar_id,
  kind: entry.kind,
  amount: entry.amount ?? "",
  concept: entry.concept || "",
  occurred_on: entry.occurred_on,
  note: entry.note || "",
});

/** Alta y edicion de movimientos, con la hucha como primer campo. */
export default function JarEntryForm({ jars, editing, onCreate, onUpdate, onCancelEdit }) {
  const [form, setForm] = useState(() => emptyForm(jars));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(editing);

  useEffect(() => {
    setError(null);
    setForm(editing ? fromEntry(editing) : emptyForm(jars));
  }, [editing, jars]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.jar_id) {
      setError("Elige una hucha.");
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
        jar_id: form.jar_id,
        occurred_on: form.occurred_on,
        kind: form.kind,
        amount,
        concept: form.concept.trim() || null,
        note: form.note.trim() || null,
      };
      if (isEditing) {
        await onUpdate(editing.id, payload);
      } else {
        await onCreate(payload);
        // Se conservan hucha y tipo: lo habitual es encadenar varios apuntes.
        setForm((f) => ({ ...emptyForm(jars), jar_id: f.jar_id, kind: f.kind }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!jars.length) return null;

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
        <label htmlFor="jar">Hucha</label>
        <select id="jar" value={form.jar_id} onChange={update("jar_id")}>
          {jars.map((j) => (
            <option key={j.id} value={j.id}>{j.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="importe">Importe (€)</label>
        <input
          id="importe"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={form.amount}
          onChange={update("amount")}
        />
      </div>

      <div className="field">
        <label htmlFor="fecha">Fecha</label>
        <input id="fecha" type="date" value={form.occurred_on} onChange={update("occurred_on")} />
      </div>

      <div className="field">
        <label htmlFor="concepto">Concepto</label>
        <input
          id="concepto"
          type="text"
          placeholder="Repostaje, cine…"
          value={form.concept}
          onChange={update("concept")}
        />
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
