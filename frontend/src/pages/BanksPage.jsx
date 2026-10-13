import { useState } from "react";
import { jarColor, UI } from "../assetTheme";
import { formatMoney, formatDate } from "../format";
import BankAccountForm from "../components/BankAccountForm";
import BankMovementForm from "../components/BankMovementForm";
import { Topbar, Banner, Panel, StatTile, EmptyState } from "../components/ui";

function AccountCard({ account, currency, onEdit, onDelete }) {
  const balance = Number(account.balance) || 0;

  return (
    <article className="jar-card" style={{ "--accent": jarColor(account.color) }}>
      <div className="jar-card-top">
        <span className="name">{account.name}</span>
        <span className="jar-actions">
          <button type="button" className="icon-btn" onClick={() => onEdit(account)} title="Editar cuenta">
            {UI.pencil}
          </button>
          <button
            type="button"
            className="icon-btn is-danger"
            onClick={() => onDelete(account)}
            title="Eliminar cuenta"
          >
            {UI.trash}
          </button>
        </span>
      </div>

      {/* En rojo si esta en numeros rojos: es justo lo que hay que ver. */}
      <div className={`jar-balance${balance < 0 ? " is-negative" : ""}`}>
        {formatMoney(balance, currency)}
      </div>

      <div className="meta">
        <span>{account.bank || "Sin entidad"}</span>
        <span>{account.num_movements} mov.</span>
      </div>

      <div className="jar-split">
        <span className="is-income">+{formatMoney(Number(account.total_income) || 0, currency)}</span>
        <span className={Number(account.total_expense) > 0 ? "is-expense" : "muted"}>
          {Number(account.total_expense) > 0 ? "−" : ""}
          {formatMoney(Number(account.total_expense) || 0, currency)}
        </span>
      </div>
    </article>
  );
}

export default function BanksPage({
  banksSummary, movements, jars, error,
  onCreateAccount, onUpdateAccount, onDeleteAccount,
  onCreateMovement, onUpdateMovement, onDeleteMovement,
}) {
  const [editingAccount, setEditingAccount] = useState(null);
  const [editingMovement, setEditingMovement] = useState(null);
  const [filterAccount, setFilterAccount] = useState("");

  const accounts = banksSummary?.accounts || [];
  const currency = banksSummary?.base_currency || "EUR";

  const handleDeleteAccount = async (account) => {
    const linked = movements.filter((m) => m.account_id === account.id && m.jar_id).length;
    const extra = [
      account.num_movements
        ? `Se borrarán sus ${account.num_movements} movimiento${account.num_movements === 1 ? "" : "s"}.`
        : "",
      linked
        ? `${linked} de ellos son traspasos: también se descontarán de sus huchas.`
        : "",
    ].filter(Boolean).join("\n");
    if (!window.confirm(`¿Eliminar la cuenta "${account.name}"?${extra ? `\n\n${extra}` : ""}`)) return;
    if (editingAccount?.id === account.id) setEditingAccount(null);
    await onDeleteAccount(account.id);
  };

  const handleUpdateAccount = async (id, payload) => {
    await onUpdateAccount(id, payload);
    setEditingAccount(null);
  };

  const handleUpdateMovement = async (id, payload) => {
    await onUpdateMovement(id, payload);
    setEditingMovement(null);
  };

  const handleDeleteMovement = async (movement) => {
    if (movement.jar_id) {
      const jar = jars.find((j) => j.id === movement.jar_id);
      const msg = `Este movimiento es un traspaso. Al borrarlo también se deshará el apunte en la hucha "${jar?.name || ""}".\n\n¿Continuar?`;
      if (!window.confirm(msg)) return;
    }
    if (editingMovement?.id === movement.id) setEditingMovement(null);
    await onDeleteMovement(movement.id);
  };

  const visible = filterAccount
    ? movements.filter((m) => m.account_id === filterAccount)
    : movements;

  return (
    <>
      <Topbar eyebrow="Bóveda" title="Cuentas" icon={UI.bank} />

      <div className="content">
        {error && <Banner>{error}</Banner>}

        <div className="stat-row">
          <StatTile
            label="Saldo en cuentas"
            value={formatMoney(Number(banksSummary?.total_balance) || 0, currency)}
            foot="Suma de todas tus cuentas"
          />
          <StatTile
            label="Entradas del mes"
            value={formatMoney(Number(banksSummary?.month_income) || 0, currency)}
            foot={banksSummary?.month_label || "—"}
          />
          <StatTile
            label="Salidas del mes"
            value={formatMoney(Number(banksSummary?.month_expense) || 0, currency)}
            foot={banksSummary?.month_label || "—"}
          />
          <StatTile
            label="Cuentas"
            value={accounts.length}
            foot={`${movements.length} movimientos en total`}
          />
        </div>

        <p className="jars-disclaimer">
          <span className="icon">{UI.alert}</span>
          Las cuentas son <strong>independientes</strong>: no se suman al patrimonio. Si asocias
          una hucha a un movimiento, el dinero se mueve en las dos a la vez.
        </p>

        <div className="section-head">
          <h2 className="section-title">Tus cuentas</h2>
          {accounts.length > 0 && <span className="section-hint">Cada cuenta lleva su propio saldo</span>}
        </div>

        {accounts.length ? (
          <div className="jar-grid">
            {accounts.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                currency={currency}
                onEdit={setEditingAccount}
                onDelete={handleDeleteAccount}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Todavía no tienes cuentas"
            hint="Crea la primera abajo indicando el banco y un saldo inicial."
          />
        )}

        <Panel
          title={editingAccount ? "Editar cuenta" : "Nueva cuenta"}
          sub={editingAccount ? editingAccount.name : "Nombre, entidad, color y saldo de partida"}
        >
          <BankAccountForm
            editing={editingAccount}
            onCreate={onCreateAccount}
            onUpdate={handleUpdateAccount}
            onCancelEdit={() => setEditingAccount(null)}
          />
        </Panel>

        <Panel
          title={editingMovement ? "Editar movimiento" : "Ingresos y gastos"}
          sub="Asocia una hucha para que el dinero se mueva también allí"
        >
          {accounts.length ? (
            <BankMovementForm
              accounts={accounts}
              jars={jars}
              editing={editingMovement}
              onCreate={onCreateMovement}
              onUpdate={handleUpdateMovement}
              onCancelEdit={() => setEditingMovement(null)}
            />
          ) : (
            <EmptyState
              title="Crea una cuenta primero"
              hint="Los movimientos necesitan una cuenta a la que asociarse."
            />
          )}
        </Panel>

        <Panel
          title="Movimientos"
          sub={`${visible.length} registro${visible.length === 1 ? "" : "s"}`}
          flush
          action={
            accounts.length > 0 && (
              <select
                className="panel-filter"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                aria-label="Filtrar por cuenta"
              >
                <option value="">Todas las cuentas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )
          }
        >
          {visible.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cuenta</th>
                    <th>Concepto</th>
                    <th>Hucha</th>
                    <th className="num">Importe</th>
                    <th className="num">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((m) => {
                    const account = accounts.find((a) => a.id === m.account_id);
                    const jar = jars.find((j) => j.id === m.jar_id);
                    const income = m.kind === "income";
                    return (
                      <tr key={m.id}>
                        <td>{formatDate(m.occurred_on)}</td>
                        <td>
                          <span className="tag" style={{ "--seg": jarColor(account?.color) }}>
                            <span className="dot" />
                            {account?.name || "—"}
                          </span>
                        </td>
                        <td>{m.concept || "—"}</td>
                        <td>
                          {jar ? (
                            <span className="tag" style={{ "--seg": jarColor(jar.color) }}>
                              <span className="dot" />
                              {jar.name}
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className={`num ${income ? "is-income" : "is-expense"}`}>
                          {income ? "+" : "−"}
                          {formatMoney(Number(m.amount), currency)}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setEditingMovement(m)}
                              title="Editar"
                            >
                              {UI.pencil}
                            </button>
                            <button
                              type="button"
                              className="icon-btn is-danger"
                              onClick={() => handleDeleteMovement(m)}
                              title="Eliminar"
                            >
                              {UI.trash}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={filterAccount ? "Esta cuenta no tiene movimientos" : "Sin movimientos todavía"}
              hint="Registra una entrada o una salida en el panel de arriba."
            />
          )}
        </Panel>
      </div>
    </>
  );
}
