import { useRef, useState } from "react";
import { UI } from "../assetTheme";

export default function ImportButton({ onImport, onDone, label = "Restaurar" }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const summary = await onImport(file);
      setResult(summary);
      await onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        style={{ display: "none" }}
        onChange={handleChange}
      />
      <button
        className="btn btn-ghost"
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        <span className="icon">{UI.upload}</span>
        <span className="btn-label">{loading ? "Importando…" : label}</span>
      </button>

      {error && <div className="form-note" style={{ color: "#e8918d" }}>{error}</div>}

      {result && (
        <div className="form-note">
          {result.created} creados, {result.updated} actualizados
          {result.skipped > 0 && `, ${result.skipped} omitidos`}
          {result.unmatched_sheets?.length > 0 && ` · hojas sin activo: ${result.unmatched_sheets.join(", ")}`}
          {result.errors?.length > 0 && ` · ${result.errors.length} avisos`}
        </div>
      )}
    </div>
  );
}
