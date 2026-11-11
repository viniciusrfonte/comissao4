import React, { useEffect, useRef, useState } from "react";

// Filtro de coluna no estilo Excel: lista de valores com busca e marcação.
// selecionado = null (sem filtro) ou lista de textos marcados.
export default function FiltroColuna({ rotulo, valores, selecionado, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const botao = useRef(null);
  const painel = useRef(null);
  const ativo = Array.isArray(selecionado);

  function abrir() {
    if (aberto) { setAberto(false); return; }
    const r = botao.current.getBoundingClientRect();
    const largura = 288;
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)) });
    setBusca("");
    setAberto(true);
  }

  useEffect(() => {
    if (!aberto) return;
    const fora = (ev) => {
      if (painel.current && painel.current.contains(ev.target)) return;
      if (botao.current && botao.current.contains(ev.target)) return;
      setAberto(false);
    };
    const tecla = (ev) => { if (ev.key === "Escape") { setAberto(false); if (botao.current) botao.current.focus(); } };
    const rolagem = (ev) => { if (!(painel.current && painel.current.contains(ev.target))) setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", rolagem, true);
    window.addEventListener("resize", () => setAberto(false));
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", rolagem, true);
    };
  }, [aberto]);

  const marcados = ativo ? selecionado : valores;
  const visiveis = busca.trim()
    ? valores.filter((v) => (v === "" ? "(vazio)" : v).toLowerCase().indexOf(busca.trim().toLowerCase()) >= 0)
    : valores;

  function alternar(v) {
    const novo = marcados.indexOf(v) >= 0 ? marcados.filter((x) => x !== v) : marcados.concat([v]);
    onChange(novo.length === valores.length ? null : novo);
  }

  return (
    <>
      <button
        type="button" ref={botao} className={"filtro-btn" + (ativo ? " ativo" : "")}
        aria-label={"Filtrar " + rotulo + (ativo ? " (filtro ativo)" : "")} aria-haspopup="dialog" aria-expanded={aberto}
        onClick={abrir}
      >▾</button>
      {aberto && (
        <div className="filtro-painel" ref={painel} role="dialog" aria-label={"Filtro de " + rotulo} style={{ top: pos.top, left: pos.left }}>
          <input
            type="search" className="filtro-busca" placeholder="Pesquisar" autoFocus
            value={busca} onChange={(ev) => setBusca(ev.target.value)} aria-label={"Pesquisar em " + rotulo}
          />
          <div className="filtro-acoes">
            <button type="button" className="link" onClick={() => onChange(busca.trim() ? visiveis : null)}>
              {busca.trim() ? "Só estes" : "Selecionar tudo"}
            </button>
            <button type="button" className="link" onClick={() => onChange([])}>Limpar</button>
          </div>
          <div className="filtro-lista">
            {visiveis.length === 0 && <div className="muted filtro-vazio">Nada encontrado</div>}
            {visiveis.map((v) => (
              <label className="filtro-item" key={v} title={v}>
                <input type="checkbox" checked={marcados.indexOf(v) >= 0} onChange={() => alternar(v)} />
                <span>{v === "" ? "(vazio)" : v}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
