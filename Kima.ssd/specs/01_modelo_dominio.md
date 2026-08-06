# MODELO DE DOMÍNIO - KIMA FINANCEIRO MVP

## Entidades (Apenas 6 tabelas)

### 1. Company (Empresa)
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `name` | String | Nome da empresa |
| `nif` | String | NIF |
| `address` | String | Morada |
| `phone` | String | Telefone |
| `email` | String | Email |
| `logo_url` | String | URL do logotipo |
| `created_at` | DateTime | Auditoria |

### 2. Client (Cliente)
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `name` | String | Nome do cliente |
| `nif` | String | NIF (validação módulo 11) |
| `address` | String | Morada |
| `phone` | String | Telefone |
| `email` | String | Email |
| `created_at` | DateTime | Auditoria |
| `updated_at` | DateTime | Auditoria |

### 3. Product (Artigo/Serviço)
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `code` | String | Código interno |
| `description` | String | Descrição |
| `price` | Decimal (AOA) | Preço unitário |
| `tax_rate` | Decimal (%) | Taxa de IVA (14%, 7%, 0%) |
| `created_at` | DateTime | Auditoria |
| `updated_at` | DateTime | Auditoria |

### 4. Invoice (Fatura)
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `client_id` | String (UUID) | FK → Client |
| `number` | Integer | Número sequencial (ex: 1, 2, 3...) |
| `issue_date` | DateTime | Data de emissão |
| `due_date` | DateTime | Data de vencimento |
| `payment_method` | Enum | cash, transfer, multicaixa, pos, check |
| `status` | Enum | pending, paid, cancelled |
| `subtotal` | Decimal (AOA) | Total sem IVA |
| `tax_amount` | Decimal (AOA) | Total de IVA |
| `total` | Decimal (AOA) | Total líquido |
| `notes` | String | Observações |
| `created_at` | DateTime | Auditoria |
| `updated_at` | DateTime | Auditoria |

### 5. InvoiceLine (Linha da Fatura)
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `invoice_id` | String (UUID) | FK → Invoice |
| `product_id` | String (UUID) | FK → Product (opcional) |
| `description` | String | Descrição livre |
| `quantity` | Decimal | Quantidade |
| `unit_price` | Decimal (AOA) | Preço unitário |
| `tax_rate` | Decimal (%) | IVA aplicado |
| `total` | Decimal (AOA) | Total da linha |

### 6. Payment (Pagamento)
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | String (UUID) | PK |
| `invoice_id` | String (UUID) | FK → Invoice |
| `amount` | Decimal (AOA) | Valor pago |
| `payment_date` | DateTime | Data |
| `method` | Enum | cash, transfer, multicaixa |
| `created_at` | DateTime | Auditoria |

## Relacionamentos (Resumo)
- **Company** (1) → (1) Configuração única
- **Client** (1) → (N) Invoice
- **Invoice** (1) → (N) InvoiceLine
- **Product** (1) → (N) InvoiceLine
- **Invoice** (1) → (N) Payment
