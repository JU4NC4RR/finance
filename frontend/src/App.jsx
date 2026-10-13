import { useCallback, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { api, UnauthorizedError } from "./api";
import { UI } from "./assetTheme";
import Sidebar from "./components/Sidebar";
import AuthScreen from "./components/AuthScreen";
import DashboardPage from "./pages/DashboardPage";
import AssetPage from "./pages/AssetPage";
import AssetsPage from "./pages/AssetsPage";
import JarsPage from "./pages/JarsPage";
import BanksPage from "./pages/BanksPage";
import StrategiesPage from "./pages/StrategiesPage";
import SettingsPage from "./pages/SettingsPage";

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
  const [jarsSummary, setJarsSummary] = useState(null);
  const [jarEntries, setJarEntries] = useState([]);
  const [banksSummary, setBanksSummary] = useState(null);
  const [bankMovements, setBankMovements] = useState([]);
  const [strategies, setStrategies] = useState([]);
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
      const [at, tx, sm, js, je, bs, bm, st] = await Promise.all([
        api.getAssetTypes(),
        api.getTransactions(),
        api.getSummary(),
        api.getJarsSummary(),
        api.getJarEntries(),
        api.getBanksSummary(),
        api.getBankMovements(),
        api.getStrategies(),
      ]);
      setAssetTypes(at);
      setTransactions(tx);
      setSummary(sm);
      setJarsSummary(js);
      setJarEntries(je);
      setBanksSummary(bs);
      setBankMovements(bm);
      setStrategies(st);
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

  // Cada accion sobre huchas recarga: los saldos son agregados del backend.
  const withReload = (fn) => async (...args) => {
    const result = await fn(...args);
    await loadAll();
    return result;
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
                jarsSummary={jarsSummary}
                banksSummary={banksSummary}
                strategies={strategies}
                error={error}
                onDataChanged={loadAll}
              />
            }
          />
          <Route
            path="/huchas"
            element={
              <JarsPage
                jarsSummary={jarsSummary}
                entries={jarEntries}
                error={error}
                onCreateJar={withReload(api.createJar)}
                onUpdateJar={withReload(api.updateJar)}
                onDeleteJar={withReload(api.deleteJar)}
                onCreateEntry={withReload(api.createJarEntry)}
                onUpdateEntry={withReload(api.updateJarEntry)}
                onDeleteEntry={withReload(api.deleteJarEntry)}
              />
            }
          />
          <Route
            path="/cuentas"
            element={
              <BanksPage
                banksSummary={banksSummary}
                movements={bankMovements}
                jars={jarsSummary?.jars || []}
                error={error}
                onCreateAccount={withReload(api.createAccount)}
                onUpdateAccount={withReload(api.updateAccount)}
                onDeleteAccount={withReload(api.deleteAccount)}
                onCreateMovement={withReload(api.createBankMovement)}
                onUpdateMovement={withReload(api.updateBankMovement)}
                onDeleteMovement={withReload(api.deleteBankMovement)}
              />
            }
          />
          <Route
            path="/estrategias"
            element={
              <StrategiesPage
                strategies={strategies}
                error={error}
                onCreateStrategy={withReload(api.createStrategy)}
                onUpdateStrategy={withReload(api.updateStrategy)}
                onDeleteStrategy={withReload(api.deleteStrategy)}
                onCreateItem={withReload(api.createStrategyItem)}
                onUpdateItem={withReload(api.updateStrategyItem)}
                onDeleteItem={withReload(api.deleteStrategyItem)}
              />
            }
          />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route
            path="/activos"
            element={
              <AssetsPage
                summary={summary}
                transactions={transactions}
                error={error}
                onDelete={handleDelete}
                onCreateAsset={withReload(api.createAssetType)}
                onUpdateAsset={withReload(api.updateAssetType)}
                onDeleteAsset={withReload(api.deleteAssetType)}
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
