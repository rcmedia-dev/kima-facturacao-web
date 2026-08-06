# Manual de Testes - Listagem e Visualização de Faturas (Dia 8)

Este manual descreve o roteiro completo de testes funcionais para a **Listagem, Filtros, Paginação e Visualização de Faturas** no **Kima Financeiro MVP**.

---

## 📋 Pré-requisitos
- Aplicação em execução local (`npm run dev`) em `http://localhost:3000`.
- Navegador moderno (Chrome, Edge, Firefox ou Safari).
- Faturas previamente emitidas ou dados mockados de demonstração.

---

## 🔍 Módulo 1: Listagem e Pesquisa de Faturas (`/faturas`)

### Caso de Teste 1.1: Visualização da Tabela e Paginação (10 itens/pág)
- **Ação:** Acesse a rota `/faturas`.
- **Resultado Esperado:** 
  - A tabela exibe as colunas: `Nº Fatura`, `Cliente`, `Data Emissão`, `Vencimento`, `Total (AOA)`, `Status`, `Ações`.
  - São apresentadas **no máximo 10 faturas por página**.
  - O indicador de paginação no rodapé informa a contagem correta (ex: *A exibir 1 a 10 de 15 faturas*).
  - Os botões de navegação (*Anterior*, *Próximo*, *Números de Página*) permitem transitar entre as páginas.

### Caso de Teste 1.2: Pesquisa por Número de Fatura ou Nome de Cliente
- **Ação:** No campo de busca *Pesquisa*, digite o número de uma fatura (ex: `A/000001`) ou o nome de um cliente (ex: `Empresa Teste`).
- **Resultado Esperado:**
  - A tabela é filtrada instantaneamente exibindo apenas os registos correspondentes.
  - Ao clicar no botão `X` (limpar), a busca é redefinida e a tabela exibe todos os itens.

### Caso de Teste 1.3: Filtro por Estado (Status)
- **Ação:** No select *Estado*, altere de `Todos os Estados` para `Pendente`, `Pago` ou `Cancelado`.
- **Resultado Esperado:**
  - `Pendente`: Exibe apenas faturas com badge amarelo *Pendente*.
  - `Pago`: Exibe apenas faturas com badge verde *Pago*.
  - `Cancelado`: Exibe apenas faturas com badge vermelho *Cancelado*.

### Caso de Teste 1.4: Filtro por Intervalo de Datas
- **Ação:** Preencha os campos `Data Inicial` e `Data Final`.
- **Resultado Esperado:** A tabela exibe somente as faturas cuja `Data Emissão` esteja compreendida no intervalo selecionado.

---

## 👁️ Módulo 2: Visualização de Detalhes da Fatura (`/faturas/[id]`)

### Caso de Teste 2.1: Navegação para os Detalhes
- **Ação:** Na listagem de faturas, clique no ícone do olho (`Ver detalhes`) na linha de uma fatura.
- **Resultado Esperado:** O utilizador é redirecionado para a rota `/faturas/[id]`.

### Caso de Teste 2.2: Verificação do Conteúdo do Documento
- **Ação:** Revise as seções da página de detalhes.
- **Resultado Esperado:**
  - **Cabeçalho:** Número da fatura (`Série/Número`) e Badge de Estado.
  - **Cartão do Cliente:** Nome, NIF, Morada, Telefone e Email.
  - **Cartão de Informações:** Data de Emissão, Vencimento e Forma de Pagamento.
  - **Tabela de Linhas:** Descrição, Qtd, Preço Unitário, Taxa de IVA e Total da Linha com IVA.
  - **Bloco de Totais:** Subtotal Imponível (sem IVA), Total IVA e Total a Pagar em Kwanza (AOA).

### Caso de Teste 2.3: Download do Ficheiro PDF
- **Ação:** Na página de detalhe da fatura, clique no botão `Baixar PDF`.
- **Resultado Esperado:** O navegador baixa o ficheiro `.pdf` estilizado com o logotipo da empresa, colunas de emissor/cliente e totais.

### Caso de Teste 2.4: Botão "Voltar"
- **Ação:** Clique no botão `Voltar`.
- **Resultado Esperado:** Retorna à rota de listagem `/faturas`.

---

## ⚡ Módulo 3: Testes de API Backend (`/api/invoices`)

| Endpoint | Método | Query Params / Exemplo | Resposta Esperada |
| :--- | :---: | :--- | :--- |
| `/api/invoices` | `GET` | `?status=Pendente&page=1&limit=10` | Objeto com array de faturas e metadados de paginação (`totalItems`, `totalPages`, etc.) |
| `/api/invoices/[id]` | `GET` | N/A | Objeto completo da fatura com dados do cliente e linhas |
| `/api/invoices/[id]/pdf` | `GET` | N/A | Stream do ficheiro `application/pdf` para download direto |
