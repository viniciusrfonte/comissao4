import React from "react";
import { brl, variacao } from "../lib/planilha.js";

const compacto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

// Gráfico de colunas em SVG (sem bibliotecas). Cada coluna mostra o valor e a variação sobre o período anterior.
export default function Grafico({ titulo, itens, serie }) {
  const n = itens.length;
  const W = Math.max(340, n * 76), H = 230;
  const topo = 30, base = 56, lado = 10;
  const area = H - topo - base;
  const max = Math.max.apply(null, itens.map((i) => i.valor).concat([0])) || 1;
  const passo = (W - lado * 2) / n;
  const larg = Math.min(46, passo * 0.62);
  const desc = titulo + ": " + itens.map((i) => i.nome + " " + brl.format(i.valor)).join("; ");

  return (
    <figure className="card grafico">
      <figcaption><h2>{titulo}</h2></figcaption>
      <div className="chartwrap">
        <svg role="img" aria-label={desc} viewBox={"0 0 " + W + " " + H} style={{ width: W > 700 ? W : "100%", minWidth: Math.min(W, 340) }}>
          <line className="ch-eixo" x1={lado} x2={W - lado} y1={topo + area} y2={topo + area} />
          {itens.map((it, i) => {
            const h = (it.valor / max) * area;
            const cx = lado + passo * (i + 0.5);
            const v = i > 0 ? variacao(it.valor, itens[i - 1].valor) : null;
            const seta = v == null ? "" : (v >= 0 ? "▲ " : "▼ ") + Math.abs(Math.round(v)) + "%";
            return (
              <g key={it.nome + i}>
                <title>{it.nome + ": " + brl.format(it.valor)}</title>
                <rect x={cx - larg / 2} y={topo + area - h} width={larg} height={Math.max(h, it.valor ? 1 : 0)} rx="3" style={{ fill: "var(--" + serie + ")" }} />
                <text className="ch-valor" x={cx} y={topo + area - h - 7} textAnchor="middle">{compacto.format(it.valor)}</text>
                <text className="ch-nome" x={cx} y={topo + area + 18} textAnchor="middle">{it.nome}</text>
                {seta && <text className="ch-var" x={cx} y={topo + area + 35} textAnchor="middle">{seta}</text>}
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
