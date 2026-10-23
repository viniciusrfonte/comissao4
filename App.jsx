import React, { useCallback, useEffect, useMemo, useState } from "react";
import { brl, extrair, filtrar, fmtPct, listarVendedores, origemTexto } from "./lib/planilha.js";
import { buscarPlanilha, gravarSenha, lerSenha, msgErro } from "./lib/api.js";

const STORE = "comissoes-planilha-v2";

function lerCache() {
  try {
    var salvo = JSON.parse(localStorage.getItem(STORE) || "null");
    if (salvo && salvo.rows && salvo.rows.length) return salvo;
  } catch (e) {}
  return null;
}
function gravarCache(rows, origem) {
  try { localStorage.setItem(STORE, JSON.stringify({ rows: rows, origem: origem })); } catch (e) {}
}
function limparCache() {
  try { localStorage.removeItem(STORE); } catch (e) {}
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

export default function App() {
  const [rows, setRows] = useState([]);
  const [origem, setOrigem] = useState("");
  const [carregado, setCarregado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [vendedor, setVendedor] = useState("");
  const [aviso, setAviso] = useState("");
  const [precisaSenha, setPrecisaSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");

  const aplicar = useCallback((novas, texto) => {
    setRows(novas); setOrigem(texto); setCarregado(true);
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
          aplicar(extraidas, texto);
          gravarCache(extraidas, texto);
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
    if (cache) aplicar(cache.rows, cache.origem);
    atualizar();
  }, [aplicar, atualizar]);

  const vendedores = useMemo(() => listarVendedores(rows), [rows]);
  useEffect(() => {
    if (vendedores.length && vendedores.indexOf(vendedor) < 0) setVendedor(vendedores[0]);
  }, [vendedores, vendedor]);

  const { lista, total, vendas } = useMemo(() => filtrar(rows, vendedor), [rows, vendedor]);

  if (precisaSenha) {
    return (
      <Acesso
        erro={erroSenha}
        onEntrar={(s) => { gravarSenha(s); setErroSenha(""); atualizar(); }}
      />
    );
  }

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
      <Topo />
      <div className="wrap gutter">
        <div className="bar">
          <div className="field">
            <label htmlFor="vendedor">Vendedor</label>
            <select id="vendedor" value={vendedor} onChange={(ev) => setVendedor(ev.target.value)}>
              {vendedores.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="spacer"></div>
          <button type="button" id="atualizar" disabled={carregando} onClick={atualizar}>
            {carregando ? "Atualizando..." : "Atualizar planilha"}
          </button>
        </div>

        {aviso && <div className="notice" id="aviso">{aviso}</div>}

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

        <p className="foot" id="origem">{origem}</p>
      </div>
    </>
  );
}
