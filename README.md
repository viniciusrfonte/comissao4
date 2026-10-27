# Comissões por Vendedor

Página que lê a planilha de vendas no Google Sheets e mostra, para cada vendedor, as comissões em aberto.

**Regra de negócio** (idêntica à versão feita no Claude): entra na lista a linha cujo *Percentual da Venda*, arredondado, é de **50% ou mais** e cuja coluna *Pgto Comissão* está **vazia**. A tela mostra o total de comissões em aberto, a quantidade de clientes, o valor das vendas e a tabela de clientes com total no rodapé.

## Abas

**Comissões em aberto**: a tela original, sem alterações de regra.

**Comissões pagas**: total pago por vendedor.
- Escolha um vendedor (ou "Todos os vendedores") e marque uma ou mais opções do filtro, que são os valores distintos da coluna **PAGTO DE COMISSÃO** (também aceita os títulos `PGTO COMISSÃO`, `PAGTO COMISSÃO` e `PGTO DE COMISSÃO`).
- **Comissão paga** = soma da **coluna I**. **Valor vendido** = soma da **coluna F**. Essas duas são lidas **pela posição** (F e I), não pelo título. Se você inserir ou mover colunas na planilha, a página avisa quando os títulos de F e I parecerem trocados.
- Só entram linhas com a coluna de pagamento preenchida.
- Gráficos de colunas "mês a mês" (comissão e valor vendido) e tabela com a variação sobre o mês anterior. O mês é reconhecido no texto do pagamento: `10/10/2026`, `2026-10-10`, `10/2026`, `OUT/2026`, `Outubro/2026`, `Pago em outubro de 2026`. Se algum valor selecionado não indicar um mês (por exemplo `Lote 2`), o comparativo passa a ser por valor do filtro, na ordem da planilha.

## Como funciona

```
Navegador (React)  ──►  /api/planilha (função da Vercel)  ──►  Google Sheets
   tela e cálculos         guarda as credenciais                 (somente leitura)
```

- O navegador **nunca** vê as credenciais do Google. Quem lê a planilha é a função `api/planilha.js`.
- Os cálculos e filtros rodam no navegador (`src/lib/planilha.js`).
- **Não precisa de banco de dados nem de Supabase.** A planilha é a fonte única dos dados. O último resultado fica guardado no navegador de cada pessoa só para abrir mais rápido, e a página busca a versão nova ao abrir.

## O que mudou em relação à versão dentro do Claude

| No Claude | Aqui | Efeito |
|---|---|---|
| Conector "Google Sheets" do Claude | Função `api/planilha.js` + conta de serviço do Google | Funciona sem o Claude |
| Banco compartilhado entre usuários | Não é mais necessário: todos leem a mesma planilha | O botão **Atualizar planilha** sempre traz o dado atual |
| Login da conta Claude | Senha opcional (`APP_PASSWORD`) | Controla quem vê as comissões |
| Planilha fixa no código | Variáveis `SHEET_ID` e `SHEET_RANGE` | Trocar de planilha sem mexer no código |

Os dados são de comissões. **Defina `APP_PASSWORD`**; sem ela, qualquer pessoa com o link vê tudo.

## 1. Configurar o acesso à planilha (uma vez)

### 1A. Planilha compartilhada por link (mais simples, sem Google Cloud)

1. Na planilha, clique em **Compartilhar > Acesso geral > Qualquer pessoa com o link > Leitor**.
2. `SHEET_ID`: trecho da URL entre `/d/` e `/edit`.
3. `SHEET_GID` (se houver mais de uma aba): número depois de `gid=` na URL quando a aba certa está aberta.
4. Pronto: não precisa de conta de serviço. Atenção: quem tiver o link da planilha também a vê direto no Google; a senha da página (`APP_PASSWORD`) só protege esta página.

### 1B. Planilha privada (conta de serviço do Google)

Use só se a planilha não puder ficar aberta por link.

1. Acesse <https://console.cloud.google.com/> e crie um projeto (ou use um existente).
2. Em **APIs e serviços > Biblioteca**, ative a **Google Sheets API**.
3. Em **IAM e administrador > Contas de serviço**, crie uma conta de serviço (sem papéis).
4. Abra a conta criada, aba **Chaves > Adicionar chave > Criar nova chave > JSON**. Um arquivo `.json` será baixado. **Não o coloque no repositório.**
5. No arquivo, você vai usar dois campos: `client_email` e `private_key`.
6. Abra a planilha no Google Sheets, clique em **Compartilhar** e adicione o `client_email` como **Leitor**.
7. O `SHEET_ID` é o trecho da URL da planilha entre `/d/` e `/edit`.

A planilha precisa ter, na faixa lida (padrão `Planilha1!A:K`), um cabeçalho com estas colunas (acentos e maiúsculas não importam): `Vendedor`, `Nome do Cliente`, `Código do Cliente`, `% Comissão`, `Valor Venda`, `Percentual da Venda`, `Comissão`, `Pgto Comissão`.

## 2. Rodar no seu computador

Requer [Node.js](https://nodejs.org/) 18 ou superior.

```bash
npm install
cp .env.example .env.local     # no Windows: copy .env.example .env.local
# edite .env.local com os valores do passo 1
npm run dev                    # abre em http://localhost:5173
npm test                       # testes das regras de cálculo
```

## 3. Publicar: GitHub + Vercel

**GitHub**

1. Crie um repositório vazio em <https://github.com/new> (pode ser privado).
2. Na pasta do projeto:

```bash
git init
git add .
git commit -m "Comissões por Vendedor"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git push -u origin main
```

O `.gitignore` já impede o envio de `.env*` e `node_modules`. Confira com `git status` que nenhum arquivo `.env` ou `.json` de credencial aparece.

**Vercel**

1. Em <https://vercel.com/new>, importe o repositório do GitHub. O Vercel detecta Vite sozinho (build `npm run build`, saída `dist`).
2. Antes de clicar em **Deploy**, abra **Environment Variables** e cadastre:

| Nome | Valor |
|---|---|
| `SHEET_ID` | ID da planilha |
| `SHEET_GID` | número da aba (modo link; opcional se houver só uma aba) |
| `SHEET_RANGE` | `Planilha1!A:K` (só no modo conta de serviço; opcional) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | só modo 1B: `client_email` do JSON |
| `GOOGLE_PRIVATE_KEY` | só modo 1B: `private_key` do JSON, inteira |
| `APP_PASSWORD` | senha de acesso à página |

3. Clique em **Deploy**. O link público sai no formato `https://nome-do-projeto.vercel.app`.
4. Se alterar variáveis depois, faça **Redeploy** para valerem.

## Problemas comuns

- **"O servidor ainda não está configurado"**: falta a variável `SHEET_ID` na Vercel.
- **"O Google Sheets recusou a leitura"**: a mensagem termina com o código do Google. `LINK_NAO_PUBLICO` = a planilha não está como "Qualquer pessoa com o link"; `PERMISSION_DENIED` = planilha não compartilhada com o `client_email`; `SERVICE_DISABLED` = ative a Google Sheets API no projeto; `404` = `SHEET_ID` errado.
- **"A aba ou a faixa não foi encontrada"**: confira o nome da aba em `SHEET_RANGE`.
- **"Colunas não encontradas"**: algum título do cabeçalho está diferente do esperado.
- **Totais diferentes do esperado**: a leitura usa o valor **como aparece formatado** na planilha (por exemplo `50%`), que é o que a regra de arredondamento considera.

## Estrutura

```
api/planilha.js        função serverless (lê o Google Sheets, confere a senha)
src/App.jsx            tela
src/lib/planilha.js    regras de negócio e cálculos
src/lib/api.js         chamada à função e mensagens de erro
src/styles.css         visual (mesmo CSS da versão original)
public/logo.png        logo
tests/                 testes das regras
.env.example           modelo das variáveis (sem valores reais)
```
