import { useCallback, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { api, UnauthorizedError } from "./api";
import { UI } from "./assetTheme";
import Sidebar from "./components/Sidebar";
import AuthScreen from "./components/AuthScreen";
import DashboardPage from "./pages/DashboardPage";
import AssetPage from "./pages/AssetPage";

function Boot({ text }) {
  return (
    <div className="boot">
      <div className="brand-mark">{UI.vault}</div>
      <div className="boot-text">{text}</div>
    </div>
  );
}

export default function App() {
  // auth: null mientras se comprueba; luego { needs_setup, authenticated, username }
  const [auth, setAuth] = useState(null);
  const [assetTypes, setAssetTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      const status = await api.getAuthStatus();
      setAuth(status);
      return status;
    } catch {
      // El backend no responde: se distingue de "no autenticado" para no
      // enseñar un login que tampoco funcionaria.
      setAuth({ needs_setup: false, authenticated: false, unreachable: true });
      return null;
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [at, tx, sm] = await Promise.all([
        api.getAssetTypes(),
        api.getTransactions(),
        api.getSummary(),
      ]);
      setAssetTypes(at);
      setTransactions(tx);
      setSummary(sm);
      setError(null);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        // La sesion caduco o se cerro desde otro sitio: de vuelta al login.
        setAuth({ needs_setup: false, authenticated: false });
        return;
      }
      setError("No se ha podido conectar con el backend. Comprueba que los contenedores esten arriba.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Los datos solo se piden (y se refrescan) con la sesion iniciada.
  useEffect(() => {
    if (!auth?.authenticated) return undefined;
    setLoading(true);
    loadAll();
    const interval = setInterval(loadAll, 60_000);
    return () => clearInterval(interval);
  }, [auth?.authenticated, loadAll]);

  const handleAuthenticated = async () => {
    await checkAuth();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setAssetTypes([]);
      setTransactions([]);
      setSummary(null);
      await checkAuth();
    }
  };

  const handleCreate = async (payload) => {
    await api.createTransaction(payload);
    await loadAll();
  };

  const handleUpdate = async (id, payload) => {
    await api.updateTransaction(id, payload);
    await loadAll();
  };

  const handleDelete = async (id) => {
    await api.deleteTransaction(id);
    await loadAll();
  };

  if (auth === null) return <Boot text="Abriendo la bóveda" />;

  if (auth.unreachable) {
    return (
      <div className="boot">
        <div className="brand-mark">{UI.vault}</div>
        <div className="boot-text">No se ha podido conectar con el backend</div>
      </div>
    );
  }

  if (!auth.authenticated) {
    return <AuthScreen needsSetup={auth.needs_setup} onAuthenticated={handleAuthenticated} />;
  }

  if (loading) return <Boot text="Abriendo la bóveda" />;

  return (
    <div className="shell">
      <Sidebar
        assetTypes={assetTypes}
        pricesUpdatedAt={summary?.prices_updated_at}
        offline={Boolean(error)}
        username={auth.username}
        onLogout={handleLogout}
      />

      <div className="main">
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                summary={summary}
                transactions={transactions}
                error={error}
                onDataChanged={loadAll}
              />
            }
          />
          <Route
            path="/activos/:code"
            element={
              <AssetPage
                assetTypes={assetTypes}
                transactions={transactions}
                summary={summary}
                error={error}
                onCreated={handleCreate}
                onUpdated={handleUpdate}
                onDelete={handleDelete}
                onDataChanged={loadAll}
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
}
