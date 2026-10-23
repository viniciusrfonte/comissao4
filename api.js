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
  if (!r.ok) throw { code: (corpo && corpo.error) || "erro_" + r.status };
  return corpo && corpo.values;
}

// Mensagens equivalentes às da versão original, adaptadas ao novo servidor.
export function msgErro(e) {
  var c = e && e.code;
  if (c === "not_configured") return "O servidor ainda não está configurado. Cadastre SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY na Vercel.";
  if (c === "sheet_access") return "O Google Sheets recusou a leitura. Compartilhe a planilha com o e-mail da conta de serviço e confira o SHEET_ID.";
  if (c === "sheet_range") return "A aba ou a faixa de células não foi encontrada. Confira a variável SHEET_RANGE.";
  if (c === "upstream_error" || c === "network") return "O Google Sheets não respondeu agora. Tente de novo em instantes.";
  return "Não foi possível ler a planilha (" + (c || "erro") + ").";
}
