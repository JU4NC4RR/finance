import { useState } from "react";
import { api } from "../api";
import { UI } from "../assetTheme";

/**
 * Pantalla de acceso. Hace de alta inicial cuando todavia no hay ningun
 * usuario (needsSetup) y de inicio de sesion el resto de las veces.
 */
export default function AuthScreen({ needsSetup, onAuthenticated }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (needsSetup) {
      if (username.trim().length < 3) {
        setError("El usuario debe tener al menos 3 caracteres.");
        return;
      }
      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (password !== confirm) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    setLoading(true);
    try {
      if (needsSetup) {
        await api.setup(username.trim(), password);
      } else {
        await api.login(username.trim(), password);
      }
      await onAuthenticated();
    } catch (err) {
      setError(err.message);
      setPassword("");
      setConfirm("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">{UI.vault}</div>
          <div>
            <div className="wordmark">BÓVEDA<span>.</span></div>
            <div className="tagline">Patrimonio</div>
          </div>
        </div>

        <h1 className="auth-title">
          {needsSetup ? "Crea tu acceso" : "Introduce tus credenciales"}
        </h1>
        <p className="auth-sub">
          {needsSetup
            ? "Es la primera vez que abres la bóveda. Elige un usuario y una contraseña; se te pedirán cada vez que entres."
            : "Esta bóveda está protegida."}
        </p>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="clave">Contraseña</label>
            <input
              id="clave"
              type="password"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {needsSetup && (
            <div className="field">
              <label htmlFor="clave2">Repite la contraseña</label>
              <input
                id="clave2"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="form-error">
              <span className="icon">{UI.alert}</span>
              <span>{error}</span>
            </div>
          )}

          <button className="btn auth-submit" type="submit" disabled={loading}>
            {loading
              ? "Un momento…"
              : needsSetup ? "Crear acceso y entrar" : "Entrar"}
          </button>
        </form>

        {needsSetup && (
          <p className="auth-note">
            Guárdala bien: no hay forma de recuperarla desde la aplicación.
          </p>
        )}
      </div>
    </div>
  );
}
