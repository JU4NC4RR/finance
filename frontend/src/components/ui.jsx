import { UI } from "../assetTheme";

export function Topbar({ eyebrow, title, icon, accent, children }) {
  return (
    <header className="topbar">
      <div className="topbar-titles">
        {icon && (
          <div className="page-icon" style={accent ? { "--accent": accent } : undefined}>
            {icon}
          </div>
        )}
        <div>
          {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
          <h1 className="page-title">{title}</h1>
        </div>
      </div>
      {children && <div className="topbar-actions">{children}</div>}
    </header>
  );
}

export function Banner({ children }) {
  return (
    <div className="banner" role="alert">
      <span className="icon">{UI.alert}</span>
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ title, hint, icon = UI.inbox }) {
  return (
    <div className="empty-state">
      <span className="icon">{icon}</span>
      {title && <div className="title">{title}</div>}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

/**
 * Chip de variacion. El color sigue la direccion e incluye siempre una flecha,
 * para no depender solo del color.
 */
export function Delta({ value, suffix = "%" }) {
  const n = Number(value) || 0;
  const state = Math.abs(n) < 0.05 ? "flat" : n > 0 ? "up" : "down";
  const icon = state === "up" ? UI.trendUp : state === "down" ? UI.trendDown : UI.minus;
  const sign = state === "up" ? "+" : "";
  return (
    <span className={`delta is-${state}`}>
      <span className="icon">{icon}</span>
      {sign}
      {n.toFixed(1).replace(".", ",")}
      {suffix}
    </span>
  );
}

/**
 * `accent` identifica la entidad con un punto de color junto al texto, no
 * tinendo el texto: un color de serie sobre fondo oscuro no llega al contraste
 * exigible a un texto, y la identidad debe venir de la marca, no de la tinta.
 */
export function StatTile({ label, value, foot, accent, badge }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {accent && <span className="dot" style={{ "--seg": accent }} />}
        <span className="stat-value-text">{value}</span>
      </div>
      {/* El badge va bajo la cifra, nunca a su lado: compartir la linea
          obligaria a recortar el importe, y un numero truncado enganna. */}
      {(foot || badge) && (
        <div className="stat-foot-row">
          {badge}
          {foot && <span className="stat-foot">{foot}</span>}
        </div>
      )}
    </div>
  );
}

export function Panel({ title, sub, action, flush = false, children }) {
  return (
    <section className="panel">
      {(title || action) && (
        <div className="panel-head">
          <div>
            <div className="panel-title">{title}</div>
            {sub && <div className="panel-sub">{sub}</div>}
          </div>
          {action}
        </div>
      )}
      <div className={`panel-body${flush ? " is-flush" : ""}`}>{children}</div>
    </section>
  );
}
