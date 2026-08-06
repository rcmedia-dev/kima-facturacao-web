# Manual de Testes - Emissão de Fatura (3 Passos - Dia 6-7)

Este manual descreve o roteiro completo de testes funcionais para o fluxo de **Emissão de Faturas em 3 Passos** e a geração de PDF no **Kima Financeiro MVP**.

---

## 📋 Pré-requisitos
- Aplicação rodando localmente (`npm run dev`) em `http://localhost:3000`.
- Navegador atualizado (Chrome, Edge, Firefox ou Safari).
- Clientes e Artigos cadastrados no sistema (ou utilize os dados mock de demonstração).

---

## 🚀 Fluxo de Teste Guiado (3 Passos)

### Passo 1: Seleção de Cliente
- **Rota:** `/faturas/nova`
- **Ação 1:** Digite o nome ou NIF no campo de busca.
- **Resultado Esperado:** 
  - A lista filtra os clientes em tempo real.
  - O cliente é marcado visualmente ao ser clicado (`Borda Azul` + `Badge Selecionado`).
  - O resumo verde *"Cliente Confirmado"* exibe Nome, NIF e Contactos.
- **Ação 2 (Modal Rápido):** Clique em `Criar Novo Cliente`.
  - Cadastre um cliente novo e salve.
  - **Resultado Esperado:** O novo cliente é criado e selecionado automaticamente.
- **Ação 3:** Clique em `Próximo: Adicionar Linhas`.

---

### Passo 2: Adição de Linhas da Fatura
- **Ação 1:** No dropdown *Artigo / Serviço*, selecione um item (ex: `Consultoria em TI`).
- **Ação 2:** Especifique a quantidade (ex: `2`).
- **Ação 3:** Clique em `Adicionar Linha`.
- **Resultado Esperado:**
  - O item é incluído na tabela com Descrição, Quantidade, Preço Unitário, Badge da Taxa de IVA (0%, 7% ou 14%) e Subtotal da Linha com IVA.
  - O bloco inferior escuro (*TOTAL GERAL DA FATURA*) atualiza em tempo real o `Subtotal`, `Total IVA` e `TOTAL GERAL`.
- **Ação 4 (Remoção):** Clique no ícone de lixeira em uma linha da tabela.
  - **Resultado Esperado:** A linha é removida e os valores totais são recalculados imediatamente.
- **Ação 5:** Clique em `Próximo: Resumo e Emitir`.

---

### Passo 3: Revisão, Vencimento e Emissão
- **Ação 1:** Verifique os blocos de resumo (*Cliente Destinatário*, *Itens da Fatura* e *Totais*).
- **Ação 2:** Selecione a *Forma de Pagamento* (`Transferência`, `Multicaixa`, `Numerário`, etc.).
- **Ação 3:** Adicione uma observação no campo de texto (opcional).
- **Ação 4:** Clique no botão verde `Emitir Fatura Agora`.
- **Resultado Esperado:**
  - O botão entra em estado de carregamento (`Emitindo Fatura...`).
  - A notificação verde de confirmação é exibida.
  - O sistema gera a numeração sequencial automática (ex: `FT A/000001` ou `FT A/000002`).
  - O utilizador é automaticamente redirecionado para a página de detalhes da fatura em `/faturas/[id]`.

---

## 📄 Teste de Geração e Download de PDF

### Caso de Teste 4.1: Download do Documento PDF
- **Ação:** Na página de detalhes da fatura (`/faturas/[id]`), clique no botão `Baixar PDF`.
- **Resultado Esperado:**
  - O navegador inicia o download do arquivo `.pdf` (ex: `Fatura_A_000001.pdf`).
  - O documento PDF formatado via `jsPDF` contém:
    1. Cabeçalho com cor institucional azul e logotipo da empresa (se configurado).
    2. Coluna do Emissor (Empresa) e Coluna do Destinatário (Cliente).
    3. Caixa com Data de Emissão, Vencimento e Forma de Pagamento.
    4. Tabela estilizada com todas as linhas, IVA e totais em Kwanza (AOA).
    5. Rodapé legal de homologação/simulação MVP.

---

## ⚡ Módulo 5: Testes da API Backend (`/api/invoices`)

| Endpoint | Método | Payload de Exemplo | Resposta Esperada |
| :--- | :---: | :--- | :--- |
| `/api/invoices` | `GET` | N/A | `{ "success": true, "data": [...] }` |
| `/api/invoices` | `POST` | `{"clienteId": "...", "linhas": [{"artigoId": "...", "quantidade": 2, "descricao": "Item", "preco": 10000, "taxaIVA": "14"}], "formaPagamento": "Transferência"}` | `201 Created` com objeto da fatura e numeração gerada |
