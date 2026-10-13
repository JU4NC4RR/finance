import { useEffect, useState } from "react";
import { UI } from "../assetTheme";

const emptyForm = () => ({ name: "", salary: "", note: "" });

const fromStrategy = (s) => ({
  name: s.name,
  salary: s.salary ?? "",
  note: s.note || "",
});

export default function StrategyForm({ editing, onCreate, onUpdate, onCancelEdit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(editing);

  useEffect(() => {
    setError(null);
    setForm(editing ? fromStrategy(editing) : emptyForm());
  }, [editing]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Ponle un nombre a la estrategia.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        // Sin sueldo es null, no 0: un 0 haria que todas las lineas
        // mostrasen 0,00 € como si el reparto no valiese nada.
        salary: form.salary ? parseFloat(form.salary) : null,
        currency: "EUR",
        note: form.note.trim() || null,
      };
      if (isEditing) {
        await onUpdate(editing.id, payload);
      } else {
        await onCreate(payload);
        setForm(emptyForm());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="field">
        <label htmlFor="estrategia">Nombre</label>
        <input
          id="estrategia"
          type="text"
          placeholder="Reparto actual, Plan agresivo…"
          value={form.name}
          onChange={update("name")}
        />
      </div>

      <div className="field">
        <label htmlFor="sueldo">Sueldo de referencia (€)</label>
        <input
          id="sueldo"
          type="number"
          step="0.01"
          min="0"
          placeholder="opcional"
          value={form.salary}
          onChange={update("salary")}
        />
      </div>

      <div className="field field-wide">
        <label htmlFor="nota-est">Nota</label>
        <input
          id="nota-est"
          type="text"
          placeholder="opcional"
          value={form.note}
          onChange={update("note")}
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
          {loading ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear estrategia"}
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
