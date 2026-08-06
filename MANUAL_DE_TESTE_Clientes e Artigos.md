# Manual de Testes - CRUD de Clientes e Artigos (Dia 3-4)

Este manual descreve o roteiro completo para realização dos testes funcionais da interface e das rotas de API para o **CRUD de Clientes** e **CRUD de Artigos/Serviços** no **Kima Financeiro MVP**.

---

## 📋 Pré-requisitos
- Aplicação em execução local (`npm run dev`) no endereço `http://localhost:3000`.
- Navegador moderno (Chrome, Edge, Firefox ou Safari).

---

## 🔍 Módulo 1: Gestão de Clientes (`/clientes`)

### Caso de Teste 1.1: Listagem e Pesquisa de Clientes
- **Ação:** Acesse a rota `/clientes`.
- **Resultado Esperado:** 
  - Tabela renderizada contendo colunas: `Nome`, `NIF`, `Telefone`, `Email`, `Ações`.
  - Contador exibindo a quantidade atual de clientes cadastrados (ex: `4 clientes`).
  - Campo de busca funcional que filtra por **Nome** ou **NIF** em tempo real ao digitar.

### Caso de Teste 1.2: Cadastro de Cliente Pessoa Jurídica (PJ) com NIF Válido
- **Ação:** Clique no botão `+ Novo Cliente`.
- **Passos:**
  1. Selecione Tipo: `Pessoa Jurídica`.
  2. Preencha NIF: `5417001234` (10 dígitos).
  3. Preencha Nome: `Empresa Teste Angola Lda`.
  4. Preencha Morada: `Rua Rainha Ginga, Luanda`.
  5. Preencha Telefone: `+244 923 111 222`.
  6. Preencha Email: `contato@empresateste.ao`.
  7. Clique em `Criar`.
- **Resultado Esperado:** O cliente é cadastrado com sucesso e passa a ser exibido na tabela.

### Caso de Teste 1.3: Cadastro de Cliente Pessoa Física (PF) com BI Angolano
- **Ação:** Clique no botão `+ Novo Cliente`.
- **Passos:**
  1. Selecione Tipo: `Pessoa Física`.
  2. Preencha NIF: `005432198LA042` (Formato BI Angolano - 14 caracteres).
  3. Preencha Nome: `João Manuel dos Santos`.
  4. Preencha Morada: `Bairro Miramar, Luanda`.
  5. Preencha Telefone: `+244 912 345 678`.
  6. Preencha Email: `joao.santos@email.ao`.
  7. Clique em `Criar`.
- **Resultado Esperado:** O cliente PF com formato de BI Angolano é validado e salvo com sucesso.

### Caso de Teste 1.4: Validação de NIF Inválido (Bloqueio)
- **Ação:** Tente cadastrar um cliente com NIF incorreto (ex: `12345` ou `ABC1234567890`).
- **Resultado Esperado:** O sistema exibe mensagem de erro: *"NIF Angolano inválido. Deve possuir 10 dígitos (PJ/PF) ou 14 caracteres de BI (ex: 005432198LA042)"* e impede o envio do formulário.

### Caso de Teste 1.5: Edição de Cliente
- **Ação:** Na tabela de clientes, clique no ícone de lápis (`Editar`) da linha de um cliente.
- **Passos:** Altere o telefone ou a morada do cliente e clique em `Atualizar`.
- **Resultado Esperado:** A tabela é atualizada instantaneamente com as novas informações do cliente.

### Caso de Teste 1.6: Exclusão de Cliente
- **Ação:** Na tabela, clique no ícone da lixeira (`Excluir`) e confirme o alerta de confirmação.
- **Resultado Esperado:** O cliente é removido da listagem e o contador de clientes é reduzido em 1.

---

## 📦 Módulo 2: Gestão de Artigos / Serviços (`/artigos`)

### Caso de Teste 2.1: Listagem e Pesquisa de Artigos
- **Ação:** Acesse a rota `/artigos`.
- **Resultado Esperado:**
  - Tabela renderizada contendo colunas: `Código`, `Descrição`, `Preço (AOA)`, `IVA (%)`, `Ações`.
  - Os preços são exibidos devidamente formatados na moeda nacional (ex: `150.000,00 Kz` ou `AOA 150.000,00`).
  - Campo de busca funcional que filtra por **Código** ou **Descrição** em tempo real.

### Caso de Teste 2.2: Cadastro de Novo Artigo com IVA 14%
- **Ação:** Clique em `+ Novo Artigo`.
- **Passos:**
  1. Preencha Código: `SERV-IT-001`.
  2. Preencha Descrição: `Consultoria em Sistemas e TI`.
  3. Preencha Preço: `250000`.
  4. Selecione Taxa de IVA: `14%`.
  5. Categoria: `Serviços`.
  6. Stock Atual: `10`.
  7. Clique em `Criar`.
- **Resultado Esperado:** Artigo criado e exibido na tabela com taxa de 14% e preço formatado.

### Caso de Teste 2.3: Cadastro de Artigo Isento de IVA (0%)
- **Ação:** Clique em `+ Novo Artigo`.
- **Passos:**
  1. Preencha Código: `LIVRO-01`.
  2. Preencha Descrição: `Manual de Faturação Angolana`.
  3. Preencha Preço: `15000`.
  4. Selecione Taxa de IVA: `0% (Isento)`.
  5. Clique em `Criar`.
- **Resultado Esperado:** Artigo gravado com sucesso e IVA marcado como `0%`.

### Caso de Teste 2.4: Edição e Exclusão de Artigo
- **Ação:** Teste editar o preço ou descrição de um artigo e também o fluxo de exclusão com confirmação.
- **Resultado Esperado:** Alterações refletidas na tabela e exclusão executada com sucesso.

---

## ⚡ Módulo 3: Teste das API Routes (Backend)

Você também pode validar os endpoints diretamente via HTTP (Postman, Insomnia ou `curl`):

| Endpoint | Método | Payload de Exemplo | Resposta Esperada |
| :--- | :---: | :--- | :--- |
| `/api/clients` | `GET` | N/A | `{ "success": true, "data": [...] }` |
| `/api/clients` | `POST` | `{"nome": "Empresa API", "nif": "5417009999", "morada": "Luanda", "telefone": "923000000", "email": "api@teste.ao"}` | `201 Created` |
| `/api/clients/[id]` | `PUT` | `{"nome": "Empresa API Atualizada"}` | `200 OK` |
| `/api/clients/[id]` | `DELETE` | N/A | `200 OK` |
| `/api/products` | `GET` | N/A | `{ "success": true, "data": [...] }` |
| `/api/products` | `POST` | `{"codigo": "API-01", "descricao": "Item API", "preco": 5000, "taxaIVA": "14"}` | `201 Created` |
| `/api/products/[id]` | `PUT` | `{"preco": 6000}` | `200 OK` |
| `/api/products/[id]` | `DELETE` | N/A | `200 OK` |
