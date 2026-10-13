import { useEffect, useState } from "react";
import { JAR_COLORS, UI } from "../assetTheme";
import { formatMoney } from "../format";

const emptyForm = (nextColor) => ({ name: "", percentage: "", color: nextColor });

const fromItem = (item) => ({
  name: item.name,
  percentage: item.percentage ?? "",
  color: item.color,
});

export default function StrategyItemForm({
  strategy, editing, remaining, nextColor, onCreate, onUpdate, onCancelEdit,
}) {
  const [form, setForm] = useState(() => emptyForm(nextColor));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(editing);

  useEffect(() => {
    setError(null);
    setForm(editing ? fromItem(editing) : emptyForm(nextColor));
  }, [editing, nextColor]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("La línea necesita un nombre.");
      return;
    }
    const pct = parseFloat(form.percentage);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      setError("El porcentaje debe estar entre 0 y 100.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        strategy_id: strategy.id,
        name: form.name.trim(),
        percentage: pct,
        color: form.color,
        note: null,
      };
      if (isEditing) {
        await onUpdate(editing.id, payload);
      } else {
        await onCreate(payload);
        setForm(emptyForm(nextColor));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pct = parseFloat(form.percentage);
  const salary = strategy.salary != null ? Number(strategy.salary) : null;
  const showAmount = salary != null && Number.isFinite(pct) && pct > 0;

  // Cuanto quedaria libre si se guardara esta linea tal como esta ahora.
  const after = Number.isFinite(pct) && pct > 0
    ? remaining - pct + (isEditing ? Number(editing.percentage) : 0)
    : null;

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="field">
        <label htmlFor="linea">Concepto</label>
        <input
          id="linea"
          type="text"
          placeholder="Ahorro, Vivienda, Ocio…"
          value={form.name}
          onChange={update("name")}
        />
      </div>

      <div className="field">
        <label htmlFor="pct">Porcentaje (%)</label>
        <input
          id="pct"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="0,00"
          value={form.percentage}
          onChange={update("percentage")}
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

      {/* El importe en euros es la razon de ser del reparto, asi que se ve
          antes de guardar y no despues. */}
      {(showAmount || after !== null) && (
        <div className="transfer-preview">
          <span className="icon">{UI.strategy}</span>
          <span>
            {showAmount && (
              <>
                <strong>{formatMoney((salary * pct) / 100, strategy.currency)}</strong>
                {" al mes · "}
              </>
            )}
            {after !== null && (
              after < -0.005 ? (
                <span className="is-expense">
                  te pasarías del 100 % en {Math.abs(after).toFixed(2).replace(".", ",")} puntos
                </span>
              ) : (
                <>quedaría <strong>{after.toFixed(2).replace(".", ",")} %</strong> sin asignar</>
              )
            )}
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
          {loading ? "Guardando…" : isEditing ? "Guardar cambios" : "Añadir línea"}
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
