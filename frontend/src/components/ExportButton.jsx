import { useState } from "react";
import { UI } from "../assetTheme";

export default function ExportButton({ onExport, label = "Exportar" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await onExport();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className="btn btn-ghost" type="button" onClick={handleClick} disabled={loading}>
        <span className="icon">{UI.download}</span>
        <span className="btn-label">{loading ? "Generando…" : label}</span>
      </button>
      {error && <div className="form-note" style={{ color: "#e8918d" }}>{error}</div>}
    </div>
  );
}
