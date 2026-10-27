import test from "node:test";
import assert from "node:assert/strict";
import { extrair, filtrar, listarVendedores, parseMoney, parsePct, norm, fmtPct, chaveMes, opcoesPagamento, pagasDoVendedor, resumoPagas, TODOS, variacao } from "../src/lib/planilha.js";

const cab = ["Vendedor", "Nome do Cliente", "Código do Cliente", "% Comissão", "Valor Venda", "Percentual da Venda", "Comissão", "Pgto Comissão"];
const matriz = [
  ["Relatório de comissões"],
  cab,
  ["ana", "Cliente 1", "C1", "5%", "R$ 10.000,00", "50%", "R$ 500,00", ""],
  ["ana", "Cliente 2", "C2", "5%", "R$ 20.000,00", "49,6%", "R$ 1.000,00", ""],   // 49,6 arredonda para 50: entra
  ["ana", "Cliente 3", "C3", "5%", "R$ 1.000,00", "49,4%", "R$ 50,00", ""],       // 49,4 arredonda para 49: fora
  ["ana", "Cliente 4", "C4", "5%", "R$ 5.000,00", "100%", "R$ 250,00", "pago"],   // já pago: fora
  ["bruno", "Cliente 5", "C5", 0.05, 8000, 0.5, 400, ""],                         // números puros: 0,5 vira 50%
  ["bruno", "", "C6", "5%", "R$ 1,00", "100%", "R$ 1,00", ""],                    // sem cliente: ignorada
];

test("extrai colunas pelo cabeçalho, mesmo com acentos e linhas acima", () => {
  const rows = extrair(matriz);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0].slice(0, 9), ["ANA", "Cliente 1", "C1", 5, 10000, 50, 500, 0, ""]);
});

test("regra: percentual arredondado >= 50 e Pgto Comissão vazio", () => {
  const rows = extrair(matriz);
  const ana = filtrar(rows, "ANA");
  assert.equal(ana.lista.length, 2);
  assert.equal(ana.total, 1500);
  assert.equal(ana.vendas, 30000);
  const bruno = filtrar(rows, "BRUNO");
  assert.equal(bruno.lista.length, 1);
  assert.equal(bruno.total, 400);
});

test("vendedores em ordem alfabética", () => {
  assert.deepEqual(listarVendedores(extrair(matriz)), ["ANA", "BRUNO"]);
});

test("aceita 'Pagto Comissão' e avisa quando falta coluna", () => {
  const m = [cab.map((c) => (c === "Pgto Comissão" ? "Pagto Comissão" : c)), matriz[2]];
  assert.equal(extrair(m).length, 1);
  assert.match(extrair([cab.slice(0, 7).concat("X"), matriz[2]]).erro, /PGTO COMISSAO/);
  assert.equal(extrair([["a", "b"]]), null);
});

test("conversões", () => {
  assert.equal(parseMoney("R$ 1.234,56"), 1234.56);
  assert.equal(parsePct("49,6%"), 49.6);
  assert.equal(parsePct(0.5), 50);
  assert.equal(norm("  Código  do Cliente "), "CODIGO DO CLIENTE");
  assert.equal(fmtPct(5), "5%");
});

// Layout A..K: F = Valor venda, I = Comissão, H = Pagto de comissão
const cab11 = ["Vendedor", "Nome do Cliente", "Código do Cliente", "% Comissão", "Obs", "Valor Venda", "Percentual da Venda", "Pagto de Comissão", "Comissão", "x", "y"];
const L = (v, c, venda, perc, com, pg) => [v, c, "1", "5%", "", venda, perc, pg, com, "", ""];
// extrair localiza pelo nome; aqui F e I precisam bater com a posição, então montamos com os nomes nas posições certas
const cabPos = ["Vendedor", "Nome do Cliente", "Código do Cliente", "% Comissão", "Obs", "Valor Venda", "Percentual da Venda", "Pagto de Comissão", "Comissão", "x", "y"];
const pagas = extrair([
  cabPos,
  L("ana", "A", "R$ 1.000,00", "100%", "R$ 100,00", "Outubro/2026"),
  L("ana", "B", "R$ 2.000,00", "100%", "R$ 200,00", "Setembro/2026"),
  L("ana", "C", "R$ 3.000,00", "100%", "R$ 300,00", "Setembro/2026"),
  L("bruno", "D", "R$ 4.000,00", "100%", "R$ 400,00", "10/10/2026"),
  L("bruno", "E", "R$ 500,00", "100%", "R$ 50,00", ""),
]);

test("lê a coluna de pagamento (PAGTO DE COMISSÃO) e as colunas F e I por posição", () => {
  assert.equal(pagas.cab.F, "Valor Venda");
  assert.equal(pagas.cab.I, "Comissão");
  assert.equal(pagas.cab.pgto, "Pagto de Comissão");
  assert.deepEqual([pagas[0][8], pagas[0][9], pagas[0][10]], ["Outubro/2026", 1000, 100]);
  assert.equal(pagas[4][8], "");
});

test("reconhece o mês em vários formatos", () => {
  assert.deepEqual(chaveMes("10/10/2026"), { ano: 2026, mes: 10 });
  assert.deepEqual(chaveMes("2026-03-15"), { ano: 2026, mes: 3 });
  assert.deepEqual(chaveMes("10/2026"), { ano: 2026, mes: 10 });
  assert.deepEqual(chaveMes("OUT/2026"), { ano: 2026, mes: 10 });
  assert.deepEqual(chaveMes("Pago em outubro de 2026"), { ano: 2026, mes: 10 });
  assert.deepEqual(chaveMes("Setembro"), { ano: 0, mes: 9 });
  assert.equal(chaveMes("Pago"), null);
  assert.equal(chaveMes("Lote 2"), null);
});

test("opções em ordem cronológica; texto livre mantém a ordem da planilha", () => {
  assert.deepEqual(opcoesPagamento(pagasDoVendedor(pagas, "ANA")), ["Setembro/2026", "Outubro/2026"]);
  const livres = extrair([cabPos, L("ana", "A", "1", "100%", "1", "Lote 2"), L("ana", "B", "1", "100%", "1", "Lote 1")]);
  assert.deepEqual(opcoesPagamento(pagasDoVendedor(livres, "ANA")), ["Lote 2", "Lote 1"]);
});

test("totais pagos somam F (venda) e I (comissão) por vendedor, seleção e mês", () => {
  const ana = resumoPagas(pagas, "ANA", ["Setembro/2026", "Outubro/2026"]);
  assert.equal(ana.total, 600);
  assert.equal(ana.vendas, 6000);
  assert.deepEqual(ana.meses.map((m) => [m.nome, m.comissao, m.vendas, m.qtd]), [["set/2026", 500, 5000, 2], ["out/2026", 100, 1000, 1]]);
  assert.equal(resumoPagas(pagas, "ANA", ["Setembro/2026"]).total, 500);
  const todos = resumoPagas(pagas, TODOS, ["Setembro/2026", "Outubro/2026", "10/10/2026"]);
  assert.equal(todos.total, 1000);
  assert.deepEqual(todos.vendedores.map((v) => [v.nome, v.comissao]), [["BRUNO", 400], ["ANA", 600]].sort((a, b) => b[1] - a[1]));
  assert.equal(resumoPagas(pagas, "ANA", []).total, 0);
  assert.equal(variacao(150, 100), 50);
  assert.equal(variacao(5, 0), null);
});

test("sem coluna 'de': aceita PGTO COMISSÃO como filtro", () => {
  const c = cabPos.map((x) => (x === "Pagto de Comissão" ? "Pgto Comissão" : x));
  const r = extrair([c, L("ana", "A", "R$ 10,00", "100%", "R$ 1,00", "Set/2026")]);
  assert.equal(r[0][8], "Set/2026");
});
