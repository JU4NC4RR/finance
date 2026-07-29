const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/** Lanzado cuando la sesion no es valida, para que App muestre el login. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Sesion no iniciada");
    this.name = "UnauthorizedError";
  }
}

/** Extrae el "detail" de FastAPI para poder enseñar un mensaje legible. */
async function errorFrom(res) {
  const body = await res.text();
  try {
    const parsed = JSON.parse(body);
    if (parsed.detail) return new Error(parsed.detail);
  } catch {
    /* la respuesta no era JSON: se usa el texto tal cual */
  }
  return new Error(`${res.status} ${res.statusText}: ${body}`);
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    // La cookie de sesion es HttpOnly; el navegador la adjunta sola, pero hay
    // que pedirle explicitamente que incluya credenciales.
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return null;
  return res.json();
}

async function download(path, fallbackFilename) {
  const res = await fetch(`${API_URL}${path}`, { credentials: "same-origin" });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw await errorFrom(res);
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackFilename;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function upload(path, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export const api = {
  // --- Acceso ---
  getAuthStatus: () => request("/auth/status"),
  setup: (username, password) =>
    request("/auth/setup", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  changePassword: (current_password, new_password) =>
    request("/auth/password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),

  getAssetTypes: () => request("/asset-types"),
  getTransactions: (assetTypeId) =>
    request(assetTypeId ? `/transactions?asset_type_id=${assetTypeId}` : "/transactions"),
  createTransaction: (payload) =>
    request("/transactions", { method: "POST", body: JSON.stringify(payload) }),
  updateTransaction: (id, payload) =>
    request(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: "DELETE" }),
  getSummary: () => request("/dashboard/summary"),
  exportFullBackup: () => download("/export/full", "boveda_backup.xlsx"),
  exportAsset: (assetTypeId, assetName) =>
    download(`/export/asset-types/${assetTypeId}`, `${assetName}.xlsx`),
  importFullBackup: (file) => upload("/export/full/import", file),
  importAsset: (assetTypeId, file) => upload(`/export/asset-types/${assetTypeId}/import`, file),
};
