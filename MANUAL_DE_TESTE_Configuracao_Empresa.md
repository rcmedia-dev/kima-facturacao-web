# Manual de Testes - Configuração da Empresa (Dia 5)

Este manual descreve o roteiro completo de testes para a funcionalidade de **Configuração da Empresa** no **Kima Financeiro MVP**.

---

## 📋 Pré-requisitos
- Aplicação em execução local (`npm run dev`) em `http://localhost:3000`.
- Navegador de internet (Chrome, Edge, Firefox ou Safari).

---

## 🔍 Módulo 1: Configurações da Empresa (`/configuracoes`)

### Caso de Teste 1.1: Carregamento Inicial dos Dados
- **Ação:** Acesse a rota `/configuracoes`.
- **Resultado Esperado:** 
  - O formulário deve carregar preenchido com os dados atuais da empresa (`Nome`, `NIF`, `Morada`, `Telefone`, `Email` e `Logotipo`).
  - Se for o primeiro acesso, exibe os dados pré-configurados padrão da empresa (ex: *Kima Tecnologias & Serviços Lda*).

### Caso de Teste 1.2: Upload do Logotipo (Imagem Base64)
- **Ação:** No bloco *Logotipo da Empresa*, clique em `Carregar Logotipo` ou `Alterar Logotipo`.
- **Passos:**
  1. Selecione uma imagem nos formatos `.png`, `.jpg`, `.svg` ou `.webp` (tamanho < 2MB).
  2. Verifique o resultado do *preview*.
- **Resultado Esperado:** A imagem é imediatamente exibida no quadro de preview.

### Caso de Teste 1.3: Remoção do Logotipo
- **Ação:** Com um logotipo visível no preview, passe o cursor do mouse e clique no botão `Remover`.
- **Resultado Esperado:** O logotipo é removido e o preview retorna ao estado inicial com o ícone genérico de empresa.

### Caso de Teste 1.4: Validação do NIF da Empresa (Módulo 11)
- **Ação:** No campo `NIF Angolano`, digite um valor numérico inválido (ex: `12345` ou NIF que falhe na validação de 10 dígitos).
- **Resultado Esperado:**
  - O campo exibe mensagem de alerta em vermelho: *"NIF Angolano inválido (deve possuir 10 dígitos numéricos)"*.
  - O botão `Salvar Configurações` fica desabilitado.

### Caso de Teste 1.5: Atualização e Salvação com Sucesso
- **Ação:** Preencha NIF válido (ex: `5417082910`), altere o nome da empresa ou o telefone e clique em `Salvar Configurações`.
- **Resultado Esperado:**
  - O botão exibe estado de carregamento (`Salvando...`).
  - É exibido o alerta verde de confirmação: *"Configurações da empresa salvas com sucesso!"*.
  - Os novos dados persistem no banco/localStorage e são refletidos globalmente no sistema.

---

## 🔄 Módulo 2: Restauração e Limpeza de Dados Mock

### Caso de Teste 2.1: Preencher / Restaurar Dados Mock
- **Ação:** Na secção *Gestão de Dados de Demonstração (Mock)*, clique em `Preencher / Restaurar Dados Mock`.
- **Resultado Esperado:** O sistema repovoa clientes, artigos, fornecedores e faturas e exibe notificação azul de sucesso.

### Caso de Teste 2.2: Eliminar Todos os Dados
- **Ação:** Clique no botão vermelho `Eliminar Todos os Dados` e confirme o prompt.
- **Resultado Esperado:** Todos os dados cadastrais do sistema são limpos.

---

## ⚡ Módulo 3: Testes de API Routes (`/api/company`)

Você também pode testar os endpoints via ferramentas HTTP (Postman, Insomnia ou `curl`):

| Endpoint | Método | Payload de Exemplo | Resposta Esperada |
| :--- | :---: | :--- | :--- |
| `/api/company` | `GET` | N/A | `{ "success": true, "data": { "nome": "Kima...", "nif": "5417082910", ... } }` |
| `/api/company` | `PUT` | `{"nomeEmpresa": "Kima Lda", "nif": "5417082910", "morada": "Luanda", "telefone": "923000111", "email": "info@kima.ao", "logoUrl": "data:image/png;base64,..."}` | `{ "success": true, "data": { ... } }` |
