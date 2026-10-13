import { NavLink } from "react-router-dom";
import { UI } from "../assetTheme";
import { formatDateTime } from "../format";

export default function Sidebar({ pricesUpdatedAt, offline, username, onLogout }) {
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

        <NavLink to="/activos" className={({ isActive }) => `side-link${isActive ? " active" : ""}`}>
          <span className="icon">{UI.wallet}</span>
          <span className="label">Activos</span>
        </NavLink>

        <NavLink to="/cuentas" className={({ isActive }) => `side-link${isActive ? " active" : ""}`}>
          <span className="icon">{UI.bank}</span>
          <span className="label">Cuentas</span>
        </NavLink>

        <NavLink to="/huchas" className={({ isActive }) => `side-link${isActive ? " active" : ""}`}>
          <span className="icon">{UI.jars}</span>
          <span className="label">Huchas</span>
        </NavLink>

        <NavLink to="/estrategias" className={({ isActive }) => `side-link${isActive ? " active" : ""}`}>
          <span className="icon">{UI.strategy}</span>
          <span className="label">Estrategias</span>
        </NavLink>

        <NavLink to="/ajustes" className={({ isActive }) => `side-link${isActive ? " active" : ""}`}>
          <span className="icon">{UI.settings}</span>
          <span className="label">Ajustes</span>
        </NavLink>
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
