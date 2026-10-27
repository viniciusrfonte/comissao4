// Regras de negócio da versão original (copiadas sem alteração de comportamento).

export const COL_VENDA = 5;     // coluna F (Valor venda), usada na aba "Comissões pagas"
export const COL_COMISSAO = 8;  // coluna I (Comissão), usada na aba "Comissões pagas"
export const LIMITE = 50; // % mínimo do "Percentual da Venda" (arredondado) para a comissão entrar na lista

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function norm(s) {
  return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

export function parseMoney(v) {
  if (typeof v === "number") return v;
  var s = String(v == null ? "" : v).replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return 0;
  if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
  var n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

export function parsePct(v) {
  if (typeof v === "number") return v <= 1 ? v * 100 : v;
  var s = String(v == null ? "" : v).replace("%", "").replace(/\s/g, "").replace(",", ".");
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Mantida da versão original (leitor de CSV). Não é usada pela tela atual.
export function parseCSV(text) {
  var rows = [], row = [], cur = "", q = false, i, c;
  text = text.replace(/^﻿/, "");
  for (i = 0; i < text.length; i++) {
    c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// Localiza as colunas pelo nome do cabeçalho.
// Cada registro: [vendedor, cliente, código, %comissão, venda, %venda, comissão, pago(0/1), texto do pagamento,
// valor da coluna F, valor da coluna I]. As colunas F e I da aba "Comissões pagas" são lidas por posição.
export function extrair(matriz) {
  var h = -1, idx = {}, i, j;
  for (i = 0; i < matriz.length && h < 0; i++) {
    var ns = matriz[i].map(norm);
    if (ns.indexOf("VENDEDOR") >= 0 && ns.indexOf("PERCENTUAL DA VENDA") >= 0) {
      h = i; idx = {};
      ns.forEach(function (n, k) { if (!(n in idx)) idx[n] = k; });
    }
  }
  if (h < 0) return null;
  ["PAGTO COMISSAO", "PGTO DE COMISSAO", "PAGTO DE COMISSAO"].forEach(function (a) {
    if (!("PGTO COMISSAO" in idx) && (a in idx)) idx["PGTO COMISSAO"] = idx[a];
  });
  var need = ["VENDEDOR", "NOME DO CLIENTE", "CODIGO DO CLIENTE", "% COMISSAO", "VALOR VENDA", "PERCENTUAL DA VENDA", "COMISSAO", "PGTO COMISSAO"];
  var falta = need.filter(function (n) { return !(n in idx); });
  if (falta.length) return { erro: "Colunas não encontradas: " + falta.join(", ") };
  var out = [];
  function txt(r, n) { var v = r[idx[n]]; return v == null ? "" : String(v).trim(); }
  // Filtro da aba "Comissões pagas": prefere a coluna "PAGTO DE COMISSAO" se existir; senão a mesma de "PGTO COMISSAO".
  var idxPgto = "PAGTO DE COMISSAO" in idx ? idx["PAGTO DE COMISSAO"] : "PGTO DE COMISSAO" in idx ? idx["PGTO DE COMISSAO"] : idx["PGTO COMISSAO"];
  function pgtoTxt(r) { var v = r[idxPgto]; return v == null ? "" : String(v).trim(); }
  for (j = h + 1; j < matriz.length; j++) {
    var r = matriz[j];
    var vend = txt(r, "VENDEDOR"), cli = txt(r, "NOME DO CLIENTE");
    if (!vend || !cli) continue;
    out.push([
      vend.toUpperCase(), cli, txt(r, "CODIGO DO CLIENTE"),
      parsePct(r[idx["% COMISSAO"]]), parseMoney(r[idx["VALOR VENDA"]]),
      parsePct(r[idx["PERCENTUAL DA VENDA"]]), parseMoney(r[idx["COMISSAO"]]),
      txt(r, "PGTO COMISSAO") === "" ? 0 : 1,
      pgtoTxt(r),
      parseMoney(r[COL_VENDA]), parseMoney(r[COL_COMISSAO])
    ]);
  }
  out.cab = { F: String(matriz[h][COL_VENDA] == null ? "" : matriz[h][COL_VENDA]).trim(), I: String(matriz[h][COL_COMISSAO] == null ? "" : matriz[h][COL_COMISSAO]).trim(), pgto: String(matriz[h][idxPgto] == null ? "" : matriz[h][idxPgto]).trim() };
  return out;
}

export function fmtPct(n) { return (Math.round(n * 100) / 100).toLocaleString("pt-BR") + "%"; }

export function fmtData(iso) {
  var d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function origemTexto(nome, total, iso) {
  return "Planilha " + nome + " · " + total + " linhas · atualizada em " + fmtData(iso) + ". Regra: Percentual da Venda arredondado, como aparece na planilha, de 50% ou mais, com Pgto Comissão vazio.";
}

// Comissões em aberto de um vendedor, com os totais exibidos na tela.
export function filtrar(rows, vendedor) {
  var lista = rows.filter(function (r) {
    return r[0] === vendedor && Math.round(r[5]) >= LIMITE && r[7] === 0;
  });
  var total = 0, vendas = 0;
  lista.forEach(function (r) { total += r[6]; vendas += r[4]; });
  return { lista: lista, total: total, vendas: vendas };
}

export function listarVendedores(rows) {
  var vend = {};
  rows.forEach(function (r) { vend[r[0]] = 1; });
  return Object.keys(vend).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
}

// ---------- Comissões pagas (aba nova) ----------

export const TODOS = "__TODOS__";
var MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
var RE_MES = /\b(JAN(?:EIRO)?|FEV(?:EREIRO)?|MAR(?:CO)?|ABR(?:IL)?|MAI(?:O)?|JUN(?:HO)?|JUL(?:HO)?|AGO(?:STO)?|SET(?:EMBRO)?|OUT(?:UBRO)?|NOV(?:EMBRO)?|DEZ(?:EMBRO)?)\b(?:\W+(?:DE\s+)?(\d{4}|\d{2})\b)?/;
var ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function ano4(a) { var n = parseInt(a, 10); return a.length <= 2 ? 2000 + n : n; }

// Tenta descobrir o mês de um texto de "Pgto Comissão": 10/10/2026, 2026-10-10, 10/2026, OUT/2026, Outubro...
// Devolve { ano, mes } (ano 0 se não houver) ou null quando o texto não indica um mês.
export function chaveMes(rotulo) {
  var s = norm(rotulo), m, mes, ano = 0;
  if ((m = s.match(/(\d{4})[\/.\-](\d{1,2})/))) { ano = +m[1]; mes = +m[2]; }
  else if ((m = s.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/))) { mes = +m[2]; ano = ano4(m[3]); }
  else if ((m = s.match(/(\d{1,2})[\/.\-](\d{4})/))) { mes = +m[1]; ano = +m[2]; }
  else if ((m = s.match(RE_MES))) { mes = ABREV.indexOf(m[1].slice(0, 3)) + 1; ano = m[2] ? ano4(m[2]) : 0; }
  else return null;
  return mes >= 1 && mes <= 12 ? { ano: ano, mes: mes } : null;
}

function nomeMes(k) { return MESES_ABREV[k.mes - 1] + (k.ano ? "/" + k.ano : ""); }

// Linhas com comissão paga (coluna de pagamento preenchida) do vendedor escolhido (ou de todos).
export function pagasDoVendedor(rows, vendedor) {
  return rows.filter(function (r) { return r[8] !== "" && (vendedor === TODOS || r[0] === vendedor); });
}

// Opções distintas de Pgto Comissão, em ordem cronológica quando todas indicam um mês;
// caso contrário, na ordem em que aparecem na planilha.
export function opcoesPagamento(pagas) {
  var vistos = {}, lista = [];
  pagas.forEach(function (r) { if (!vistos[r[8]]) { vistos[r[8]] = 1; lista.push(r[8]); } });
  var chaves = lista.map(chaveMes);
  if (lista.length && chaves.every(Boolean)) {
    var idx = lista.map(function (_, i) { return i; });
    idx.sort(function (a, b) {
      return (chaves[a].ano * 100 + chaves[a].mes) - (chaves[b].ano * 100 + chaves[b].mes) || a - b;
    });
    return idx.map(function (i) { return lista[i]; });
  }
  return lista;
}

// Totais, linhas e agrupamento mês a mês das comissões pagas nas opções selecionadas.
export function resumoPagas(rows, vendedor, selecionadas) {
  var sel = {};
  selecionadas.forEach(function (x) { sel[x] = 1; });
  var lista = pagasDoVendedor(rows, vendedor).filter(function (r) { return sel[r[8]]; });
  var total = 0, vendas = 0;
  lista.forEach(function (r) { total += r[10]; vendas += r[9]; });

  var chaves = selecionadas.map(chaveMes);
  var porMes = selecionadas.length > 0 && chaves.every(Boolean);
  var grupos = {}, ordem = [];
  lista.forEach(function (r) {
    var k = porMes ? chaveMes(r[8]) : null;
    var id = porMes ? k.ano + "-" + k.mes : r[8];
    if (!grupos[id]) {
      grupos[id] = { id: id, nome: porMes ? nomeMes(k) : r[8], ord: porMes ? k.ano * 100 + k.mes : 0, comissao: 0, vendas: 0, qtd: 0 };
      ordem.push(grupos[id]);
    }
    grupos[id].comissao += r[10]; grupos[id].vendas += r[9]; grupos[id].qtd += 1;
  });
  if (porMes) ordem.sort(function (a, b) { return a.ord - b.ord; });
  else {
    var pos = {};
    selecionadas.forEach(function (x, i) { pos[x] = i; });
    ordem.sort(function (a, b) { return pos[a.id] - pos[b.id]; });
  }
  return { lista: lista, total: total, vendas: vendas, meses: ordem, porMes: porMes, vendedores: porVendedor(lista) };
}

// Totais por vendedor (maior comissão primeiro).
export function porVendedor(lista) {
  var g = {}, out = [];
  lista.forEach(function (r) {
    if (!g[r[0]]) { g[r[0]] = { nome: r[0], comissao: 0, vendas: 0, qtd: 0 }; out.push(g[r[0]]); }
    g[r[0]].comissao += r[10]; g[r[0]].vendas += r[9]; g[r[0]].qtd += 1;
  });
  return out.sort(function (a, b) { return b.comissao - a.comissao || a.nome.localeCompare(b.nome, "pt-BR"); });
}

// Variação percentual entre dois valores (null quando não há base de comparação).
export function variacao(atual, anterior) {
  return anterior ? ((atual - anterior) / anterior) * 100 : null;
}
