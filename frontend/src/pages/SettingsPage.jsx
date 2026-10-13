import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { UI } from "../assetTheme";
import { formatDateTime } from "../format";
import { Topbar, Banner, Panel, EmptyState } from "../components/ui";

/** Botón que copia un texto y confirma brevemente. */
function CopyButton({ text, label = "Copiar" }) {
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      // Sin permiso de portapapeles (o sin HTTPS): el texto está a la vista
      // para seleccionarlo a mano, así que no se interrumpe con un error.
      setDone(false);
    }
  };

  return (
    <button type="button" className="btn btn-ghost" onClick={copy}>
      <span className="icon">{done ? UI.check : UI.copy}</span>
      {done ? "Copiado" : label}
    </button>
  );
}

export default function SettingsPage() {
  const [tokens, setTokens] = useState([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState(null);   // token recién creado, en claro
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const base = `${window.location.origin}/api`;
  const backupUrl = `${base}/export/full`;

  const load = useCallback(async () => {
    try {
      setTokens(await api.getApiTokens());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Ponle un nombre al token para reconocerlo luego.");
      return;
    }
    setLoading(true);
    try {
      setFresh(await api.createApiToken(name.trim()));
      setName("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (token) => {
    if (!window.confirm(
      `¿Revocar el token "${token.name}"?\n\nCualquier script que lo use dejará de funcionar.`
    )) return;
    try {
      await api.revokeApiToken(token.id);
      if (fresh?.id === token.id) setFresh(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const curl = fresh
    ? `curl -H "Authorization: Bearer ${fresh.token}" \\\n  -OJ ${backupUrl}`
    : null;

  return (
    <>
      <Topbar eyebrow="Bóveda" title="Ajustes" icon={UI.settings} />

      <div className="content">
        {error && <Banner>{error}</Banner>}

        <Panel
          title="Copias de seguridad por API"
          sub="Descarga el Excel con un GET, sin abrir el navegador"
        >
          <p className="settings-text">
            La copia completa está en <code>GET {backupUrl}</code>. Como el resto de la
            API exige identificarse, necesitas un token que viaja en la cabecera{" "}
            <code>Authorization</code>.
          </p>

          <div className="code-block">
            <code>{`curl -H "Authorization: Bearer TU_TOKEN" -OJ ${backupUrl}`}</code>
            <CopyButton text={`curl -H "Authorization: Bearer TU_TOKEN" -OJ ${backupUrl}`} />
          </div>

          <p className="settings-text muted">
            <code>-OJ</code> guarda el fichero con el nombre que envía el servidor
            (<code>boveda_backup_AAAAMMDD.xlsx</code>). Para un activo concreto, usa{" "}
            <code>{`${base}/export/asset-types/{id}`}</code>.
          </p>
        </Panel>

        {/* El token en claro solo existe en esta respuesta: si se pierde, hay
            que revocarlo y crear otro. Por eso se muestra destacado. */}
        {fresh && (
          <Panel title="Tu token nuevo" sub="Cópialo ahora: no se vuelve a mostrar">
            <div className="code-block is-secret">
              <code>{fresh.token}</code>
              <CopyButton text={fresh.token} />
            </div>

            <p className="settings-text">Comando listo para usar:</p>
            <div className="code-block">
              <code>{curl}</code>
              <CopyButton text={curl.replace(/\\\n\s+/, "")} />
            </div>

            <p className="settings-text muted">
              Guárdalo donde guardes tus contraseñas. En la base de datos solo queda su
              hash, así que nadie —ni la aplicación— puede volver a enseñártelo.
            </p>
          </Panel>
        )}

        <Panel title="Tokens activos" sub={`${tokens.length} token${tokens.length === 1 ? "" : "s"}`} flush>
          {tokens.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Token</th>
                    <th>Creado</th>
                    <th>Último uso</th>
                    <th className="num">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td><code className="token-prefix">{t.prefix}…</code></td>
                      <td>{formatDateTime(t.created_at)}</td>
                      <td>{t.last_used_at ? formatDateTime(t.last_used_at) : "Nunca"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn is-danger"
                            onClick={() => revoke(t)}
                            title="Revocar token"
                          >
                            {UI.trash}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sin tokens"
              hint="Crea uno abajo para poder descargar las copias desde un script."
            />
          )}
        </Panel>

        <Panel title="Nuevo token" sub="Ponle un nombre para saber de dónde se usa">
          <form className="form-grid" onSubmit={create}>
            <div className="field">
              <label htmlFor="token-name">Nombre</label>
              <input
                id="token-name"
                type="text"
                placeholder="Copias del NAS, cron del portátil…"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button className="btn" type="submit" disabled={loading}>
                <span className="icon">{UI.plus}</span>
                {loading ? "Creando…" : "Crear token"}
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
