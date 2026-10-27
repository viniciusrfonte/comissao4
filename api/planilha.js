// Função serverless da Vercel: lê a planilha e devolve os valores crus.
// Dois modos (credenciais ficam SOMENTE em variáveis de ambiente):
//  1) Planilha compartilhada como "qualquer pessoa com o link": lê o CSV exportado, sem credenciais.
//  2) Conta de serviço do Google (opcional): para planilhas privadas. Se falhar, tenta o modo 1.
import { JWT } from "google-auth-library";
import crypto from "node:crypto";
import { parseCSV } from "../src/lib/planilha.js";

function igual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Modo 2: API do Google com conta de serviço.
async function viaConta({ SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY }, faixa) {
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
  if (!r.ok) {
    let g = {};
    try { g = (await r.json()).error || {}; } catch (e) {}
    const motivo = (g.details && g.details[0] && g.details[0].reason) || g.status || "";
    console.error("sheets:", r.status, motivo, g.message);
    const erro = r.status === 403 || r.status === 404 ? "sheet_access" : r.status === 400 ? "sheet_range" : "upstream_error";
    return { falha: { error: erro, http: r.status, motivo } };
  }
  const dados = await r.json();
  return { values: dados.values || [] };
}

// Modo 1: CSV exportado de uma planilha com link compartilhado.
async function viaLink(SHEET_ID, gid) {
  const url =
    "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(SHEET_ID) +
    "/export?format=csv" + (gid ? "&gid=" + encodeURIComponent(gid) : "");
  const r = await fetch(url, { redirect: "follow" });
  const tipo = r.headers.get("content-type") || "";
  if (!r.ok || !tipo.includes("csv")) {
    console.error("link:", r.status, tipo);
    return { falha: { error: "sheet_access", http: r.status || 0, motivo: "LINK_NAO_PUBLICO" } };
  }
  return { values: parseCSV(await r.text()) };
}

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

  const env = process.env;
  const faixa = env.SHEET_RANGE || "Planilha1!A:K";
  if (!env.SHEET_ID) {
    return res.status(500).json({ error: "not_configured" });
  }
  const temConta = !!(env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY);

  try {
    let resultado = null;
    if (temConta) resultado = await viaConta(env, faixa);
    if (!resultado || resultado.falha) {
      const viaConta_falha = resultado && resultado.falha;
      const l = await viaLink(env.SHEET_ID, env.SHEET_GID);
      resultado = l.falha && viaConta_falha ? { falha: viaConta_falha } : l;
    }
    if (resultado.falha) return res.status(502).json(resultado.falha);
    return res.status(200).json({ values: resultado.values });
  } catch (e) {
    console.error("planilha:", e && e.message);
    return res.status(502).json({ error: "upstream_error" });
  }
}
