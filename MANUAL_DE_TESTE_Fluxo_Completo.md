# MANUAL DE TESTE - Fluxo Completo de Faturação

Este documento detalha o procedimento para validar o fluxo principal de operação do sistema Kima Financeiro.

## 1. Pré-condições
- O sistema deve estar rodando localmente (`npm run dev`).
- O banco de dados deve estar limpo ou com dados de teste.

## 2. Roteiro de Testes

### Passo 1: Configuração da Empresa
1. Acesse `/configuracoes`.
2. Preencha Nome, NIF (10 dígitos válidos), Morada, Telefone e Email.
3. Clique em **Guardar Configurações**.
4. **Validação:** Toast de sucesso deve ser exibido.

### Passo 2: Gestão de Clientes
1. Acesse `/clientes`.
2. Clique em **Novo Cliente**.
3. Preencha os campos (Tipo: PJ, NIF válido com módulo 11).
4. Clique em **Criar**.
5. **Validação:** Cliente deve aparecer na listagem com sucesso.

### Passo 3: Gestão de Artigos
1. Acesse `/artigos`.
2. Clique em **Novo Artigo**.
3. Preencha Código, Descrição, Preço (>0) e Taxa IVA.
4. Clique em **Criar**.
5. **Validação:** Artigo deve aparecer na listagem com sucesso.

### Passo 4: Emissão de Fatura
1. Acesse `/faturas/nova`.
2. **Passo 1:** Selecione o Cliente criado.
3. **Passo 2:** Adicione o Artigo criado (Quantidade > 0).
4. **Passo 3:** Revise os totais (Subtotal, IVA, Total).
5. Clique em **Emitir Fatura**.
6. **Validação:** Deve redirecionar para `/faturas/[id]` da fatura emitida.

### Passo 5: Registro de Pagamento
1. Na página de detalhe da fatura emitida:
2. Clique em **Registrar Pagamento**.
3. Informe o valor (igual ao total da fatura), data e forma de pagamento.
4. Clique em **Confirmar Pagamento**.
5. **Validação:** O status da fatura deve mudar para **Pago** e o valor deve refletir no Dashboard.

### Passo 6: Dashboard e Validações Finais
1. Acesse `/dashboard`.
2. **Validação:** O card "Total Faturado este Mês" deve estar atualizado e "Faturas Pendentes" deve decrementar.
3. **Responsividade:** Redimensione o navegador para testar a visualização em mobile.

---
*Manual de Testes - Kima Financeiro MVP*
