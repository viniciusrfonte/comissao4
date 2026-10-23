# Comissões por Vendedor

Página que lê a planilha de vendas no Google Sheets e mostra, para cada vendedor, as comissões em aberto.

**Regra de negócio** (idêntica à versão feita no Claude): entra na lista a linha cujo *Percentual da Venda*, arredondado, é de **50% ou mais** e cuja coluna *Pgto Comissão* está **vazia**. A tela mostra o total de comissões em aberto, a quantidade de clientes, o valor das vendas e a tabela de clientes com total no rodapé.

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

## 1. Configurar o Google (uma vez)

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
| `SHEET_RANGE` | `Planilha1!A:K` (opcional) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` do JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` do JSON, inteira (com `-----BEGIN...` e `...END-----`) |
| `APP_PASSWORD` | senha de acesso à página |

3. Clique em **Deploy**. O link público sai no formato `https://nome-do-projeto.vercel.app`.
4. Se alterar variáveis depois, faça **Redeploy** para valerem.

## Problemas comuns

- **"O servidor ainda não está configurado"**: falta alguma das três variáveis do Google na Vercel.
- **"O Google Sheets recusou a leitura"**: a planilha não foi compartilhada com o `client_email`, ou o `SHEET_ID` está errado.
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
