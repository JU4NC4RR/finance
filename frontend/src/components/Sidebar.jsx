import { NavLink } from "react-router-dom";
import { accentFor, iconFor, UI } from "../assetTheme";
import { formatDateTime } from "../format";

export default function Sidebar({ assetTypes, pricesUpdatedAt, offline, username, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">{UI.vault}</div>
        <div>
          <div className="wordmark">BÓVEDA<span>.</span></div>
          <div className="tagline">Patrimonio</div>
        </div>
      </div>

      <nav className="side-nav">
        <NavLink to="/" end className={({ isActive }) => `side-link${isActive ? " active" : ""}`}>
          <span className="icon">{UI.grid}</span>
          <span className="label">Resumen</span>
        </NavLink>

        <div className="side-label">Activos</div>

        {assetTypes.map((a) => (
          <NavLink
            key={a.id}
            to={`/activos/${a.code}`}
            style={{ "--accent": accentFor(a.code) }}
            className={({ isActive }) => `side-link${isActive ? " active" : ""}`}
          >
            <span className="icon">{iconFor(a.code)}</span>
            <span className="label">{a.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="side-foot">
        {username && (
          <div className="side-user">
            <span className="icon">{UI.user}</span>
            <span className="side-user-name">{username}</span>
            <button type="button" className="side-logout" onClick={onLogout} title="Cerrar sesión">
              {UI.logout}
            </button>
          </div>
        )}

        <div className="sync-pill">
          <span className={`pulse${offline ? " is-off" : ""}`} />
          <span>
            {offline ? "Sin conexión" : "Precios al día"}
            {!offline && pricesUpdatedAt && (
              <>
                <br />
                {formatDateTime(pricesUpdatedAt)}
              </>
            )}
          </span>
        </div>
      </div>
    </aside>
  );
}
