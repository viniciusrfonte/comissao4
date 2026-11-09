import React, { useEffect, useRef, useState } from "react";

// Caixa de seleção em lista suspensa, com marcação de vários itens (não ocupa espaço na página).
export default function ListaMulti({ id, rotulo, itens, marcados, onAlternar, onTodos, onLimpar, nomeTodos }) {
  const [aberta, setAberta] = useState(false);
  const caixa = useRef(null);

  useEffect(() => {
    if (!aberta) return;
    const fora = (ev) => { if (caixa.current && !caixa.current.contains(ev.target)) setAberta(false); };
    const tecla = (ev) => { if (ev.key === "Escape") setAberta(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", tecla); };
  }, [aberta]);

  const resumo =
    marcados.length === itens.length ? nomeTodos :
    marcados.length === 0 ? "Nenhum selecionado" :
    marcados.length === 1 ? marcados[0] :
    marcados.length + " de " + itens.length + " selecionados";

  return (
    <div className="field multi" ref={caixa}>
      <label id={id + "-rot"} htmlFor={id}>{rotulo}</label>
      <button type="button" id={id} className="multi-btn" aria-haspopup="listbox" aria-expanded={aberta} onClick={() => setAberta(!aberta)}>
        <span className="multi-txt">{resumo}</span><span aria-hidden="true">▾</span>
      </button>
      {aberta && (
        <div className="multi-lista" role="group" aria-labelledby={id + "-rot"}>
          <div className="multi-acoes">
            <button type="button" className="link" onClick={onTodos}>Selecionar todos</button>
            <button type="button" className="link" onClick={onLimpar}>Limpar</button>
          </div>
          <div className="multi-itens" id={id + "-itens"}>
            {itens.map((v) => (
              <label className="multi-item" key={v}>
                <input type="checkbox" checked={marcados.indexOf(v) >= 0} onChange={() => onAlternar(v)} />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
