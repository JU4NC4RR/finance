import { useState } from "react";
import { jarColor, UI } from "../assetTheme";
import { formatMoney, formatPercent, formatDate } from "../format";
import JarForm from "../components/JarForm";
import JarEntryForm from "../components/JarEntryForm";
import { Topbar, Banner, Panel, StatTile, EmptyState } from "../components/ui";

function JarCard({ jar, currency, onEdit, onDelete }) {
  const balance = Number(jar.balance) || 0;
  const target = jar.target_amount != null ? Number(jar.target_amount) : null;
  // El porcentaje real se muestra tal cual (puede pasar de 100 si has metido
  // mas de lo que te propusiste); solo se limita el ancho de la barra.
  const progress = target > 0 ? (balance / target) * 100 : null;
  const barWidth = progress === null ? 0 : Math.min(Math.max(progress, 0), 100);

  return (
    <article className="jar-card" style={{ "--accent": jarColor(jar.color) }}>
      <div className="jar-card-top">
        <span className="name">{jar.name}</span>
        <span className="jar-actions">
          <button type="button" className="icon-btn" onClick={() => onEdit(jar)} title="Editar hucha">
            {UI.pencil}
          </button>
          <button
            type="button"
            className="icon-btn is-danger"
            onClick={() => onDelete(jar)}
            title="Eliminar hucha"
          >
            {UI.trash}
          </button>
        </span>
      </div>

      {/* Una hucha puede quedar en negativo si se gasta de mas: se marca en
          rojo en vez de esconderlo, porque es justo lo que hay que ver. */}
      <div className={`jar-balance${balance < 0 ? " is-negative" : ""}`}>
        {formatMoney(balance, currency)}
      </div>

      {progress !== null ? (
        <>
          <div className="share-track">
            <div
              className={`share-fill${progress >= 100 ? " is-complete" : ""}`}
              style={{ width: `${Math.max(barWidth, 1.5)}%` }}
            />
          </div>
          <div className="meta">
            <span>{formatPercent(progress)} de {formatMoney(target, currency)}</span>
            <span>{jar.num_entries} mov.</span>
          </div>
        </>
      ) : (
        <div className="meta">
          <span>Sin objetivo</span>
          <span>{jar.num_entries} mov.</span>
        </div>
      )}

      {/* Sin el condicional saldria un "−0,00 €" que se lee raro. */}
      <div className="jar-split">
        <span className="is-income">+{formatMoney(Number(jar.total_income) || 0, currency)}</span>
        <span className={Number(jar.total_expense) > 0 ? "is-expense" : "muted"}>
          {Number(jar.total_expense) > 0 ? "−" : ""}
          {formatMoney(Number(jar.total_expense) || 0, currency)}
        </span>
      </div>
    </article>
  );
}

export default function JarsPage({
  jarsSummary, entries, error,
  onCreateJar, onUpdateJar, onDeleteJar,
  onCreateEntry, onUpdateEntry, onDeleteEntry,
}) {
  const [editingJar, setEditingJar] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [filterJar, setFilterJar] = useState("");

  const jars = jarsSummary?.jars || [];
  const currency = jarsSummary?.base_currency || "EUR";

  const handleDeleteJar = async (jar) => {
    const extra = jar.num_entries
      ? `\n\nSe borrarán también sus ${jar.num_entries} movimiento${jar.num_entries === 1 ? "" : "s"}.`
      : "";
    if (!window.confirm(`¿Eliminar la hucha "${jar.name}"?${extra}`)) return;
    if (editingJar?.id === jar.id) setEditingJar(null);
    await onDeleteJar(jar.id);
  };

  const handleUpdateJar = async (id, payload) => {
    await onUpdateJar(id, payload);
    setEditingJar(null);
  };

  const handleUpdateEntry = async (id, payload) => {
    await onUpdateEntry(id, payload);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (id) => {
    if (editingEntry?.id === id) setEditingEntry(null);
    await onDeleteEntry(id);
  };

  const visibleEntries = filterJar ? entries.filter((e) => e.jar_id === filterJar) : entries;

  return (
    <>
      <Topbar eyebrow="Bóveda" title="Huchas" icon={UI.jars} />

      <div className="content">
        {error && <Banner>{error}</Banner>}

        <div className="stat-row">
          <StatTile
            label="Saldo en huchas"
            value={formatMoney(Number(jarsSummary?.total_balance) || 0, currency)}
            foot="Lo que has ingresado a mano"
          />
          <StatTile
            label="Ingresos del mes"
            value={formatMoney(Number(jarsSummary?.month_income) || 0, currency)}
            foot={jarsSummary?.month_label || "—"}
          />
          <StatTile
            label="Gastos del mes"
            value={formatMoney(Number(jarsSummary?.month_expense) || 0, currency)}
            foot={jarsSummary?.month_label || "—"}
          />
          <StatTile
            label="Huchas activas"
            value={jars.length}
            foot={`${entries.length} movimientos en total`}
          />
        </div>

        {/* El saldo sale solo de los movimientos que se registran aqui: no se
            deduce de Efectivo ni de Ahorros ni de ningun otro activo. Se deja
            dicho para que quede claro que es un circuito independiente. */}
        <p className="jars-disclaimer">
          <span className="icon">{UI.alert}</span>
          Las huchas son <strong>independientes</strong>: el saldo sale solo de lo que ingresas
          aquí, no de Efectivo ni de Ahorros, y no se suma al patrimonio.
        </p>

        <div className="section-head">
          <h2 className="section-title">Tus huchas</h2>
          {jars.length > 0 && <span className="section-hint">Cada hucha lleva su propio saldo</span>}
        </div>

        {jars.length ? (
          <div className="jar-grid">
            {jars.map((jar) => (
              <JarCard
                key={jar.id}
                jar={jar}
                currency={currency}
                onEdit={setEditingJar}
                onDelete={handleDeleteJar}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Todavía no tienes huchas"
            hint="Crea la primera abajo: gasolina, ocio, imprevistos… lo que necesites separar."
          />
        )}

        <Panel
          title={editingJar ? "Editar hucha" : "Nueva hucha"}
          sub={editingJar ? editingJar.name : "Ponle nombre, color y un objetivo opcional"}
        >
          <JarForm
            editing={editingJar}
            onCreate={onCreateJar}
            onUpdate={handleUpdateJar}
            onCancelEdit={() => setEditingJar(null)}
          />
        </Panel>

        <Panel
          title={editingEntry ? "Editar movimiento" : "Ingresos y gastos"}
          sub="Cada apunte va asociado a una hucha"
        >
          {jars.length ? (
            <JarEntryForm
              jars={jars}
              editing={editingEntry}
              onCreate={onCreateEntry}
              onUpdate={handleUpdateEntry}
              onCancelEdit={() => setEditingEntry(null)}
            />
          ) : (
            <EmptyState
              title="Crea una hucha primero"
              hint="Los movimientos necesitan una hucha a la que asociarse."
            />
          )}
        </Panel>

        <Panel
          title="Movimientos"
          sub={`${visibleEntries.length} registro${visibleEntries.length === 1 ? "" : "s"}`}
          flush
          action={
            jars.length > 0 && (
              <select
                className="panel-filter"
                value={filterJar}
                onChange={(e) => setFilterJar(e.target.value)}
                aria-label="Filtrar por hucha"
              >
                <option value="">Todas las huchas</option>
                {jars.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            )
          }
        >
          {visibleEntries.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hucha</th>
                    <th>Concepto</th>
                    <th className="num">Importe</th>
                    <th>Nota</th>
                    <th className="num">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map((entry) => {
                    const jar = jars.find((j) => j.id === entry.jar_id);
                    const income = entry.kind === "income";
                    return (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.occurred_on)}</td>
                        <td>
                          <span className="tag" style={{ "--seg": jarColor(jar?.color) }}>
                            <span className="dot" />
                            {jar?.name || entry.jar?.name || "—"}
                          </span>
                        </td>
                        <td>{entry.concept || "—"}</td>
                        <td className={`num ${income ? "is-income" : "is-expense"}`}>
                          {income ? "+" : "−"}
                          {formatMoney(Number(entry.amount), currency)}
                        </td>
                        <td>
                          {entry.bank_movement_id ? (
                            <span className="from-bank">
                              <span className="icon">{UI.transfer}</span>Traspaso
                            </span>
                          ) : (
                            entry.note || "—"
                          )}
                        </td>
                        <td>
                          {/* Un apunte de traspaso lo gobierna la cuenta: si se
                              pudiera tocar aqui, los dos saldos se descuadrarian. */}
                          {entry.bank_movement_id ? (
                            <span className="muted locked-hint" title="Se gestiona desde Cuentas">
                              Desde Cuentas
                            </span>
                          ) : (
                            <div className="row-actions">
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => setEditingEntry(entry)}
                                title="Editar"
                              >
                                {UI.pencil}
                              </button>
                              <button
                                type="button"
                                className="icon-btn is-danger"
                                onClick={() => handleDeleteEntry(entry.id)}
                                title="Eliminar"
                              >
                                {UI.trash}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={filterJar ? "Esta hucha no tiene movimientos" : "Sin movimientos todavía"}
              hint="Registra un ingreso o un gasto en el panel de arriba."
            />
          )}
        </Panel>
      </div>
    </>
  );
}
