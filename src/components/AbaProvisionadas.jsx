import React, { useMemo, useState } from "react";
import { brl, fmtPct, listarVendedores, provisionadas } from "../lib/planilha.js";
import Barra from "./Barra.jsx";
import ListaMulti from "./ListaMulti.jsx";

const FAIXAS = [
  { id: "ate49", minimo: null, limite: 49, nome: "Vendas com comissionamento de até 49%" },
  { id: "de30", minimo: 30, limite: 49, nome: "Vendas com pagamento de 30% até 49%" },
  { id: "ate29", minimo: null, limite: 29, nome: "Vendas com percentual de até 29%" },
];

// Aba nova: comissões em aberto de vendas com Percentual da Venda baixo (até 49% ou até 30%).
export default function AbaProvisionadas({ rows, carregado, carregando, onAtualizar }) {
  const [faixa, setFaixa] = useState(FAIXAS[0].id);
  const f = FAIXAS.filter((x) => x.id === faixa)[0];
  const [sel, setSel] = useState(null); // null = todos os vendedores marcados
  const vendedores = useMemo(() => listarVendedores(rows), [rows]);
  const marcados = sel === null ? vendedores : vendedores.filter((v) => sel.indexOf(v) >= 0);
  const res = useMemo(() => provisionadas(rows, f.limite, marcados, f.minimo), [rows, f, marcados]);

  function alternar(v) {
    setSel(marcados.indexOf(v) >= 0 ? marcados.filter((x) => x !== v) : marcados.concat([v]));
  }

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
        <ListaMulti
          id="pv-vendedor" rotulo="Vendedor" nomeTodos="Todos os vendedores"
          itens={vendedores} marcados={marcados}
          onAlternar={alternar} onTodos={() => setSel(null)} onLimpar={() => setSel([])}
        />
      </Barra>

      <fieldset className="chips">
        <legend>Percentual da venda</legend>
        <div className="lista" id="pv-faixas">
          {FAIXAS.map((x) => (
            <label className="chip" key={x.id}>
              <input type="radio" name="pv-faixa" checked={faixa === x.id} onChange={() => setFaixa(x.id)} />
              <span>{x.nome}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="summary tres" aria-live="polite">
        <div className="main"><div className="k">Total de comissão em aberto</div><div className="v" id="pv-total">{brl.format(res.total)}</div></div>
        <div className="main"><div className="k">Total de vendas dessas comissões</div><div className="v" id="pv-vendas">{brl.format(res.vendas)}</div></div>
        <div><div className="k">Quantidade de vendas</div><div className="v" id="pv-qtd">{String(res.qtd)}</div></div>
      </section>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Código cliente</th>
              <th>Nome do cliente</th>
              <th>Vendedor</th>
              <th className="num">Valor da venda</th>
              <th className="num">Valor pago</th>
              <th className="num">Percentual</th>
              <th className="num">Comissão</th>
              <th>Mês</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody id="pv-linhas">
            {res.lista.map((r, i) => (
              <tr key={r[2] + "|" + i}>
                <td className="code">{r[2]}</td>
                <td className="name">{r[1]}</td>
                <td>{r[0]}</td>
                <td className="num">{brl.format(r[4])}</td>
                <td className="num">{brl.format(r[11])}</td>
                <td className="num">{fmtPct(r[5])}</td>
                <td className="num">{brl.format(r[6])}</td>
                <td>{r[12]}</td>
                <td className="obs">{r[13]}</td>
              </tr>
            ))}
          </tbody>
          {res.lista.length > 0 && (
            <tfoot>
              <tr>
                <td className="name">Total</td><td></td><td></td><td></td><td></td><td></td>
                <td className="num">{brl.format(res.total)}</td><td></td><td></td>
              </tr>
            </tfoot>
          )}
        </table>
        {res.lista.length === 0 && (
          <div className="empty" id="pv-vazio">
            {marcados.length === 0 ? "Marque ao menos um vendedor para ver as vendas." : "Nenhuma venda provisionada para esta seleção."}
          </div>
        )}
      </div>
    </>
  );
}
