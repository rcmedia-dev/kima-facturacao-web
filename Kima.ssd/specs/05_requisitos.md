# REQUISITOS - KIMA FINANCEIRO MVP (SEM AUTENTICAÇÃO)

## Requisitos Funcionais (RF)

| ID | Descrição |
| :--- | :--- |
| RF01 | Cadastrar, editar, listar e remover clientes (nome, NIF, contacto). |
| RF02 | Cadastrar, editar, listar e remover artigos (código, descrição, preço, IVA). |
| RF03 | Emitir fatura com: cliente, data, linhas, forma de pagamento. |
| RF04 | Calcular automaticamente: subtotal, IVA, total (em AOA). |
| RF05 | Gerar número sequencial automático para cada fatura (começando em 1). |
| RF06 | Visualizar fatura em PDF (com layout profissional). |
| RF07 | Listar faturas com filtros (período, status, cliente). |
| RF08 | Registrar pagamento de fatura (valor, data, método). |
| RF09 | Dashboard com: total faturado (mês), faturas pendentes, total clientes. |
| RF10 | Configurar dados da empresa (nome, NIF, morada, telefone, logotipo). |
| RF11 | **O sistema NÃO tem login ou senha. Acesso direto à URL.** |

## Requisitos Não Funcionais (RNF)

| ID | Descrição |
| :--- | :--- |
| RNF01 | Aplicação inteira em Next.js (API Routes + Frontend) - sem backend separado. |
| RNF02 | Banco de dados: SQLite (arquivo) via Prisma. |
| RNF03 | Deploy: Vercel (gratuito). |
| RNF04 | Interface responsiva (funciona no celular e desktop). |
| RNF05 | Emissão de fatura em menos de 30 segundos (UX otimizada). |
| RNF06 | Moeda: todos os valores em Kwanza (AOA). Formato: `1.234.567,00 Kz`. |
| RNF07 | **Acesso direto: qualquer pessoa com a URL pode usar o sistema.** |
| RNF08 | Código organizado: separação clara entre components, pages e api routes. |
| RNF09 | Geração de PDF usando `@react-pdf/renderer` ou `html2canvas + jspdf`. |
| RNF10 | Armazenamento do logotipo: upload para `/public/uploads` ou usar base64. |
