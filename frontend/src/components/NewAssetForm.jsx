import { useEffect, useState } from "react";
import { api } from "../api";
import { UI } from "../assetTheme";

/** Genera un código a partir del nombre: "MSCI World" -> "MSCI_WORLD". */
function codeFrom(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // quita las tildes ya separadas por NFD
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

const money = (value, currency) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency, useGrouping: "always" })
    .format(value);

/**
 * Alta y edición de un activo.
 *
 * Dos tipos, que es lo que decide cómo se valora:
 *   - Cotizado: lleva ticker, y vale cantidad x cotización en vivo.
 *   - Manual:   vale la suma de lo que apuntes, como el efectivo o los ahorros.
 *
 * Para los cotizados se busca por ISIN, nombre o ticker y se elige entre las
 * cotizaciones encontradas: un mismo fondo cotiza en varias bolsas y a distinto
 * precio, así que la elección la hace el usuario, no el programa.
 */
export default function NewAssetForm({ editing, onCreate, onUpdate, onCancelEdit }) {
  const isEditing = Boolean(editing);

  const [quoted, setQuoted] = useState(true);
  const [manualKind, setManualKind] = useState("other");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [name, setName] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setQuery(""); setResults([]); setChosen(null); setName(""); setError(null);
  };

  useEffect(() => {
    setError(null);
    setResults([]);
    setQuery("");
    if (editing) {
      const symbol = editing.market_symbol;
      setQuoted(Boolean(symbol));
      setName(editing.name);
      // Al editar ya hay un ticker válido: se da por elegido para no obligar
      // a buscarlo otra vez solo porque se quiera corregir el nombre.
      setChosen(symbol ? { symbol, name: editing.name, price: null, currency: "EUR" } : null);
    } else {
      setQuoted(true);
      setManualKind("other");
      setName("");
      setChosen(null);
    }
  }, [editing]);

  const search = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setError("Escribe al menos 2 caracteres.");
      return;
    }
    setSearching(true);
    setError(null);
    setResults([]);
    setChosen(null);
    try {
      const found = await api.searchAssets(q);
      setResults(found);
      if (found.length === 1) pick(found[0]);   // con uno solo no hay que elegir
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const pick = (quote) => {
    setChosen(quote);
    setName((current) => current.trim() || quote.name);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (quoted && !chosen) {
      setError("Busca el valor y elige una cotización.");
      return;
    }
    if (!name.trim()) {
      setError("Ponle un nombre al activo.");
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await onUpdate(editing.id, {
          name: name.trim(),
          market_symbol: quoted ? chosen.symbol : null,
        });
      } else {
        await onCreate({
          code: codeFrom(name),
          name: name.trim(),
          // La categoría es consecuencia del tipo: "other" cae en la rama que
          // suma los movimientos, igual que efectivo y ahorros.
          category: quoted ? "investment" : manualKind,
          unit: quoted ? "participaciones" : "unit",
          market_symbol: quoted ? chosen.symbol : null,
          currency: quoted ? null : "EUR",
        });
        reset();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="field field-kind">
        <label>Tipo de activo</label>
        <div className="kind-toggle" role="group">
          <button
            type="button"
            className={`kind-btn${quoted ? " active" : ""}`}
            onClick={() => { setQuoted(true); setError(null); }}
            aria-pressed={quoted}
          >
            <span className="icon">{UI.trendUp}</span>Cotizado
          </button>
          <button
            type="button"
            className={`kind-btn${!quoted ? " active" : ""}`}
            onClick={() => { setQuoted(false); setError(null); }}
            aria-pressed={!quoted}
          >
            <span className="icon">{UI.pencil}</span>Manual
          </button>
        </div>
        <span className="field-hint">
          {quoted
            ? "Lleva ticker: el valor sale de multiplicar tus participaciones por la cotización en vivo."
            : "Lo pones tú: el valor es la suma de lo que apuntes, como en efectivo o ahorros."}
        </span>
      </div>

      {quoted && (
        <div className="field field-wide">
          <label htmlFor="buscar">ISIN, nombre o ticker</label>
          <div className="input-with-action">
            <input
              id="buscar"
              type="text"
              placeholder="IE00BYX5MX67, SPY, iShares Core MSCI World…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter busca en lugar de enviar: aún no hay nada que guardar.
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
            />
            <button type="button" className="btn btn-ghost" onClick={search} disabled={searching}>
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </div>
          {isEditing && chosen && !results.length && (
            <span className="field-hint">
              Ticker actual: <code>{chosen.symbol}</code>. Busca otro solo si quieres cambiarlo.
            </span>
          )}
        </div>
      )}

      {quoted && results.length > 0 && (
        <div className="field field-wide">
          <label>
            {results.length === 1
              ? "Cotización encontrada"
              : `${results.length} cotizaciones · elige una`}
          </label>
          <div className="quote-list">
            {results.map((q) => (
              <button
                key={q.symbol}
                type="button"
                className={`quote-option${chosen?.symbol === q.symbol ? " active" : ""}`}
                onClick={() => pick(q)}
                aria-pressed={chosen?.symbol === q.symbol}
              >
                <span className="quote-symbol">{q.symbol}</span>
                <span className="quote-name">{q.name}</span>
                {q.exchange && <span className="quote-exchange">{q.exchange}</span>}
                <span className="quote-price">{money(q.price, q.currency)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(!quoted || chosen) && (
        <div className="field">
          <label htmlFor="nombre-activo">Nombre del activo</label>
          <input
            id="nombre-activo"
            type="text"
            placeholder={quoted ? "" : "Efectivo, Ahorros, Crowdlending…"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}

      {/* Los manuales comparten el calculo (suman lo que apuntas) pero no los
          campos: el efectivo lleva mes y referencia, el ahorro un hash. Se
          elige aqui para que borrar uno de fabrica y rehacerlo no pierda nada. */}
      {!quoted && !isEditing && (
        <div className="field">
          <label htmlFor="comportamiento">Campos del formulario</label>
          <select id="comportamiento" value={manualKind} onChange={(e) => setManualKind(e.target.value)}>
            <option value="other">Básico · fecha e importe</option>
            <option value="cash">Efectivo · mes, tipo de billete y referencia</option>
            <option value="savings">Ahorro · fecha, importe y hash</option>
          </select>
        </div>
      )}

      {error && (
        <div className="form-error">
          <span className="icon">{UI.alert}</span>
          <span>{error}</span>
        </div>
      )}

      <div className="form-actions">
        <button className="btn" type="submit" disabled={loading || (quoted && !chosen)}>
          <span className="icon">{isEditing ? UI.pencil : UI.plus}</span>
          {loading ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear activo"}
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
