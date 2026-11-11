import React, { useEffect, useRef, useState } from "react";
import { brl, variacao } from "../lib/planilha.js";

const compacto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
// Rótulo curto (sem "R$" e sem casas) para colunas estreitas, para os valores não se sobreporem.
const curto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

// Gráfico de colunas em SVG (sem bibliotecas). Cada coluna mostra o valor e a variação sobre o período anterior.
export default function Grafico({ titulo, itens, serie }) {
  const n = itens.length;
  // Mede o espaço disponível: o gráfico ocupa a largura da coluna (sem rolagem lateral em telas largas).
  const caixa = useRef(null);
  const [larguraCaixa, setLarguraCaixa] = useState(0);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setLarguraCaixa(Math.floor(el.clientWidth));
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = Math.max(larguraCaixa || 340, n * 52, 300), H = 230;
  const topo = 30, base = 56, lado = 10;
  const area = H - topo - base;
  const max = Math.max.apply(null, itens.map((i) => i.valor).concat([0])) || 1;
  const passo = (W - lado * 2) / n;
  const larg = Math.min(46, passo * 0.62);
  const desc = titulo + ": " + itens.map((i) => i.nome + " " + brl.format(i.valor)).join("; ");

  return (
    <figure className="card grafico">
      <figcaption><h2>{titulo}</h2></figcaption>
      <div className="chartwrap" ref={caixa}>
        <svg role="img" aria-label={desc} viewBox={"0 0 " + W + " " + H} style={{ width: W }}>
          <line className="ch-eixo" x1={lado} x2={W - lado} y1={topo + area} y2={topo + area} />
          {itens.map((it, i) => {
            const h = (it.valor / max) * area;
            const cx = lado + passo * (i + 0.5);
            const v = i > 0 && it.mes && itens[i - 1].mes ? variacao(it.valor, itens[i - 1].valor) : null;
            const seta = v == null ? "" : (v >= 0 ? "▲ " : "▼ ") + Math.abs(Math.round(v)) + "%";
            return (
              <g key={it.nome + i}>
                <title>{it.nome + ": " + brl.format(it.valor)}</title>
                <rect x={cx - larg / 2} y={topo + area - h} width={larg} height={Math.max(h, it.valor ? 1 : 0)} rx="3" style={{ fill: "var(--" + serie + ")" }} />
                <text className="ch-valor" x={cx} y={topo + area - h - 7} textAnchor="middle" style={passo < 84 ? { fontSize: "10px" } : undefined}>{passo < 84 ? curto.format(it.valor) : compacto.format(it.valor)}</text>
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
