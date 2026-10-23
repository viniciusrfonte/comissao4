import test from "node:test";
import assert from "node:assert/strict";
import { extrair, filtrar, listarVendedores, parseMoney, parsePct, norm, fmtPct } from "../src/lib/planilha.js";

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
  assert.deepEqual(rows[0], ["ANA", "Cliente 1", "C1", 5, 10000, 50, 500, 0]);
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
