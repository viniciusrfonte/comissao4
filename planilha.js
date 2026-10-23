// Regras de negócio da versão original (copiadas sem alteração de comportamento).

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
// Cada registro: [vendedor, cliente, código, %comissão, venda, %venda, comissão, pago(0/1)]
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
  if (!("PGTO COMISSAO" in idx) && ("PAGTO COMISSAO" in idx)) idx["PGTO COMISSAO"] = idx["PAGTO COMISSAO"];
  var need = ["VENDEDOR", "NOME DO CLIENTE", "CODIGO DO CLIENTE", "% COMISSAO", "VALOR VENDA", "PERCENTUAL DA VENDA", "COMISSAO", "PGTO COMISSAO"];
  var falta = need.filter(function (n) { return !(n in idx); });
  if (falta.length) return { erro: "Colunas não encontradas: " + falta.join(", ") };
  var out = [];
  function txt(r, n) { var v = r[idx[n]]; return v == null ? "" : String(v).trim(); }
  for (j = h + 1; j < matriz.length; j++) {
    var r = matriz[j];
    var vend = txt(r, "VENDEDOR"), cli = txt(r, "NOME DO CLIENTE");
    if (!vend || !cli) continue;
    out.push([
      vend.toUpperCase(), cli, txt(r, "CODIGO DO CLIENTE"),
      parsePct(r[idx["% COMISSAO"]]), parseMoney(r[idx["VALOR VENDA"]]),
      parsePct(r[idx["PERCENTUAL DA VENDA"]]), parseMoney(r[idx["COMISSAO"]]),
      txt(r, "PGTO COMISSAO") === "" ? 0 : 1
    ]);
  }
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
