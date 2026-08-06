# MANUAL DE TESTE - Live Preview & Emissão de Documentos

Este manual descreve os passos necessários para testar e validar a nova funcionalidade de **Pré-visualização em Tempo Real (Live Preview)** integrada no processo de criação de faturas e documentos no **Kima Financeiro**.

---

## 🎯 Objetivo
Permitir que o utilizador visualize instantaneamente como o documento (Fatura, Fatura-Recibo, Orçamento, Nota de Crédito, etc.) será gerado, garantindo feedback visual imediato à medida que seleciona o cliente, adiciona artigos e altera quantidades.

---

## 🧪 Casos de Teste

### Cenário 1: Verificação Inicial do Layout Split-Screen
1. **Ação:** Aceder a **Faturas > Nova Fatura** no menu principal.
2. **Resultado Esperado:** 
   * O ecrã divide-se em duas colunas responsivas em ecrãs médios/grandes (`lg:grid-cols-12`).
   * À esquerda, o assistente (wizard) em passos para preenchimento.
   * À direita (fixo em `sticky top-6`), o painel de **Pré-visualização ao Vivo** com o selo verde indicador de atualização em tempo real.

### Cenário 2: Atualização Dinâmica do Tipo de Documento
1. **Ação:** No Passo 1, altere o **Tipo de Documento** entre *Fatura*, *Orçamento*, *Nota de Crédito*, *Fatura-Recibo*, etc.
2. **Resultado Esperado:**
   * O selo de identificação no topo do Preview altera-se instantaneamente com a respetiva cor e designação (ex: badge azul para *Fatura*, cinzento escuro para *Orçamento*, etc.).
   * O cabeçalho do documento reflete a mudança em tempo real.

### Cenário 3: Seleção de Cliente e Atualização do Preview
1. **Ação:** Pesquise e selecione um cliente na lista do Passo 1.
2. **Resultado Esperado:**
   * O bloco *"Exmo(s). Sr(s)."* no painel de Preview à direita preenche-se automaticamente com o **Nome**, **NIF** e **Morada** do cliente selecionado.

### Cenário 4: Adição e Modificação de Linhas de Artigos
1. **Ação:** Avance para o **Passo 2: Linhas**, selecione um artigo/serviço, defina a quantidade (ex: `3`) e clique em **Adicionar Linha**.
2. **Resultado Esperado:**
   * A tabela de itens no preview à direita atualiza-se imediatamente, mostrando a descrição, quantidade, preço unitário, taxa de IVA e o total calculado da linha.
   * Os totais gerais (Subtotal de Incidência, Total de IVA e Total Geral em AOA) são recalculados em tempo real na parte inferior do preview.

### Cenário 5: Emissão Final do Documento
1. **Ação:** Avance para o **Passo 3**, confirme a forma de pagamento e clique em **Emitir Documento**.
2. **Resultado Esperado:**
   * O documento é gravado com sucesso, exibindo o ecrã de confirmação e redirecionando para a página de detalhes/PDF final.

---

## ✅ Critérios de Aceitação
- [x] O preview é responsivo e mantém-se visível sem sobreposição indevida.
- [x] Todas as alterações de tipo de documento, cliente e linhas refletem-se sem atrasos percetíveis.
- [x] A formatação monetária respeita estritamente o Kwanza (`AOA`) via `formatMoedaAOA`.
- [x] O design mantém a identidade visual corporativa do Kima Financeiro (`bg-slate-900`, tons azuis e cinzentos limpos).
