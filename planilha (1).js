// Função serverless da Vercel: lê a planilha no Google Sheets e devolve os valores crus.
// Substitui o conector "Google Sheets" que o Claude fornecia à versão original.
// Credenciais ficam SOMENTE em variáveis de ambiente (nunca no código nem no navegador).
import { JWT } from "google-auth-library";
import crypto from "node:crypto";

function igual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const senha = process.env.APP_PASSWORD;
  if (senha) {
    const enviada = req.headers["x-app-password"] || "";
    if (!igual(enviada, senha)) {
      await espera(600); // atrasa tentativas de adivinhar a senha
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  const { SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
  const faixa = process.env.SHEET_RANGE || "Planilha1!A:K";
  if (!SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    return res.status(500).json({ error: "not_configured" });
  }

  try {
    const cliente = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const { token } = await cliente.getAccessToken();
    const url =
      "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(SHEET_ID) +
      "/values/" + encodeURIComponent(faixa) + "?valueRenderOption=FORMATTED_VALUE";
    const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (r.status === 403 || r.status === 404) {
      return res.status(502).json({ error: "sheet_access" });
    }
    if (r.status === 400) {
      return res.status(502).json({ error: "sheet_range" });
    }
    if (!r.ok) {
      return res.status(502).json({ error: "upstream_error" });
    }
    const dados = await r.json();
    return res.status(200).json({ values: dados.values || [] });
  } catch (e) {
    console.error("planilha:", e && e.message);
    return res.status(502).json({ error: "upstream_error" });
  }
}
