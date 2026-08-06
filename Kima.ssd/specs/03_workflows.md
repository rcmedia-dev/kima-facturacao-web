# WORKFLOWS - KIMA FINANCEIRO MVP

## Workflow 1: Emissão de Fatura (O Mais Importante)

```
1. Usuário acessa o sistema (URL direta) e clica em "Nova Fatura"
   ↓
2. Passo 1: Selecionar Cliente
   ├── Digita o nome ou NIF (autocomplete)
   ├── Ou clica em "Novo Cliente" (criação rápida)
   └── Cliente selecionado é exibido no resumo
   ↓
3. Passo 2: Adicionar Linhas
   ├── Pesquisa artigo (autocomplete por código/descrição)
   ├── Define quantidade
   ├── Sistema calcula total da linha (qtd × preço)
   ├── Botão "Adicionar Linha" → aparece na tabela
   ├── Pode remover linhas da tabela
   └── Botão "Próximo Passo"
   ↓
4. Passo 3: Resumo e Emissão
   ├── Exibe resumo: cliente, linhas, subtotal, IVA, total
   ├── Seleciona forma de pagamento (cash/transfer/multicaixa)
   ├── Define data de vencimento
   ├── Clica "Emitir Fatura"
   ↓
5. Sistema:
   ├── Valida: cliente obrigatório, pelo menos 1 linha
   ├── Atribui número sequencial automático
   ├── Calcula: subtotal, IVA por linha, total
   ├── Grava no banco (Invoice + InvoiceLines)
   ├── Gera PDF automaticamente
   ├── Redireciona para página de visualização da fatura
   └── Exibe toast de sucesso
```

## Workflow 2: Registrar Pagamento

```
1. Usuário acessa a fatura (via listagem ou dashboard)
   ↓
2. Clica em "Registrar Pagamento" (botão visível se status = pending)
   ↓
3. Modal aparece com:
   ├── Valor em dívida (exibido)
   ├── Campo: Valor a pagar (preenchido automaticamente com o total)
   ├── Campo: Data do pagamento (hoje, por padrão)
   └── Select: Método (cash, transfer, multicaixa)
   ↓
4. Clica em "Confirmar Pagamento"
   ↓
5. Sistema:
   ├── Valida: valor ≤ saldo devedor
   ├── Cria registro de Payment
   ├── Atualiza status da fatura para "paid"
   ├── Atualiza o saldo devedor do cliente
   ├── Registra a ação (log simples)
   └── Exibe toast de sucesso
```

## Workflow 3: Listar Faturas

```
1. Usuário acessa "Faturas" no menu
   ↓
2. Visualiza tabela com:
   ├── Nº da Fatura
   ├── Cliente
   ├── Data de Emissão
   ├── Total (AOA)
   └── Status (pending / paid / cancelled)
   ↓
3. Filtros disponíveis:
   ├── Período (data inicial → data final)
   ├── Status (todos / pending / paid / cancelled)
   └── Cliente (autocomplete)
   ↓
4. Clica em uma fatura para ver os detalhes
   ↓
5. Na página de detalhes:
   ├── Dados completos da fatura
   ├── Linhas (tabela)
   ├── Botão "Baixar PDF"
   ├── Botão "Registrar Pagamento" (se pending)
   └── Botão "Cancelar Fatura" (com confirmação)
```
