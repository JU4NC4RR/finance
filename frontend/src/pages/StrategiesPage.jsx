import { useEffect, useState } from "react";
import { JAR_COLORS, jarColor, UI } from "../assetTheme";
import { formatMoney, formatPercent } from "../format";
import StrategyForm from "../components/StrategyForm";
import StrategyItemForm from "../components/StrategyItemForm";
import { Topbar, Banner, Panel, StatTile, EmptyState } from "../components/ui";

const pctOf = (v) => Number(v) || 0;

export default function StrategiesPage({
  strategies, error,
  onCreateStrategy, onUpdateStrategy, onDeleteStrategy,
  onCreateItem, onUpdateItem, onDeleteItem,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Si no hay seleccion valida (primera carga, o se borro la elegida),
  // se cae a la primera estrategia disponible.
  const selected = strategies.find((s) => s.id === selectedId) || strategies[0] || null;

  useEffect(() => {
    setEditingItem(null);
  }, [selected?.id]);

  const total = selected ? pctOf(selected.total_percentage) : 0;
  const remaining = 100 - total;
  const overflow = remaining < -0.005;
  const salary = selected?.salary != null ? Number(selected.salary) : null;

  const handleDeleteStrategy = async (s) => {
    const n = s.items.length;
    const extra = n ? `\n\nSe borrarán sus ${n} línea${n === 1 ? "" : "s"} de reparto.` : "";
    if (!window.confirm(`¿Eliminar la estrategia "${s.name}"?${extra}`)) return;
    if (editingStrategy?.id === s.id) setEditingStrategy(null);
    await onDeleteStrategy(s.id);
  };

  const handleUpdateStrategy = async (id, payload) => {
    await onUpdateStrategy(id, payload);
    setEditingStrategy(null);
  };

  const handleUpdateItem = async (id, payload) => {
    await onUpdateItem(id, payload);
    setEditingItem(null);
  };

  const handleDeleteItem = async (item) => {
    if (editingItem?.id === item.id) setEditingItem(null);
    await onDeleteItem(item.id);
  };

  // Color sugerido para la siguiente linea: el primero que no este en uso,
  // para no repetir tonos mientras queden libres.
  const usedColors = new Set((selected?.items || []).map((i) => i.color));
  const nextColor = (JAR_COLORS.find((c) => !usedColors.has(c.key)) || JAR_COLORS[0]).key;

  return (
    <>
      <Topbar eyebrow="Bóveda" title="Estrategias" icon={UI.strategy} />

      <div className="content">
        {error && <Banner>{error}</Banner>}

        <div className="stat-row">
          <StatTile
            label="Estrategia"
            value={selected ? selected.name : "—"}
            foot={`${strategies.length} definida${strategies.length === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Sueldo de referencia"
            value={salary != null ? formatMoney(salary, selected.currency) : "—"}
            foot={salary != null ? "Base del reparto" : "Sin sueldo: solo porcentajes"}
          />
          <StatTile
            label="Asignado"
            value={formatPercent(total)}
            foot={`${selected?.items.length || 0} línea${selected?.items.length === 1 ? "" : "s"}`}
          />
          <StatTile
            label={overflow ? "Te has pasado" : "Sin asignar"}
            value={formatPercent(Math.abs(remaining))}
            foot={
              salary != null
                ? formatMoney(Math.abs((salary * remaining) / 100), selected.currency)
                : overflow ? "Revisa los porcentajes" : "Del 100 % del sueldo"
            }
          />
        </div>

        <p className="jars-disclaimer">
          <span className="icon">{UI.alert}</span>
          Las estrategias son solo un <strong>plan</strong>: no mueven dinero ni tocan tus activos,
          huchas o cuentas.
        </p>

        <div className="section-head">
          <h2 className="section-title">Tus estrategias</h2>
          {strategies.length > 1 && <span className="section-hint">Pulsa para ver el detalle</span>}
        </div>

        {strategies.length ? (
          <div className="jar-grid">
            {strategies.map((s) => {
              const t = pctOf(s.total_percentage);
              const isActive = selected?.id === s.id;
              return (
                <article
                  key={s.id}
                  className={`jar-card strategy-card${isActive ? " is-selected" : ""}`}
                  onClick={() => setSelectedId(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(s.id);
                    }
                  }}
                >
                  <div className="jar-card-top">
                    <span className="name">{s.name}</span>
                    <span className="jar-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={(e) => { e.stopPropagation(); setEditingStrategy(s); }}
                        title="Editar estrategia"
                      >
                        {UI.pencil}
                      </button>
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        onClick={(e) => { e.stopPropagation(); handleDeleteStrategy(s); }}
                        title="Eliminar estrategia"
                      >
                        {UI.trash}
                      </button>
                    </span>
                  </div>

                  <div className="jar-balance">
                    {s.salary != null ? formatMoney(Number(s.salary), s.currency) : formatPercent(t)}
                  </div>

                  {/* Misma barra apilada que la distribucion del patrimonio:
                      un vistazo basta para comparar dos estrategias. */}
                  <div className="alloc-bar strategy-bar">
                    {s.items.map((i) => (
                      <div
                        key={i.id}
                        className="alloc-seg"
                        style={{ "--seg": jarColor(i.color), flexGrow: pctOf(i.percentage) }}
                      />
                    ))}
                    {100 - t > 0.005 && (
                      <div className="alloc-seg is-free" style={{ flexGrow: 100 - t }} />
                    )}
                  </div>

                  <div className="meta">
                    <span>{s.items.length} línea{s.items.length === 1 ? "" : "s"}</span>
                    <span className={pctOf(s.total_percentage) > 100.005 ? "is-expense" : undefined}>
                      {formatPercent(t)} asignado
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Todavía no tienes estrategias"
            hint="Crea la primera abajo y reparte tu sueldo por conceptos."
          />
        )}

        <Panel
          title={editingStrategy ? "Editar estrategia" : "Nueva estrategia"}
          sub={editingStrategy ? editingStrategy.name : "Un nombre y, si quieres, el sueldo base"}
        >
          <StrategyForm
            editing={editingStrategy}
            onCreate={onCreateStrategy}
            onUpdate={handleUpdateStrategy}
            onCancelEdit={() => setEditingStrategy(null)}
          />
        </Panel>

        {selected && (
          <>
            <Panel
              title={`Reparto · ${selected.name}`}
              sub={
                overflow
                  ? `Te has pasado del 100 % en ${Math.abs(remaining).toFixed(2).replace(".", ",")} puntos`
                  : `${formatPercent(remaining)} sin asignar`
              }
              flush
            >
              {selected.items.length ? (
                <div className="alloc">
                  <div className="alloc-bar">
                    {selected.items.map((i) => (
                      <div
                        key={i.id}
                        className="alloc-seg"
                        style={{ "--seg": jarColor(i.color), flexGrow: pctOf(i.percentage) }}
                      />
                    ))}
                    {remaining > 0.005 && (
                      <div className="alloc-seg is-free" style={{ flexGrow: remaining }} />
                    )}
                  </div>

                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th className="num">Porcentaje</th>
                          <th className="num">{salary != null ? "Al mes" : ""}</th>
                          <th className="num">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.items.map((i) => (
                          <tr key={i.id}>
                            <td>
                              <span className="tag" style={{ "--seg": jarColor(i.color) }}>
                                <span className="dot" />
                                {i.name}
                              </span>
                            </td>
                            <td className="num">{formatPercent(pctOf(i.percentage))}</td>
                            <td className="num">
                              {salary != null
                                ? formatMoney((salary * pctOf(i.percentage)) / 100, selected.currency)
                                : "—"}
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="icon-btn"
                                  onClick={() => setEditingItem(i)}
                                  title="Editar"
                                >
                                  {UI.pencil}
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn is-danger"
                                  onClick={() => handleDeleteItem(i)}
                                  title="Eliminar"
                                >
                                  {UI.trash}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td><strong>Total</strong></td>
                          <td className={`num${overflow ? " is-expense" : ""}`}>
                            <strong>{formatPercent(total)}</strong>
                          </td>
                          <td className="num">
                            {salary != null
                              ? formatMoney((salary * total) / 100, selected.currency)
                              : "—"}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Esta estrategia no tiene líneas"
                  hint="Añade la primera abajo: por ejemplo, 20 % a ahorro."
                />
              )}
            </Panel>

            <Panel
              title={editingItem ? "Editar línea" : "Añadir línea"}
              sub={`En «${selected.name}»`}
            >
              <StrategyItemForm
                strategy={selected}
                editing={editingItem}
                remaining={remaining}
                nextColor={nextColor}
                onCreate={onCreateItem}
                onUpdate={handleUpdateItem}
                onCancelEdit={() => setEditingItem(null)}
              />
            </Panel>
          </>
        )}
      </div>
    </>
  );
}
