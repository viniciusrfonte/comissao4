import React, { useCallback, useEffect, useState } from "react";
import { extrair, origemTexto } from "./lib/planilha.js";
import { buscarPlanilha, gravarSenha, lerSenha, msgErro } from "./lib/api.js";
import AbaAbertas from "./components/AbaAbertas.jsx";
import AbaPagas from "./components/AbaPagas.jsx";

const STORE = "comissoes-planilha-v5";

function lerCache() {
  try {
    var salvo = JSON.parse(localStorage.getItem(STORE) || "null");
    if (salvo && salvo.rows && salvo.rows.length) return salvo;
  } catch (e) {}
  return null;
}
function gravarCache(rows, origem, cab) {
  try { localStorage.setItem(STORE, JSON.stringify({ rows: rows, origem: origem, cab: cab })); } catch (e) {}
}
function limparCache() {
  try { localStorage.removeItem(STORE); localStorage.removeItem("comissoes-planilha-v4"); localStorage.removeItem("comissoes-planilha-v3"); localStorage.removeItem("comissoes-planilha-v2"); } catch (e) {}
}

function Topo() {
  return (
    <header className="topo gutter">
      <div className="in">
        <img className="logo" src="/logo.png" alt="Rhino CNC" width="520" height="124" />
        <h1>Comissões por vendedor</h1>
      </div>
    </header>
  );
}

function Acesso({ onEntrar, erro }) {
  const [senha, setSenha] = useState("");
  return (
    <>
      <Topo />
      <div className="wrap gutter">
        <form
          className="gate"
          onSubmit={(ev) => { ev.preventDefault(); onEntrar(senha); }}
        >
          <div className="field" style={{ maxWidth: "none" }}>
            <label htmlFor="senha">Senha de acesso</label>
            <input
              id="senha" type="password" autoComplete="current-password" autoFocus
              value={senha} onChange={(ev) => setSenha(ev.target.value)}
            />
          </div>
          {erro && <div className="notice">{erro}</div>}
          <button type="submit" disabled={!senha}>Entrar</button>
        </form>
      </div>
    </>
  );
}

const ABAS = [
  { id: "abertas", nome: "Comissões em aberto" },
  { id: "pagas", nome: "Comissões pagas" },
];

export default function App() {
  const [rows, setRows] = useState([]);
  const [cab, setCab] = useState(null);
  const [origem, setOrigem] = useState("");
  const [carregado, setCarregado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState("");
  const [precisaSenha, setPrecisaSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");
  const [aba, setAba] = useState("abertas");

  const aplicar = useCallback((novas, texto, c) => {
    setRows(novas); setOrigem(texto); setCab(c || null); setCarregado(true);
  }, []);

  const atualizar = useCallback(async () => {
    setCarregando(true);
    setAviso("");
    try {
      const values = await buscarPlanilha();
      if (!Array.isArray(values)) {
        setAviso("O Google Sheets não devolveu dados da aba esperada.");
      } else {
        const extraidas = extrair(values);
        if (!extraidas) setAviso("Não encontrei as colunas VENDEDOR e PERCENTUAL DA VENDA na planilha.");
        else if (extraidas.erro) setAviso(extraidas.erro);
        else if (!extraidas.length) setAviso("A planilha não tem linhas com vendedor e cliente preenchidos.");
        else {
          const texto = origemTexto("Google Sheets", extraidas.length, new Date().toISOString());
          aplicar(extraidas, texto, extraidas.cab);
          gravarCache(extraidas, texto, extraidas.cab);
        }
      }
      setPrecisaSenha(false);
    } catch (e) {
      if (e && e.code === "unauthorized") {
        limparCache();
        setRows([]); setCarregado(false);
        setErroSenha(lerSenha() ? "Senha incorreta." : "");
        setPrecisaSenha(true);
      } else {
        setAviso(msgErro(e));
      }
    }
    setCarregando(false);
  }, [aplicar]);

  // Ao abrir: mostra o último resultado salvo no navegador e já busca a versão mais recente.
  useEffect(() => {
    const cache = lerCache();
    if (cache) aplicar(cache.rows, cache.origem, cache.cab);
    atualizar();
  }, [aplicar, atualizar]);

  if (precisaSenha) {
    return (
      <Acesso
        erro={erroSenha}
        onEntrar={(s) => { gravarSenha(s); setErroSenha(""); atualizar(); }}
      />
    );
  }

  function teclas(ev) {
    const i = ABAS.findIndex((a) => a.id === aba);
    if (ev.key === "ArrowRight") setAba(ABAS[(i + 1) % ABAS.length].id);
    else if (ev.key === "ArrowLeft") setAba(ABAS[(i + ABAS.length - 1) % ABAS.length].id);
  }

  return (
    <>
      <Topo />
      <div className="wrap gutter">
        <div className="tabs" role="tablist" aria-label="Seções" onKeyDown={teclas}>
          {ABAS.map((a) => (
            <button
              key={a.id} type="button" role="tab" id={"aba-" + a.id}
              className="tab" aria-selected={aba === a.id} aria-controls={"painel-" + a.id}
              tabIndex={aba === a.id ? 0 : -1} onClick={() => setAba(a.id)}
            >{a.nome}</button>
          ))}
        </div>

        {aviso && <div className="notice" id="aviso">{aviso}</div>}

        <div className="painel" role="tabpanel" id={"painel-" + aba} aria-labelledby={"aba-" + aba}>
          {aba === "abertas"
            ? <AbaAbertas rows={rows} carregado={carregado} carregando={carregando} onAtualizar={atualizar} />
            : <AbaPagas rows={rows} cab={cab} carregado={carregado} carregando={carregando} onAtualizar={atualizar} />}
        </div>

        <p className="foot" id="origem">{aba === "abertas" ? origem : origem.split(" Regra:")[0]}</p>
      </div>
    </>
  );
}
