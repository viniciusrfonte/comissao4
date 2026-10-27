import React from "react";

// Faixa superior das abas: filtros à esquerda e botão de atualizar à direita (igual à versão original).
export default function Barra({ children, carregando, onAtualizar }) {
  return (
    <div className="bar">
      {children}
      <div className="spacer"></div>
      <button type="button" id="atualizar" disabled={carregando} onClick={onAtualizar}>
        {carregando ? "Atualizando..." : "Atualizar planilha"}
      </button>
    </div>
  );
}
