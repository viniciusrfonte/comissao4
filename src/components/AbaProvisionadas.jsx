import React, { useEffect, useMemo, useState } from "react";
import { COLUNAS_PROV, brl, filtrarColunas, listarVendedores, provisionadas, totaisLista, valoresColuna } from "../lib/planilha.js";
import Barra from "./Barra.jsx";
import ListaMulti from "./ListaMulti.jsx";
import FiltroColuna from "./FiltroColuna.jsx";

const FAIXAS = [
  { id: "ate49", minimo: null, limite: 49, nome: "Vendas com comissionamento de até 49%" },
  { id: "de30", minimo: 30, limite: 49, nome: "Vendas com pagamento de 30% até 49%" },
  { id: "ate29", minimo: null, limite: 29, nome: "Vendas com percentual de até 29%" },
];

// Comissões em aberto de vendas com Percentual da Venda baixo, com filtro estilo Excel em cada coluna.
export default function AbaProvisionadas({ rows, carregado, carregando, onAtualizar }) {
  const [faixa, setFaixa] = useState(FAIXAS[0].id);
  const f = FAIXAS.filter((x) => x.id === faixa)[0];
  const [sel, setSel] = useState(null); // null = todos os vendedores marcados
  const vendedores = useMemo(() => listarVendedores(rows), [rows]);
  const marcados = sel === null ? vendedores : vendedores.filter((v) => sel.indexOf(v) >= 0);
  const res = useMemo(() => provisionadas(rows, f.limite, marcados, f.minimo), [rows, f, marcados]);

  // Filtros por coluna (estilo Excel). Voltam ao padrão quando muda o filtro de percentual ou de vendedor.
  const [filtros, setFiltros] = useState({});
  const chaveBase = faixa + "|" + marcados.join("|");
  useEffect(() => { setFiltros({}); }, [chaveBase]);
  const lista = useMemo(() => filtrarColunas(res.lista, filtros), [res.lista, filtros]);
  const tot = useMemo(() => totaisLista(lista), [lista]);
  const opcoes = useMemo(() => {
    const o = {};
    COLUNAS_PROV.forEach((c) => { o[c.k] = valoresColuna(res.lista, c); });
    return o;
  }, [res.lista]);
  const nAtivos = COLUNAS_PROV.filter((c) => Array.isArray(filtros[c.k])).length;
  function mudarFiltro(k, v) {
    setFiltros((atual) => { const n = Object.assign({}, atual); if (v === null) delete n[k]; else n[k] = v; return n; });
  }

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
        <div className="main"><div className="k">Total de comissão em aberto</div><div className="v" id="pv-total">{brl.format(tot.total)}</div></div>
        <div className="main"><div className="k">Total de vendas dessas comissões</div><div className="v" id="pv-vendas">{brl.format(tot.vendas)}</div></div>
        <div><div className="k">Quantidade de vendas</div><div className="v" id="pv-qtd">{String(tot.qtd)}</div></div>
      </section>

      {nAtivos > 0 && (
        <div className="filtros-ativos" id="pv-ativos">
          <span>{nAtivos === 1 ? "1 filtro de coluna ativo" : nAtivos + " filtros de coluna ativos"}</span>
          <button type="button" className="link" onClick={() => setFiltros({})}>Limpar filtros</button>
        </div>
      )}

      <div className="tablewrap">
        <table className="compacta">
          <thead>
            <tr>
              {COLUNAS_PROV.map((c) => (
                <th key={c.k} className={c.num ? "num" : ""}>
                  <span className="th-in">
                    <span>{c.rot}</span>
                    <FiltroColuna rotulo={c.rot} valores={opcoes[c.k]} selecionado={filtros[c.k] || null} onChange={(v) => mudarFiltro(c.k, v)} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody id="pv-linhas">
            {lista.map((r, i) => (
              <tr key={r[2] + "|" + i}>
                {COLUNAS_PROV.map((c) => (
                  <td key={c.k} className={(c.num ? "num " : "") + (c.cls || "")}>{c.get(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {lista.length > 0 && (
            <tfoot>
              <tr id="pv-rodape">
                {COLUNAS_PROV.map((c, i) => (
                  <td key={c.k} className={c.k === "com" ? "num" : i === 0 ? "name" : ""}>
                    {c.k === "com" ? brl.format(tot.total) : i === 0 ? (nAtivos > 0 ? "Total (filtrado)" : "Total") : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
        {lista.length === 0 && (
          <div className="empty" id="pv-vazio">
            {marcados.length === 0
              ? "Marque ao menos um vendedor para ver as vendas."
              : res.lista.length > 0
                ? "Nenhuma venda com os filtros de coluna selecionados."
                : "Nenhuma venda provisionada para esta seleção."}
          </div>
        )}
      </div>
    </>
  );
}
