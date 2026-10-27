// Cliente da função /api/planilha. Guarda a senha só na sessão da aba (sessionStorage).
const CHAVE_SENHA = "comissoes-senha";

export function lerSenha() {
  try { return sessionStorage.getItem(CHAVE_SENHA) || ""; } catch (e) { return ""; }
}
export function gravarSenha(s) {
  try { sessionStorage.setItem(CHAVE_SENHA, s); } catch (e) {}
}

export async function buscarPlanilha() {
  var r;
  try {
    r = await fetch("/api/planilha", { headers: { "x-app-password": lerSenha() }, cache: "no-store" });
  } catch (e) {
    throw { code: "network" };
  }
  var corpo = null;
  try { corpo = await r.json(); } catch (e) {}
  if (!r.ok) throw { code: (corpo && corpo.error) || "erro_" + r.status, http: corpo && corpo.http, motivo: corpo && corpo.motivo };
  return corpo && corpo.values;
}

// Mensagens equivalentes às da versão original, adaptadas ao novo servidor.
export function msgErro(e) {
  var c = e && e.code;
  var det = e && e.http ? " [Google: " + e.http + (e.motivo ? " " + e.motivo : "") + "]" : "";
  if (c === "not_configured") return "O servidor ainda não está configurado. Cadastre a variável SHEET_ID na Vercel (e faça Redeploy).";
  if (c === "sheet_access") return "O Google Sheets recusou a leitura. Confira: (1) a planilha está compartilhada como \"Qualquer pessoa com o link\" (Leitor); (2) o SHEET_ID está correto; (3) o SHEET_GID é o da aba certa." + det;
  if (c === "sheet_range") return "A aba ou a faixa de células não foi encontrada (confira SHEET_RANGE), ou o arquivo é um Excel guardado no Drive em vez de uma planilha do Google." + det;
  if (c === "upstream_error" || c === "network") return "O Google Sheets não respondeu agora. Tente de novo em instantes." + det;
  return "Não foi possível ler a planilha (" + (c || "erro") + ")." + det;
}
