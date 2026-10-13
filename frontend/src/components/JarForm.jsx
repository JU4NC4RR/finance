import { useEffect, useState } from "react";
import { JAR_COLORS, UI } from "../assetTheme";

const emptyForm = () => ({ name: "", color: "cash", target_amount: "", note: "" });

const fromJar = (jar) => ({
  name: jar.name,
  color: jar.color,
  target_amount: jar.target_amount ?? "",
  note: jar.note || "",
});

export default function JarForm({ editing, onCreate, onUpdate, onCancelEdit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(editing);

  useEffect(() => {
    setError(null);
    setForm(editing ? fromJar(editing) : emptyForm());
  }, [editing]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Ponle un nombre a la hucha.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color,
        // Sin meta es null, no 0: un 0 pintaria una barra de progreso falsa.
        target_amount: form.target_amount ? parseFloat(form.target_amount) : null,
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
        <label htmlFor="nombre">Nombre</label>
        <input
          id="nombre"
          type="text"
          placeholder="Gasolina, Ocio, Imprevistos…"
          value={form.name}
          onChange={update("name")}
        />
      </div>

      <div className="field">
        <label htmlFor="meta">Objetivo (€)</label>
        <input
          id="meta"
          type="number"
          step="0.01"
          min="0"
          placeholder="opcional"
          value={form.target_amount}
          onChange={update("target_amount")}
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
          {loading ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear hucha"}
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
