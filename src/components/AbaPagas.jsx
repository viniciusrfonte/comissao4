import React, { useMemo, useState } from "react";
import { TODOS, brl, listarVendedores, opcoesPagamento, pagasDoVendedor, resumoPagas, totaisRhino, variacao } from "../lib/planilha.js";
import Barra from "./Barra.jsx";
import Grafico from "./Grafico.jsx";

function Variacao({ v }) {
  if (v == null) return <span className="muted">-</span>;
  return <span>{(v >= 0 ? "▲ " : "▼ ") + Math.abs(Math.round(v * 10) / 10).toLocaleString("pt-BR") + "%"}</span>;
}

// Aba nova: total pago por vendedor, filtrando por uma ou mais opções da coluna de pagamento.
// Somas: Comissão = coluna I; Valor venda = coluna F.
export default function AbaPagas({ rows, cab, carregado, carregando, onAtualizar }) {
  const [vendedor, setVendedor] = useState(TODOS);
  const [sel, setSel] = useState(null); // null = todas as opções marcadas
  const [detalhe, setDetalhe] = useState(false);

  const vendedores = useMemo(() => listarVendedores(rows), [rows]);
  const vendedorAtual = vendedor === TODOS || vendedores.indexOf(vendedor) >= 0 ? vendedor : TODOS;
  const opcoes = useMemo(() => opcoesPagamento(pagasDoVendedor(rows, vendedorAtual)), [rows, vendedorAtual]);
  const marcadas = sel === null ? opcoes : opcoes.filter((o) => sel.indexOf(o) >= 0);
  const rhino = useMemo(() => totaisRhino(rows), [rows]);
  const res = useMemo(() => resumoPagas(rows, vendedorAtual, marcadas), [rows, vendedorAtual, marcadas]);

  function alternar(o) {
    setSel(marcadas.indexOf(o) >= 0 ? marcadas.filter((x) => x !== o) : marcadas.concat([o]));
  }

  const nomeF = cab && cab.F, nomeI = cab && cab.I;
  const colunasSuspeitas = cab && (!/VENDA|VALOR/i.test(nomeF || "") || !/COMISS/i.test(nomeI || ""));
  const rotuloFiltro = (cab && cab.pgto) || "Pgto Comissão";

  if (!carregado) {
    return (
      <>
        <Barra carregando={carregando} onAtualizar={onAtualizar} />
        <div className="tablewrap"><div className="empty">
          {carregando ? "Carregando a planilha..." : "Nenhuma planilha carregada ainda. Clique em Atualizar planilha para ler os dados do Google Sheets."}
        </div></div>
      </>
    );
  }

  return (
    <>
      <Barra carregando={carregando} onAtualizar={onAtualizar}>
        <div className="field">
          <label htmlFor="pg-vendedor">Vendedor</label>
          <select id="pg-vendedor" value={vendedorAtual} onChange={(ev) => { setVendedor(ev.target.value); setSel(null); }}>
            <option value={TODOS}>Todos os vendedores</option>
            {vendedores.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </Barra>

      <fieldset className="chips">
        <legend>{"Filtro: " + rotuloFiltro}</legend>
        {opcoes.length === 0 ? (
          <p className="muted">Nenhuma comissão paga encontrada para este vendedor.</p>
        ) : (
          <>
            <div className="acoes">
              <button type="button" className="link" onClick={() => setSel(null)}>Selecionar todos</button>
              <button type="button" className="link" onClick={() => setSel([])}>Limpar</button>
              <span className="muted">{marcadas.length + " de " + opcoes.length + " selecionados"}</span>
            </div>
            <div className="lista" id="pg-opcoes">
              {opcoes.map((o) => (
                <label className="chip" key={o}>
                  <input type="checkbox" checked={marcadas.indexOf(o) >= 0} onChange={() => alternar(o)} />
                  <span>{o}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </fieldset>

      {colunasSuspeitas && (
        <div className="notice">
          {"Atenção: a coluna F se chama \"" + nomeF + "\" e a coluna I se chama \"" + nomeI + "\". Os totais usam a coluna F como valor vendido e a coluna I como comissão; confira se a ordem das colunas da planilha mudou."}
        </div>
      )}

      <section className="summary cinco" aria-live="polite">
        <div className="main"><div className="k">{"Comissão paga (coluna I)"}</div><div className="v" id="pg-total">{brl.format(res.total)}</div></div>
        <div><div className="k">Valor vendido (Vendas com 50% ou mais)</div><div className="v" id="pg-vendas">{brl.format(res.vendas)}</div></div>
        <div><div className="k">Vendas pagas</div><div className="v" id="pg-qtd">{String(res.lista.length)}</div></div>
        <div title={"Soma da coluna F" + (nomeF ? " (" + nomeF + ")" : "") + " da aba Planilha1"}>
          <div className="k">Total vendas 2026 Rhino</div>
          <div className="v" id="pg-total-2026">{brl.format(rhino.vendas)}</div>
        </div>
        <div title={"Soma da coluna G" + (cab && cab.G ? " (" + cab.G + ")" : "") + " da aba Planilha1"}>
          <div className="k">Total recebido Rhino</div>
          <div className="v" id="pg-recebido">{brl.format(rhino.recebido)}</div>
        </div>
      </section>

      {res.meses.length > 0 && (
        <>
          <h2 className="sec">{res.temMes ? "Comparativo mês a mês" : "Comparativo por pagamento"}</h2>
          <div className="grid2">
            <Grafico titulo="Comissão paga" serie="serie-a" itens={res.meses.map((m) => ({ nome: m.nome, valor: m.comissao, mes: m.mes }))} />
            <Grafico titulo="Valor vendido" serie="serie-b" itens={res.meses.map((m) => ({ nome: m.nome, valor: m.vendas, mes: m.mes }))} />
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>{res.porMes ? "Mês" : res.temMes ? "Mês / pagamento" : "Pagamento"}</th>
                  <th className="num">Vendas pagas</th>
                  <th className="num">Valor vendido</th>
                  <th className="num">Comissão</th>
                  <th className="num">Var. comissão</th>
                  <th className="num">Var. vendido</th>
                </tr>
              </thead>
              <tbody id="pg-meses">
                {res.meses.map((m, i) => (
                  <tr key={m.id}>
                    <td className="name">{m.nome}</td>
                    <td className="num">{m.qtd}</td>
                    <td className="num">{brl.format(m.vendas)}</td>
                    <td className="num">{brl.format(m.comissao)}</td>
                    <td className="num">{i > 0 && m.mes && res.meses[i - 1].mes ? <Variacao v={variacao(m.comissao, res.meses[i - 1].comissao)} /> : <span className="muted">-</span>}</td>
                    <td className="num">{i > 0 && m.mes && res.meses[i - 1].mes ? <Variacao v={variacao(m.vendas, res.meses[i - 1].vendas)} /> : <span className="muted">-</span>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="name">Total</td>
                  <td className="num">{res.lista.length}</td>
                  <td className="num">{brl.format(res.vendas)}</td>
                  <td className="num">{brl.format(res.total)}</td>
                  <td></td><td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {vendedorAtual === TODOS && res.vendedores.length > 0 && (
        <>
          <h2 className="sec">Por vendedor</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th className="num">Vendas pagas</th>
                  <th className="num">Valor vendido</th>
                  <th className="num">Comissão paga</th>
                </tr>
              </thead>
              <tbody id="pg-vendedores">
                {res.vendedores.map((v) => (
                  <tr key={v.nome}>
                    <td className="name">{v.nome}</td>
                    <td className="num">{v.qtd}</td>
                    <td className="num">{brl.format(v.vendas)}</td>
                    <td className="num">{brl.format(v.comissao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {res.lista.length > 0 && (
        <>
          <button type="button" className="link detalhe" onClick={() => setDetalhe(!detalhe)} aria-expanded={detalhe}>
            {detalhe ? "Ocultar clientes" : "Ver clientes (" + res.lista.length + ")"}
          </button>
          {detalhe && (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome do cliente</th>
                    {vendedorAtual === TODOS && <th>Vendedor</th>}
                    <th>Código</th>
                    <th>Pagamento</th>
                    <th className="num">Valor venda</th>
                    <th className="num">Comissão</th>
                  </tr>
                </thead>
                <tbody id="pg-linhas">
                  {res.lista.map((r, i) => (
                    <tr key={r[2] + "|" + i}>
                      <td className="name">{r[1]}</td>
                      {vendedorAtual === TODOS && <td>{r[0]}</td>}
                      <td className="code">{r[2]}</td>
                      <td>{r[8]}</td>
                      <td className="num">{brl.format(r[9])}</td>
                      <td className="num">{brl.format(r[10])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {res.lista.length === 0 && opcoes.length > 0 && (
        <p className="muted">Marque ao menos uma opção do filtro para ver os totais.</p>
      )}
    </>
  );
}
