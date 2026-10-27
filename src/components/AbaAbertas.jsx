import React, { useEffect, useMemo, useState } from "react";
import { brl, filtrar, fmtPct, listarVendedores } from "../lib/planilha.js";
import Barra from "./Barra.jsx";

// Aba original: comissões em aberto (Percentual da Venda arredondado >= 50% e Pgto Comissão vazio).
export default function AbaAbertas({ rows, carregado, carregando, onAtualizar }) {
  const [vendedor, setVendedor] = useState("");
  const vendedores = useMemo(() => listarVendedores(rows), [rows]);
  useEffect(() => {
    if (vendedores.length && vendedores.indexOf(vendedor) < 0) setVendedor(vendedores[0]);
  }, [vendedores, vendedor]);
  const { lista, total, vendas } = useMemo(() => filtrar(rows, vendedor), [rows, vendedor]);

  let vazio = "";
  if (!carregado) {
    vazio = carregando
      ? "Carregando a planilha..."
      : "Nenhuma planilha carregada ainda. Clique em Atualizar planilha para ler os dados do Google Sheets.";
  } else if (!lista.length) {
    vazio = "Nenhuma comissão em aberto para este vendedor.";
  }

  return (
    <>
      <Barra carregando={carregando} onAtualizar={onAtualizar}>
        <div className="field">
          <label htmlFor="vendedor">Vendedor</label>
          <select id="vendedor" value={vendedor} onChange={(ev) => setVendedor(ev.target.value)}>
            {vendedores.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </Barra>

      <section className="summary" aria-live="polite">
        <div className="main"><div className="k">Total de comissões em aberto</div><div className="v" id="total">{brl.format(total)}</div></div>
        <div><div className="k">Clientes</div><div className="v" id="qtd">{String(lista.length)}</div></div>
        <div><div className="k">Valor das vendas</div><div className="v" id="vendas">{brl.format(vendas)}</div></div>
      </section>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Nome do cliente</th>
              <th>Código</th>
              <th className="num">% Comissão</th>
              <th className="num">Valor da venda</th>
              <th className="num">Comissão</th>
            </tr>
          </thead>
          <tbody id="linhas">
            {lista.map((r, i) => (
              <tr key={r[2] + "|" + i}>
                <td className="name">{r[1]}</td>
                <td className="code">{r[2]}</td>
                <td className="num">{fmtPct(r[3])}</td>
                <td className="num">{brl.format(r[4])}</td>
                <td className="num">{brl.format(r[6])}</td>
              </tr>
            ))}
          </tbody>
          {lista.length > 0 && (
            <tfoot id="rodape">
              <tr>
                <td className="name">Total</td><td></td><td></td>
                <td className="num">{brl.format(vendas)}</td>
                <td className="num">{brl.format(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        {vazio && <div className="empty" id="vazio">{vazio}</div>}
      </div>
    </>
  );
}
