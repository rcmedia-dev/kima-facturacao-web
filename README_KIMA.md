# Kima Financeiro - Sistema de Faturação Moderno

Um sistema moderno e profissional de faturação para pequenas empresas angolanas, desenvolvido com Next.js 16, Tailwind CSS, Shadcn/ui e Zustand.

## Características Principais

### 1. **Dashboard Inteligente**
- Métricas em tempo real (Total Faturado, Faturas Pendentes, Total Clientes)
- Visualização das últimas faturas
- Links rápidos para criar clientes e faturas

### 2. **Gerenciamento de Clientes**
- CRUD completo (Criar, Ler, Atualizar, Deletar)
- Busca por nome ou NIF
- Armazenamento em localStorage com sincronização automática
- Campos: Nome, NIF, Morada, Telefone, Email

### 3. **Gerenciamento de Artigos**
- CRUD completo para produtos/serviços
- Campos: Código, Descrição, Preço (AOA), Taxa de IVA
- Suporte para múltiplas alíquotas de IVA (0%, 7%, 14%)

### 4. **Fluxo de Nova Fatura (3 Passos)**
- **Passo 1: Cliente** - Selecionar cliente com busca integrada
- **Passo 2: Linhas** - Adicionar artigos com quantidade e cálculo automático de IVA
- **Passo 3: Emissão** - Revisar, emitir e gerar PDF da fatura
- Cálculo automático de subtotal, IVA e total
- Data de vencimento automática (configurável)

### 5. **Listagem e Detalhe de Faturas**
- Listagem com filtros por status e período
- Visualização detalhada de cada fatura
- Modal de registrar pagamento
- Estatísticas de fatura (estado, datas, valores)

### 6. **Configurações da Empresa**
- Informações da empresa (Nome, NIF, Morada, Telefone, Email)
- Preferências (dias para vencimento, etc)
- Persistência em localStorage

## Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Estilização**: Tailwind CSS v4
- **UI Components**: Shadcn/ui
- **State Management**: Zustand
- **Formulários**: React Hook Form + Zod
- **Ícones**: Lucide React
- **PDF Generation**: jsPDF
- **Datas**: date-fns
- **Armazenamento**: localStorage (MVP)

## Instalação e Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Iniciar servidor de produção
pnpm start
```

O aplicativo estará disponível em `http://localhost:3000`

## Autenticação de administradores e funcionários

- Administradores continuam a usar a autenticação Supabase partilhada com o Kima Hub.
- Funcionários aceitam o convite e definem a própria palavra-passe; o administrador não precisa de a criar nem conhecer. Podem usar o mesmo projeto Supabase partilhado, desde que o email do funcionário ainda não exista no Auth.
- No `.env.local`, as variáveis `NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_URL` e `NEXT_PUBLIC_FATURAS_AUTH_SUPABASE_ANON_KEY` podem ter os mesmos valores das variáveis Supabase partilhadas. `FATURAS_AUTH_SUPABASE_SERVICE_ROLE_KEY` também pode usar a chave administrativa desse projeto, apenas no servidor. Não é necessário criar outro projeto.
- O Supabase só permite uma conta por email dentro do projeto: se o email do funcionário já existir no Auth, ele terá de entrar com a palavra-passe dessa conta para aceitar o convite; não é possível criar uma segunda palavra-passe para o mesmo email.
- Depois da migration `006_funcionarios_kima_facturas.sql` já aplicada, execute `migrations/007_auth_separado_funcionarios.sql` na base de dados de negócio. A migration preserva os funcionários existentes como Hub, identifica os novos como Faturas e mantém as permissões separadas por origem.

## Estrutura de Pastas

```
app/
├── dashboard/          # Dashboard com métricas
├── clientes/          # Gerenciamento de clientes
├── artigos/           # Gerenciamento de artigos
├── faturas/           # Listagem e detalhe de faturas
│   ├── nova/          # Fluxo de nova fatura (3 passos)
│   └── [id]/          # Detalhe e operações de fatura
├── configuracoes/     # Configurações da empresa
└── layout.tsx         # Layout raiz

components/
├── header.tsx         # Header com navegação
└── ui/               # Componentes Shadcn/ui

lib/
├── types.ts          # Tipos TypeScript
├── schemas.ts        # Schemas Zod
├── store.ts          # Zustand store
├── storage.ts        # Helpers de localStorage
├── formatters.ts     # Utilitários de formatação
└── constants.ts      # Constantes da aplicação

hooks/
└── use-store-init.ts # Hook para inicialização do store
```

## Fluxo de Dados

1. **Inicialização**: `useStoreInit()` carrega dados do localStorage ao montar
2. **Armazenamento**: Zustand store gerencia estado global
3. **Persistência**: Todos os dados são salvos em localStorage automaticamente
4. **Sincronização**: Estado reativo se atualiza em tempo real em todos os componentes

## Paleta de Cores

- **Primário**: Azul (#2563EB)
- **Secundário**: Teal (#14B8A6)
- **Destaque**: Amarelo (#F59E0B)
- **Neutros**: Tons de cinza e branco

## Funcionalidades MVP Implementadas

✅ Dashboard com métricas  
✅ CRUD de Clientes  
✅ CRUD de Artigos  
✅ Fluxo de Nova Fatura (3 passos)  
✅ Listagem de Faturas com filtros  
✅ Detalhe de Fatura  
✅ Configurações da Empresa  
✅ Responsividade mobile  
✅ Design moderno e profissional  
✅ Persistência em localStorage  

## Próximas Melhorias (Futuro)

- [ ] Integração com banco de dados (Neon/Supabase)
- [ ] Autenticação de usuários
- [ ] Geração de PDF/Excel
- [ ] Integração com payment gateways
- [ ] Relatórios avançados
- [ ] Export de dados
- [ ] API REST completa
- [ ] Testes automatizados

## Suporte para Moedas Angolanas

O sistema utiliza o **Kwanza Angolano (AOA)** como moeda padrão, com símbolo **Kz**.

## Licença

Desenvolvido para Kima Financeiro.
